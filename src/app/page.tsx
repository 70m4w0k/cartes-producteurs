import Explorer from "@/components/Explorer";
import { getPublicProducers, getPublicRelayPoints } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [producers, relayPoints] = await Promise.all([getPublicProducers(), getPublicRelayPoints()]);
  return <Explorer producers={producers} relayPoints={relayPoints} />;
}
