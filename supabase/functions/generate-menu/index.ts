import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createGeminiClient } from '../_shared/gemini-client.ts';
import { getMenuGenerationPrompt } from '../_shared/prompts.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { params } = await req.json();

    if (!params) {
      throw new Error('Missing parameters for menu generation');
    }

    const gemini = createGeminiClient();
    const prompt = getMenuGenerationPrompt(params);
    const { text: result } = await gemini.generateText(prompt, { jsonMode: true });

    // Parse result to ensure it's valid JSON
    let jsonResult;
    try {
      jsonResult = gemini.parseJSON(result);
    } catch (e) {
      console.error('Failed to parse JSON from AI', result);
      throw new Error('AI returned invalid JSON format');
    }

    return new Response(JSON.stringify(jsonResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
