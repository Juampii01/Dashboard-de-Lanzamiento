import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<string> {
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<T> {
  const text = await callClaude(systemPrompt, userPrompt, maxTokens);

  // Extraer JSON del bloque de código si viene envuelto en ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
  const rawJson = jsonMatch ? jsonMatch[1] : text;

  return JSON.parse(rawJson.trim()) as T;
}
