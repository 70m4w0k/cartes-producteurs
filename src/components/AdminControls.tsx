"use client";

import { useTransition } from "react";
import type { PublicationStatus } from "@prisma/client";
import { setEventStatus, setPlaceStatus } from "@/app/actions/admin";

export function StatusButtons({ id, status, target }: { id: string; status: PublicationStatus; target: "place" | "event" }) {
  const [pending, start] = useTransition();
  const set = (s: PublicationStatus) => start(() => (target === "place" ? setPlaceStatus(id, s) : setEventStatus(id, s)));
  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && <button disabled={pending} className="btn text-sm" onClick={() => set("APPROVED")}>{status === "PENDING" ? "Valider" : "Rétablir"}</button>}
      {status !== "SUSPENDED" && <button disabled={pending} className="btn-ghost text-sm text-red-700" onClick={() => set("SUSPENDED")}>{target === "place" ? "Suspendre" : "Masquer"}</button>}
    </div>
  );
}
