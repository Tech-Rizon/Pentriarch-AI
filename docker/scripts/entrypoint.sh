#!/bin/bash

# Pentriarch AI Security Scanner Container Entrypoint
# Enhanced entrypoint with tool validation and status reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}🛡️  Pentriarch AI Security Scanner${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Function to check if a tool is available
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

# Function to validate tools
validate_tools() {
    echo -e "${YELLOW}🔍 Validating Security Tools...${NC}"
    echo ""

    local tools_count=0
    local tools_available=0

    # Network Discovery & Reconnaissance
    echo -e "${BLUE}📡 Network Discovery & Reconnaissance:${NC}"
    ((tools_count++)); check_tool "nmap" "Network discovery and security auditing" && ((tools_available++))
    ((tools_count++)); check_tool "masscan" "High-speed port scanner" && ((tools_available++))
    ((tools_count++)); check_tool "zmap" "Internet-scale network scanner" && ((tools_available++))
    ((tools_count++)); check_tool "theharvester" "Email/subdomain/host gathering" && ((tools_available++))
    ((tools_count++)); check_tool "recon-ng" "Web reconnaissance framework" && ((tools_available++))
    echo ""

    # Web Application Security
    echo -e "${BLUE}🌐 Web Application Security:${NC}"
    ((tools_count++)); check_tool "nikto" "Web server vulnerability scanner" && ((tools_available++))
    ((tools_count++)); check_tool "whatweb" "Web technology identification" && ((tools_available++))
    ((tools_count++)); check_tool "gobuster" "Directory/DNS brute-forcer" && ((tools_available++))
    ((tools_count++)); check_tool "ffuf" "Fast web fuzzer" && ((tools_available++))
    ((tools_count++)); check_tool "wafw00f" "WAF detection tool" && ((tools_available++))
    echo ""

    # Database & Injection Testing
    echo -e "${BLUE}🗃️  Database & Injection Testing:${NC}"
    ((tools_count++)); check_tool "sqlmap" "Automatic SQL injection tool" && ((tools_available++))
    echo ""

    # Password & Hash Cracking
    echo -e "${BLUE}🔐 Password & Hash Cracking:${NC}"
    ((tools_count++)); check_tool "hydra" "Network login cracker" && ((tools_available++))
    ((tools_count++)); check_tool "john" "Password hash cracker" && ((tools_available++))
    ((tools_count++)); check_tool "hashcat" "Advanced password recovery" && ((tools_available++))
    echo ""

    # SSL/TLS Testing
    echo -e "${BLUE}🔒 SSL/TLS Testing:${NC}"
    ((tools_count++)); check_tool "sslscan" "SSL/TLS configuration scanner" && ((tools_available++))
    ((tools_count++)); check_tool "sslyze" "SSL configuration analyzer" && ((tools_available++))
    ((tools_count++)); check_tool "testssl.sh" "SSL/TLS implementation tester" && ((tools_available++))
    echo ""

    # Modern Security Tools
    echo -e "${BLUE}⚡ Modern Security Tools:${NC}"
    ((tools_count++)); check_tool "nuclei" "Vulnerability scanner" && ((tools_available++))
    ((tools_count++)); check_tool "httpx" "HTTP probe utility" && ((tools_available++))
    ((tools_count++)); check_tool "subfinder" "Subdomain discovery" && ((tools_available++))
    echo ""

    # Summary
    local percentage=$((tools_available * 100 / tools_count))
    echo -e "${YELLOW}📊 Tools Summary:${NC}"
    echo -e "   Available: ${GREEN}$tools_available${NC}/$tools_count (${percentage}%)"

    if [ $percentage -ge 90 ]; then
        echo -e "   Status: ${GREEN}✅ Excellent${NC}"
    elif [ $percentage -ge 75 ]; then
        echo -e "   Status: ${YELLOW}⚠️  Good${NC}"
    else
        echo -e "   Status: ${RED}❌ Poor${NC}"
    fi
    echo ""
}

# Function to show system information
show_system_info() {
    echo -e "${YELLOW}💻 System Information:${NC}"
    echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d '"' -f 2)"
    echo "   User: $(whoami)"
    echo "   Working Directory: $(pwd)"
    echo "   Python: $(python3 --version 2>/dev/null || echo 'Not available')"
    echo "   Go: $(go version 2>/dev/null | cut -d ' ' -f 3 || echo 'Not available')"
    echo ""
}

# Function to show usage examples
show_usage() {
    echo -e "${YELLOW}🚀 Usage Examples:${NC}"
    echo "   Basic Nmap scan:     nmap -sV target.com"
    echo "   Web vulnerability:   nikto -h target.com"
    echo "   Directory fuzzing:   gobuster dir -u target.com -w /usr/share/wordlists/dirb/common.txt"
    echo "   SQL injection:       sqlmap -u 'target.com/page?id=1' --batch"
    echo "   SSL testing:         testssl.sh target.com"
    echo "   Nuclei scan:         nuclei -u target.com"
    echo ""
}

# Main execution flow
main() {
    # If specific command is passed, execute it directly
    if [ $# -gt 0 ] && [ "$1" != "validate" ] && [ "$1" != "help" ]; then
        echo -e "${GREEN}🏃 Executing: $*${NC}"
        echo ""
        exec "$@"
    fi

    # Handle special commands
    case "${1:-}" in
        "validate")
            validate_tools
            ;;
        "help")
            show_usage
            ;;
        *)
            # Default behavior: show info and validate
            show_system_info
            validate_tools
            show_usage

            # If no arguments, start interactive shell
            if [ $# -eq 0 ]; then
                echo -e "${GREEN}🐚 Starting interactive shell...${NC}"
                exec /bin/bash
            fi
            ;;
    esac
}

# Execute main function
main "$@"
