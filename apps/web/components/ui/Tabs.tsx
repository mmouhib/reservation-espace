import { cn } from "@/lib/cn";

/** A row of buttons that switches between a few views of the same page. */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="mb-5 inline-flex rounded-xl bg-slate-200/70 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "min-h-9 rounded-lg px-4 text-sm font-medium transition-colors",
            value === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
