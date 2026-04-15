import type { Context } from '@netlify/functions';
import { generateText } from './_shared/gemini.ts';
import { getClientById } from './_shared/clients.ts';
import { BUILDER_SYSTEM_PROMPT } from './_shared/prompts.ts';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { structure, images, clientId } = await req.json();
    const client = getClientById(clientId);

    const themeColors = client
      ? {
          primary: client.theme.primary,
          secondary: '#16213e',
          accent: '#0f3460',
          highlight: client.theme.accent,
          text: '#ffffff',
          textDark: '#333333',
          background: client.theme.background,
          lightBg: '#f5f5f5',
        }
      : undefined;

    let userPrompt = `以下の構成案をスライドJSONに変換してください。\n\n## 構成案\n${structure}\n`;

    if (themeColors) {
      userPrompt += `\n## テーマカラー\n${JSON.stringify(themeColors, null, 2)}\n`;
    }

    if (client) {
      userPrompt += `\n## プレゼンター情報\n- 名前: ${client.name}\n- 肩書: ${client.title}\n`;
    }

    const result = await generateText(userPrompt, BUILDER_SYSTEM_PROMPT);

    let json;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      json = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      json = null;
    }

    if (!json || !json.slides) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate valid JSON from structure' }),
        { status: 500, headers: corsHeaders() }
      );
    }

    if (images && Array.isArray(images)) {
      for (const img of images) {
        const slideIdx = img.slideIndex;
        if (slideIdx >= 0 && slideIdx < json.slides.length) {
          const slide = json.slides[slideIdx];
          if (slide.type === 'image_full') {
            slide.image_base64 = img.base64;
            slide.image_mime = img.mime || 'image/png';
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        json,
        slideCount: json.slides.length,
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
