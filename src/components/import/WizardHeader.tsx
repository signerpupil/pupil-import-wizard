interface WizardHeaderProps {
  title?: string;
}

export function WizardHeader({ title = 'Import Wizard' }: WizardHeaderProps) {
  return (
    <>
      {/* Teal title bar with repeating pattern */}
      <div 
        className="h-[63px] relative"
        style={{
          background: 'linear-gradient(135deg, #0077BB 0%, #00A0D2 50%, #0077BB 100%)',
        }}
      >
        {/* Diagonal lines pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              135deg,
              transparent,
              transparent 4px,
              rgba(255,255,255,0.1) 4px,
              rgba(255,255,255,0.1) 8px
            )`,
          }}
        />
        <div className="container mx-auto px-5 h-full flex items-center relative z-10">
          <h1 className="text-white text-2xl font-light tracking-[0.15em] uppercase">{title}</h1>
        </div>
      </div>
    </>
  );
}
