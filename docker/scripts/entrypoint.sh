#!/bin/bash
# Pentriarch AI Security Scanner Container Entrypoint
# Safe validation (no early exit), DEBUG mode, and optional tool blocks.

# Strict mode for the overall script
set -euo pipefail

# Optional: verbose debug (run container with -e DEBUG=1 to enable)
if [[ "${DEBUG:-0}" == "1" ]]; then
  set -x
fi

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# Banner
echo -e "${BLUE}🛡️  Pentriarch AI Security Scanner${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# ----- helpers -----
check_tool() {
  local tool=$1
  local description=$2
  if command -v "$tool" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ $tool${NC} - $description"
    return 0
  else
    echo -e "${RED}❌ $tool${NC} - $description (NOT FOUND)"
    return 1
  fi
}

validate_tools() {
  echo -e "${YELLOW}🔍 Validating Security Tools...${NC}"
  echo ""

  # Do NOT exit the whole script if one tool is missing
  set +e

  local tools_count=0
  local tools_available=0

  # ── Network Discovery & Reconnaissance (MVP: nmap) ──
  echo -e "${BLUE}📡 Network Discovery & Reconnaissance:${NC}"
  ((tools_count++)); check_tool "nmap" "Network discovery and security auditing" && ((tools_available++)) || true
  # Optional (commented for MVP; uncomment when you need them)
  # ((tools_count++)); check_tool "masscan" "High-speed port scanner" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "zmap" "Internet-scale network scanner" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "theharvester" "Email/subdomain/host gathering" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "recon-ng" "Web reconnaissance framework" && ((tools_available++)) || true
  echo ""

  # ── Web Application Security (MVP: nikto, gobuster, whatweb) ──
  echo -e "${BLUE}🌐 Web Application Security:${NC}"
  ((tools_count++)); check_tool "nikto" "Web server vulnerability scanner" && ((tools_available++)) || true
  ((tools_count++)); check_tool "gobuster" "Directory/DNS brute-forcer" && ((tools_available++)) || true
  ((tools_count++)); check_tool "whatweb" "Web technology identification" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "ffuf" "Fast web fuzzer" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "wafw00f" "WAF detection tool" && ((tools_available++)) || true
  echo ""

  # ── DB & Injection (MVP: sqlmap) ──
  echo -e "${BLUE}🗃️  Database & Injection Testing:${NC}"
  ((tools_count++)); check_tool "sqlmap" "Automatic SQL injection tool" && ((tools_available++)) || true
  echo ""

  # ── Password / Hash (optional) ──
  echo -e "${BLUE}🔐 Password & Hash Cracking:${NC}"
  # ((tools_count++)); check_tool "hydra" "Network login cracker" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "john" "Password hash cracker" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "hashcat" "Advanced password recovery" && ((tools_available++)) || true
  echo ""

  # ── SSL/TLS (keep sslscan; others optional) ──
  echo -e "${BLUE}🔒 SSL/TLS Testing:${NC}"
  ((tools_count++)); check_tool "sslscan" "SSL/TLS configuration scanner" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "sslyze" "SSL configuration analyzer" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "testssl.sh" "SSL/TLS implementation tester" && ((tools_available++)) || true
  echo ""

  # ── Modern (optional) ──
  echo -e "${BLUE}⚡ Modern Security Tools:${NC}"
  # ((tools_count++)); check_tool "nuclei" "Vulnerability scanner" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "httpx" "HTTP probe utility" && ((tools_available++)) || true
  # ((tools_count++)); check_tool "subfinder" "Subdomain discovery" && ((tools_available++)) || true
  echo ""

  # Restore strict mode for rest of script
  set -e

  local percentage=0
  if [[ $tools_count -gt 0 ]]; then
    percentage=$(( tools_available * 100 / tools_count ))
  fi

  echo -e "${YELLOW}📊 Tools Summary:${NC}"
  echo -e "   Available: ${GREEN}$tools_available${NC}/$tools_count (${percentage}%)"
  if   [ $percentage -ge 90 ]; then echo -e "   Status: ${GREEN}✅ Excellent${NC}"
  elif [ $percentage -ge 75 ]; then echo -e "   Status: ${YELLOW}⚠️  Good${NC}"
  else                              echo -e "   Status: ${RED}❌ Poor${NC}"
  fi
  echo ""
}

show_system_info() {
  echo -e "${YELLOW}💻 System Information:${NC}"
  echo "   OS: $(grep PRETTY_NAME /etc/os-release | cut -d '\"' -f 2)"
  echo "   User: $(whoami)"
  echo "   Working Directory: $(pwd)"
  echo "   Python: $(python3 --version 2>/dev/null || echo 'Not available')"
  echo "   Go: $(go version 2>/dev/null | awk '{print $3}' || echo 'Not available')"
  echo ""
}

show_usage() {
  echo -e "${YELLOW}🚀 Usage Examples:${NC}"
  echo "   Basic Nmap scan:     nmap -sV target.com"
  echo "   Web vulnerability:   nikto -h target.com"
  echo "   Directory fuzzing:   gobuster dir -u target.com -w /usr/share/wordlists/dirb/common.txt"
  echo "   SQL injection:       sqlmap -u 'target.com/page?id=1' --batch"
  echo "   SSL testing:         sslscan target.com"
  # echo "   Nuclei scan:         nuclei -u target.com"
  echo ""
}

main() {
  # If a specific command is passed (not validate/help), run it
  if [ $# -gt 0 ] && [ "${1:-}" != "validate" ] && [ "${1:-}" != "help" ]; then
    echo -e "${GREEN}🏃 Executing: $*${NC}"
    echo ""
    exec "$@"
  fi

  case "${1:-}" in
    "validate") validate_tools ;;
    "help")     show_usage ;;
    *)
      show_system_info
      validate_tools
      show_usage
      # No args → drop to shell for convenience
      if [ $# -eq 0 ]; then
        echo -e "${GREEN}🐚 Starting interactive shell...${NC}"
        exec /bin/bash
      fi
      ;;
  esac
}

main "$@"
