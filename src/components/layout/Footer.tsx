import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isOptedOut, setOptOut } from '@/lib/analytics';

export function Footer() {
  const navigate = useNavigate();
  const [optedOut, setOptedOutState] = useState(false);

  useEffect(() => {
    setOptedOutState(isOptedOut());
  }, []);

  const handleToggle = (checked: boolean) => {
    // checked = participate, !checked = opt out
    setOptOut(!checked);
    setOptedOutState(!checked);
  };

  return (
    <footer className="w-full border-t bg-muted/30 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/docs')}
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              Hilfe & FAQ
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="analytics-toggle"
              checked={!optedOut}
              onCheckedChange={handleToggle}
            />
            <Label htmlFor="analytics-toggle" className="text-xs cursor-pointer">
              Anonyme Nutzungsstatistik
            </Label>
          </div>
        </div>
      </div>
    </footer>
  );
}
