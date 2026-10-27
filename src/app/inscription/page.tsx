import { SignupForm } from "@/components/AuthForms";

export const metadata = { title: "Inscription · Producteurs de la vallée d'Ax" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Référencer mon exploitation</h1>
      <p className="mb-4 text-stone-600">Gratuit, sans commission. Vous gardez la main sur ce qui est affiché.</p>
      <div className="rounded-xl border border-stone-200 bg-white p-6"><SignupForm /></div>
    </div>
  );
}
