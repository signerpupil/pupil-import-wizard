import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'assistant-enabled';
const DISCLAIMER_KEY = 'assistant-disclaimer-ack';

export function isAssistantEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setAssistantEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  window.dispatchEvent(new Event('assistant-toggle'));
}

export function FloatingAssistant() {
  const [enabled, setEnabled] = useState(isAssistantEnabled());
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackDisclaimer, setAckDisclaimer] = useState(
    typeof window !== 'undefined' && localStorage.getItem(DISCLAIMER_KEY) === '1',
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onToggle = () => setEnabled(isAssistantEnabled());
    window.addEventListener('assistant-toggle', onToggle);
    return () => window.removeEventListener('assistant-toggle', onToggle);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && ackDisclaimer) inputRef.current?.focus();
  }, [open, ackDisclaimer]);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, '1');
    setAckDisclaimer(true);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Fehler beim Aufruf.' }));
        throw new Error(errBody.error || 'Fehler beim Aufruf.');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      setMessages((m) => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: assistantText };
                return copy;
              });
            }
          } catch {
            /* ignore parse errors on partial chunks */
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => m.filter((_, i) => i !== m.length - 1 || m[m.length - 1].role !== 'assistant' || m[m.length - 1].content !== ''));
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Hilfe-Assistent öffnen"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(400px,calc(100vw-2rem))] h-[min(600px,calc(100vh-3rem))] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b p-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium text-sm">Hilfe-Assistent</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Schliessen"
              className="hover:bg-primary-foreground/10 rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!ackDisclaimer ? (
            <div className="flex-1 p-4 flex flex-col gap-4 text-sm">
              <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded p-3 text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">Hinweis Datenschutz</p>
                  <p className="text-xs">
                    Dieser Assistent nutzt einen externen KI-Dienst (Lovable AI). Er ist ausschliesslich für <strong>allgemeine Bedienungsfragen</strong> gedacht.
                  </p>
                  <p className="text-xs">
                    Bitte <strong>keine Personendaten</strong> aus Importdateien (Namen, AHV, Adressen, E-Mails) eingeben. Die eigentliche Datenverarbeitung im Wizard bleibt weiterhin 100 % lokal.
                  </p>
                </div>
              </div>
              <Button onClick={acceptDisclaimer} className="w-full">Verstanden, weiter</Button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <p>Hallo! Ich helfe bei Fragen zur Bedienung.</p>
                    <p className="text-xs mt-2">z. B. «Wie starte ich den Stammdaten-Import?»</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-sm whitespace-pre-wrap rounded-lg px-3 py-2 max-w-[85%]',
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-muted text-foreground',
                    )}
                  >
                    {m.content || (loading && i === messages.length - 1 ? '…' : '')}
                  </div>
                ))}
                {loading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="mr-auto bg-muted rounded-lg px-3 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {error && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                    {error}
                  </div>
                )}
              </div>
              <div className="border-t p-2 flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Frage eingeben…"
                  rows={1}
                  className="flex-1 resize-none rounded border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
                  disabled={loading}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  aria-label="Senden"
                  className="h-8 w-8 flex-shrink-0"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}