import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import pupilLogo from '@/assets/pupil-logo.png';

interface WizardHeaderProps {
  title?: string;
}

export function WizardHeader({ title = 'Import Wizard' }: WizardHeaderProps) {
  return (
    <>
      {/* Main Header */}
      <header className="bg-[#2d3e50] text-white">
        <div className="flex items-center px-4 h-14">
          {/* Left side - Menu and Logo */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
            <img src={pupilLogo} alt="PUPIL" className="h-8" />
          </div>
        </div>
      </header>

      {/* Title Bar */}
      <div className="bg-[#5a9bd5] text-white">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-light tracking-wide">{title}</h1>
        </div>
      </div>
    </>
  );
}
