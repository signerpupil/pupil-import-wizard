import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Users,
  UserCog,
  FolderKanban,
  GraduationCap,
  BookOpen,
  NotebookPen,
  CalendarX,
  FileUp,
  Database,
  Sparkles,
  LifeBuoy,
  ExternalLink,
} from 'lucide-react';

const LOGO_URL = `${import.meta.env.BASE_URL}pupil-logo.png`;

type Tile = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  href?: string;
};

const aufbereitung: Tile[] = [
  { title: 'Stammdaten Mitarbeitende', description: 'Lehrpersonen und Mitarbeitende aus LehrerOffice aufbereiten.', icon: UserCog, accent: 'var(--seven-magenta)', href: '/style-vorschau/stammdaten-mitarbeitende' },
  { title: 'Stammdaten SuS & EZB', description: 'Schülerinnen, Schüler und Erziehungsberechtigte prüfen und korrigieren.', icon: Users, accent: 'var(--seven-blue)' },
  { title: 'Gruppen', description: 'Fächer und Gruppen aus LehrerOffice auf PUPIL abbilden.', icon: FolderKanban, accent: 'var(--seven-teal)' },
  { title: 'LP-Zuweisung', description: 'Lehrpersonen den Gruppen zuweisen – aufbauend auf den Stammdaten.', icon: GraduationCap, accent: 'var(--seven-orange)' },
];

const importe: Tile[] = [
  { title: 'Import Stammdaten Mitarbeitende', description: 'Klick-Tutorial in 10 Schritten.', icon: UserCog, accent: 'var(--seven-magenta)' },
  { title: 'Import Stammdaten SuS und EZB', description: 'Aufbereitete Datei in PUPIL hochladen.', icon: Users, accent: 'var(--seven-blue)' },
  { title: 'Import Personendossier', description: 'Dateinamen-Konventionen und Upload.', icon: FolderKanban, accent: 'var(--seven-teal)' },
  { title: 'Import Lernbericht', description: 'Beurteilungen und Berichte übernehmen.', icon: BookOpen, accent: 'var(--seven-orange)' },
  { title: 'Import Journal', description: 'Journaleinträge strukturiert importieren.', icon: NotebookPen, accent: 'var(--seven-yellow)' },
  { title: 'Import Absenzen', description: 'Absenzen aus LehrerOffice übertragen.', icon: CalendarX, accent: 'var(--seven-blue)' },
];

const ressourcen: Tile[] = [
  { title: 'PUPIL E-Learning Aargau', description: 'Lernmodule mit gemeinsamem Zugang.', icon: GraduationCap, accent: 'var(--seven-teal)' },
  { title: 'Schulungsunterlagen', description: 'Präsentationen und Handouts zum Projekt.', icon: BookOpen, accent: 'var(--seven-orange)' },
  { title: 'Übungsumgebung', description: 'Testinstanz zum gefahrlosen Ausprobieren.', icon: Sparkles, accent: 'var(--seven-magenta)' },
  { title: 'Dokumentation', description: 'Offizielle PUPIL-Dokumentation.', icon: LifeBuoy, accent: 'var(--seven-blue)' },
];

function SectionHeader({ label, title, description, icon: Icon, accent }: { label: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; accent: string }) {
  return (
    <div className="flex items-start gap-4 border-t border-border pt-6">
      <div
        className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
        style={{ backgroundColor: `hsl(${accent})` }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function TileCard({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const card = (
    <div className="group flex h-full cursor-pointer flex-col justify-between rounded-sm border border-border bg-card p-6 transition-colors duration-200 hover:border-foreground">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${tile.accent})` }} />
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-snug text-foreground">{tile.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{tile.description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Öffnen <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
  return tile.href ? <Link to={tile.href}>{card}</Link> : card;
}

export default function StylePreviewPage() {
  return (
    <div className="seven-theme min-h-screen bg-background text-foreground">
      {/* Hinweisleiste */}
      <div className="border-b border-border bg-foreground px-6 py-2 text-center text-xs text-background">
        Design-Vorschau im 7-Education-Stil – die bestehende Seite bleibt unverändert.
      </div>

      {/* Kopfzeile */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={LOGO_URL} alt="PUPIL" className="h-8 w-auto" />
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zur aktuellen Seite
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-6 pb-24 pt-14">
        {/* Titel */}
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--seven-magenta))' }}>
            <span className="h-px w-8" style={{ backgroundColor: 'hsl(var(--seven-magenta))' }} />
            PUPIL@AG
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            PUPIL@AG –<br />Schritt für Schritt
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Bereiten Sie Ihre Daten aus LehrerOffice Schritt für Schritt für den Import in PUPIL auf.
            Wählen Sie unten den passenden Bereich. Weiter unten finden Sie Hilfe, Kontakt und Schulungsmaterial.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90">
              Datenaufbereitung starten <ArrowRight className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground">
              Edi fragen
            </button>
          </div>
        </section>

        {/* Datenaufbereitung */}
        <section className="space-y-6">
          <SectionHeader
            label="01"
            title="Datenaufbereitung"
            description="Wählen Sie aus, welche Daten Sie aus LehrerOffice übernehmen möchten."
            icon={FileUp}
            accent="var(--seven-magenta)"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {aufbereitung.map((t) => <TileCard key={t.title} tile={t} />)}
          </div>
        </section>

        {/* Datenimporte */}
        <section className="space-y-6">
          <SectionHeader
            label="02"
            title="Datenimporte"
            description="Direkte Datenimporte in PUPIL – mit Klick-Anleitungen."
            icon={Database}
            accent="var(--seven-blue)"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {importe.map((t) => <TileCard key={t.title} tile={t} />)}
          </div>
        </section>

        {/* Schulung & Ressourcen */}
        <section className="space-y-6">
          <SectionHeader
            label="03"
            title="Schulung & Ressourcen"
            description="Lernmodule, Unterlagen und Umgebungen zum Üben."
            icon={GraduationCap}
            accent="var(--seven-teal)"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ressourcen.map((t) => <TileCard key={t.title} tile={t} />)}
          </div>
        </section>

        {/* Login & Kontakt */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-sm border border-border bg-card p-8">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(var(--seven-orange))' }}>Login</span>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">Login & Onboarding Portal</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Zugang zum Onboarding-Portal und zur Testumgebung Ihrer Schule.
            </p>
            <button className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground underline underline-offset-4">
              Portal öffnen <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-sm p-8 text-white" style={{ backgroundColor: 'hsl(var(--seven-magenta))' }}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Kontakt</span>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">Kontakt zur Projektleitung Pupil</h3>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              Fragen zur Migration, zum Zeitplan oder zu Zusatzleistungen? Buchen Sie direkt einen Termin.
            </p>
            <button className="mt-6 inline-flex items-center gap-2 rounded-sm bg-white px-5 py-2.5 text-sm font-medium" style={{ color: 'hsl(var(--seven-magenta))' }}>
              Termin buchen <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Fusszeile */}
        <footer className="flex items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <img src={LOGO_URL} alt="PUPIL" className="h-5 w-auto opacity-60" />
          <span>Design-Vorschau</span>
        </footer>
      </main>
    </div>
  );
}
