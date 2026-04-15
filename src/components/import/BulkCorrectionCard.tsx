import { useMemo } from 'react';
import { CheckCircle, Edit2, Zap, Loader2, ArrowRight, Phone, Hash, Mail, MapPin, User, CalendarDays, CreditCard, Scissors, UserCog, Users, Languages, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ValidationError } from '@/types/importTypes';
import {
  applyLocalCorrection,
  type LocalSuggestion,
} from '@/lib/localBulkCorrections';

interface BulkCorrectionCardProps {
  uncorrectedErrors: ValidationError[];
  errors: ValidationError[];
  isAnalyzing: boolean;
  hasRunAnalysis: boolean;
  analysisTime: number | null;
  localSuggestions: LocalSuggestion[];
  onAnalyze: () => void;
  onApplyBulkCorrection: (suggestion: LocalSuggestion) => void;
  onStartStepByStep: (filterRows?: number[], filterColumn?: string) => void;
}

function getPatternMeta(type: string): { icon: React.ReactNode; label: string; example?: { from: string; to: string } } {
  switch (type) {
    case 'phone_format':
      return { icon: <Phone className="h-3.5 w-3.5 text-pupil-success" />, label: 'Telefonnummer', example: { from: '0791234567', to: '+41 79 123 45 67' } };
    case 'ahv_format':
      return { icon: <Hash className="h-3.5 w-3.5 text-pupil-success" />, label: 'AHV-Nummer', example: { from: '7561234567890', to: '756.1234.5678.90' } };
    case 'email_format':
      return { icon: <Mail className="h-3.5 w-3.5 text-pupil-success" />, label: 'E-Mail', example: { from: 'name @gmial.com', to: 'name@gmail.com' } };
    case 'plz_format':
      return { icon: <MapPin className="h-3.5 w-3.5 text-pupil-success" />, label: 'Postleitzahl', example: { from: '8001 Zürich', to: '8001' } };
    case 'gender_format':
      return { icon: <User className="h-3.5 w-3.5 text-pupil-success" />, label: 'Geschlecht', example: { from: 'männlich', to: 'M' } };
    case 'name_format':
      return { icon: <User className="h-3.5 w-3.5 text-pupil-success" />, label: 'Namen', example: { from: 'MÜLLER', to: 'Müller' } };
    case 'street_format':
      return { icon: <MapPin className="h-3.5 w-3.5 text-pupil-success" />, label: 'Strasse', example: { from: 'HAUPTSTRASSE 1', to: 'Hauptstrasse 1' } };
    case 'date_format':
      return { icon: <CalendarDays className="h-3.5 w-3.5 text-pupil-success" />, label: 'Datum (Excel)', example: { from: '45291', to: '01.01.2024' } };
    case 'date_de_format':
      return { icon: <CalendarDays className="h-3.5 w-3.5 text-pupil-success" />, label: 'Datumsformat', example: { from: '2014-03-15', to: '15.03.2014' } };
    case 'whitespace_trim':
      return { icon: <Scissors className="h-3.5 w-3.5 text-pupil-success" />, label: 'Leerzeichen trimmen', example: { from: ' Meier ', to: 'Meier' } };
    case 'iban_format':
      return { icon: <CreditCard className="h-3.5 w-3.5 text-pupil-success" />, label: 'IBAN', example: { from: 'CH930076201162385295 7', to: 'CH93 0076 2011 6238 5295 7' } };
    case 'duplicate':
      return { icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Duplikate' };
    case 'parent_id_inconsistent':
      return { icon: <UserCog className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Eltern-ID Inkonsistenz' };
    case 'nationality_correction':
      return { icon: <Globe className="h-3.5 w-3.5 text-pupil-success" />, label: 'Nationalität', example: { from: 'Türkei', to: 'Türkiye' } };
    case 'manual_review':
      return { icon: <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Manuelle Prüfung' };
    case 'language_bista':
      return { icon: <Languages className="h-3.5 w-3.5 text-pupil-success" />, label: 'BISTA-Sprache', example: { from: 'Englsh', to: 'Englisch' } };
    default:
      return { icon: <Zap className="h-3.5 w-3.5 text-pupil-success" />, label: type };
  }
}

export function BulkCorrectionCard({
  uncorrectedErrors,
  errors,
  isAnalyzing,
  hasRunAnalysis,
  analysisTime,
  localSuggestions,
  onAnalyze,
  onApplyBulkCorrection,
  onStartStepByStep,
}: BulkCorrectionCardProps) {
  const suggestionsWithApplicability = useMemo(() => {
    const uncorrectedRowsByColumn = new Map<string, Set<number>>();
    for (const err of uncorrectedErrors) {
      if (!uncorrectedRowsByColumn.has(err.column)) uncorrectedRowsByColumn.set(err.column, new Set());
      uncorrectedRowsByColumn.get(err.column)!.add(err.row);
    }
    return localSuggestions
      .map(suggestion => ({
        suggestion,
        hasApplicableCorrections: suggestion.autoFix
          ? applyLocalCorrection(suggestion, errors).length > 0
          : false,
      }))
      .filter(({ suggestion }) => {
        const uncorrected = uncorrectedRowsByColumn.get(suggestion.affectedColumn);
        return suggestion.affectedRows.some(row => uncorrected?.has(row));
      });
  }, [localSuggestions, errors, uncorrectedErrors]);

  if (uncorrectedErrors.length === 0) return null;

  return (
    <Card className="border-pupil-success/30 bg-pupil-success/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Zap className="h-5 w-5 text-pupil-success" />
            <CardTitle className="text-lg">Muster-Analyse</CardTitle>
            <Badge variant="outline" className="text-pupil-success border-pupil-success/30 text-xs">
              Web Worker · 100% Lokal
            </Badge>
            {analysisTime !== null && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(analysisTime)}ms
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {suggestionsWithApplicability.filter(s => s.hasApplicableCorrections).length > 1 && (
              <Button
                size="sm"
                onClick={() => {
                  suggestionsWithApplicability
                    .filter(s => s.hasApplicableCorrections)
                    .forEach(({ suggestion }) => onApplyBulkCorrection(suggestion));
                }}
                className="gap-2 bg-pupil-success hover:bg-pupil-success/90"
              >
                <Zap className="h-4 w-4" />
                Alle {suggestionsWithApplicability.filter(s => s.hasApplicableCorrections).length} Auto-Fixes anwenden
              </Button>
            )}
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="gap-2"
              variant="outline"
              size="sm"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analysiere...</>
              ) : (
                <><Zap className="h-4 w-4" />Neu analysieren</>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Erkennt Formatierungsmuster und schlägt automatische Korrekturen vor – ohne Datenweitergabe
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isAnalyzing && (
          <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
            <Loader2 className="h-5 w-5 animate-spin text-pupil-success" />
            <div>
              <p className="text-sm font-medium">Analysiere Daten im Hintergrund…</p>
              <p className="text-xs text-muted-foreground">UI bleibt reaktiv – Web Worker verarbeitet {uncorrectedErrors.length} Fehler</p>
            </div>
          </div>
        )}

        {!isAnalyzing && hasRunAnalysis && suggestionsWithApplicability.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-dashed">
            <CheckCircle className="h-5 w-5 text-pupil-success shrink-0" />
            <div>
              <p className="text-sm font-medium">Keine automatischen Korrekturen gefunden</p>
              <p className="text-xs text-muted-foreground">Nutzen Sie die manuelle Schritt-für-Schritt Korrektur für die verbleibenden Fehler</p>
            </div>
          </div>
        )}

        {suggestionsWithApplicability.length > 0 && (
          <div className="space-y-2">
            {suggestionsWithApplicability.map(({ suggestion, hasApplicableCorrections }, idx) => {
              const patternMeta = getPatternMeta(suggestion.type);
              return (
                <div key={idx} className={`rounded-lg border overflow-hidden ${hasApplicableCorrections ? 'border-pupil-success/30' : 'border-muted'}`}>
                  <div className={`px-3 py-2 flex items-center gap-2 text-xs font-medium ${hasApplicableCorrections ? 'bg-pupil-success/10 text-pupil-success' : 'bg-muted/50 text-muted-foreground'}`}>
                    {hasApplicableCorrections ? (
                      <><Zap className="h-3 w-3" /> Auto-Fix verfügbar</>
                    ) : (
                      <><Edit2 className="h-3 w-3" /> Manuelle Prüfung</>
                    )}
                  </div>
                  <div className="p-3 bg-background space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${hasApplicableCorrections ? 'bg-pupil-success/10' : 'bg-muted'}`}>
                          {patternMeta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold">{patternMeta.label}</span>
                            <Badge variant="outline" className="text-xs font-mono">{suggestion.affectedColumn}</Badge>
                            <Badge variant="secondary" className="text-xs">{suggestion.affectedRows.length} Einträge</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.pattern}</p>
                          {patternMeta.example && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <span className="text-muted-foreground shrink-0">Beispiel:</span>
                              <code className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-mono">{patternMeta.example.from}</code>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <code className="px-1.5 py-0.5 bg-pupil-success/10 text-pupil-success rounded font-mono">{patternMeta.example.to}</code>
                            </div>
                          )}
                          {hasApplicableCorrections && (() => {
                            const corrections = applyLocalCorrection(suggestion, errors);
                            const previews = corrections.slice(0, 3);
                            if (previews.length === 0) return null;
                            return (
                              <div className="mt-2 space-y-1">
                                <span className="text-xs text-muted-foreground font-medium">Aus Ihren Daten:</span>
                                {previews.map((c, i) => {
                                  const originalError = errors.find(e => e.row === c.row && e.column === c.column);
                                  return (
                                    <div key={i} className="flex items-center gap-1.5 text-xs">
                                      <code className="px-1 py-0.5 bg-destructive/10 text-destructive rounded font-mono text-[10px] max-w-[120px] truncate">{originalError?.value ?? '?'}</code>
                                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                      <code className="px-1 py-0.5 bg-pupil-success/10 text-pupil-success rounded font-mono text-[10px] max-w-[120px] truncate">{c.value}</code>
                                    </div>
                                  );
                                })}
                                {corrections.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{corrections.length - 3} weitere</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {hasApplicableCorrections && (
                          <Button
                            size="sm"
                            onClick={() => onApplyBulkCorrection(suggestion)}
                            className="gap-1.5 bg-pupil-success hover:bg-pupil-success/90"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Anwenden
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStartStepByStep(suggestion.affectedRows, suggestion.affectedColumn)}
                          className="gap-1.5"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Manuell
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
