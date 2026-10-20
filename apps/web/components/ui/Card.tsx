import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)} {...props} />;
}

/** A card with a heading, used for each block of a page. */
export function Section({ title, icon, actions, children, className }: { title: string; icon?: IconName; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          {icon && <Icon name={icon} className="size-5 text-brand-700" />}
          {title}
        </h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </Card>
  );
}

/** A big number with a label, for the home page and the statistics. */
export function StatCard({ label, value, icon, hint }: { label: string; value: ReactNode; icon: IconName; hint?: ReactNode }) {
  return (
    <Card className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon name={icon} className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
      </div>
    </Card>
  );
}

export function EmptyState({ icon, children, action }: { icon: IconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-600">
      <Icon name={icon} className="size-8 text-slate-400" />
      <p>{children}</p>
      {action}
    </div>
  );
}
