// Ensure Nmap runs in non-privileged containers by default.
export function normalizeNmapFlags(flags: string[]): string[] {
  const f = [...flags];
  const has = (s: string) => f.some(v => v.toLowerCase() === s.toLowerCase());

  // If user didn’t pick a scan type, force TCP connect (-sT)
  if (!["-sT","-sS","-sA","-sU"].some(s => has(s))) f.unshift("-sT");

  // If user didn’t disable ping, force -Pn (skip ICMP to avoid NET_RAW)
  if (!has("-Pn")) f.unshift("-Pn");

  return f;
}

// Do these flags require raw sockets / extra caps?
export function needsRawSockets(flags: string[]): boolean {
  const has = (s: string) => flags.some(v => v.toLowerCase() === s.toLowerCase());
  // SYN scan or default ping (no -Pn) needs NET_RAW / NET_ADMIN
  return has("-sS") || !has("-Pn");
}
