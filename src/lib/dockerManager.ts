// src/lib/dockerManager.ts
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import Docker from "dockerode";
import { insertScanLogServer, updateScanStatusServer } from "./supabase";
import { WebSocketBroadcaster } from "./websocket";
import { TOOL_IMAGES } from "./toolImages";
import { generateDetailedReportForScan } from "./reporting";
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

const REAL = process.env.REAL_EXECUTION !== "false";
const isWin = typeof process !== "undefined" && process.platform === "win32";

const DEFAULT_IMAGE = process.env.KALI_CONTAINER_IMAGE || "pentriarch/kali-scanner:latest";

/** Very light splitter for args. Assumes e.g. "nmap -sV -T4 target" */
function tokenize(cmd: string): string[] {
  return cmd.trim().split(/\s+/).filter(Boolean);
}

class DockerManager extends EventEmitter {
  private runningScans: Map<string, ScanExecution> = new Map();
  private broadcaster: WebSocketBroadcaster;
  private dockerClient: Docker;

  constructor() {
    super();
    this.broadcaster = WebSocketBroadcaster.getInstance();
    this.dockerClient = this.createDockerClient();
    console.log("Docker Manager initialized (REAL execution only; simulations removed).");
    if (!REAL) {
      // Fail fast so we don't accidentally proceed without real execution.
      console.error(
        "REAL_EXECUTION is not 'true'. Set REAL_EXECUTION=true in your environment. Simulations are disabled."
      );
    }
  }

  private createDockerClient(): Docker {
    const dockerHost = process.env.DOCKER_HOST || "";
    if (dockerHost.startsWith("unix://")) {
      return new Docker({ socketPath: dockerHost.replace("unix://", "") });
    }
    if (dockerHost.startsWith("npipe://")) {
      return new Docker({ socketPath: dockerHost.replace("npipe://", "") });
    }
    if (dockerHost.startsWith("tcp://")) {
      const url = new URL(dockerHost.replace("tcp://", "http://"));
      return new Docker({
        host: url.hostname,
        port: Number.parseInt(url.port || "2375", 10),
        protocol: url.protocol.replace(":", "")
      });
    }
    return new Docker();
  }

