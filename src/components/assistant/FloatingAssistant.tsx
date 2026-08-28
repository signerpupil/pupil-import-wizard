import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

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
          {/* Ambient pulse ring */}
          <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping [animation-duration:3s]" />
          <div className="absolute -inset-1 rounded-full bg-primary/30 blur-md group-hover:bg-primary/50 transition-all duration-500" />

          <button
            onClick={() => setOpen(true)}
            aria-label="Edi öffnen"
            className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_40px_hsl(var(--primary)/0.5)] hover:-translate-y-1 active:scale-95 transition-all duration-300"
          >
            <MessageCircle className="h-7 w-7" />

            {/* Active indicator */}
            <span className="absolute top-3 right-3 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground" />
            </span>
          </button>

          {/* Hover tooltip */}
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none shadow-xl">
            Edi fragen
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45" />
          </div>
        </div>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(780px,calc(100vw-2rem))] h-[min(760px,calc(100vh-3rem))] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 bg-primary text-primary-foreground">
            <span className="font-medium text-sm">Edi</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Schliessen"
              className="hover:bg-primary-foreground/10 rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
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