import type { Context } from '@netlify/functions';
import { generateText } from './_shared/gemini.ts';
import { getClientById } from './_shared/clients.ts';
import { DIRECTOR_SYSTEM_PROMPT } from './_shared/prompts.ts';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { memo, clientId, feedback } = await req.json();
    const client = getClientById(clientId);

    let userPrompt = `## クライアント情報\n`;
    if (client) {
      userPrompt += `- 名前: ${client.name}\n`;
      userPrompt += `- トーン: ${client.tone.style}\n`;
      userPrompt += `- 一人称: ${client.tone.firstPerson}\n`;
      userPrompt += `- 読者呼称: ${client.tone.readerAddress}\n`;
      userPrompt += `- テーマカラー: メイン ${client.theme.primary}, アクセント ${client.theme.accent}\n`;
      if (client.prohibitedWords.length > 0) {
        userPrompt += `- 禁止ワード: ${client.prohibitedWords.join(', ')}\n`;
      }
      if (client.requiredTerms.length > 0) {
        userPrompt += `- 必須用語: ${client.requiredTerms.join(', ')}\n`;
      }
      if (client.achievements.length > 0) {
        userPrompt += `- 実績: ${client.achievements.join(' / ')}\n`;
      }
    }

    userPrompt += `\n## ユーザーのメモ\n${memo}\n`;

    if (feedback) {
      userPrompt += `\n## 前回の評価フィードバック（修正してください）\n${feedback}\n`;
    }

    const result = await generateText(userPrompt, DIRECTOR_SYSTEM_PROMPT);

    const imageSlideIndices: number[] = [];
    const lines = result.split('\n');
    let currentSlideIndex = -1;
    for (const line of lines) {
      const slideMatch = line.match(/###\s*スライド(\d+)/);
      if (slideMatch) {
        currentSlideIndex = parseInt(slideMatch[1], 10) - 1;
      }
      if (line.includes('image_full') && line.includes('画像生成') && currentSlideIndex >= 0) {
        if (!imageSlideIndices.includes(currentSlideIndex)) {
          imageSlideIndices.push(currentSlideIndex);
        }
      }
    }

    const slideCountMatch = result.match(/総スライド数[:：]\s*(\d+)/);
    const slideCount = slideCountMatch ? parseInt(slideCountMatch[1], 10) : lines.filter((l) => l.match(/###\s*スライド\d+/)).length;

    return new Response(
      JSON.stringify({
        structure: result,
        slideCount,
        imageSlideIndices,
      }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders() });
  }
};

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
