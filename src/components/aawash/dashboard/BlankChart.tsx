/* Blank placeholder chart used in empty timeline/activity panels.
   Fills the host card's content area (LightPanel `mt-4 flex-1`) so the
   empty state lines up flush with the surrounding card on every screen. */
export function BlankChart({ label = "No activity yet" }: { label?: string }) {
  return (
    <div className="relative flex h-full min-h-[148px] w-full flex-col overflow-hidden rounded-[20px] bg-surface-warm sm:min-h-[176px]">
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
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1="12"
          x2="308"
          y1="128"
          y2="128"
          className="stroke-border"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="12"
          x2="12"
          y1="12"
          y2="128"
          className="stroke-border"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative mt-auto w-full px-4 pb-3.5 text-center text-[11px] font-light text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
