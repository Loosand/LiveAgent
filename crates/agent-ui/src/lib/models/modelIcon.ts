export type ModelIconBrand =
  | "claude"
  | "cohere"
  | "deepseek"
  | "gemini"
  | "grok"
  | "meta"
  | "minimax"
  | "mistral"
  | "moonshot"
  | "openai"
  | "openrouter"
  | "perplexity"
  | "qwen"
  | "zai";

const MODEL_ICON_RULES: ReadonlyArray<readonly [ModelIconBrand, RegExp]> = [
  ["openai", /(?:^|[/_-])(?:chatgpt|codex|dall-e|gpt|o1|o3|o4|whisper)(?:[/_-]|$)|openai/iu],
  ["claude", /anthropic|claude/iu],
  ["deepseek", /deepseek/iu],
  ["grok", /(?:^|[/_-])grok(?:[/_-]|$)|xai/iu],
  ["gemini", /gemini|gemma/iu],
  ["qwen", /qwen|qvq|qwq|tongyi/iu],
  ["meta", /(?:^|[/_-])(?:llama|meta)(?:[/_-]|$)/iu],
  ["mistral", /codestral|mistral|mixtral|pixtral/iu],
  ["moonshot", /kimi|moonshot/iu],
  ["zai", /(?:^|[/_-])glm(?:[/_-]|$)|zai/iu],
  ["minimax", /abab|minimax/iu],
  ["perplexity", /perplexity|sonar/iu],
  ["cohere", /cohere|command-r/iu],
  ["openrouter", /openrouter/iu],
];

/** Resolve a model family using the same ordered matching rules as Tessera. */
export function resolveModelIconBrand(
  ...sources: ReadonlyArray<string | null | undefined>
): ModelIconBrand | null {
  const candidate = sources.filter(Boolean).join("/");
  if (!candidate) return null;
  return MODEL_ICON_RULES.find(([, pattern]) => pattern.test(candidate))?.[0] ?? null;
}
