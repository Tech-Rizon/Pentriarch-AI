// Deprecated: use dockerManager + /api/execute instead.




//  import { spawn } from "child_process";

/* export async function runRealNmap(target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "docker.exe" : "docker";

    const args = [
      "run", "--rm",
      "--cpus=0.5", "--memory=512m",
      "instrumentisto/nmap",
      "-sV", "-T4", target
    ];

    const proc = spawn(cmd, args);
    let output = "";
    let error = "";

    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => { error += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(error || `Exited with code ${code}`));
    });
  });
}
*/