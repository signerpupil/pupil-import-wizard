import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { buildFaqBlock, loadActiveFaqs } from '../_shared/faqs.ts';
import { WIZARD_HELP_BLOCK } from '../_shared/wizardHelp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Gepflegte FAQs serverseitig an den vom Widget gesendeten System-Prompt anhängen
    try {
      const faqBlock = WIZARD_HELP_BLOCK + buildFaqBlock(await loadActiveFaqs());
      if (faqBlock) {
        if (typeof body.system === 'string') {
          body.system = body.system + faqBlock;
        } else if (Array.isArray(body.system)) {
          body.system = [...body.system, { type: 'text', text: faqBlock }];
        } else {
          body.system = faqBlock;
        }
      }
    } catch (e) {
      console.error('faq injection failed', e instanceof Error ? e.message : e);
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await anthropicRes.text();
    return new Response(data, {
      status: anthropicRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});