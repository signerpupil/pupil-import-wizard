// Floating help assistant for the PUPIL Import Wizard.
// Streams a chat response from Lovable AI Gateway back to the browser.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Du bist der Hilfe-Assistent für den «PUPIL Import Wizard» – eine Web-App, mit der Schulen ihre Stammdaten (Schüler:innen, Eltern, Lehrpersonen, Gruppen) für den Import ins Schulverwaltungssystem PUPIL vorbereiten.

Sprich Schweizer Hochdeutsch (de_CH, «ss» statt «ß»), sei kurz und präzise. Duze die Nutzer:innen nicht automatisch – bleib neutral-höflich.

Deine Aufgaben:
- Erkläre Bedienung, Import-Schritte, Validierungsregeln, Fehlermeldungen und Export-Formate.
- Verweise bei Detailfragen auf «Hilfe & FAQ» (/docs) oder «Regeln pro Import (HTML)» im Footer.

Wichtige Grenzen:
- Verarbeite KEINE echten Personendaten. Wenn Nutzer:innen Importdaten (Namen, AHV-Nummern, Adressen, E-Mails) einfügen wollen, weise freundlich darauf hin, dass dieser Assistent extern läuft und keine Personendaten entgegennehmen darf.
- Erfinde keine Regeln. Wenn du etwas nicht sicher weisst, sag das und verweise auf die Regelübersicht.
- Keine rechtliche, medizinische oder finanzielle Beratung.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY nicht konfiguriert." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages muss ein Array sein." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      let status = upstream.status;
      let msg = "Assistent momentan nicht erreichbar.";
      if (status === 429) msg = "Zu viele Anfragen – bitte kurz warten.";
      if (status === 402) msg = "AI-Guthaben aufgebraucht. Bitte im Workspace aufladen.";
      return new Response(
        JSON.stringify({ error: msg, detail: errText }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});