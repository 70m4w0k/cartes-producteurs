import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Connexion · Producteurs de la vallée d'Ax" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-2xl font-bold">Espace producteur</h1>
      <div className="rounded-xl border border-stone-200 bg-white p-6"><LoginForm /></div>
    </div>
  );
}
