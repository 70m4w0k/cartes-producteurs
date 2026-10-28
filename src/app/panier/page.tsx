import { CartView } from "@/components/CartView";

export const metadata = { title: "Panier · Producteurs de la vallée d'Ax" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">🧺 Mon panier</h1>
      <p className="text-stone-600">
        Chaque producteur confirme sa partie de la commande. Une fois confirmée, vous obtenez l&apos;adresse de retrait et un itinéraire.
      </p>
      <CartView />
    </div>
  );
}
