import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export function PanelHead({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {right && <div className="head-extra">{right}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  stack = false,
}: {
  id: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  stack?: boolean;
}) {
  return (
    <div className={stack ? 'seg stack' : 'seg'} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="seg-pill"
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button className="switch" data-on={checked} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <i />
      {children}
    </button>
  );
}

export const fmt = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 10_000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('pt-BR');

export const fmtMs = (ms: number) =>
  ms < 1 ? `${ms.toFixed(2)} ms` : ms < 10 ? `${ms.toFixed(1)} ms` : ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} s`;

export const fmtClock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 100) / 10);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};
