// src/lib/dockerManager.ts
import { EventEmitter } from "node:events";
import { spawn } from "node:child_process";
import { logScanActivity, updateScanStatus } from "./supabase";
import { WebSocketBroadcaster } from "./websocket";
import { TOOL_IMAGES } from "./toolImages";
// If you have helpers, keep/import them. Otherwise remove this line.
// import { normalizeNmapFlags, needsRawSockets } from "./flagHelpers";

interface ContainerStats {
  memory_usage: string;
  cpu_usage: string;
  uptime: string;
  container_id: string;
  image: string;
  created: string;
}
interface ContainerStatus {
  exists: boolean;
  running: boolean;
  stats?: ContainerStats;
}
interface ScanExecution {
  containerId: string;
  startTime: Date;
  timeout?: NodeJS.Timeout;
  killed: boolean;
  real?: boolean;
  image?: string;
}

const REAL = process.env.REAL_EXECUTION === "true";
const isWin = typeof process !== "undefined" && process.platform === "win32";
const DOCKER = isWin ? "docker.exe" : "docker";

function detectTool(command: string): keyof typeof TOOL_IMAGES | null {
  const c = command.trim().toLowerCase();
  if (c.startsWith("nmap")) return "nmap";
  if (c.startsWith("nikto")) return "nikto";
  if (c.startsWith("sqlmap")) return "sqlmap";
  if (c.startsWith("gobuster")) return "gobuster";
  // if (c.startsWith("nuclei")) return "nuclei";
  // if (c.startsWith("httpx")) return "httpx";
  // if (c.startsWith("subfinder")) return "subfinder";
  // if (c.startsWith("sslscan")) return "sslscan";
  return null;
}

/** Very light splitter for args. Assumes e.g. "nmap -sV -T4 target" */
function tokenize(cmd: string): string[] {
  return cmd.trim().split(/\s+/).filter(Boolean);
}

class DockerManager extends EventEmitter {
  private runningScans: Map<string, ScanExecution> = new Map();
  private broadcaster: WebSocketBroadcaster;

  constructor() {
    super();
    this.broadcaster = WebSocketBroadcaster.getInstance();
    console.log("Docker Manager initialized (REAL execution only; simulations removed).");
    if (!REAL) {
      // Fail fast so we don't accidentally proceed without real execution.
      console.error(
        "REAL_EXECUTION is not 'true'. Set REAL_EXECUTION=true in your environment. Simulations are disabled."
      );
    }
  }

  /** Public entry used by your API routes */
  async executeScan(
    scanId: string,
    command: string,
    userId: string,
    _target?: string
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    if (!REAL) {
      const msg =
        "REAL_EXECUTION=false (or unset). Simulations were removed. Set REAL_EXECUTION=true to run scans.";
      await updateScanStatus(scanId, "failed", { execution_error: msg, direct_execution: true });
      await logScanActivity(scanId, userId, "error", msg);
      throw new Error(msg);
    }
    return this.realExecution(scanId, command, userId);
  }

