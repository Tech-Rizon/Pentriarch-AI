#!/bin/bash

# Pentriarch AI Security Scanner Container Test Suite
# Comprehensive testing for container functionality and security tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="pentriarch/kali-scanner:latest"
TEST_TARGET="scanme.nmap.org"  # Safe testing target
CONTAINER_NAME="pentriarch-test-$(date +%s)"

# Test results tracking
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to log test results
log_test() {
    local test_name="$1"
    local result="$2"
    local message="$3"

    ((TESTS_TOTAL++))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name: $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name: $message"
        ((TESTS_FAILED++))
    fi
}

# Function to run container command and check result
run_container_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    local timeout="${4:-30}"

    echo -e "${BLUE}🔍 Testing: $test_name${NC}"

    if timeout "$timeout" docker run --rm --name "$CONTAINER_NAME-$(date +%s)" "$IMAGE_NAME" $command > /tmp/test_output 2>&1; then
        if grep -q "$expected_pattern" /tmp/test_output; then
            log_test "$test_name" "PASS" "Command executed successfully and output matches pattern"
        else
            log_test "$test_name" "FAIL" "Command executed but output doesn't match expected pattern"
            echo "Expected pattern: $expected_pattern"
            echo "Actual output:"
            cat /tmp/test_output | head -10
        fi
    else
        log_test "$test_name" "FAIL" "Command failed to execute or timed out"
        echo "Command output:"
        cat /tmp/test_output | head -10
    fi

    echo ""
}

# Function to test tool availability
test_tool_availability() {
    local tool="$1"
    local test_args="$2"

    run_container_test "Tool Available: $tool" "$tool $test_args" "$tool"
}

# Main test execution
main() {
    echo -e "${BLUE}🛡️  Pentriarch AI Security Scanner Container Test Suite${NC}"
    echo -e "${BLUE}======================================================${NC}"
    echo ""

    # Check if Docker is available
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not available. Please install Docker first.${NC}"
        exit 1
    fi

    # Check if image exists
    if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Image $IMAGE_NAME not found. Building it first...${NC}"
        cd "$(dirname "$0")"
        ./build.sh
        echo ""
    fi

    echo -e "${YELLOW}🚀 Starting container tests...${NC}"
    echo ""

    # Test 1: Container starts successfully
    echo -e "${BLUE}🔍 Testing: Container Startup${NC}"
    if docker run --rm --name "$CONTAINER_NAME-startup" "$IMAGE_NAME" echo "Container test" > /tmp/test_output 2>&1; then
        log_test "Container Startup" "PASS" "Container starts and executes commands successfully"
    else
        log_test "Container Startup" "FAIL" "Container failed to start"
        cat /tmp/test_output
    fi
    echo ""

    # Test 2: Tool validation
    run_container_test "Tool Validation" "validate" "Tools Summary"

    # Test 3: Network tools
    echo -e "${YELLOW}📡 Testing Network Discovery Tools...${NC}"
    test_tool_availability "nmap" "--version"
    test_tool_availability "masscan" "--version"
    run_container_test "Nmap Basic Scan" "nmap -sn $TEST_TARGET" "$TEST_TARGET"

    # Test 4: Web application tools
    echo -e "${YELLOW}🌐 Testing Web Application Tools...${NC}"
    test_tool_availability "nikto" "-Version"
    test_tool_availability "gobuster" "version"
    test_tool_availability "whatweb" "--version"
    run_container_test "Whatweb Scan" "whatweb $TEST_TARGET" "Whatweb"

    # Test 5: Modern security tools
    echo -e "${YELLOW}⚡ Testing Modern Security Tools...${NC}"
    test_tool_availability "nuclei" "-version"
    test_tool_availability "httpx" "-version"
    test_tool_availability "subfinder" "-version"

    # Test 6: Database tools
    echo -e "${YELLOW}🗃️  Testing Database Tools...${NC}"
    test_tool_availability "sqlmap" "--version"

    # Test 7: Password tools
    echo -e "${YELLOW}🔐 Testing Password Tools...${NC}"
    test_tool_availability "hydra" "-h"
    test_tool_availability "john" "--list=formats"

    # Test 8: SSL/TLS tools
    echo -e "${YELLOW}🔒 Testing SSL/TLS Tools...${NC}"
    test_tool_availability "sslscan" "--version"
    test_tool_availability "sslyze" "--version"
    run_container_test "SSL Scan" "sslscan $TEST_TARGET" "Testing SSL server"

    # Test 9: Python tools
    echo -e "${YELLOW}🐍 Testing Python Environment...${NC}"
    run_container_test "Python Version" "python3 --version" "Python 3"
    run_container_test "Python Packages" "python3 -c 'import requests, nmap; print(\"Packages OK\")'" "Packages OK"

    # Test 10: Go tools
    echo -e "${YELLOW}🔷 Testing Go Environment...${NC}"
    run_container_test "Go Version" "go version" "go version"

    # Test 11: System utilities
    echo -e "${YELLOW}🛠️  Testing System Utilities...${NC}"
    run_container_test "Network Tools" "ping -c 1 8.8.8.8" "1 packets transmitted"
    run_container_test "DNS Tools" "nslookup google.com" "google.com"

    # Test 12: User permissions
    echo -e "${YELLOW}👤 Testing User Permissions...${NC}"
    run_container_test "Non-root User" "whoami" "scanner"
    run_container_test "Home Directory" "pwd" "/app"

    # Test 13: Interactive mode
    echo -e "${YELLOW}💬 Testing Interactive Features...${NC}"
    run_container_test "Help Command" "help" "Usage Examples"

    # Test Summary
    echo ""
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo -e "${BLUE}===============${NC}"
    echo -e "Total Tests: $TESTS_TOTAL"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "Status: ${GREEN}✅ ALL TESTS PASSED${NC}"
        echo ""
        echo -e "${GREEN}🎉 Pentriarch AI Security Scanner Container is fully functional!${NC}"
        exit 0
    else
        local success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
        echo -e "Success Rate: $success_rate%"

        if [ $success_rate -ge 80 ]; then
            echo -e "Status: ${YELLOW}⚠️  MOSTLY FUNCTIONAL${NC}"
        else
            echo -e "Status: ${RED}❌ NEEDS ATTENTION${NC}"
        fi
        exit 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up test containers...${NC}"
    docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | xargs -r docker rm -f
    rm -f /tmp/test_output
}

# Set up cleanup trap
trap cleanup EXIT

# Execute main function
main "$@"
