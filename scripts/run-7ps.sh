#!/bin/bash
#
# run-7ps.sh - Execute 7PS (7 Parallel Sets) batch test run via API
#
# Usage:
#   ./scripts/run-7ps.sh --release <release_number> [options]
#
# Required:
#   --release, -r       Release number (e.g., 2.1.1)
#
# Optional:
#   --env, -e           Environment name (default: qa)
#   --api-url, -a       API base URL (default: http://localhost:3000)
#   --poll-interval     Polling interval in seconds (default: 5)
#   --timeout           Max wait time in seconds (default: 3600)
#   --quiet, -q         Suppress progress output
#   --json              Output final result as JSON
#   --help, -h          Show this help message
#
# Examples:
#   ./scripts/run-7ps.sh -r 2.1.1                # Uses qa environment by default
#   ./scripts/run-7ps.sh -r 2.1.1 -e dev         # Uses dev environment
#   ./scripts/run-7ps.sh -r 2.1.1 --env uat      # Uses uat environment
#   ./scripts/run-7ps.sh -r 2.1.1 -a http://10.0.0.1:3000
#   ./scripts/run-7ps.sh -r 2.1.1 --json --quiet # CI/CD mode

set -e

# Default values
API_URL="http://localhost:3000"
POLL_INTERVAL=5
TIMEOUT=3600
QUIET=false
JSON_OUTPUT=false
RELEASE=""
ENVIRONMENT="qa"  # Default environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    if [ "$QUIET" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