  private async ensureImage(image: string): Promise<void> {
    try {
      await this.dockerClient.getImage(image).inspect();
      return;
    } catch {
      // Pull image if missing
    }

    await new Promise<void>((resolve, reject) => {
      this.dockerClient.pull(image, (error, stream) => {
        if (error) {
          reject(error);
          return;
        }
        if (!stream) {
          reject(new Error("Docker pull stream unavailable"));
          return;
        }
        this.dockerClient.modem.followProgress(stream, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /** Public entry used by your API routes */
  async executeScan(
    scanId: string,
    command: string,
    userId: string,
    _target?: string,
    timeoutMs?: number
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    if (!REAL) {
      const msg =
        "REAL_EXECUTION=false. Set REAL_EXECUTION=true to enable real scans.";
      await updateScanStatusServer(scanId, "failed", { execution_error: msg, direct_execution: true });
      await insertScanLogServer({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: "error",
        message: msg,
        raw_output: msg
      });
      throw new Error(msg);
    }
    return this.realExecution(scanId, command, userId, timeoutMs);
  }

  /** REAL execution path: spawn docker and stream logs */
  private async realExecution(
    scanId: string,
    command: string,
    userId: string,
    timeoutMs?: number
  ): Promise<{ success: boolean; output?: string; error?: string; containerId?: string }> {
    const tokens = tokenize(command);
    if (tokens.length === 0) {
      throw new Error("Command is empty.");
    }
    const meta = TOOL_IMAGES[tokens[0] as keyof typeof TOOL_IMAGES] || {
      image: DEFAULT_IMAGE,
      baseArgs: [] as string[]
    };

    // If you later add flag normalization, do it here (e.g., for nmap on Windows/docker).
    // const finalArgs = tool === "nmap" ? normalizeNmapFlags(tokens.slice(1)) : tokens.slice(1);
    const finalArgs = tokens.slice(1);

    await this.ensureImage(meta.image);

    const started = new Date();
      const execution: ScanExecution = {
        containerId: "",
        startTime: started,
        killed: false,
        real: true,
        image: meta.image,
      };
    this.runningScans.set(scanId, execution);

    await updateScanStatusServer(scanId, "running");
    await insertScanLogServer({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: "info",
      message: `Starting REAL scan: ${command}`,
      raw_output: command
    });

    // Broadcast start
    this.broadcaster.broadcastScanProgress(scanId, userId, {
      scanId,
      status: "running",
      progress: 10,
      currentStep: `Launching container (${meta.image})`,
      output: `Command: ${command}`,
    });

    const begin = Date.now();
    let out = "";
    let err = "";

    const killAfterMs = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 10 * 60 * 1000;

    const hostConfig: Docker.ContainerCreateOptions["HostConfig"] = {
      AutoRemove: true,
    };
    if (!isWin) {
      hostConfig.NanoCpus = 0.5 * 1e9;
      hostConfig.Memory = 512 * 1024 * 1024;
    }

    const container = await this.dockerClient.createContainer({
      Image: meta.image,
      Cmd: [...meta.baseArgs, ...finalArgs],
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      HostConfig: hostConfig
    });

    execution.containerId = container.id;

    const attachStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    this.dockerClient.modem.demuxStream(attachStream, stdout, stderr);

    const handleStdout = (text: string) => {
      out += text;
      insertScanLogServer({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Command output",
        raw_output: text
      }).catch(console.error);
      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: "running",
        progress: 50,
        currentStep: "Streaming output",
        output: text,
      });
    };

    const handleStderr = (text: string) => {
      err += text;
      insertScanLogServer({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Command error output",
        raw_output: text
      }).catch(console.error);
      this.broadcaster.broadcastScanProgress(scanId, userId, {
        scanId,
        status: "running",
        progress: 55,
        currentStep: "Processing stderr",
        output: text,
      });
    };

    stdout.on("data", (d) => handleStdout(d.toString()));
    stderr.on("data", (d) => handleStderr(d.toString()));

    execution.timeout = setTimeout(async () => {
      try {
        execution.killed = true;
        await container.stop({ t: 0 });
        await container.remove({ force: true });
      } catch {}
    }, killAfterMs);

    await container.start();
    const done = await container.wait();

    if (execution.timeout) clearTimeout(execution.timeout);
    const durationMs = Date.now() - begin;
    const exitCode = done?.StatusCode ?? 1;

    if (exitCode === 0 && !execution.killed) {
      const executedTool = tokens[0] || "unknown";
      await updateScanStatusServer(scanId, "completed", {
        execution_result: { tool: executedTool, image: meta.image },
        output_length: out.length,
        execution_duration: durationMs,
        direct_execution: true,
      });
      await insertScanLogServer({
        scan_id: scanId,
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Scan completed successfully",
        raw_output: `Execution time: ${durationMs}ms`
      });

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
      generateDetailedReportForScan(scanId).catch(console.error);
      return { success: true, output: out, containerId: execution.containerId };
    }

    // Failed or killed
    await updateScanStatusServer(scanId, "failed", {
      execution_error: err || "Scan failed",
      execution_duration: durationMs,
      direct_execution: true,
    });
    await insertScanLogServer({
      scan_id: scanId,
      timestamp: new Date().toISOString(),
      level: "error",
      message: execution.killed ? "Scan killed (timeout/cancel)" : (err || "Scan failed"),
      raw_output: err || "Scan failed"
    });

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
    return { success: false, output: out, error: err || "Scan failed", containerId: execution.containerId };
  }

  async killScan(scanId: string): Promise<boolean> {
    const execution = this.runningScans.get(scanId);
    if (!execution) return false;

    try {
      execution.killed = true;
      if (execution.timeout) clearTimeout(execution.timeout);
      if (execution.containerId) {
        try {
          const container = this.dockerClient.getContainer(execution.containerId);
          await container.stop({ t: 0 });
          await container.remove({ force: true });
        } catch {
          // Best-effort cleanup if the container already exited.
        }
      }
      await updateScanStatusServer(scanId, "cancelled");
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
    let dockerOk = false;
    let imageOk = false;
    const image = process.env.KALI_CONTAINER_IMAGE || TOOL_IMAGES.nmap.image;

    try {
      await this.dockerClient.ping();
      dockerOk = true;
    } catch {
      dockerOk = false;
    }

    if (dockerOk) {
      try {
        await this.dockerClient.getImage(image).inspect();
        imageOk = true;
      } catch {
        imageOk = false;
      }
    }

    return {
      docker: dockerOk,
      image: imageOk,
      containers: this.runningScans.size,
    };
  }

  /** Compatibility shim used by your /api/execute route */
  async executeCommand(
    command: string | { toString(): string },
    scanId: string,
    outputCallback?: (output: string) => void,
    timeoutMs?: number,
    userId?: string
  ): Promise<{ success: boolean; output: string; duration: number; error?: string }> {
    const startTime = Date.now();
    const result = await this.executeScan(scanId, command.toString(), userId || "system", undefined, timeoutMs);
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
