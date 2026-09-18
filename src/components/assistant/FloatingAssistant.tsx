import { useEffect, useState } from 'react';
import { MessageCircle, X, Minus, Maximize2 } from 'lucide-react';

const ASSISTANT_LOGO_URL = `${import.meta.env.BASE_URL}edi-assistent-logo.png`;

const STORAGE_KEY = 'assistant-enabled';
const ASSISTANT_URL = `${import.meta.env.BASE_URL}pupil-assistent.html`;

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
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const onToggle = () => setEnabled(isAssistantEnabled());
    window.addEventListener('assistant-toggle', onToggle);
    return () => window.removeEventListener('assistant-toggle', onToggle);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 group">
          {/* Ambient pulse rings (Edi-Magenta) */}
          <div className="absolute inset-0 rounded-full bg-[#F43274] opacity-40 animate-ping [animation-duration:2.5s]" />
          <div className="absolute -inset-2 rounded-full bg-[#F43274]/50 blur-lg animate-pulse [animation-duration:3s]" />

          <button
            onClick={() => { setOpen(true); setMinimized(false); }}
            aria-label="Edi öffnen"
            className="relative flex items-center justify-center h-20 w-20 rounded-full bg-[#F43274] shadow-[0_10px_36px_rgba(244,50,116,0.55)] hover:shadow-[0_14px_46px_rgba(244,50,116,0.65)] hover:-translate-y-1 active:scale-95 transition-all duration-300"
          >
            <img
              src={ASSISTANT_LOGO_URL}
              alt="Edi Assistent"
              className="h-[88%] w-[88%] object-contain"
            />

            {/* Chat-Bot badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-background shadow-md">
              <MessageCircle className="h-4 w-4 text-[#F43274]" />
            </span>
          </button>

          {/* Permanent label */}
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-xl animate-pulse [animation-duration:3s]">
            Edi fragen
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45" />
          </div>
        </div>
      )}

      {open && minimized && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-2rem))] bg-primary text-primary-foreground border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setMinimized(false)}>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium text-sm">Edi</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
                aria-label="Maximieren"
                className="hover:bg-primary-foreground/10 rounded p-1.5"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                aria-label="Schliessen"
                className="hover:bg-primary-foreground/10 rounded p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {open && !minimized && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(780px,calc(100vw-2rem))] h-[min(760px,calc(100vh-3rem))] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 bg-primary text-primary-foreground">
            <span className="font-medium text-sm">Edi</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                aria-label="Minimieren"
                className="hover:bg-primary-foreground/10 rounded p-1"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Schliessen"
                className="hover:bg-primary-foreground/10 rounded p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe
            src={ASSISTANT_URL}
            title="Edi"
            className="flex-1 w-full border-0 bg-white"
          />
        </div>
      )}
    </>
  );
}