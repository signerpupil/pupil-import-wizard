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
        <button
          onClick={() => setOpen(true)}
          aria-label="Hilfe-Assistent öffnen"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(780px,calc(100vw-2rem))] h-[min(760px,calc(100vh-3rem))] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-3 py-2 bg-primary text-primary-foreground">
            <span className="font-medium text-sm">PUPIL@AG Assistent</span>
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
            title="PUPIL@AG Assistent"
            className="flex-1 w-full border-0 bg-white"
          />
        </div>
      )}
    </>
  );
}