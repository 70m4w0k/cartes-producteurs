import { Suspense } from "react";
import Explorer from "@/components/Explorer";
import { getMapData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { places, events } = await getMapData();
  return (
    <Suspense>
      <Explorer places={places} events={events} />
    </Suspense>
  );
}
