"use client";

import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme, type ThemeMode } from "@/lib/theme/ThemeProvider";

const NEXT: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };
const ICON: Record<ThemeMode, IconName> = { system: "monitor", light: "sun", dark: "moon" };

/** One button that goes through "follow the device", light and dark. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();
  const label = `${t("theme.label")}: ${t(`theme.${mode}`)}`;

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
    >
      <Icon name={ICON[mode]} />
    </button>
  );
}
