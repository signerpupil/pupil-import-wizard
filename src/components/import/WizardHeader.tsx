import { User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WizardHeader() {
  return (
    <header className="bg-pupil-header text-pupil-header-foreground">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* PUPIL Logo - Hexagon pattern */}
          <div className="flex items-center gap-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2L35 11V29L20 38L5 29V11L20 2Z" fill="hsl(var(--primary))" stroke="white" strokeWidth="1"/>
              <path d="M20 8L30 14V26L20 32L10 26V14L20 8Z" fill="hsl(var(--pupil-teal))" stroke="white" strokeWidth="0.5"/>
              <path d="M20 14L25 17V23L20 26L15 23V17L20 14Z" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">PUPIL</h1>
            <p className="text-xs text-pupil-header-foreground/70">Import Wizard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-pupil-header-foreground hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-pupil-header-foreground hover:bg-white/10">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Abmelden</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
