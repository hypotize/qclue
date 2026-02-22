import { openrouter, MODEL } from "./client";

export type TranslationInput = {
  clueText: string;
  hint1Text?: string;
  hint2Text?: string;
};

export type TranslationOutput = TranslationInput;

const SUPPORTED_LANGUAGES = ["ja", "fr", "es", "zh-Hans", "zh-Hant"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export async function translateContent(
  input: TranslationInput,
  targetLanguages: SupportedLanguage[] = [...SUPPORTED_LANGUAGES]
): Promise<Record<SupportedLanguage, TranslationOutput>> {
  const fields = Object.entries(input)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: "${v}"`)
    .join("\n");

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the given treasure hunt clue fields into the requested languages.
Return a JSON object keyed by language code, each containing the same field names as the input.
Preserve the tone and difficulty of the original. Languages: ${targetLanguages.join(", ")}.`,
      },
      {
        role: "user",
        content: fields,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");

  return JSON.parse(content) as Record<SupportedLanguage, TranslationOutput>;
}
