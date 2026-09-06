import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  cached = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  return cached;
}

export const hasAnthropic = () => Boolean(process.env.ANTHROPIC_API_KEY);
