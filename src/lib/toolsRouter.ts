import { z } from 'zod'

// Security tool definitions
export interface SecurityTool {
  id: string
  name: string
  description: string
  category: 'reconnaissance' | 'scanning' | 'exploitation' | 'post-exploitation' | 'web-application' | 'network' | 'database' | 'osint' | 'cloud' | 'mobile' | 'wireless' | 'forensics' | 'password' | 'vulnerability'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  requires_auth: boolean
  default_flags: string[]
  max_execution_time: number // in seconds
  output_format: 'text' | 'json' | 'xml' | 'csv'
  documentation: string
}

export const SECURITY_TOOLS: SecurityTool[] = [
  // === NETWORK DISCOVERY & RECONNAISSANCE ===
  {
    id: 'nmap',
    name: 'Nmap',
    description: 'Network discovery and security auditing',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-sV', '-sC', '--max-retries=1', '--host-timeout=300s'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'Network port scanner for discovery and security auditing'
  },
  {
    id: 'masscan',
    name: 'Masscan',
    description: 'High-speed port scanner',
    category: 'scanning',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-p1-65535', '--rate=1000', '--wait=3'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Fast port scanner for large networks'
  },
  {
    id: 'zmap',
    name: 'ZMap',
    description: 'Internet-scale network scanner',
    category: 'reconnaissance',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-p', '80', '--rate=10000'],
    max_execution_time: 1200,
    output_format: 'text',
    documentation: 'Fast single packet network scanner'
  },
  {
    id: 'rustscan',
    name: 'RustScan',
    description: 'Modern fast port scanner',
    category: 'scanning',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--ulimit', '5000', '--timeout', '3000'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'Fast port scanner built in Rust'
  },
  {
    id: 'unicornscan',
    name: 'Unicornscan',
    description: 'Asynchronous network stimulus delivery',
    category: 'scanning',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-mT', '-I'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Asynchronous TCP/UDP port scanner'
  },
  {
    id: 'dnsenum',
    name: 'DNSEnum',
    description: 'DNS enumeration and subdomain discovery',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--threads', '10', '--timeout', '10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'DNS enumeration tool for subdomain discovery'
  },
  {
    id: 'fierce',
    name: 'Fierce',
    description: 'DNS reconnaissance tool',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--connect', '--wide'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'DNS scanner for locating non-contiguous IP space'
  },
  {
    id: 'dnsrecon',
    name: 'DNSRecon',
    description: 'DNS enumeration and reconnaissance',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-t', 'std'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'DNS enumeration script'
  },
  {
    id: 'sublist3r',
    name: 'Sublist3r',
    description: 'Subdomain enumeration tool',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-t', '10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Fast subdomains enumeration tool for penetration testers'
  },
  {
    id: 'amass',
    name: 'OWASP Amass',
    description: 'Advanced subdomain enumeration',
    category: 'osint',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['enum', '-passive'],
    max_execution_time: 900,
    output_format: 'text',
    documentation: 'In-depth attack surface mapping and asset discovery'
  },

  // === WEB APPLICATION TESTING ===
  {
    id: 'nikto',
    name: 'Nikto',
    description: 'Web server scanner for vulnerabilities',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-h', '-Format', 'txt', '-timeout', '10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Web server scanner that tests for dangerous files and configurations'
  },
  {
    id: 'gobuster',
    name: 'Gobuster',
    description: 'Directory and file brute-forcing',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['dir', '-w', '/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt', '-t', '10', '--timeout', '10s'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Fast directory/file brute-forcer'
  },
  {
    id: 'dirb',
    name: 'DIRB',
    description: 'Web content scanner',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-S', '-w'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Web content scanner for hidden directories and files'
  },
  {
    id: 'dirsearch',
    name: 'DirSearch',
    description: 'Advanced web path scanner',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-t', '20', '--timeout', '10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Advanced command-line tool designed to brute force directories and files'
  },
  {
    id: 'wpscan',
    name: 'WPScan',
    description: 'WordPress security scanner',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--url', '--detection-mode', 'passive', '--request-timeout', '60'],
    max_execution_time: 300,
    output_format: 'json',
    documentation: 'WordPress vulnerability scanner'
  },
  {
    id: 'whatweb',
    name: 'WhatWeb',
    description: 'Web technology identification',
    category: 'reconnaissance',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-a', '3', '--max-threads', '5'],
    max_execution_time: 120,
    output_format: 'text',
    documentation: 'Web technology fingerprinting tool'
  },
  {
    id: 'wapiti',
    name: 'Wapiti',
    description: 'Web application vulnerability scanner',
    category: 'web-application',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['-f', 'txt', '--timeout', '10'],
    max_execution_time: 900,
    output_format: 'text',
    documentation: 'Web application security auditor'
  },
  {
    id: 'sqlmap',
    name: 'SQLMap',
    description: 'Automated SQL injection testing',
    category: 'web-application',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['--batch', '--risk=1', '--level=1', '--timeout=30', '--retries=1'],
    max_execution_time: 900,
    output_format: 'text',
    documentation: 'Automated tool for detecting and exploiting SQL injection flaws'
  },
  {
    id: 'xsser',
    name: 'XSSer',
    description: 'Cross-site scripting detection',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--auto', '--timeout=10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Automatic framework to detect and exploit XSS vulnerabilities'
  },
  {
    id: 'commix',
    name: 'Commix',
    description: 'Command injection exploitation',
    category: 'web-application',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['--batch', '--timeout=10'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Automated All-in-One OS command injection and exploitation tool'
  },
  {
    id: 'burpsuite',
    name: 'Burp Suite',
    description: 'Comprehensive web application security testing',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--headless', '--project-file=/tmp/burp'],
    max_execution_time: 1800,
    output_format: 'json',
    documentation: 'Web application security testing platform'
  },
  {
    id: 'zaproxy',
    name: 'OWASP ZAP',
    description: 'Web application security scanner',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-daemon', '-port', '8080'],
    max_execution_time: 1200,
    output_format: 'json',
    documentation: 'OWASP Zed Attack Proxy web application security scanner'
  },

  // === DATABASE & API TESTING ===
  {
    id: 'mongoaudit',
    name: 'MongoAudit',
    description: 'MongoDB security auditing',
    category: 'database',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--no-color'],
    max_execution_time: 300,
    output_format: 'json',
    documentation: 'MongoDB auditing and pentesting tool'
  },
  {
    id: 'nosqlmap',
    name: 'NoSQLMap',
    description: 'NoSQL injection testing',
    category: 'database',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['--attack', '1'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Automated NoSQL database enumeration and web application exploitation tool'
  },
  {
    id: 'redis-cli',
    name: 'Redis CLI',
    description: 'Redis security testing',
    category: 'database',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--scan'],
    max_execution_time: 120,
    output_format: 'text',
    documentation: 'Redis command line interface for security testing'
  },
  {
    id: 'restler',
    name: 'RESTler',
    description: 'REST API fuzzing',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--no_ssl'],
    max_execution_time: 900,
    output_format: 'json',
    documentation: 'First stateful REST API fuzzing tool'
  },
  {
    id: 'apiscan',
    name: 'APIScan',
    description: 'API security scanner',
    category: 'web-application',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--timeout', '10'],
    max_execution_time: 600,
    output_format: 'json',
    documentation: 'REST API security scanner'
  },

  // === OSINT & INFORMATION GATHERING ===
  {
    id: 'theharvester',
    name: 'theHarvester',
    description: 'Email and subdomain harvesting',
    category: 'osint',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-l', '100'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'Gather emails, subdomains, hosts, employee names, open ports and banners'
  },
  {
    id: 'maltego',
    name: 'Maltego',
    description: 'Link analysis and data mining',
    category: 'osint',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-headless'],
    max_execution_time: 600,
    output_format: 'xml',
    documentation: 'Interactive data mining tool for link analysis'
  },
  {
    id: 'shodan',
    name: 'Shodan CLI',
    description: 'Internet-connected device search',
    category: 'osint',
    risk_level: 'low',
    requires_auth: true,
    default_flags: ['search'],
    max_execution_time: 60,
    output_format: 'json',
    documentation: 'Search engine for Internet-connected devices'
  },
  {
    id: 'censys',
    name: 'Censys',
    description: 'Internet host and service discovery',
    category: 'osint',
    risk_level: 'low',
    requires_auth: true,
    default_flags: ['search'],
    max_execution_time: 60,
    output_format: 'json',
    documentation: 'Search engine for finding and analyzing Internet-connected devices'
  },
  {
    id: 'recon-ng',
    name: 'Recon-ng',
    description: 'Reconnaissance framework',
    category: 'osint',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-w', 'default'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Full-featured reconnaissance framework'
  },
  {
    id: 'spiderfoot',
    name: 'SpiderFoot',
    description: 'Automated OSINT collection',
    category: 'osint',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-l', '127.0.0.1:5001'],
    max_execution_time: 900,
    output_format: 'json',
    documentation: 'Open source intelligence automation tool'
  },

  // === PASSWORD & AUTHENTICATION ===
  {
    id: 'hydra',
    name: 'Hydra',
    description: 'Network login brute-forcer',
    category: 'password',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['-t', '4', '-w', '30'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'Very fast network logon cracker'
  },
  {
    id: 'medusa',
    name: 'Medusa',
    description: 'Parallel password cracker',
    category: 'password',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['-t', '5'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'Speedy, parallel, and modular login brute-forcer'
  },
  {
    id: 'ncrack',
    name: 'Ncrack',
    description: 'Network authentication cracking',
    category: 'password',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['-T', '4'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'High-speed network authentication cracking tool'
  },
  {
    id: 'john',
    name: 'John the Ripper',
    description: 'Password hash cracking',
    category: 'password',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--wordlist=/usr/share/wordlists/rockyou.txt'],
    max_execution_time: 3600,
    output_format: 'text',
    documentation: 'Fast password cracker'
  },
  {
    id: 'hashcat',
    name: 'Hashcat',
    description: 'Advanced password recovery',
    category: 'password',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-m', '0', '-a', '0'],
    max_execution_time: 3600,
    output_format: 'text',
    documentation: 'Advanced password recovery utility'
  },

  // === VULNERABILITY ASSESSMENT ===
  {
    id: 'openvas',
    name: 'OpenVAS',
    description: 'Comprehensive vulnerability scanner',
    category: 'vulnerability',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--scan-config', 'full_and_fast'],
    max_execution_time: 3600,
    output_format: 'xml',
    documentation: 'Full-featured vulnerability scanner'
  },
  {
    id: 'nessus',
    name: 'Nessus',
    description: 'Enterprise vulnerability scanner',
    category: 'vulnerability',
    risk_level: 'medium',
    requires_auth: true,
    default_flags: ['--policy', 'basic'],
    max_execution_time: 3600,
    output_format: 'xml',
    documentation: 'Comprehensive vulnerability scanner'
  },
  {
    id: 'nexpose',
    name: 'Nexpose',
    description: 'Rapid7 vulnerability management',
    category: 'vulnerability',
    risk_level: 'medium',
    requires_auth: true,
    default_flags: ['--scan-template', 'full-audit'],
    max_execution_time: 3600,
    output_format: 'xml',
    documentation: 'Vulnerability management solution'
  },
  {
    id: 'nuclei',
    name: 'Nuclei',
    description: 'Fast vulnerability scanner',
    category: 'vulnerability',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['-t', '/nuclei-templates/', '-timeout', '10'],
    max_execution_time: 900,
    output_format: 'json',
    documentation: 'Fast and customizable vulnerability scanner'
  },

  // === CLOUD & CONTAINER SECURITY ===
  {
    id: 'scout-suite',
    name: 'Scout Suite',
    description: 'Multi-cloud security auditing',
    category: 'cloud',
    risk_level: 'low',
    requires_auth: true,
    default_flags: ['--no-browser'],
    max_execution_time: 600,
    output_format: 'json',
    documentation: 'Multi-cloud security auditing tool'
  },
  {
    id: 'cloudsploit',
    name: 'CloudSploit',
    description: 'Cloud security scanning',
    category: 'cloud',
    risk_level: 'low',
    requires_auth: true,
    default_flags: ['--config', './config.js'],
    max_execution_time: 600,
    output_format: 'json',
    documentation: 'Cloud security configuration scanner'
  },
  {
    id: 'prowler',
    name: 'Prowler',
    description: 'AWS security assessment',
    category: 'cloud',
    risk_level: 'low',
    requires_auth: true,
    default_flags: ['-M', 'json'],
    max_execution_time: 900,
    output_format: 'json',
    documentation: 'AWS security best practices assessment'
  },
  {
    id: 'docker-bench',
    name: 'Docker Bench',
    description: 'Docker security benchmarking',
    category: 'cloud',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--json'],
    max_execution_time: 300,
    output_format: 'json',
    documentation: 'Docker security benchmarking tool'
  },
  {
    id: 'trivy',
    name: 'Trivy',
    description: 'Container vulnerability scanner',
    category: 'cloud',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['image', '--format', 'json'],
    max_execution_time: 600,
    output_format: 'json',
    documentation: 'Vulnerability scanner for containers and other artifacts'
  },

  // === WIRELESS & NETWORK PROTOCOLS ===
  {
    id: 'aircrack-ng',
    name: 'Aircrack-ng',
    description: 'WiFi security auditing',
    category: 'wireless',
    risk_level: 'high',
    requires_auth: false,
    default_flags: ['-w', '/usr/share/wordlists/rockyou.txt'],
    max_execution_time: 3600,
    output_format: 'text',
    documentation: 'Complete suite of tools to assess WiFi network security'
  },
  {
    id: 'kismet',
    name: 'Kismet',
    description: 'Wireless network detector',
    category: 'wireless',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--no-ncurses'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'Wireless network and device detector'
  },
  {
    id: 'bluetooth-scanner',
    name: 'Bluetooth Scanner',
    description: 'Bluetooth device discovery',
    category: 'wireless',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--timeout', '30'],
    max_execution_time: 120,
    output_format: 'text',
    documentation: 'Bluetooth device discovery and enumeration'
  },

  // === EXPLOITATION & POST-EXPLOITATION ===
  {
    id: 'metasploit',
    name: 'Metasploit',
    description: 'Penetration testing framework',
    category: 'exploitation',
    risk_level: 'critical',
    requires_auth: false,
    default_flags: ['-q', '-x', 'db_status; exit'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'Advanced open-source platform for developing, testing, and executing exploit code'
  },
  {
    id: 'empire',
    name: 'PowerShell Empire',
    description: 'Post-exploitation framework',
    category: 'post-exploitation',
    risk_level: 'critical',
    requires_auth: false,
    default_flags: ['--headless'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'PowerShell and Python post-exploitation agent'
  },
  {
    id: 'cobaltstrike',
    name: 'Cobalt Strike',
    description: 'Advanced threat emulation',
    category: 'exploitation',
    risk_level: 'critical',
    requires_auth: true,
    default_flags: ['--headless'],
    max_execution_time: 3600,
    output_format: 'text',
    documentation: 'Software platform for Adversary Simulations and Red Team Operations'
  },

  // === MOBILE & IOT SECURITY ===
  {
    id: 'mobsf',
    name: 'Mobile Security Framework',
    description: 'Mobile app security testing',
    category: 'mobile',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--no-browser'],
    max_execution_time: 900,
    output_format: 'json',
    documentation: 'Automated mobile application security testing framework'
  },
  {
    id: 'iot-inspector',
    name: 'IoT Inspector',
    description: 'IoT device security analysis',
    category: 'mobile',
    risk_level: 'medium',
    requires_auth: false,
    default_flags: ['--timeout', '30'],
    max_execution_time: 600,
    output_format: 'json',
    documentation: 'IoT device security analysis tool'
  },

  // === FORENSICS & STEGANOGRAPHY ===
  {
    id: 'volatility',
    name: 'Volatility',
    description: 'Memory forensics framework',
    category: 'forensics',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['--info'],
    max_execution_time: 1800,
    output_format: 'text',
    documentation: 'Advanced memory forensics framework'
  },
  {
    id: 'binwalk',
    name: 'Binwalk',
    description: 'Firmware analysis tool',
    category: 'forensics',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['-E'],
    max_execution_time: 600,
    output_format: 'text',
    documentation: 'Firmware analysis tool for reverse engineering'
  },
  {
    id: 'steghide',
    name: 'Steghide',
    description: 'Steganography detection',
    category: 'forensics',
    risk_level: 'low',
    requires_auth: false,
    default_flags: ['info'],
    max_execution_time: 300,
    output_format: 'text',
    documentation: 'Steganography program for hiding data in image and audio files'
  }
]

// Command validation schema
const CommandSchema = z.object({
  tool: z.string(),
  target: z
    .string()
    .url()
    .or(z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/))
    .or(z.string().regex(/^[a-zA-Z0-9.-]+$/)),
  flags: z.array(z.string()).optional(),
  timeout: z.number().max(1800).optional(), // Max 30 minutes
  output_file: z.string().optional()
})

export type Command = z.infer<typeof CommandSchema>

// Input sanitization
export function sanitizeTargetHost(target: string): string {
  // Remove any potential command injection attempts
  const cleaned = target
    .replace(/[;&|`$(){}[\]\\]/g, '') // Remove shell metacharacters
    .replace(/\s+/g, '') // Remove spaces
    .trim()

  // Validate format
  if (
    !/^[a-zA-Z0-9.-]+$/.test(cleaned) &&
    !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleaned)
  ) {
    throw new Error('Invalid target format. Use a hostname or IPv4 address.')
  }

  return cleaned
}

export function sanitizeTargetUrl(target: string): string {
  const cleaned = target
    .replace(/[;&|`$(){}[\]\\]/g, '')
    .replace(/\s+/g, '')
    .trim()

  if (/^https?:\/\/[^\s]+$/i.test(cleaned)) {
    return cleaned
  }

  if (/^[a-zA-Z0-9.-]+$/.test(cleaned) || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(cleaned)) {
    return `http://${cleaned}`
  }

  throw new Error('Invalid target format. Use a URL or hostname.')
}
export function sanitizeFlags(flags: string[]): string[] {
  return flags
    .filter(flag => typeof flag === 'string')
    .map(flag => flag.replace(/[;&|`$(){}[\]\\]/g, ''))
    .filter(flag => flag.length > 0 && flag.length < 100)
}

// Command generation functions
export function generateNmapCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'nmap')
  if (!tool) {
    throw new Error('Nmap tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetHost(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'nmap',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

export function generateNiktoCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'nikto')
  if (!tool) {
    throw new Error('Nikto tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetUrl(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'nikto',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

export function generateSqlmapCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'sqlmap')
  if (!tool) {
    throw new Error('Sqlmap tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetUrl(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'sqlmap',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

export function generateWpscanCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'wpscan')
  if (!tool) {
    throw new Error('WPScan tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetUrl(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'wpscan',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

export function generateGobusterCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'gobuster')
  if (!tool) {
    throw new Error('Gobuster tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetUrl(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'gobuster',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

export function generateWhatwebCommand(target: string, flags?: string[]): Command {
  const tool = SECURITY_TOOLS.find(t => t.id === 'whatweb')
  if (!tool) {
    throw new Error('Whatweb tool configuration not found')
  }
  const sanitizedTarget = sanitizeTargetUrl(target)
  const sanitizedFlags = flags ? sanitizeFlags(flags) : tool.default_flags

  return {
    tool: 'whatweb',
    target: sanitizedTarget,
    flags: sanitizedFlags,
    timeout: tool.max_execution_time
  }
}

// Main routing function
export function routeToolCommand(toolName: string, target: string, customFlags?: string[]): Command {
  const tool = toolName.toLowerCase().trim()

  switch (tool) {
    case 'nmap':
      return generateNmapCommand(target, customFlags)
    case 'nikto':
      return generateNiktoCommand(target, customFlags)
    case 'sqlmap':
      return generateSqlmapCommand(target, customFlags)
    case 'wpscan':
      return generateWpscanCommand(target, customFlags)
    case 'gobuster':
      return generateGobusterCommand(target, customFlags)
    case 'whatweb':
      return generateWhatwebCommand(target, customFlags)
    default:
      throw new Error(`Tool '${toolName}' is not supported or not found`)
  }
}

// Command to shell string conversion
export function commandToShellString(command: Command): string {
  const tool = SECURITY_TOOLS.find(t => t.id === command.tool)
  if (!tool) {
    throw new Error(`Tool ${command.tool} not found`)
  }

  let shellCommand = command.tool

  // Add flags
  if (command.flags && command.flags.length > 0) {
    shellCommand += ` ${command.flags.join(' ')}`
  }

  // Add target (varies by tool)
  switch (command.tool) {
    case 'nmap':
    case 'masscan':
    case 'whatweb':
      shellCommand += ` ${command.target}`
      break
    case 'nikto':
      shellCommand += ` -h ${command.target}`
      break
    case 'sqlmap':
      shellCommand += ` -u ${command.target}`
      break
    case 'wpscan':
      shellCommand += ` --url ${command.target}`
      break
    case 'gobuster':
      shellCommand += ` -u ${command.target}`
      break
    default:
      shellCommand += ` ${command.target}`
  }

  // Add timeout wrapper
  if (command.timeout) {
    shellCommand = `timeout ${command.timeout}s ${shellCommand}`
  }

  return shellCommand
}

export function commandToToolString(command: Command): string {
  const tool = SECURITY_TOOLS.find(t => t.id === command.tool)
  if (!tool) {
    throw new Error(`Tool ${command.tool} not found`)
  }

  let shellCommand = command.tool

  if (command.flags && command.flags.length > 0) {
    shellCommand += ` ${command.flags.join(' ')}`
  }

  switch (command.tool) {
    case 'nmap':
    case 'masscan':
    case 'whatweb':
      shellCommand += ` ${command.target}`
      break
    case 'nikto':
      shellCommand += ` -h ${command.target}`
      break
    case 'sqlmap':
      shellCommand += ` -u ${command.target}`
      break
    case 'wpscan':
      shellCommand += ` --url ${command.target}`
      break
    case 'gobuster':
      shellCommand += ` -u ${command.target}`
      break
    default:
      shellCommand += ` ${command.target}`
  }

  return shellCommand
}

// AI prompt interpretation
export interface AICommandSuggestion {
  tool: string
  target: string
  reasoning: string
  confidence: number // 0-1
  flags?: string[]
  estimated_time: number
  risk_assessment: string
}

export function parseAIResponse(aiResponse: string): AICommandSuggestion[] {
  // This would typically parse structured AI output
  // For now, we'll provide a basic implementation
  const suggestions: AICommandSuggestion[] = []

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(aiResponse)
    if (Array.isArray(parsed)) {
      return parsed.map(suggestion => ({
        ...suggestion,
        confidence: Math.min(Math.max(suggestion.confidence || 0.5, 0), 1)
      }))
    }
  } catch {
    // If not JSON, try to extract tools from text
    const toolMentions = aiResponse.match(/(?:use|run|execute|try)\s+(nmap|nikto|sqlmap|wpscan|gobuster|whatweb)/gi)
    const targetMentions = aiResponse.match(/(?:target|scan|test)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)

    if (toolMentions && targetMentions) {
      const tool = toolMentions[0].split(/\s+/).pop()?.toLowerCase() || 'nmap'
      const target = targetMentions[0].split(/\s+/).pop() || 'example.com'

      suggestions.push({
        tool,
        target,
        reasoning: 'Extracted from AI response text',
        confidence: 0.7,
        estimated_time: SECURITY_TOOLS.find(t => t.id === tool)?.max_execution_time || 300,
        risk_assessment: SECURITY_TOOLS.find(t => t.id === tool)?.risk_level || 'medium'
      })
    }
  }

  return suggestions
}

export function validateCommand(command: Command): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    CommandSchema.parse(command)
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => e.message))
    }
  }

  // Additional custom validations
  const tool = SECURITY_TOOLS.find(t => t.id === command.tool)
  if (!tool) {
    errors.push(`Tool ${command.tool} is not supported`)
  }

  if (command.timeout && command.timeout > 1800) {
    errors.push('Timeout cannot exceed 30 minutes')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Get tool information
export function getToolInfo(toolId: string): SecurityTool | undefined {
  return SECURITY_TOOLS.find(tool => tool.id === toolId)
}

export function getAllTools(): SecurityTool[] {
  return SECURITY_TOOLS
}

export function getToolsByCategory(category: SecurityTool['category']): SecurityTool[] {
  return SECURITY_TOOLS.filter(tool => tool.category === category)
}

export function getToolsByRiskLevel(riskLevel: SecurityTool['risk_level']): SecurityTool[] {
  return SECURITY_TOOLS.filter(tool => tool.risk_level === riskLevel)
}