print_success() {
    if [ "$QUIET" = false ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

print_warning() {
    if [ "$QUIET" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_progress() {
    if [ "$QUIET" = false ]; then
        echo -e "${CYAN}[PROGRESS]${NC} $1"
    fi
}

# Show help
show_help() {
    head -25 "$0" | tail -23 | sed 's/^#//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--release)
            RELEASE="$2"
            shift 2
            ;;
        -e|--env|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--api-url)
            API_URL="$2"
            shift 2
            ;;
        --poll-interval)
            POLL_INTERVAL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$RELEASE" ]; then
    print_error "Release number is required. Use --release or -r"
    echo "Example: ./scripts/run-7ps.sh -r 2.1.1"
    exit 1
fi

# Check for required commands
command -v curl >/dev/null 2>&1 || { print_error "curl is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { print_error "jq is required but not installed."; exit 1; }

# Remove trailing slash from API_URL
API_URL="${API_URL%/}"

print_info "Starting 7PS batch execution..."
print_info "API URL: $API_URL"
print_info "Release: $RELEASE"
print_info "Environment: $ENVIRONMENT"
echo ""

# Step 1: Look up release ID by release number
print_info "Looking up release '$RELEASE'..."

RELEASE_RESPONSE=$(curl -s "${API_URL}/api/releases?search=${RELEASE}&limit=100")

# Check if request succeeded
if [ "$(echo "$RELEASE_RESPONSE" | jq -r '.success // false')" != "true" ]; then
    print_error "Failed to fetch releases from API"
    exit 1
fi

# Find exact match for release number
RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r --arg rel "$RELEASE" '.data[] | select(.release_number == $rel) | .id' | head -1)

if [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" = "null" ]; then
    echo ""
    print_error "Release '$RELEASE' not found!"
    echo ""
    echo -e "${YELLOW}Available releases:${NC}"
    echo "$RELEASE_RESPONSE" | jq -r '.data[] | "  - \(.release_number) (ID: \(.id))"' | head -10
    echo ""
    exit 1
fi

print_success "Found release '$RELEASE' (ID: $RELEASE_ID)"
echo ""

# Step 2: Start batch execution
print_info "Initiating batch execution..."

START_RESPONSE=$(curl -s -X POST \
    "${API_URL}/api/test-runs/execute-all" \
    -H "Content-Type: application/json" \
    -d "{\"releaseId\": ${RELEASE_ID}, \"environment\": \"${ENVIRONMENT}\"}")

# Check if request succeeded
SUCCESS=$(echo "$START_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" != "true" ]; then
    ERROR_MSG=$(echo "$START_RESPONSE" | jq -r '.error // "Unknown error"')

    # Check if it's an environment configuration error
    if echo "$ERROR_MSG" | grep -qi "not configured"; then
        echo ""
        print_error "Environment '${ENVIRONMENT}' is not configured!"
        echo ""
        echo -e "${YELLOW}To fix this:${NC}"
        echo -e "  1. Open the UAT DDT CMS in your browser"
        echo -e "  2. Go to ${CYAN}Settings${NC} page"
        echo -e "  3. Add the '${ENVIRONMENT}' environment with its URL"
        echo ""
        echo -e "Example URL format: ${CYAN}https://your-app-${ENVIRONMENT}.example.com${NC}"
        echo ""
        exit 1
    fi

    print_error "Failed to start batch execution: $ERROR_MSG"
    exit 1
fi

# Extract batch info
BATCH_ID=$(echo "$START_RESPONSE" | jq -r '.data.batchId')
TOTAL_SETS=$(echo "$START_RESPONSE" | jq -r '.data.totalSets')
TEST_RUN_IDS=$(echo "$START_RESPONSE" | jq -r '.data.testRunIds | join(", ")')

print_success "Batch execution started!"
print_info "Batch ID: ${PURPLE}${BATCH_ID}${NC}"
print_info "Total test sets: $TOTAL_SETS"
print_info "Test run IDs: $TEST_RUN_IDS"
echo ""

# Step 3: Poll for status until complete
print_info "Polling for execution status (interval: ${POLL_INTERVAL}s, timeout: ${TIMEOUT}s)..."
echo ""

START_TIME=$(date +%s)
LAST_STATUS=""

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    if [ $ELAPSED -ge $TIMEOUT ]; then
        print_error "Timeout reached after ${TIMEOUT}s"
        exit 1
    fi

    # Get batch status
    STATUS_RESPONSE=$(curl -s "${API_URL}/api/test-runs/batch/${BATCH_ID}/status")

    # Check if we got a valid response
    if [ -z "$STATUS_RESPONSE" ] || [ "$(echo "$STATUS_RESPONSE" | jq -r '.success // false')" != "true" ]; then
        print_warning "Failed to get status, retrying..."
        sleep "$POLL_INTERVAL"
        continue
    fi

    # Extract status info
    BATCH_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status // "unknown"')
    COMPLETED_SETS=$(echo "$STATUS_RESPONSE" | jq -r '.data.completedSets // 0')
    PASSED_SETS=$(echo "$STATUS_RESPONSE" | jq -r '.data.passedSets // 0')
    FAILED_SETS=$(echo "$STATUS_RESPONSE" | jq -r '.data.failedSets // 0')

    # Build progress string
    PROGRESS_MSG="Status: ${BATCH_STATUS} | Completed: ${COMPLETED_SETS}/${TOTAL_SETS} | Passed: ${PASSED_SETS} | Failed: ${FAILED_SETS} | Elapsed: ${ELAPSED}s"

    # Only print if status changed
    if [ "$PROGRESS_MSG" != "$LAST_STATUS" ]; then
        print_progress "$PROGRESS_MSG"
        LAST_STATUS="$PROGRESS_MSG"
    fi

    # Check if batch is complete
    if [ "$BATCH_STATUS" = "completed" ] || [ "$BATCH_STATUS" = "failed" ]; then
        break
    fi

    sleep "$POLL_INTERVAL"
done

echo ""

# Step 4: Get final detailed results
print_info "Fetching final results..."

DETAILS_RESPONSE=$(curl -s "${API_URL}/api/test-runs/batch/${BATCH_ID}/details")

if [ "$(echo "$DETAILS_RESPONSE" | jq -r '.success // false')" != "true" ]; then
    print_error "Failed to fetch batch details"
    exit 1
fi

# Extract final results
FINAL_STATUS=$(echo "$DETAILS_RESPONSE" | jq -r '.data.status')
RELEASE_NUMBER=$(echo "$DETAILS_RESPONSE" | jq -r '.data.releaseNumber')
TOTAL_DURATION_MS=$(echo "$DETAILS_RESPONSE" | jq -r '.data.totalDurationMs // 0')
TOTAL_DURATION_SEC=$((TOTAL_DURATION_MS / 1000))
PASSED_SETS=$(echo "$DETAILS_RESPONSE" | jq -r '.data.passedSets')
FAILED_SETS=$(echo "$DETAILS_RESPONSE" | jq -r '.data.failedSets')
COMPLETED_SETS=$(echo "$DETAILS_RESPONSE" | jq -r '.data.completedSets')
STARTED_AT=$(echo "$DETAILS_RESPONSE" | jq -r '.data.startedAt')
COMPLETED_AT=$(echo "$DETAILS_RESPONSE" | jq -r '.data.completedAt')

# Output JSON if requested
if [ "$JSON_OUTPUT" = true ]; then
    echo "$DETAILS_RESPONSE" | jq '.data'
    exit 0
fi

# Print summary
echo ""
echo "=============================================="
echo "           7PS BATCH EXECUTION SUMMARY"
echo "=============================================="
echo ""
echo -e "Release:       ${CYAN}${RELEASE_NUMBER}${NC}"
echo -e "Environment:   ${CYAN}${ENVIRONMENT}${NC}"
echo -e "Batch ID:      ${PURPLE}${BATCH_ID}${NC}"
echo ""
echo -e "Started at:    $STARTED_AT"
echo -e "Completed at:  $COMPLETED_AT"
echo -e "Duration:      ${TOTAL_DURATION_SEC}s"
echo ""
echo "----------------------------------------------"
echo "                   RESULTS"
echo "----------------------------------------------"
echo ""
echo -e "Total Sets:    ${TOTAL_SETS}"
echo -e "Completed:     ${COMPLETED_SETS}"
echo -e "Passed:        ${GREEN}${PASSED_SETS}${NC}"
echo -e "Failed:        ${RED}${FAILED_SETS}${NC}"
echo ""

# Print individual test set results
echo "----------------------------------------------"
echo "              TEST SET DETAILS"
echo "----------------------------------------------"
echo ""

echo "$DETAILS_RESPONSE" | jq -r '.data.testRuns[] | "\(.testSetName)|\(.status)|\(.passedSteps)|\(.failedSteps)|\(.totalSteps)|\(.durationMs)"' | while IFS='|' read -r name status passed failed total duration; do
    duration_sec=$((duration / 1000))

    if [ "$status" = "passed" ]; then
        status_color="${GREEN}PASSED${NC}"
    elif [ "$status" = "failed" ]; then
        status_color="${RED}FAILED${NC}"
    else
        status_color="${YELLOW}${status}${NC}"
    fi

    echo -e "  ${name}"
    echo -e "    Status: ${status_color} | Steps: ${passed}/${total} passed | Duration: ${duration_sec}s"
    echo ""
done

echo "=============================================="

# Exit with appropriate code
if [ "$FINAL_STATUS" = "failed" ]; then
    print_error "Batch execution completed with failures"
    exit 1
else
    print_success "Batch execution completed successfully!"
    exit 0
fi
