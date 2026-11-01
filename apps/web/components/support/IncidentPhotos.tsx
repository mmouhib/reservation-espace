"use client";

import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/api/client";

function Photo({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    photoUrl(id)
      .then((value) => {
        created = value;
        if (active) setUrl(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => undefined); // unavailable offline: the placeholder stays
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  if (!url) return <span className="size-16 rounded-lg bg-slate-100" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
      <img src={url} alt="" className="size-16 rounded-lg object-cover" />
    </a>
  );
}

/** Thumbnails of the photos attached to an incident. */
export function IncidentPhotos({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {ids.map((id) => (
        <Photo key={id} id={id} />
      ))}
    </div>
  );
}
