import type { Context } from '@netlify/functions';
import { generateImage } from './_shared/gemini.ts';
import { buildDesignerPrompt } from './_shared/prompts.ts';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { slideIndex, designInstruction, themeColors } = await req.json();

    if (typeof slideIndex !== 'number' || !designInstruction) {
      return new Response(JSON.stringify({ error: 'slideIndex and designInstruction are required' }), { status: 400, headers: corsHeaders() });
    }

    const prompt = buildDesignerPrompt(designInstruction, themeColors);
    const { base64, mimeType } = await generateImage(prompt);

    return new Response(
      JSON.stringify({
        slideIndex,
        imageBase64: base64,
        mimeType,
      }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, slideIndex: -1 }),
      { status: 500, headers: corsHeaders() }
    );
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
