import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Footer() {
  const navigate = useNavigate();

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
          <div className="text-xs text-muted-foreground/70 text-center sm:text-right">
            © {new Date().getFullYear()} PUPIL
          </div>
        </div>
      </div>
    </footer>
  );
}
