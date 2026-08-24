import { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Search, Target, FileText, ArrowRight, ShieldCheck, FileUp, RefreshCw, Database, FileJson, FolderOpen, ClipboardList, Sparkles, UserCog, PlayCircle, Shield, School, Map, Eye, EyeOff, Rocket, LogIn, Mail, Calendar, ExternalLink } from 'lucide-react';
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
  const [openDialog, setOpenDialog] = useState<'tutorial' | 'roles' | 'elearning' | 'schulungsunterlagen' | 'lernumgebung' | 'schulportal' | 'roadmap' | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

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
    <div className="space-y-8">
      {/* Logo + Hero section */}
      <div className="space-y-4 p-6 rounded-xl bg-white border border-border/40 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="shrink-0 bg-white rounded-lg p-1">
            <img
              src="/pupil-logo.png"
              alt="pupil by seven education"
              className="h-14 w-auto"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              PUPIL@AG – Schritt für Schritt
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Migration LehrerOffice – Import in Pupil
            </p>
          </div>
        </div>
      </div>

      {/* Login Onboarding */}
      <div className="space-y-4 p-6 rounded-xl border border-pupil-onboarding/30 bg-pupil-onboarding/[0.06]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-pupil-onboarding text-pupil-onboarding-foreground shadow-md">
              <Rocket className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Login & Onboarding</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Greifen Sie auf Ihr schulspezifisches Onboarding-Portal zu.
              </p>
            </div>
          </div>
          <Button
            onClick={() => window.open('https://www.pipy.app/pupil/onboarding', '_blank', 'noopener,noreferrer')}
            size="lg"
            className="bg-pupil-onboarding hover:bg-pupil-onboarding/90 text-pupil-onboarding-foreground shadow-md"
          >
            Onboarding-Portal öffnen
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <Alert className="border-pupil-onboarding/20 bg-pupil-onboarding/[0.04]">
          <AlertDescription className="text-xs text-muted-foreground">
            Hinweis: Beim Klick wird die Seite <strong>www.pipy.app/pupil/onboarding</strong> in einem neuen Tab geöffnet.
          </AlertDescription>
        </Alert>
      </div>

      {/* Kontakt zur Projektleitung Pupil */}
      <div className="space-y-4 p-6 rounded-xl border border-pupil-contact/30 bg-pupil-contact/[0.06]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-pupil-contact text-pupil-contact-foreground shadow-md">
              <Mail className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Kontakt zur Projektleitung Pupil</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Haben Sie Fragen oder benötigen Sie persönliche Unterstützung? Buchen Sie einen Termin.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setContactDialogOpen(true)}
            size="lg"
            className="bg-pupil-contact hover:bg-pupil-contact/90 text-pupil-contact-foreground shadow-md"
          >
            Termin buchen
            <Calendar className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Import Type Selection */}
      <div className="space-y-4 p-6 rounded-xl border border-primary/10 bg-primary/[0.02]">
        <h3 className="text-xl font-semibold text-foreground">Migration LehrerOffice - Import in Pupil</h3>
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
                    'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group',
                    isSelected
                      ? 'ring-2 ring-primary shadow-lg bg-primary/[0.03]'
                      : 'hover:border-primary/30'
                  )}
                  onClick={() => onSelectType(config.type)}
                >
                  <CardHeader className="pb-3">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{config.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={onNext}
            disabled={!canProceed}
            size="lg"
            className="px-8 text-base shadow-md hover:shadow-lg transition-all"
          >
            Weiter
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Pupil Instanz einrichten */}
      <div className="space-y-4 p-6 rounded-xl border border-pupil-teal/20 bg-pupil-teal/[0.04]">
        <h3 className="text-xl font-semibold text-foreground">Pupil Instanz einrichten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-teal/40 bg-pupil-teal/[0.06] hover:border-pupil-teal"
            onClick={() => setOpenDialog('tutorial')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-teal text-pupil-teal-foreground shadow-md">
                <PlayCircle className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Interaktives Tutorial</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Klickbares Tutorial zur Schulverwaltung – öffnet sich direkt hier im Fenster.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-teal/40 bg-pupil-teal/[0.06] hover:border-pupil-teal"
            onClick={() => setOpenDialog('roles')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-teal text-pupil-teal-foreground shadow-md">
                <Shield className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Übersicht Rollen- & Zugriffsrechte</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Übersicht aller Rollen und Berechtigungen in PUPIL.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* E-Learnings für den Kanton Aargau */}
      <div className="space-y-4 p-6 rounded-xl border border-pupil-learning/30 bg-pupil-learning/[0.06]">
        <h3 className="text-xl font-semibold text-foreground">E-Learnings für den Kanton Aargau</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-learning/40 bg-pupil-learning/[0.08] hover:border-pupil-learning"
            onClick={() => setOpenDialog('elearning')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-learning text-pupil-learning-foreground shadow-md">
                <BookOpen className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">PUPIL E-Learning Aargau</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                E-Learnings und Schulungsinhalte für den Kanton Aargau.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Weitere Ressourcen & Schulung */}
      <div className="space-y-4 p-6 rounded-xl border border-pupil-resources/30 bg-pupil-resources/[0.06]">
        <h3 className="text-xl font-semibold text-foreground">Weitere Ressourcen & Schulung</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-resources/40 bg-pupil-resources/[0.08] hover:border-pupil-resources"
            onClick={() =>
              window.open(
                'https://cloud.pupil.school/s/QN4W4qLSdiJnwQC/authenticate/showshare',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-md">
                <FolderOpen className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Schulungsunterlagen</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Zentrale Unterlagen und Materialien für PUPIL@AG. Öffnet sich in einem neuen Tab.
              </CardDescription>
              <div className="mt-3 pt-3 border-t border-pupil-resources/10">
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
                  <p className="mt-1.5 text-sm font-mono bg-pupil-resources/10 text-pupil-resources rounded px-2 py-1 inline-block">
                    Pupil@AG!2025!
                  </p>
                )}
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-resources/40 bg-pupil-resources/[0.08] hover:border-pupil-resources"
            onClick={() => setOpenDialog('lernumgebung')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-md">
                <GraduationCap className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Lernumgebung für Lehrpersonen</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Interaktive Lernumgebung und Übungsinhalte für Lehrpersonen.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-resources/40 bg-pupil-resources/[0.08] hover:border-pupil-resources"
            onClick={() => setOpenDialog('schulportal')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-md">
                <School className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Schulportal Kanton Aargau</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Offizielle Informationen des Kantons Aargau zu PUPIL.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group border-pupil-resources/40 bg-pupil-resources/[0.08] hover:border-pupil-resources"
            onClick={() => setOpenDialog('roadmap')}
          >
            <CardHeader className="pb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-pupil-resources text-pupil-resources-foreground shadow-md">
                <Map className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">PUPIL@AG - Roadmap</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Aktuelle Roadmap und Planung für das Projekt PUPIL@AG.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

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
              Die Migration ist Schritt für Schritt dokumentiert. Ein persönliches Begleitgespräch ist daher kostenpflichtig, sofern Sie kein entsprechendes Angebot angenommen haben.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              Haben Sie vorab ein Angebot für <strong>„Begleitung im Projekt"</strong> von Sales erhalten und angenommen?
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
