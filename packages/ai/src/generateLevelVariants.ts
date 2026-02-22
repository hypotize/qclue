import { openrouter, MODEL } from "./client";

export type LevelVariants = {
  basic: string;
  elementary: string;
  senior_elementary: string;
  junior_high: string;
  senior_high: string;
  adult: string;
};

export async function generateLevelVariants(
  baseText: string,
  language = "en"
): Promise<LevelVariants> {
  const response = await openrouter.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a treasure hunt clue writer. Given a base clue, rewrite it at six difficulty levels.
Return a JSON object with keys: basic, elementary, senior_elementary, junior_high, senior_high, adult.
- basic (ages 3-5): very simple, direct, uses easy words
- elementary (ages 6-8): simple, slightly less direct
- senior_elementary (ages 9-11): moderate vocabulary
- junior_high (ages 12-14): more wordplay, some indirection
- senior_high (ages 15-17): clever, indirect
- adult: cryptic, metaphorical, challenging
Write all clues in language: ${language}.`,
      },
      {
        role: "user",
        content: `Base clue: "${baseText}"`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  return JSON.parse(content) as LevelVariants;
}
