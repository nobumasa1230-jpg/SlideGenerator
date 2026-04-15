import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const ai = getGeminiClient();
  const contents = [{ role: 'user' as const, parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  return response.text ?? '';
}

export async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const ai = getGeminiClient();

  const systemPrompt =
    'You are an expert infographic designer. ' +
    'Create a visually stunning widescreen (16:9 aspect ratio) infographic image. ' +
    'The image MUST be in 16:9 landscape format (e.g. 1280x720 or 1920x1080). ' +
    'Use a dark blue (#1a1a2e) background with gold (#c8a45a) accents. ' +
    'All text in the image MUST be in Japanese. ' +
    'Use clean, modern typography with Noto Sans JP style. ' +
    'Include data visualizations, icons, and clear visual hierarchy. ' +
    'The design should be professional and suitable for business presentations.';

  const fullPrompt = systemPrompt + '\n\nCreate an infographic about: ' + prompt;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user' as const, parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates in Gemini image response');
  }

  for (const part of candidates[0].content?.parts ?? []) {
    if (part.inlineData) {
      const data = part.inlineData.data;
      const mimeType = part.inlineData.mimeType ?? 'image/png';
      if (data) {
        return { base64: data, mimeType };
      }
    }
  }

  throw new Error('No image data in Gemini response');
}
