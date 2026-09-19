import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { buildFaqBlock, loadActiveFaqs } from '../_shared/faqs.ts';
import { WIZARD_HELP_BLOCK } from '../_shared/wizardHelp.ts';
import { logChat } from '../_shared/chatLog.ts';

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

    // Anonymes Protokoll: nur die finale Antwort protokollieren
    try {
      const systemText = typeof body.system === 'string'
        ? body.system
        : Array.isArray(body.system)
          ? body.system.map((b: { text?: string }) => b?.text ?? '').join('\n')
          : '';
      const isHelper = !!body.tools || /needs_live_docs|KEINE_TREFFER/i.test(systemText);
      if (anthropicRes.ok && !isHelper) {
        const msgs = Array.isArray(body.messages) ? body.messages : [];
        const lastUser = [...msgs].reverse().find((m: { role?: string }) => m?.role === 'user');
        const question = typeof lastUser?.content === 'string'
          ? lastUser.content
          : Array.isArray(lastUser?.content)
            ? lastUser.content.map((c: { text?: string }) => c?.text ?? '').join('\n')
            : '';
        let answerText = '';
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed?.content)) {
            answerText = parsed.content
              .filter((b: { type?: string }) => b?.type === 'text')
              .map((b: { text?: string }) => b.text ?? '')
              .join('\n');
          }
        } catch { /* ignore */ }
        if (question) {
          await logChat({
            question,
            answer: answerText,
            source: 'widget',
            session_id: req.headers.get('x-session-id'),
          });
        }
      }
    } catch (e) {
      console.error('chat log skipped', e instanceof Error ? e.message : e);
    }

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