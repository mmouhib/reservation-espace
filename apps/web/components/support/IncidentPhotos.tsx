"use client";

import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase/client";

function Photo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDownloadURL(ref(getFirebase().storage, path))
      .then((value) => active && setUrl(value))
      .catch(() => undefined); // unavailable offline: the placeholder stays
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) return <span className="size-16 rounded-lg bg-slate-100" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- Storage download URL */}
      <img src={url} alt="" className="size-16 rounded-lg object-cover" />
    </a>
  );
}

/** Thumbnails of the photos attached to an incident. */
export function IncidentPhotos({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {paths.map((path) => (
        <Photo key={path} path={path} />
      ))}
    </div>
  );
}
