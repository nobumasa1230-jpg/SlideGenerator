import type { Context } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  try {
    const { json } = await req.json();

    if (!json || !json.slides) {
      return new Response(JSON.stringify({ error: 'json with slides is required' }), { status: 400, headers: corsHeaders() });
    }

    const gasUrl = process.env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      return new Response(JSON.stringify({ error: 'GAS_WEBAPP_URL is not configured' }), { status: 500, headers: corsHeaders() });
    }

    const jsonStr = JSON.stringify(json);
    const base64Data = Buffer.from(jsonStr).toString('base64');

    let gasResponse;
    if (base64Data.length < 6000) {
      const url = `${gasUrl}?data=${encodeURIComponent(base64Data)}`;
      gasResponse = await fetch(url, { redirect: 'follow' });
    } else {
      gasResponse = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: jsonStr,
        redirect: 'follow',
      });
    }

    const responseText = await gasResponse.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Failed to parse GAS response',
          raw: responseText.substring(0, 500),
        }),
        { status: 502, headers: corsHeaders() }
      );
    }

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          url: result.url,
          slideCount: result.slideCount || json.slides.length,
        }),
        { status: 200, headers: corsHeaders() }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'GAS returned failure',
          url: '',
          slideCount: 0,
        }),
        { status: 502, headers: corsHeaders() }
      );
    }
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
