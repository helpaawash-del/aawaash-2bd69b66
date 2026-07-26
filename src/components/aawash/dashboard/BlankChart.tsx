/* Blank placeholder chart used in empty timeline/activity panels. */
export function BlankChart({ label = "No activity yet" }: { label?: string }) {
  return (
    <div className="relative h-[168px] w-full overflow-hidden rounded-[22px] bg-surface-warm">
      <svg
        viewBox="0 0 320 140"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {[28, 56, 84, 112].map((y) => (
          <line
            key={y}
            x1="12"
            x2="308"
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.7"
          />
        ))}
        <line x1="12" x2="308" y1="128" y2="128" className="stroke-border" strokeWidth="1.5" />
        <line x1="12" x2="12" y1="12" y2="128" className="stroke-border" strokeWidth="1.5" />
      </svg>
      <span className="absolute inset-x-0 bottom-4 text-center text-[11px] font-light text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
