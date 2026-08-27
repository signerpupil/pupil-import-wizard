import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Bot, AlertCircle, Mail, Phone } from "lucide-react";

const LOGO_URL =
  "https://static.wixstatic.com/media/254536_a0dcf7422d28431c8ef0ee0d676b2ca6~mv2.png";
const PRIMARY = "#2b80c0";
const BG = "#f4f7fb";
const PRIVACY_KEY = "pupil-assistent-privacy-ok";
const DISCLAIMER_KEY = "pupil-assistent-disclaimer-ok";
const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/assistant-claude`;

const QUICK_CHIPS = [
  "Wann muss ich SSO einrichten?",
  "Wie erstelle ich dynamische Gruppen?",
  "Was ist das Projekt Koneksa?",
  "Wann ist der beste Zeitpunkt die Migration durchzuführen?",
  "Wie funktionieren Absenzen in PUPIL?",
  "Wann ist der Kick-Off für Slot 1?",
  "Darf eine Schule die AHV-Nummern der Eltern und Schülerinnen und Schüler bei der Gemeinde beantragen?",
];

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  source?: "live" | "static" | "faq";
};

export default function AssistentPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [disclaimerOk, setDisclaimerOk] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrivacyOk(localStorage.getItem(PRIVACY_KEY) === "1");
    setDisclaimerOk(localStorage.getItem(DISCLAIMER_KEY) === "1");
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const dismissPrivacy = () => {
    localStorage.setItem(PRIVACY_KEY, "1");
    setPrivacyOk(true);
  };

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, "1");
    setDisclaimerOk(true);
  };

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text || "(leere Antwort)", source: data.source },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div style={{ background: BG }} className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <img src={LOGO_URL} alt="PUPIL" className="h-10 w-auto" />
          <div>
            <h1 className="text-xl font-semibold" style={{ color: PRIMARY }}>
              PUPIL Assistent
            </h1>
            <p className="text-sm text-slate-500">
              Hilfe zu Import, Onboarding und Datenregeln
            </p>
          </div>
        </div>

        {/* Datenschutz & KI-Disclaimer */}
        {!disclaimerOk && (
          <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4" style={{ borderColor: PRIMARY }}>
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  <strong>KI-Assistent:</strong> Die Antworten werden von einer Künstlichen Intelligenz (Claude von Anthropic) generiert. Sie können Fehler enthalten, unvollständig sein oder veraltet sein.
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Datenschutzhinweis:</strong> Deine Fragen werden zur Verarbeitung an Anthropic übermittelt. Bitte gib <strong>keine personenbezogenen Daten</strong> ein (Namen, AHV, Adressen, E-Mails aus Importdateien). Deine Eingaben werden nicht zur Modellverbesserung verwendet.
                </p>
                <p className="text-sm text-slate-700">
                  Für verbindliche Auskünfte, Termine oder Rechtsfragen wende dich bitte direkt an den Support:{' '}
                  <a href="mailto:pupil@ag.ch" className="underline" style={{ color: PRIMARY }}>pupil@ag.ch</a> / 062 835 26 03.
                </p>
                <label className="flex items-start gap-2 text-sm text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    id="disclaimer-check"
                    className="mt-1"
                    onChange={(e) => {
                      if (e.target.checked) acceptDisclaimer();
                    }}
                  />
                  <span>Ich verstehe, dass die Antworten KI-generiert sind und Fehler enthalten können. Ich gebe keine personenbezogenen Daten ein.</span>
                </label>
              </div>
            </div>
          </div>
        )}
        {!privacyOk && disclaimerOk && (
          <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4" style={{ borderColor: PRIMARY }}>
            <p className="text-sm text-slate-700">
              <strong>Datenschutzhinweis:</strong> Deine Fragen werden an Anthropic (Claude) gesendet
              und dort verarbeitet. Bitte gib <strong>keine personenbezogenen Daten</strong> ein
              (Namen, AHV, Adressen, E-Mails aus Importdateien).
            </p>
            <button
              onClick={dismissPrivacy}
              className="mt-3 text-sm px-3 py-1.5 rounded-lg text-white"
              style={{ background: PRIMARY }}
            >
              Verstanden
            </button>
          </div>
        )}

        {/* Chips */}
        {messages.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-slate-500 mb-3">Beispielfragen:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-sm px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div
          ref={scrollRef}
          className="bg-white rounded-2xl shadow-sm p-4 flex-1 min-h-[400px] max-h-[60vh] overflow-y-auto flex flex-col gap-3"
        >
          {messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center my-auto">
              Stell eine Frage oder wähle oben ein Beispiel.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  m.role === "user" ? "text-white" : "bg-slate-50 text-slate-800"
                }`}
                style={m.role === "user" ? { background: PRIMARY } : undefined}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-a:text-sky-700">
                    <div className="flex items-center gap-1.5 mb-1.5 not-prose">
                      <Bot className="h-3 w-3 text-slate-400" />
                      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">KI-generiert</span>
                    </div>
                    <ReactMarkdown
                      components={{
                        a: (props) => (
                          <a {...props} target="_blank" rel="noreferrer noopener" />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                    {m.source && (
                      <div className="mt-2 not-prose flex items-center gap-2 flex-wrap">
                        {m.source === "faq" ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                            FAQ
                          </span>
                        ) : m.source === "live" ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Live-Doku
                          </span>
                        ) : (
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                            Onboarding/Koneksa
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> denkt nach…
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Frag den Assistenten… (Enter = senden, Shift+Enter = neue Zeile)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-300"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="rounded-xl px-4 py-2.5 text-white disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: PRIMARY }}
          >
            <Send className="h-4 w-4" /> Senden
          </button>
        </div>

        {/* Dauerhafter KI-Disclaimer & Support */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Antworten sind KI-generiert und können Fehler enthalten. Bitte kritische Angaben verifizieren.</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href="mailto:pupil@ag.ch" className="flex items-center gap-1 hover:underline" style={{ color: PRIMARY }}>
              <Mail className="h-3.5 w-3.5" /> Support
            </a>
            <span className="hidden sm:inline">|</span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> 062 835 26 03
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}