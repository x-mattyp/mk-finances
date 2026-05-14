import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EntryForm from "@/components/EntryForm";
import type { Entry } from "@/types/entry";

const YEARS = new Set([2024, 2025, 2026, 2027]);

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  let defaultYear = now.getFullYear();
  let defaultMonth = now.getMonth() + 1;

  const qy = sp.year ? parseInt(sp.year, 10) : NaN;
  const qm = sp.month ? parseInt(sp.month, 10) : NaN;
  if (!Number.isNaN(qy) && YEARS.has(qy) && !Number.isNaN(qm) && qm >= 1 && qm <= 12) {
    defaultYear = qy;
    defaultMonth = qm;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: initialPrefill } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", defaultYear)
    .eq("month", defaultMonth)
    .maybeSingle();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-muted">
          Loading…
        </div>
      }
    >
      <EntryForm
        key={`${defaultYear}-${defaultMonth}`}
        initialPrefill={(initialPrefill as Entry | null) ?? null}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </Suspense>
  );
}
