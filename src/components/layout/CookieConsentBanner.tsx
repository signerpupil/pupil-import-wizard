import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, Shield } from 'lucide-react';

const CONSENT_KEY = 'cookie-consent-status';

type ConsentStatus = 'pending' | 'accepted' | 'rejected';

export function CookieConsentBanner() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('pending');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      setConsentStatus(stored as ConsentStatus);
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsentStatus('accepted');
    setIsVisible(false);
  };

  const handleRejectOptional = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsentStatus('rejected');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t">
      <Card className="container mx-auto max-w-4xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-pupil-teal/10 flex items-center justify-center">
              <Cookie className="h-6 w-6 text-pupil-teal" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Cookie-Einstellungen
            </h3>
            <p className="text-sm text-muted-foreground">
              Diese Website verwendet Cookies. Die Hosting-Plattform Lovable.dev erfasst grundlegende 
              Nutzungsdaten zur Sicherstellung des technischen Betriebs. Mit "Alle akzeptieren" stimmen 
              Sie auch der Erfassung von Analytics-Daten zu. Mit "Nur notwendige" werden nur technisch 
              erforderliche Cookies gesetzt.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Weitere Informationen finden Sie in unserer{' '}
              <button
                onClick={() => {
                  // Trigger opening cookie policy - this will be handled by parent
                  const event = new CustomEvent('open-cookie-policy');
                  window.dispatchEvent(event);
                }}
                className="underline hover:text-foreground transition-colors"
              >
                Cookie-Policy
              </button>
              .
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleRejectOptional}
              className="w-full sm:w-auto"
            >
              Nur notwendige
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="w-full sm:w-auto bg-pupil-teal hover:bg-pupil-teal/90"
            >
              Alle akzeptieren
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function useCookieConsent(): ConsentStatus {
  const [status, setStatus] = useState<ConsentStatus>('pending');

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      setStatus(stored as ConsentStatus);
    }
  }, []);

  return status;
}
