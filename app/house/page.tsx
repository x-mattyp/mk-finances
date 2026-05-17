import { redirect } from "next/navigation";
import HouseFundClient from "@/components/HouseFundClient";
import { createClient } from "@/lib/supabase/server";
import type { Entry } from "@/types/entry";

export default async function HousePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(6);

  if (error) {
    console.error(error);
  }

  const entries = ((data as Entry[] | null) ?? []).sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year,
  );

  const latest = entries[entries.length - 1];
  const incomeValues = entries
    .map((entry) => entry.income_net ?? 0)
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageNetIncome =
    incomeValues.length > 0
      ? incomeValues.reduce((sum, value) => sum + value, 0) / incomeValues.length
      : 0;

  return (
    <HouseFundClient
      email={user.email ?? ""}
      initialCurrentBalance={latest?.sav_fund ?? 0}
      initialAverageNetIncome={averageNetIncome}
    />
  );
}
