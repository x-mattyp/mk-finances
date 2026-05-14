import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/DashboardClient";
import type { Entry } from "@/types/entry";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", user.id)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error) {
    console.error(error);
  }

  return (
    <DashboardClient
      entries={(data as Entry[] | null) ?? []}
      email={user.email ?? ""}
    />
  );
}
