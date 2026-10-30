import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="stamp text-lg">No record</p>
      <h1 className="mt-6 font-[family-name:var(--font-stamp)] text-3xl">That file isn&apos;t in the archive.</h1>
      <Link href="/cases" className="mt-6 inline-block underline">
        Back to the cases
      </Link>
    </main>
  );
}
