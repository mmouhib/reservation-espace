import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="mt-2 text-slate-600">La page demandée n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand-700 underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