  /** REAL execution path: spawn docker and stream logs */
  private async realExecution(
    scanId: string,
    command: string,
    userId: string
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    const tool = detectTool(command);
    if (!tool || !TOOL_IMAGES[tool]) {
      throw new Error(
        "Unsupported command. Allowed tools: nmap/nikto/sqlmap/gobuster (+ optional nuclei/httpx/subfinder/sslscan)."
      );
    }

    const tokens = tokenize(command); // e.g. ["nmap", "-sV", "-T4", "target"...]
    const meta = TOOL_IMAGES[tool];

    // If you later add flag normalization, do it here (e.g., for nmap on Windows/docker).
    // const finalArgs = tool === "nmap" ? normalizeNmapFlags(tokens.slice(1)) : tokens.slice(1);
    const finalArgs = tokens.slice(1);

    const dockerArgs: string[] = [
      "run",
      "--rm",
      // modest limits; adjust as needed
      "--cpus=0.5",
      "--memory=512m",
      meta.image,
      ...meta.baseArgs,   // includes the tool name (e.g., "nmap")
      ...finalArgs,       // user flags + target
    ];

    const containerId = `real-${scanId}-${Date.now()}`;
    const started = new Date();
    const execution: ScanExecution = {
      containerId,
      startTime: started,
      killed: false,
      real: true,
      image: meta.image,
    };
    this.runningScans.set(scanId, execution);

    await updateScanStatus(scanId, "running");
    await logScanActivity(scanId, userId, "info", `Starting REAL scan: ${command}`);

    // Broadcast start
    this.broadcaster.broadcastScanProgress(scanId, userId, {
      scanId,
      status: "running",
      progress: 10,
      currentStep: `Launching container (${meta.image})`,
      output: `Command: ${command}`,
    });

    const begin = Date.now();
    const child = spawn(DOCKER, dockerArgs, { stdio: ["ignore", "pipe", "pipe"] });

    let out = "";
    let err = "";

    // Hard timeout (10 minutes). Optionally tie this to your Command.timeout from the request.
    execution.timeout = setTimeout(() => {
      try {
        execution.killed = true;
        child.kill("SIGKILL");
      } catch {}
    }, 10 * 60 * 1000);

    child.stdout.on("data", (d) => {
      const text = d.toString();
      out += text;
      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: "running",
        progress: 50,
        currentStep: "Streaming output",
        output: text,
      });
    });

    child.stderr.on("data", (d) => {
      const text = d.toString();
      err += text;
      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: "running",
        progress: 55,
        currentStep: "Processing stderr",
        output: text,
      });
    });

    const done = await new Promise<{ code: number | null }>((resolve) =>
      child.on("close", (code) => resolve({ code }))
    );

    if (execution.timeout) clearTimeout(execution.timeout);
    const durationMs = Date.now() - begin;

    if (done.code === 0 && !execution.killed) {
      await updateScanStatus(scanId, "completed", {
        execution_result: { tool, image: meta.image },
        output_length: out.length,
        execution_duration: durationMs,
        direct_execution: true,
      });
      await logScanActivity(scanId, userId, "info", "Scan completed successfully");

      this.broadcaster.broadcastScanComplete(scanId, userId, {
        scanId,
        duration: durationMs,
        exitCode: 0,
        output: out,
      });
      this.broadcaster.broadcastContainerStatus(scanId, userId, {
        scanId,
        status: "stopped",
        uptime: `${Math.round(durationMs / 1000)}s`,
        memoryUsage: "Released",
        cpuUsage: "0%",
      });

      this.runningScans.delete(scanId);
      return { success: true, output: out, containerId };
    }

    // Failed or killed
    await updateScanStatus(scanId, "failed", {
      execution_error: err || "Scan failed",
      execution_duration: durationMs,
      direct_execution: true,
    });
    await logScanActivity(
      scanId,
      userId,
      "error",
      execution.killed ? "Scan killed (timeout/cancel)" : (err || "Scan failed")
    );

    this.broadcaster.broadcastScanError(scanId, userId, {
      message: execution.killed ? "Scan killed" : (err || "Scan failed"),
      details: { duration: durationMs },
    });
    this.broadcaster.broadcastContainerStatus(scanId, userId, {
      scanId,
      status: execution.killed ? "stopped" : "error",
      uptime: `${Math.round(durationMs / 1000)}s`,
      memoryUsage: "Released",
      cpuUsage: "0%",
    });

    this.runningScans.delete(scanId);
    return { success: false, output: out, error: err || "Scan failed", containerId };
  }

  async killScan(scanId: string): Promise<boolean> {
    const execution = this.runningScans.get(scanId);
    if (!execution) return false;

    try {
      execution.killed = true;
      if (execution.timeout) clearTimeout(execution.timeout);
      await updateScanStatus(scanId, "cancelled");
      this.runningScans.delete(scanId);
      console.log(`Killed REAL scan ${scanId}`);
      return true;
    } catch (error) {
      console.error(`Failed to kill scan ${scanId}:`, error);
      return false;
    }
  }

  async getContainerStatus(scanId?: string): Promise<ContainerStatus> {
    if (scanId) {
      const execution = this.runningScans.get(scanId);
      if (execution) {
        return {
          exists: true,
          running: !execution.killed,
          stats: {
            memory_usage: "N/A",
            cpu_usage: "N/A",
            uptime: `${Math.floor((Date.now() - execution.startTime.getTime()) / 1000)}s`,
            container_id: execution.containerId,
            image: execution.image || "pentriarch/security-scanner:latest",
            created: execution.startTime.toISOString(),
          },
        };
      }
    }
    return { exists: false, running: false };
  }

  async cleanup(): Promise<void> {
    console.log("Cleaning up Docker manager...");
    for (const [scanId] of this.runningScans) {
      await this.killScan(scanId);
    }
    this.runningScans.clear();
  }

  async healthCheck(): Promise<{ docker: boolean; image: boolean; containers: number }> {
    // If you want a real check, you can try spawnSync('docker', ['--version'])
    return {
      docker: true,
      image: true,
      containers: this.runningScans.size,
    };
  }

  /** Compatibility shim used by your /api/execute route */
  async executeCommand(
    command: string | { toString(): string },
    scanId: string,
    outputCallback?: (output: string) => void
  ): Promise<{ success: boolean; output: string; duration: number; error?: string }> {
    const startTime = Date.now();
    const result = await this.executeScan(scanId, command.toString(), "system");
    const duration = Date.now() - startTime;

    if (outputCallback && result.output) {
      outputCallback(result.output);
    }

    return {
      success: !!result.success,
      output: result.output || "",
      duration,
      error: result.error,
    };
  }
}

// Export singleton instance
export const dockerManager = new DockerManager();

// Graceful shutdown handlers
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    console.log("Received SIGINT, cleaning up...");
    await dockerManager.cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, cleaning up...");
    await dockerManager.cleanup();
    process.exit(0);
  });
}
