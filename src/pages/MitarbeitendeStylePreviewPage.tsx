import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Download, FileSpreadsheet, Info, Upload, UserCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const LOGO_URL = `${import.meta.env.BASE_URL}pupil-logo.png`;

const previewRows = [
  ['2 ★', 'Standard', 'User', 'standard.user@schule.ch', 'MA', '01.01.2000', '01.08.2026'],
  ['3', 'Muster', 'Anna', 'anna.muster@schule.ch', 'MA', '14.03.1987', '01.08.2021'],
  ['4', 'Weber', 'Marco', 'marco.weber@schule.ch', 'MA', '22.11.1990', '01.08.2024'],
  ['5', 'Keller', 'Nina', 'nina.keller@schule.ch', 'MA', '05.06.1984', '01.02.2022'],
];

function PreviewProgress({ currentStep, setCurrentStep }: { currentStep: number; setCurrentStep: (step: number) => void }) {
  const steps = [
    { label: 'Datei hochladen', description: 'CSV oder Excel' },
    { label: 'Vorschau & Export', description: 'XLSX herunterladen' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 border-y border-border py-5">
      {steps.map((step, index) => {
        const active = currentStep === index;
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => setCurrentStep(index)}
            className={`flex min-h-16 items-center gap-3 rounded-sm border px-4 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-foreground'}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {index === 0 && currentStep === 1 ? <Check className="h-4 w-4" /> : index}
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{step.label}</span>
              <span className="block text-xs text-muted-foreground">{step.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function MitarbeitendeStylePreviewPage() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="seven-theme min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-foreground px-6 py-2 text-center text-xs text-background">
        Design-Vorschau – nur die Darstellung ist aktiv. Es werden keine Daten verarbeitet.
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <img src={LOGO_URL} alt="PUPIL" className="h-8 w-auto" />
          <Link to="/style-vorschau" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zur Style-Vorschau
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-6">
        <div className="mb-8 flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 rounded-sm">
            <Link to="/style-vorschau" aria-label="Zurück zur Style-Vorschau"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
              <UserCog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Stammdaten Lehrpersonen</h1>
              <p className="text-sm text-muted-foreground">LO-Export bereinigen, Standard-User einfügen, Beruf fix setzen</p>
            </div>
          </div>
        </div>

        <PreviewProgress currentStep={currentStep} setCurrentStep={setCurrentStep} />

        {currentStep === 0 ? (
          <section className="mt-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Datei hochladen</h2>
              <p className="mt-1 text-muted-foreground">Laden Sie eine oder mehrere CSV-/Excel-Dateien aus LehrerOffice hoch.</p>
            </div>

            <Card className="border-dashed border-primary bg-card shadow-none">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Dateien hierher ziehen</h3>
                  <p className="mb-4 text-muted-foreground">oder klicken Sie, um Dateien auszuwählen</p>
                  <Button variant="outline" type="button">Dateien auswählen</Button>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Unterstützte Formate: CSV, Excel (.xlsx, .xls) · Mehrere Dateien möglich (z.B. Primar + Oberstufe)
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" asChild><Link to="/style-vorschau"><ArrowLeft className="mr-2 h-4 w-4" />Zurück</Link></Button>
              <Button type="button" onClick={() => setCurrentStep(1)}>Vorschau ansehen</Button>
            </div>
          </section>
        ) : (
          <section className="mt-8 space-y-6">
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                Die Titelzeile wird umgeschrieben, eine fixe Standard-User-Zeile als Zeile 2 eingefügt und in der Spalte «Beruf» wird bei allen befüllten Datenzeilen der Wert «MA» gesetzt.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-5"><FileSpreadsheet className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">84</p><p className="text-xs text-muted-foreground">Lehrpersonen</p></div></CardContent></Card>
              <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-5"><Check className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold">1</p><p className="text-xs text-muted-foreground">Standard-User</p></div></CardContent></Card>
              <Card className="shadow-none"><CardContent className="p-5"><p className="text-2xl font-semibold">7</p><p className="text-xs text-muted-foreground">Spalten in der Vorschau</p></CardContent></Card>
            </div>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  Vorschau <Badge variant="secondary">84 Lehrpersonen</Badge><Badge variant="outline">+ 1 Standard-User</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-auto rounded-sm border border-border">
                  <Table>
                    <TableHeader><TableRow>{['Zeile', 'Name', 'Vorname', 'L_EMail', 'Beruf', 'Geb', 'Eintritt'].map((head) => <TableHead key={head} className="whitespace-nowrap bg-muted">{head}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {previewRows.map((row, rowIndex) => (
                        <TableRow key={row[0]} className={rowIndex === 0 ? 'bg-primary/5' : undefined}>
                          {row.map((cell, cellIndex) => <TableCell key={`${row[0]}-${cellIndex}`} className={`whitespace-nowrap ${rowIndex === 0 ? 'font-medium text-primary' : ''}`}>{cell}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Vorschau zeigt die ersten 4 von 84 Datenzeilen.</p>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" type="button" onClick={() => setCurrentStep(0)}><ArrowLeft className="mr-2 h-4 w-4" />Zurück</Button>
              <Button type="button"><Download className="mr-2 h-4 w-4" />XLSX herunterladen</Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}