interface ParsedCost {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string | null;
}

/**
 * Parse cost information from Claude CLI verbose output.
 *
 * Claude CLI with --verbose outputs lines like:
 *   Total cost: $0.042
 *   Input tokens: 5000
 *   Output tokens: 2000
 *
 * Claude CLI with --output-format stream-json emits result events:
 *   {"type":"result","cost_usd":0.042,"usage":{"input_tokens":5000,"output_tokens":2000}}
 */
export function parseCostFromLog(log: string): ParsedCost {
  const result: ParsedCost = {
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    model: null,
  };

  // Try stream-json result event first (most accurate)
  const resultMatch = log.match(/"type"\s*:\s*"result"[^}]*"usage"\s*:\s*\{[^}]+\}/);
  if (resultMatch) {
    try {
      // Find the complete JSON object containing the result
      const fullLine = findJsonLine(log, "result");
      if (fullLine) {
        const parsed = JSON.parse(fullLine);
        result.tokensIn = parsed.usage?.input_tokens ?? 0;
        result.tokensOut = parsed.usage?.output_tokens ?? 0;
        result.costUsd = parsed.total_cost_usd ?? parsed.cost_usd ?? 0;
        result.model = parsed.model ?? null;
        return result;
      }
    } catch {
      // Fall through to regex parsing
    }
  }

  // Fallback: parse verbose text output
  const costMatch = log.match(/Total cost:\s*\$?([\d.]+)/i);
  if (costMatch) {
    result.costUsd = parseFloat(costMatch[1]!);
  }

  const inputMatch = log.match(/Input tokens:\s*([\d,]+)/i);
  if (inputMatch) {
    result.tokensIn = parseInt(inputMatch[1]!.replace(/,/g, ""), 10);
  }

  const outputMatch = log.match(/Output tokens:\s*([\d,]+)/i);
  if (outputMatch) {
    result.tokensOut = parseInt(outputMatch[1]!.replace(/,/g, ""), 10);
  }

  const modelMatch = log.match(/Model:\s*(claude-[\w-]+)/i);
  if (modelMatch) {
    result.model = modelMatch[1]!;
  }

  return result;
}

function findJsonLine(log: string, type: string): string | null {
  const lines = log.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.includes(`"type":"${type}"`) || trimmed.includes(`"type": "${type}"`)) {
      try {
        JSON.parse(trimmed);
        return trimmed;
      } catch {
        // Not valid JSON, skip
      }
    }
  }
  return null;
}
