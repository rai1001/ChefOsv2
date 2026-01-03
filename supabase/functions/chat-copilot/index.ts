import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createGeminiClient } from '../_shared/gemini-client.ts';
import { getKitchenCopilotPrompt } from '../_shared/prompts.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, context, history } = await req.json();

    if (!message) {
      throw new Error('Missing message for chat');
    }

    const gemini = createGeminiClient();
    const systemPrompt = getKitchenCopilotPrompt();

    // Construct the full prompt including history and context
    let fullPrompt = `${systemPrompt}\n\n`;

    if (context) {
      fullPrompt += `CONTEXT:\n${JSON.stringify(context)}\n\n`;
    }

    if (history && Array.isArray(history)) {
      fullPrompt += `HISTORY:\n${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}\n\n`;
    }

    fullPrompt += `USER QUERY: ${message}\n\nASSISTANT:`;

    const { text: result } = await gemini.generateText(fullPrompt);

    return new Response(JSON.stringify({ reply: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
