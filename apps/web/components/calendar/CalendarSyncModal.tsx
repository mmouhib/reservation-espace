"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useFlash } from "@/components/ui/Flash";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorKey } from "@/lib/api/client";
import { serverUrl } from "@/lib/api/transport";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Google, Apple and Outlook cannot reach an address that only exists on this computer or this office network. */
function isPrivateHost(hostname: string): boolean {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname.endsWith(".local");
}

function SyncContent() {
  const { t } = useI18n();
  const flash = useFlash();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getMyCalendarFeed({})
      .then((result) => !cancelled && setToken(result.token))
      .catch((err) => !cancelled && setError(t(errorKey(err))));
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>;
  if (!token) return <Spinner />;

  const url = serverUrl(`/api/calendar/${token}.ics`);
  const webcal = url.replace(/^https?:/, "webcal:");
  const googleAdd = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const linkClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      flash.success("calendar.sync.copied");
    } catch {
      flash.failure("errors.generic");
    }
  }

  async function reset() {
    setBusy(true);
    try {
      setToken((await api.resetMyCalendarFeed({})).token);
      flash.success("calendar.sync.resetDone");
      setConfirmingReset(false);
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-sm text-slate-700">{t("calendar.sync.intro")}</p>
      {isPrivateHost(new URL(url).hostname) && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("calendar.sync.privateHost")}</p>
      )}

      <div>
        <label htmlFor="calendar-link" className="mb-1 block text-sm font-medium text-slate-800">
          {t("calendar.sync.linkLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id="calendar-link"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          />
          <Button variant="secondary" onClick={() => void copy()}>
            {t("calendar.sync.copy")}
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-600">{t("calendar.sync.privacy")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={googleAdd} target="_blank" rel="noreferrer" className={linkClass}>
          {t("calendar.sync.addGoogle")}
        </a>
        <a href={webcal} className={linkClass}>
          {t("calendar.sync.openApp")}
        </a>
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-medium">{t("calendar.sync.stepsTitle")}</p>
        <ol className="mt-1 list-decimal space-y-0.5 ps-5">
          <li>{t("calendar.sync.step1")}</li>
          <li>{t("calendar.sync.step2")}</li>
          <li>{t("calendar.sync.step3")}</li>
        </ol>
        <p className="mt-2 text-xs text-slate-600">{t("calendar.sync.delay")}</p>
      </div>

      {confirmingReset ? (
        <div className="space-y-2 rounded-lg border border-red-200 px-4 py-3">
          <p className="text-sm text-slate-800">{t("calendar.sync.resetConfirm")}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmingReset(false)} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void reset()} disabled={busy}>
              {t("calendar.sync.reset")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirmingReset(true)}>
          {t("calendar.sync.reset")}
        </Button>
      )}
    </>
  );
}

/** The private link to subscribe a calendar app to the bookings and events, and how to use it. */
export function CalendarSyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t("calendar.sync.title")}>
      {open && <SyncContent />}
    </Modal>
  );
}
