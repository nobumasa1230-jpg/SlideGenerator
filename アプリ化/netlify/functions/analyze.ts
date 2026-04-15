import type { Context } from '@netlify/functions';
import { generateText } from './_shared/gemini.js';
import { getClients, getClientById, detectClientFromMemo } from './_shared/clients.js';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { memo, clientId } = await req.json();

    if (!memo || typeof memo !== 'string') {
      return new Response(JSON.stringify({ error: 'memo is required' }), { status: 400, headers: corsHeaders() });
    }
    if (memo.length > 10000) {
      return new Response(JSON.stringify({ error: 'memo is too long (max 10000 chars)' }), { status: 400, headers: corsHeaders() });
    }

    let detectedClient = clientId ? getClientById(clientId) : detectClientFromMemo(memo);

    if (!detectedClient) {
      const clientList = getClients().map((c) => `${c.id}: ${c.name}`).join(', ');
      const prompt = `以下のメモから、クライアントを推定してください。\n\nクライアント一覧: ${clientList}\n\nメモ:\n${memo}\n\n最も適切なクライアントのIDを1つだけ回答してください（例: goto）。推定できない場合は "goto" と回答してください。IDのみを回答し、それ以外のテキストは不要です。`;
      const result = await generateText(prompt);
      const guessedId = result.trim().toLowerCase();
      detectedClient = getClientById(guessedId) ?? getClients()[0];
    }

    const analysisPrompt = `以下のメモを分析してください。\n\nメモ:\n${memo}\n\n以下のJSON形式で回答してください。JSON以外のテキストは不要です。\n\n{"topic": "メモの主題を1行で", "estimatedSlides": 15, "suggestedImageCount": 3}\n\nestimatedSlides: 適切なスライド枚数（メモの情報量から推定）\nsuggestedImageCount: 画像生成が必要なスライド枚数（表紙+データ系）`;

    const analysisResult = await generateText(analysisPrompt);
    let memoAnalysis;
    try {
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      memoAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { topic: 'スライド資料', estimatedSlides: 15, suggestedImageCount: 3 };
    } catch {
      memoAnalysis = { topic: 'スライド資料', estimatedSlides: 15, suggestedImageCount: 3 };
    }

    return new Response(
      JSON.stringify({
        clientId: detectedClient.id,
        clientName: detectedClient.name,
        memoAnalysis,
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
