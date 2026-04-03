#!/bin/bash
# Mock agent script for local development
# Simulates run-agent.sh behavior with streaming output

AGENT_NAME="${2:-mock-agent}"
MODE="${3:-run}"

echo "[aios-mock] Starting agent: $AGENT_NAME (mode: $MODE)"
echo "[aios-mock] Project: $1"
echo ""

sleep 1
echo "[agent] Loading context..."
sleep 0.5
echo "[agent] Reading AIOS quality criteria..."
sleep 0.5
echo "[agent] Scanning for relevant files..."
echo ""

sleep 1
echo "## Report: $AGENT_NAME ($MODE)"
echo ""
echo "### Actions Taken"
echo "- Checked system status: all healthy"
echo "- Validated 3 items against criteria"
echo "- No issues found"
echo ""

sleep 0.5
echo "### Summary"
echo "All checks passed. No action required."
echo ""
echo "---"
echo "Total cost: \$0.0042"
echo "Input tokens: 1500"
echo "Output tokens: 800"
echo "Model: claude-sonnet-4-6"

exit 0
