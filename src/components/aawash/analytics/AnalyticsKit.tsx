import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SectionCard, formatINR } from "@/components/aawash/dashboard-kit";

const PALETTE = ["var(--primary)", "var(--gold)", "var(--leaf)", "var(--destructive)", "var(--muted-foreground)"];

export type DateRange = { from: string; to: string };

/* ------------------------------ Filter Bar ------------------------------ */

const PRESETS: Array<{ key: string; label: string; days: number }> = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "365d", label: "Last year", days: 365 },
];

export function useDateRange(defaultDays = 30) {
  const [days, setDays] = useState<number>(defaultDays);
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const range = useMemo<DateRange>(() => {
    const to = custom.to ? new Date(custom.to) : new Date();
    const from = custom.from ? new Date(custom.from) : new Date(Date.now() - days * 86_400_000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days, custom.from, custom.to]);
  return { range, days, setDays, custom, setCustom };
}

export function AnalyticsFilterBar({
  days,
  setDays,
  onExport,
  extra,
}: {
  days: number;
  setDays: (d: number) => void;
  onExport?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-2 rounded-3xl p-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setDays(p.days)}
            className={`h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${
              days === p.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {extra}
      {onExport && (
        <button
          onClick={onExport}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-surface px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-surface-warm"
        >
          <Download size={14} /> Export CSV
        </button>
      )}
    </div>
  );
}

/* ------------------------ Holographic Frame & Tooltip ------------------ */

/**
 * HoloChartFrame — glass container with sheen, scanline, and corner ticks.
 * Wraps every chart to give it a "holographic HUD" feel.
 */
function HoloChartFrame({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <SectionCard title={title}>
      <div className="holo-frame relative rounded-3xl p-3">
        {/* diagonal sheen sweep */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-primary/15 to-transparent animate-holo-sheen"
        />
        {/* horizontal scanline */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-holo-scan"
        />
        {/* corner ticks */}
        {(
          [
            "top-2 left-2 border-l-2 border-t-2",
            "top-2 right-2 border-r-2 border-t-2",
            "bottom-2 left-2 border-l-2 border-b-2",
            "bottom-2 right-2 border-r-2 border-b-2",
          ] as const
        ).map((pos) => (
          <span
            key={pos}
            aria-hidden
            className={`pointer-events-none absolute h-3 w-3 rounded-[3px] border-primary/50 ${pos}`}
          />
        ))}
        <div className="relative z-20 h-64 w-full">{children}</div>
      </div>
    </SectionCard>
  );
}

// Recharts injects `active/payload/label` via its Tooltip content prop.
type GlassTipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
};

function GlassTooltip({ active, payload, label }: GlassTipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card min-w-[140px] rounded-2xl border-primary/25 px-3 py-2 shadow-[var(--shadow-float)]">
      {label !== undefined && (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {String(label)}
        </div>
      )}
      <ul className="flex flex-col gap-1 text-xs">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color ?? "var(--primary)" }}
              />
              {p.name ?? p.dataKey}
            </span>
            <span className="font-semibold text-foreground">
              {typeof p.value === "number" ? formatINR(p.value, { compact: true }) : String(p.value ?? "")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------- Charts ------------------------------- */

export function AreaTrendChart({ data, xKey = "date", yKey = "value", title }: { data: Array<Record<string, unknown>>; xKey?: string; yKey?: string; title?: string }) {
  return (
    <HoloChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--leaf)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="color-mix(in oklab, var(--primary) 16%, transparent)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: "var(--primary)", strokeOpacity: 0.25 }} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="url(#areaStroke)"
            strokeWidth={2.4}
            fill="url(#areaGrad)"
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </HoloChartFrame>
  );
}

export function BarCompareChart({ data, xKey = "name", yKey = "value", title }: { data: Array<Record<string, unknown>>; xKey?: string; yKey?: string; title?: string }) {
  return (
    <HoloChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--leaf)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="color-mix(in oklab, var(--primary) 16%, transparent)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "color-mix(in oklab, var(--primary) 8%, transparent)" }} />
          <Bar dataKey={yKey} fill="url(#barGrad)" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={1100} />
        </BarChart>
      </ResponsiveContainer>
    </HoloChartFrame>
  );
}

export function LineDualChart({ data, xKey = "date", series, title }: { data: Array<Record<string, unknown>>; xKey?: string; series: Array<{ key: string; label: string; color?: string }>; title?: string }) {
  return (
    <HoloChartFrame title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`lineGrad-${s.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity={0.6} />
                <stop offset="100%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="color-mix(in oklab, var(--primary) 16%, transparent)" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: "var(--primary)", strokeOpacity: 0.25 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={`url(#lineGrad-${s.key})`}
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </HoloChartFrame>
  );
}

export function DonutBreakdown({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <SectionCard title={title}>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-foreground">{d.name}</span>
              </span>
              <span className="text-muted-foreground">
                {formatINR(d.value, { compact: true })} · {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

/* --------------------------------- Trend ------------------------------- */

export function TrendPill({ value }: { value: number }) {
  const dir = value > 0.5 ? "up" : value < -0.5 ? "down" : "flat";
  const cls =
    dir === "up"
      ? "bg-success/15 text-success"
      : dir === "down"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      <Icon size={10} /> {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* -------------------------------- CSV utils ---------------------------- */

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
