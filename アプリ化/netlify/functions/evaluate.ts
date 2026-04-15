import type { Context } from '@netlify/functions';
import { generateText } from './_shared/gemini.js';
import { getClientById } from './_shared/clients.js';
import { EVALUATOR_SYSTEM_PROMPT } from './_shared/prompts.js';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { structure, memo, clientId } = await req.json();
    const client = getClientById(clientId);

    let userPrompt = `## 構成案\n${structure}\n\n## ユーザーの元メモ\n${memo}\n`;

    if (client) {
      userPrompt += `\n## クライアント情報\n`;
      userPrompt += `- 名前: ${client.name}\n`;
      userPrompt += `- トーン: ${client.tone.style}\n`;
      if (client.prohibitedWords.length > 0) {
        userPrompt += `- 禁止ワード: ${client.prohibitedWords.join(', ')}\n`;
      }
      if (client.requiredTerms.length > 0) {
        userPrompt += `- 必須用語: ${client.requiredTerms.join(', ')}\n`;
      }
    }

    const result = await generateText(userPrompt, EVALUATOR_SYSTEM_PROMPT);

    let evaluation;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      evaluation = null;
    }

    if (!evaluation || typeof evaluation.score !== 'number') {
      evaluation = {
        score: 80,
        passed: false,
        feedback: 'Evaluator response could not be parsed. Treating as needs-improvement.',
        issues: ['評価結果のパースに失敗しました'],
      };
    }

    evaluation.passed = evaluation.score >= 85;

    return new Response(JSON.stringify(evaluation), { status: 200, headers: corsHeaders() });
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
