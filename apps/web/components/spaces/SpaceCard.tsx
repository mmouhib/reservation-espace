"use client";

import type { Timestamp } from "firebase/firestore";
import { formatMinutes, isErrorReason, isEquipment, isSpaceTag, type Site, type Space, type SpaceSlotStatus } from "@reservation/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { WithId } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** One space of the search results: what it is, what it offers and whether it can be booked. */
export function SpaceCard({
  space,
  site,
  status,
  onBook,
}: {
  space: WithId<Space<Timestamp>>;
  site: Site | undefined;
  status: SpaceSlotStatus;
  onBook: () => void;
}) {
  const { t } = useI18n();
  const floor = site?.floors.find((f) => f.id === space.floor)?.label ?? space.floor;
  const busy = status.busy.map((b) => `${formatMinutes(b.from)}–${formatMinutes(b.to)}`).join(", ");

  return (
    <Card className={cn("flex h-full flex-col gap-3", !status.available && "bg-slate-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{space.name}</h3>
          <p className="flex items-center gap-1 text-sm text-slate-600">
            <Icon name="map-pin" className="size-4 shrink-0" />
            <span className="truncate">
              {t("reserve.floor", { floor })} · {space.location}
            </span>
          </p>
        </div>
        <Badge tone={status.available ? "success" : "neutral"}>{status.available ? t("reserve.available") : t("reserve.unavailable")}</Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="info">{t(`spaceCategories.${space.category}`)}</Badge>
        <Badge>{t("reserve.capacity", { count: space.capacity })}</Badge>
        {space.equipment.map((e) => (
          <Badge key={e}>{isEquipment(e) ? t(`equipment.${e}`) : e}</Badge>
        ))}
        {space.tags.map((tag) => (
          <Badge key={tag}>{isSpaceTag(tag) ? t(`tags.${tag}`) : tag}</Badge>
        ))}
      </div>

      {busy && <p className="text-xs text-slate-600">{t("reserve.busy", { slots: busy })}</p>}
      {!status.available && isErrorReason(status.reason) && <p className="text-sm text-amber-800">{t(`errors.${status.reason}`)}</p>}

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <p className="text-sm font-medium text-slate-700">
          {status.cost > 0 ? t("common.credits", { count: status.cost }) : t("common.free")}
        </p>
        <Button size="sm" onClick={onBook} disabled={!status.available}>
          {t("reserve.book")}
        </Button>
      </div>
    </Card>
  );
}
