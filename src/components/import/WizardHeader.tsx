import { Home, CalendarDays, FileText, Volume2, Lightbulb, Star, Settings, Bell, User, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import pupilLogo from '@/assets/pupil-logo.png';

interface WizardHeaderProps {
  title?: string;
}

export function WizardHeader({ title = 'Import Wizard' }: WizardHeaderProps) {
  return (
    <>
      {/* Main Header */}
      <header className="bg-[#2d3e50] text-white">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left side - Menu and Logo */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
            <img src={pupilLogo} alt="PUPIL" className="h-8" />
          </div>

          {/* Right side - Navigation icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <CalendarDays className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <FileText className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Volume2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Lightbulb className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Star className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                11
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 ml-2">
                  <div className="w-8 h-8 rounded-full bg-[#00838f] flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-sm">Admin PUPIL</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profil ändern</DropdownMenuItem>
                <DropdownMenuItem>Abmelden</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Title Bar */}
      <div className="bg-[#5a9bd5] text-white">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-light tracking-wide">{title}</h1>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </>
  );
}
