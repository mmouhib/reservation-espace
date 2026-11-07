"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { SpaceSummary } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** One QR code to stick on a space. Fixed black and white, so it scans the same in dark mode and on paper. */
function QrCard({ space, origin }: { space: SpaceSummary; origin: string }) {
  const { t } = useI18n();
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    void QRCode.toString(`${origin}/checkin?space=${encodeURIComponent(space.id)}`, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then((value) => !cancelled && setSvg(value));
    return () => {
      cancelled = true;
    };
  }, [origin, space.id]);

  return (
    <li className="break-inside-avoid rounded-xl border border-slate-300 bg-[#ffffff] p-4 text-center text-[#000000]">
      {/* The QR code is made here from the address of the space: nothing from outside is injected. */}
      <div className="mx-auto size-40 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-lg font-bold">{space.name}</p>
      <p className="text-sm">{[space.floor, space.location].filter(Boolean).join(" · ")}</p>
      <p className="mt-1 text-xs text-[#444444]">{t("qr.scanHint")}</p>
    </li>
  );
}

export default function QrCodesPage() {
  const { t } = useI18n();
  const sites = useCallableQuery("listSites", api.listSites, {});
  const [siteChoice, setSiteChoice] = useState("");
  const siteList = [...(sites.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const siteId = siteChoice || siteList[0]?.id || "";
  const spaces = useCallableQuery("listSpaces", api.listSpaces, siteId ? { siteId } : null);
  const list = [...(spaces.data ?? [])].sort((a, b) => a.floor.localeCompare(b.floor) || a.name.localeCompare(b.name));
  // This page only renders after sign-in, in the browser (the layout shows a spinner until then), so the address is known.
  const origin = window.location.origin;

  return (
    <>
      <DocumentTitle titleKey="admin.sections.qr.title" />
      <div className="no-print">
        <PageHeader
          title={t("qr.title")}
          description={t("qr.description")}
          actions={
            <Button onClick={() => window.print()} disabled={list.length === 0}>
              <Icon name="download" />
              {t("qr.print")}
            </Button>
          }
        />
        <div className="mb-6 max-w-xs">
          <Field label={t("qr.site")}>
            <Select value={siteId} onChange={(e) => setSiteChoice(e.target.value)}>
              {siteList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <ul className="print-area grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {origin && list.map((space) => <QrCard key={space.id} space={space} origin={origin} />)}
      </ul>
    </>
  );
}
