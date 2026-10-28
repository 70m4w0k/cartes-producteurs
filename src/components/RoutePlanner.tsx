"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { planRoute, type RoutePlan } from "@/app/actions/orders";
import { formatDate, formatMinutes } from "@/lib/slots";

const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">Chargement de la carte…</div>,
});

export function RoutePlanner({ token, dates }: { token: string; dates: string[] }) {
  const [date, setDate] = useState(dates[0]);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const compute = (origin: { lat: number; lng: number } | null) => {
    setMessage("");
    start(async () => {
      const result = await planRoute(token, date, origin);
      setPlan(result);
      if (!result) setMessage("Aucun retrait confirmé ce jour-là.");
    });
  };

  const fromMyPosition = () => {
    if (!navigator.geolocation) return setMessage("Géolocalisation indisponible.");
    navigator.geolocation.getCurrentPosition(
      (pos) => compute({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMessage("Position refusée ou indisponible : départ depuis Ax-les-Thermes."),
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      {dates.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Jour de retrait">
          {dates.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === date}
              onClick={() => {
                setDate(d);
                setPlan(null);
              }}
              className={`rounded-full border px-3 py-1 text-sm first-letter:uppercase ${d === date ? "border-moss-700 bg-moss-700 text-white" : "border-stone-300 bg-white"}`}
            >
              {formatDate(d)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={pending} onClick={fromMyPosition}>📍 Depuis ma position</button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => compute(null)}>Depuis Ax-les-Thermes</button>
      </div>
      {pending && <p className="text-sm text-stone-500">Calcul de l&apos;itinéraire…</p>}
      {message && <p className="text-sm text-amber-800">{message}</p>}

      {plan && (
        <div className="space-y-3">
          <p className="text-sm">
            Partez vers <strong>{formatMinutes(plan.departMinutes)}</strong> · environ {plan.travelMinutes} min de route
            {plan.source === "estimate" && <span className="text-stone-500"> (estimation)</span>}
          </p>
          {plan.lateMinutes > 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              ⚠️ Les créneaux sont trop serrés pour tout faire à l&apos;heure (≈ {plan.lateMinutes} min de retard). Prévenez les producteurs ou décalez un retrait.
            </p>
          )}
          <ol className="space-y-2">
            {plan.stops.map((s, i) => (
              <li key={s.producerOrderId} className="flex gap-3 rounded-lg border border-stone-200 bg-white p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss-700 text-sm font-bold text-white">{i + 1}</span>
                <div className="text-sm">
                  <p className="font-semibold">{s.place}</p>
                  {s.address && <p className="text-stone-600">{s.address}</p>}
                  <p>
                    Arrivée ≈ {formatMinutes(s.arrivalMinutes)} · créneau {formatMinutes(s.startMinutes)} – {formatMinutes(s.endMinutes)}
                    {s.arrivalMinutes > s.endMinutes && <span className="ml-1 font-medium text-red-700">(en retard)</span>}
                  </p>
                  {s.label !== s.place && <p className="text-stone-500">Commande : {s.label}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
            <RouteMap plan={plan} />
          </div>
          <a href={plan.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn">
            🧭 Ouvrir dans Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
