// src/lib/toolImages.ts
export const TOOL_IMAGES = {
  nmap:     { image: "pentriarch/kali-scanner:latest", baseArgs: ["nmap", "-sV", "-T4", "-sT", "-Pn"] },
  nikto:    { image: "pentriarch/kali-scanner:latest", baseArgs: ["nikto"] },
  sqlmap:   { image: "pentriarch/kali-scanner:latest", baseArgs: ["sqlmap", "--batch"] },
  gobuster: { image: "pentriarch/kali-scanner:latest", baseArgs: ["gobuster"] },
  whatweb:  { image: "pentriarch/kali-scanner:latest", baseArgs: ["whatweb"] },
  wpscan:   { image: "pentriarch/kali-scanner:latest", baseArgs: ["wpscan"] },
  // nuclei:  { image: "pentriarch/kali-scanner:latest", baseArgs: ["nuclei"] },
  // httpx:   { image: "pentriarch/kali-scanner:latest", baseArgs: ["httpx"] },
  // subfinder:{ image: "pentriarch/kali-scanner:latest", baseArgs: ["subfinder"] },
  // sslscan: { image: "pentriarch/kali-scanner:latest", baseArgs: ["sslscan"] },
} as const;

// helpful types exported for consumers
export type ToolId = keyof typeof TOOL_IMAGES;
export type ToolImageMeta = typeof TOOL_IMAGES[ToolId];
