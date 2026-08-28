import { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Search, Target, FileText, ArrowRight, ShieldCheck, FileUp, RefreshCw, Database, FileJson, FolderOpen, ClipboardList, Sparkles, UserCog, PlayCircle, Shield, School, Map, Eye, EyeOff, Rocket, LogIn, Mail, Calendar, ExternalLink, Copy, Check, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ImportType, FoerderplanerSubType } from '@/types/importTypes';
import type { ProcessingMode, CorrectionSource, CorrectionRule } from '@/types/correctionTypes';
import { importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { CorrectionRulesUpload } from './CorrectionRulesUpload';
import { IframeDialog } from './IframeDialog';
import { MitarbeitendeTutorialDialog } from './MitarbeitendeTutorialDialog';
import { SusEzbTutorialDialog } from './SusEzbTutorialDialog';
import { PersonendossierTutorialDialog } from './PersonendossierTutorialDialog';

import { StepHelpCard } from './StepHelpCard';

interface Step0TypeSelectProps {
  selectedType: ImportType | null;
  selectedSubType: FoerderplanerSubType | null;
  onSelectType: (type: ImportType) => void;
  onSelectSubType: (subType: FoerderplanerSubType) => void;
  onNext: () => void;
  processingMode: ProcessingMode;
  onProcessingModeChange: (mode: ProcessingMode) => void;
  correctionSource: CorrectionSource;
  onCorrectionSourceChange: (source: CorrectionSource) => void;
  onCorrectionRulesLoaded: (rules: CorrectionRule[]) => void;
  loadCorrectionRulesFromFile: (file: File) => Promise<CorrectionRule[]>;
  isLoadingCorrectionRules: boolean;
  correctionRulesError: string | null;
  localStorageRulesCount: number;
  loadedCorrectionRules: CorrectionRule[];
}

const iconMap = {
  Users,
  BookOpen,
  GraduationCap,
  Search,
  Target,
  FileText,
  FolderOpen,
  ClipboardList,
  UserCog,
};

export function Step0TypeSelect({
  selectedType,
  selectedSubType,
  onSelectType,
  onSelectSubType,
  onNext,
  processingMode,
  onProcessingModeChange,
  correctionSource,
  onCorrectionSourceChange,
  onCorrectionRulesLoaded,
  loadCorrectionRulesFromFile,
  isLoadingCorrectionRules,
  correctionRulesError,
  localStorageRulesCount,
  loadedCorrectionRules,
}: Step0TypeSelectProps) {
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSchulungsPassword, setShowSchulungsPassword] = useState(false);
  const [showElearningLogin, setShowElearningLogin] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'schulungsPassword' | null>(null);
  const [mitarbeitendeTutorialOpen, setMitarbeitendeTutorialOpen] = useState(false);
  const [susEzbTutorialOpen, setSusEzbTutorialOpen] = useState(false);
  const [personendossierTutorialOpen, setPersonendossierTutorialOpen] = useState(false);

  const [openDialog, setOpenDialog] = useState<'tutorial' | 'roles' | 'elearning' | 'schulungsunterlagen' | 'lernumgebung' | 'schulportal' | 'roadmap' | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState('');

  const handleCopy = async (value: string, field: 'email' | 'password' | 'schulungsPassword') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Fallback: silently ignore if clipboard is unavailable
    }
  };

  useEffect(() => {
    setShowFileUpload(processingMode === 'continued' && correctionSource === 'file');
  }, [processingMode, correctionSource]);

  const isSpecialType = selectedType === 'gruppen' || selectedType === 'lp-zuweisung' || selectedType === 'stammdaten-lehrpersonen';
  const canProceed = selectedType !== null && 
    (selectedType !== 'foerderplaner' || selectedSubType !== null) &&
    (isSpecialType ||
     processingMode === 'initial' || 
     (processingMode === 'continued' && (
       (correctionSource === 'localStorage' && localStorageRulesCount > 0) ||
       (correctionSource === 'file' && loadedCorrectionRules.length > 0)
     ))
    );

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          PUPIL@AG - Schritt für Schritt
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Bereiten Sie Ihre Daten aus LehrerOffice Schritt für Schritt für den Import in PUPIL auf.
          Wählen Sie unten den passenden Import-Typ. Weiter unten finden Sie Hilfe, Kontakt und Schulungsmaterial.
        </p>
      </div>

      {/* 1. Import starten */}
      <section className="space-y-5 p-6 rounded-xl border border-primary/25 bg-primary/[0.03]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Import starten</h2>
            <p className="text-sm text-muted-foreground">
              Wählen Sie aus, welche Daten Sie aus LehrerOffice übernehmen möchten.
            </p>
          </div>
        </div>

        <StepHelpCard step={0} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(['stammdaten-lehrpersonen', 'schueler', 'gruppen', 'lp-zuweisung'] as const)
            .map(t => importConfigs.find(c => c.type === t))
            .filter((c): c is NonNullable<typeof c> => !!c)
            .map((config) => {
              const Icon = iconMap[config.icon as keyof typeof iconMap];
              const isSelected = selectedType === config.type;

              return (
                <Card
                  key={config.type}
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group h-full',
                    isSelected
                      ? 'ring-2 ring-primary shadow-md bg-primary/[0.04]'
                      : 'hover:border-primary/30'
                  )}
                  onClick={() => onSelectType(config.type)}
                >
                  <CardHeader className="pb-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{config.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
        </div>

        {/* Weiter */}
        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={onNext} disabled={!canProceed} className="gap-2">
            Weiter zum Upload
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* 2. Datenimporte */}
      <section className="space-y-5 p-6 rounded-xl border border-pupil-amber/25 bg-pupil-amber/[0.03]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-pupil-amber text-pupil-amber-foreground">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Datenimporte</h2>
            <p className="text-sm text-muted-foreground">
              Direkte Datenimporte in PUPIL.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 hover:border-pupil-amber/30 group h-full bg-card border-border"
            onClick={() => setMitarbeitendeTutorialOpen(true)}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20 transition-colors">
                <UserCog className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Stammdaten Mitarbeitende</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Stammdaten in Pupil hochladen – Klick-Tutorial in 6 Schritten.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 hover:border-pupil-amber/30 group h-full bg-card border-border"
            onClick={() => setSusEzbTutorialOpen(true)}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20 transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Stammdaten SuS und EZB</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Schüler, Erziehungsberechtigte und Klassen importieren – Klick-Tutorial in 5 Schritten.
              </CardDescription>
            </CardHeader>
          </Card>


          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 hover:border-pupil-amber/30 group h-full bg-card border-border"
            onClick={() => setPersonendossierTutorialOpen(true)}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20 transition-colors">
                <FileCheck className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Personendossier</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Dateien wie Zeugnisse oder Arztbescheinigungen hochladen – Klick-Tutorial in 8 Schritten.
              </CardDescription>

            </CardHeader>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 group h-full',
              selectedType === 'foerderplaner' && selectedSubType === 'foerderplanung'
                ? 'ring-2 ring-pupil-amber shadow-md bg-pupil-amber/[0.04] border-pupil-amber/30'
                : 'bg-card border-border hover:border-pupil-amber/30'
            )}
            onClick={() => { onSelectType('foerderplaner'); onSelectSubType('foerderplanung'); }}
          >
            <CardHeader className="pb-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
                selectedType === 'foerderplaner' && selectedSubType === 'foerderplanung'
                  ? 'bg-pupil-amber text-pupil-amber-foreground shadow-sm'
                  : 'bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20'
              )}>
                <Target className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Förderplanung</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Förderziele, Massnahmen und Förderverlauf importieren.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 group h-full',
              selectedType === 'foerderplaner' && selectedSubType === 'lernberichte'
                ? 'ring-2 ring-pupil-amber shadow-md bg-pupil-amber/[0.04] border-pupil-amber/30'
                : 'bg-card border-border hover:border-pupil-amber/30'
            )}
            onClick={() => { onSelectType('foerderplaner'); onSelectSubType('lernberichte'); }}
          >
            <CardHeader className="pb-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
                selectedType === 'foerderplaner' && selectedSubType === 'lernberichte'
                  ? 'bg-pupil-amber text-pupil-amber-foreground shadow-sm'
                  : 'bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20'
              )}>
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Lernbericht</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Lernberichte und Beurteilungen importieren.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 group h-full',
              selectedType === 'journal'
                ? 'ring-2 ring-pupil-amber shadow-md bg-pupil-amber/[0.04] border-pupil-amber/30'
                : 'bg-card border-border hover:border-pupil-amber/30'
            )}
            onClick={() => onSelectType('journal')}
          >
            <CardHeader className="pb-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
                selectedType === 'journal'
                  ? 'bg-pupil-amber text-pupil-amber-foreground shadow-sm'
                  : 'bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20'
              )}>
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Journal</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Beobachtungen, Gespräche und weitere Journaldaten importieren.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-pupil-amber/10 hover:border-pupil-amber/30 group h-full bg-card border-border"
            onClick={() => { setComingSoonTitle('Import Absenzen'); setComingSoonOpen(true); }}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-amber/10 text-pupil-amber group-hover:bg-pupil-amber/20 transition-colors">
                <Calendar className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold leading-snug">Import Absenzen</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Absenzdaten in Pupil importieren.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 3. Pupil Instanz einrichten */}
      <section className="space-y-5 p-6 rounded-xl border border-pupil-teal/25 bg-pupil-teal/[0.04]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-pupil-teal text-pupil-teal-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Pupil Instanz einrichten</h2>
            <p className="text-sm text-muted-foreground">
              Grundlagen zur Einrichtung Ihrer Schule in PUPIL.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-teal/30 hover:border-pupil-teal h-full"
            onClick={() => setOpenDialog('tutorial')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-teal text-pupil-teal-foreground shadow-sm">
                <PlayCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Interaktives Tutorial</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Klickbares Tutorial zur Schulverwaltung – öffnet sich direkt hier im Fenster.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-teal/30 hover:border-pupil-teal h-full"
            onClick={() => setOpenDialog('roles')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-teal text-pupil-teal-foreground shadow-sm">
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Übersicht Rollen- & Zugriffsrechte</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Übersicht aller Rollen und Berechtigungen in PUPIL.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 3. Hilfe & Kontakt */}
      <section className="space-y-5 p-6 rounded-xl border border-border bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-foreground/80 text-background">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Hilfe & Kontakt</h2>
            <p className="text-sm text-muted-foreground">
              Zugang zum Onboarding-Portal und direkter Kontakt zur Projektleitung.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-muted text-foreground">
                <Rocket className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Login & Onboarding</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Ihr schulspezifisches Onboarding-Portal auf www.pipy.app – öffnet in einem neuen Tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://www.pipy.app/pupil/onboarding', '_blank', 'noopener,noreferrer')}
              >
                Onboarding-Portal öffnen
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col border-pupil-contact/40">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-contact/10 text-pupil-contact">
                <Calendar className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Kontakt zur Projektleitung Pupil</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Persönliche Unterstützung nötig? Buchen Sie einen Termin bei der Projektleitung.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" className="w-full" onClick={() => setContactDialogOpen(true)}>
                Termin buchen
                <Calendar className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Schulung & Ressourcen */}
      <section className="space-y-5 p-6 rounded-xl border border-pupil-resources/25 bg-pupil-resources/[0.05]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-pupil-resources text-pupil-resources-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Schulung & Ressourcen</h2>
            <p className="text-sm text-muted-foreground">
              E-Learnings, Unterlagen und Informationen rund um PUPIL@AG.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() => setOpenDialog('elearning')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">PUPIL E-Learning Aargau</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                E-Learnings und Schulungsinhalte für den Kanton Aargau.
              </CardDescription>
              <div className="mt-3 pt-3 border-t border-pupil-resources/15">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowElearningLogin((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-pupil-resources hover:underline"
                >
                  {showElearningLogin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showElearningLogin ? 'Login ausblenden' : 'Unpersönliches Login anzeigen'}
                </button>
                {showElearningLogin && (
                  <div
                    className="mt-2 space-y-2 rounded-lg border border-pupil-resources/20 bg-background p-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">E-Mail:</span>
                      <code className="text-sm font-mono truncate min-w-0 flex-1">dario.baumgartner+AG@7education.com</code>
                      <button
                        type="button"
                        onClick={() => handleCopy('dario.baumgartner+AG@7education.com', 'email')}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-pupil-resources/10 px-2 py-1 text-xs font-medium text-pupil-resources hover:bg-pupil-resources/20 transition-colors"
                        title="E-Mail kopieren"
                      >
                        {copiedField === 'email' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedField === 'email' ? 'Kopiert' : 'Kopieren'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">Passwort:</span>
                      <code className="text-sm font-mono truncate min-w-0 flex-1">Pupil@AG!2025!</code>
                      <button
                        type="button"
                        onClick={() => handleCopy('Pupil@AG!2025!', 'password')}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-pupil-resources/10 px-2 py-1 text-xs font-medium text-pupil-resources hover:bg-pupil-resources/20 transition-colors"
                        title="Passwort kopieren"
                      >
                        {copiedField === 'password' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedField === 'password' ? 'Kopiert' : 'Kopieren'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() =>
              window.open(
                'https://cloud.pupil.school/s/QN4W4qLSdiJnwQC/authenticate/showshare',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <FolderOpen className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Schulungsunterlagen</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Zentrale Unterlagen und Materialien für PUPIL@AG. Öffnet sich in einem neuen Tab.
              </CardDescription>
              <div className="mt-3 pt-3 border-t border-pupil-resources/15">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSchulungsPassword((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-pupil-resources hover:underline"
                >
                  {showSchulungsPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showSchulungsPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
                </button>
                {showSchulungsPassword && (
                  <div
                    className="mt-2 flex items-center gap-2 rounded-lg border border-pupil-resources/20 bg-background p-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-muted-foreground shrink-0">Passwort:</span>
                    <code className="text-sm font-mono truncate min-w-0 flex-1">Pupil@AG!2025!</code>
                    <button
                      type="button"
                      onClick={() => handleCopy('Pupil@AG!2025!', 'schulungsPassword')}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md bg-pupil-resources/10 px-2 py-1 text-xs font-medium text-pupil-resources hover:bg-pupil-resources/20 transition-colors"
                      title="Passwort kopieren"
                    >
                      {copiedField === 'schulungsPassword' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'schulungsPassword' ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() =>
              window.open(
                'https://ag-p1.pupil.schule/login',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <LogIn className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Übungsumgebung</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Pupil Übungsumgebung für Schulverwaltung, Schulleitung und Lehrpersonen. Die Logindaten finden sie im Bereich Schulungsunterlagen.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() => setOpenDialog('lernumgebung')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Lernumgebung für Lehrpersonen</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Interaktive Lernumgebung und Übungsinhalte für Lehrpersonen.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() => setOpenDialog('schulportal')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <School className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">Schulportal Kanton Aargau</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Offizielle Informationen des Kantons Aargau zu PUPIL.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-pupil-resources/30 hover:border-pupil-resources h-full"
            onClick={() => setOpenDialog('roadmap')}
          >
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-sm">
                <Map className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">PUPIL@AG – Roadmap</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Aktuelle Roadmap und Planung für das Projekt PUPIL@AG.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <MitarbeitendeTutorialDialog
        open={mitarbeitendeTutorialOpen}
        onOpenChange={setMitarbeitendeTutorialOpen}
      />
      <SusEzbTutorialDialog
        open={susEzbTutorialOpen}
        onOpenChange={setSusEzbTutorialOpen}
      />


      <IframeDialog

        open={openDialog === 'tutorial'}
        onOpenChange={(open) => setOpenDialog(open ? 'tutorial' : null)}
        title="Interaktives Tutorial – Schulverwaltung"
        url="https://tutorial-schulverwaltung.lovable.app"
      />
      <IframeDialog
        open={openDialog === 'roles'}
        onOpenChange={(open) => setOpenDialog(open ? 'roles' : null)}
        title="Übersicht Rollen- & Zugriffsrechte"
        url="https://rollen-zugriffe.lovable.app"
      />
      <IframeDialog
        open={openDialog === 'elearning'}
        onOpenChange={(open) => setOpenDialog(open ? 'elearning' : null)}
        title="E-Learnings für den Kanton Aargau"
        url="https://www.pupil.ch/ag-elearning"
      />
      <IframeDialog
        open={openDialog === 'lernumgebung'}
        onOpenChange={(open) => setOpenDialog(open ? 'lernumgebung' : null)}
        title="Lernumgebung für Lehrpersonen"
        url="https://signerpupil.github.io/web-toys/PUPIL_Lernumgebung_AG.html#welcome"
      />
      <IframeDialog
        open={openDialog === 'schulportal'}
        onOpenChange={(open) => setOpenDialog(open ? 'schulportal' : null)}
        title="Schulportal Kanton Aargau"
        url="https://www.schulen-aargau.ch/regelschule/schulorganisation/planung-ressourcen/pupil"
      />
      <IframeDialog
        open={openDialog === 'roadmap'}
        onOpenChange={(open) => setOpenDialog(open ? 'roadmap' : null)}
        title="PUPIL@AG - Roadmap"
        url="https://dokumentation.pupil.ch/article/vwd7iovrqq-pupil-ag-roadmap"
      />

      {/* Kontakt-Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kontakt zur Projektleitung Pupil</DialogTitle>
            <DialogDescription>
              Die Migration und die weiteren Abläufe sind Schritt für Schritt dokumentiert. Ein persönliches Begleitgespräch ist daher nur möglich, wenn Sie ein entsprechendes Angebot angenommen haben.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              Haben Sie vorab ein Angebot für <strong>„Begleitung im Projekt"</strong> von Sales erhalten und angenommen?

Wenn ja, dann dürfen Sie gerne einen Termin mit der Projektleitung vereinbaren. Wenn nicht, dürfen Sie gerne einen Termin mit Sales vereinbaren, um ein entsprechendes Angebot zu erhalten. 
            </p>
            <Alert className="border-pupil-contact/20 bg-pupil-contact/[0.04]">
              <AlertDescription className="text-xs text-muted-foreground">
                Hinweis: Der jeweilige Link öffnet sich in einem neuen Tab. Wählen Sie unten die passende Option.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                window.open('https://calendly.com/sebastian-mombers-7education/30min', '_blank', 'noopener,noreferrer');
                setContactDialogOpen(false);
              }}
              className="w-full sm:w-auto"
            >
              Nein – Calendly öffnen
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => {
                window.open('https://bookings.cloud.microsoft/bookwithme/user/8f3fb96c1e4947168ab6012279648721%407education.com?anonymous&ismsaljsauthenabled', '_blank', 'noopener,noreferrer');
                setContactDialogOpen(false);
              }}
              className="w-full sm:w-auto bg-pupil-contact hover:bg-pupil-contact/90 text-pupil-contact-foreground"
            >
              Ja – Microsoft Bookings öffnen
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{comingSoonTitle}</DialogTitle>
            <DialogDescription>
              Dieser Import-Typ ist aktuell noch nicht als Wizard verfügbar. Bitte nutzen Sie in der Zwischenzeit den entsprechenden Import direkt in PUPIL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setComingSoonOpen(false)}>Verstanden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedType === 'foerderplaner' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Förderplaner-Typ auswählen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {foerderplanerSubTypes.map((subType) => {
              const Icon = iconMap[subType.icon as keyof typeof iconMap];
              const isSelected = selectedSubType === subType.subType;

              return (
                <Card
                  key={subType.subType}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected && 'ring-2 ring-pupil-teal shadow-md'
                  )}
                  onClick={() => onSelectSubType(subType.subType)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          isSelected ? 'bg-pupil-teal text-pupil-teal-foreground' : 'bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{subType.name}</p>
                        <p className="text-sm text-muted-foreground">{subType.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Processing Mode Selection */}
      {selectedType && !isSpecialType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Aufbereitungsmodus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md group',
                processingMode === 'initial'
                  ? 'ring-2 ring-primary shadow-md bg-primary/[0.03]'
                  : 'hover:border-primary/30'
              )}
              onClick={() => onProcessingModeChange('initial')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      processingMode === 'initial'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted group-hover:bg-primary/10'
                    )}
                  >
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Erste Datenaufbereitung</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Neue Datei ohne vorherige Korrekturen aufbereiten. Korrekturen können für zukünftige Importe gespeichert werden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md group',
                processingMode === 'continued'
                  ? 'ring-2 ring-primary shadow-md bg-primary/[0.03]'
                  : 'hover:border-primary/30'
              )}
              onClick={() => onProcessingModeChange('continued')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      processingMode === 'continued'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted group-hover:bg-primary/10'
                    )}
                  >
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Weitere Datenaufbereitung</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Datei mit gespeicherten Korrekturen abgleichen. Bekannte Fehler werden automatisch korrigiert. Unterstützt auch mehrere Dateien (z.B. Primar + Oberstufe).
                    </p>
                    {localStorageRulesCount > 0 && (
                      <Badge variant="secondary" className="mt-2">
                        {localStorageRulesCount} Regeln im Browser gespeichert
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Correction Source Selection */}
      {selectedType && !isSpecialType && processingMode === 'continued' && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-4">Korrektur-Quelle wählen</h4>
            <RadioGroup
              value={correctionSource}
              onValueChange={(v) => onCorrectionSourceChange(v as CorrectionSource)}
              className="space-y-3"
            >
              <div 
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-xl border transition-all',
                  correctionSource === 'localStorage' ? 'bg-background border-primary shadow-sm' : 'border-transparent hover:bg-background/50',
                  localStorageRulesCount === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RadioGroupItem 
                  value="localStorage" 
                  id="localStorage" 
                  className="mt-1"
                  disabled={localStorageRulesCount === 0}
                />
                <Label htmlFor="localStorage" className={cn("font-normal cursor-pointer flex-1", localStorageRulesCount === 0 && 'cursor-not-allowed')}>
                  <span className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Lokale Korrekturen verwenden
                    {localStorageRulesCount > 0 && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {localStorageRulesCount} Regeln
                      </Badge>
                    )}
                  </span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {localStorageRulesCount > 0 
                      ? 'Gespeicherte Korrekturen aus diesem Browser verwenden'
                      : 'Keine gespeicherten Korrekturen vorhanden'
                    }
                  </p>
                </Label>
              </div>

              <div 
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-xl border transition-all',
                  correctionSource === 'file' ? 'bg-background border-primary shadow-sm' : 'border-transparent hover:bg-background/50'
                )}
              >
                <RadioGroupItem value="file" id="file" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="file" className="font-normal cursor-pointer">
                    <span className="font-medium flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      Korrektur-Datei hochladen
                      {loadedCorrectionRules.length > 0 && (
                        <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
                          {loadedCorrectionRules.length} Regeln geladen
                        </Badge>
                      )}
                    </span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Exportierte JSON-Datei mit Korrektur-Regeln verwenden
                    </p>
                  </Label>

                  {showFileUpload && (
                    <div className="mt-4">
                      <CorrectionRulesUpload
                        onFileLoaded={onCorrectionRulesLoaded}
                        loadFromFile={loadCorrectionRulesFromFile}
                        isLoading={isLoadingCorrectionRules}
                        error={correctionRulesError}
                      />
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}




      {/* Privacy Notice - compact at the bottom */}
      <Alert className="border-muted bg-muted/30">
        <ShieldCheck className="h-4 w-4 text-pupil-teal" />
        <AlertDescription className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Datenschutz:</span>{' '}
          Alle Daten werden ausschliesslich lokal in Ihrem Browser verarbeitet – nichts wird auf einem Server gespeichert.
        </AlertDescription>
      </Alert>
    </div>
  );
}
