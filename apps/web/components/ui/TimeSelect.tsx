import type { SelectHTMLAttributes } from "react";
import { formatMinutes, SLOT_MINUTES } from "@reservation/shared";
import { Select } from "./Field";

/** A time of day in 30 minute steps, as minutes since midnight. */
export function TimeSelect({
  value,
  onChange,
  min = 0,
  max = 24 * 60,
  ...props
}: {
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "min" | "max">) {
  const options: number[] = [];
  for (let m = min; m <= max; m += SLOT_MINUTES) options.push(m);

  return (
    <Select value={value} onChange={(e) => onChange(Number(e.target.value))} {...props}>
      {options.map((m) => (
        <option key={m} value={m}>
          {formatMinutes(m)}
        </option>
      ))}
    </Select>
  );
}
