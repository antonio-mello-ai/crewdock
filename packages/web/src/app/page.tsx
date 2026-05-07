"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/company-brain/operating");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <section className="max-w-xl">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900">
          <BrainCircuit className="h-5 w-5 text-neutral-200" />
        </div>
        <p className="mb-2 text-sm text-neutral-500">AIOS</p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-100">
          Opening Company Brain Operating
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          The primary AIOS surface is the daily operating view. Runtime pages remain
          available under Runtime Admin.
        </p>
        <Link
          href="/company-brain/operating"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-neutral-100 px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200"
        >
          Open Operating
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
