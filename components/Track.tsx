"use client";
import { useEffect } from "react";
import { track, type TrackEvent } from "@/lib/track";

export function ViewTracker({ id }: { id: number }) {
  useEffect(() => track(id, "vue"), [id]);
  return null;
}

export function TrackedLink({
  pharmacyId,
  event,
  ...props
}: { pharmacyId: number; event: TrackEvent } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={() => track(pharmacyId, event)} />;
}
