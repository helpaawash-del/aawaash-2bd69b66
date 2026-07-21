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

/* --------------------------------- Charts ------------------------------- */

export function AreaTrendChart({ data, xKey = "date", yKey = "value", title }: { data: Array<Record<string, unknown>>; xKey?: string; yKey?: string; title?: string }) {
  return (
    <SectionCard title={title}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}
              formatter={(v: number) => formatINR(v, { compact: true })}
            />
            <Area type="monotone" dataKey={yKey} stroke="var(--primary)" strokeWidth={2} fill="url(#areaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function BarCompareChart({ data, xKey = "name", yKey = "value", title }: { data: Array<Record<string, unknown>>; xKey?: string; yKey?: string; title?: string }) {
  return (
    <SectionCard title={title}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}
              formatter={(v: number) => formatINR(v, { compact: true })}
            />
            <Bar dataKey={yKey} fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function LineDualChart({ data, xKey = "date", series, title }: { data: Array<Record<string, unknown>>; xKey?: string; series: Array<{ key: string; label: string; color?: string }>; title?: string }) {
  return (
    <SectionCard title={title}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }} />
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
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
              <Tooltip formatter={(v: number) => formatINR(v, { compact: true })} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }} />
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
