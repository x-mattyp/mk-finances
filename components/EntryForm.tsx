"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Entry } from "@/types/entry";
import { sumIncomeLineItems, totalExpenses, n } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";

const YEARS = [2024, 2025, 2026, 2027] as const;

const MONTHS = [
  { v: 1, label: "January" },
  { v: 2, label: "February" },
  { v: 3, label: "March" },
  { v: 4, label: "April" },
  { v: 5, label: "May" },
  { v: 6, label: "June" },
  { v: 7, label: "July" },
  { v: 8, label: "August" },
  { v: 9, label: "September" },
  { v: 10, label: "October" },
  { v: 11, label: "November" },
  { v: 12, label: "December" },
] as const;

function zeros(): Omit<Entry, "id" | "user_id" | "year" | "month"> {
  return {
    matty_w2: 0,
    matty_1099: 0,
    matty_other: 0,
    kara_w2: 0,
    kara_other: 0,
    income_net: 0,
    exp_home: 0,
    exp_food: 0,
    exp_travel: 0,
    exp_fun: 0,
    exp_gifts: 0,
    exp_transport: 0,
    exp_shopping: 0,
    exp_selfcare: 0,
    exp_loans: 0,
    exp_student_loans: 0,
    exp_taxes: 0,
    sav_btc: 0,
    sav_ira: 0,
    sav_fund: 0,
    asset_cash: 0,
    asset_btc: 0,
    asset_equities: 0,
    asset_retirement: 0,
    asset_other: 0,
    liab_credit_cards: 0,
    liab_student_loan: 0,
    liab_other_loans: 0,
  };
}

function entryToForm(e: Entry): Omit<Entry, "id" | "user_id"> {
  return {
    year: e.year,
    month: e.month,
    matty_w2: n(e.matty_w2),
    matty_1099: n(e.matty_1099),
    matty_other: n(e.matty_other),
    kara_w2: n(e.kara_w2),
    kara_other: n(e.kara_other),
    income_net: n(e.income_net),
    exp_home: n(e.exp_home),
    exp_food: n(e.exp_food),
    exp_travel: n(e.exp_travel),
    exp_fun: n(e.exp_fun),
    exp_gifts: n(e.exp_gifts),
    exp_transport: n(e.exp_transport),
    exp_shopping: n(e.exp_shopping),
    exp_selfcare: n(e.exp_selfcare),
    exp_loans: n(e.exp_loans),
    exp_student_loans: n(e.exp_student_loans),
    exp_taxes: n(e.exp_taxes),
    sav_btc: n(e.sav_btc),
    sav_ira: n(e.sav_ira),
    sav_fund: n(e.sav_fund),
    asset_cash: n(e.asset_cash),
    asset_btc: n(e.asset_btc),
    asset_equities: n(e.asset_equities),
    asset_retirement: n(e.asset_retirement),
    asset_other: n(e.asset_other),
    liab_credit_cards: n(e.liab_credit_cards),
    liab_student_loan: n(e.liab_student_loan),
    liab_other_loans: n(e.liab_other_loans),
  };
}

export default function EntryForm({
  initialPrefill,
  defaultYear,
  defaultMonth,
}: {
  initialPrefill: Entry | null;
  defaultYear: number;
  defaultMonth: number;
}) {
  const router = useRouter();
  const incomeNetManualRef = useRef(false);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<Omit<Entry, "id" | "user_id">>(() => {
    if (
      initialPrefill &&
      initialPrefill.year === defaultYear &&
      initialPrefill.month === defaultMonth
    ) {
      return entryToForm(initialPrefill);
    }
    return { year: defaultYear, month: defaultMonth, ...zeros() };
  });

  const applyEntry = useCallback((e: Entry | null, y: number, m: number) => {
    if (e) {
      setRow(entryToForm(e));
      incomeNetManualRef.current = false;
    } else {
      setRow({ year: y, month: m, ...zeros() });
      incomeNetManualRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (!cancelled) {
        applyEntry(data as Entry | null, year, month);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, month, applyEntry]);

  const incomeSum = useMemo(
    () =>
      n(row.matty_w2) +
      n(row.matty_1099) +
      n(row.matty_other) +
      n(row.kara_w2) +
      n(row.kara_other),
    [row.matty_w2, row.matty_1099, row.matty_other, row.kara_w2, row.kara_other],
  );

  const expenseTotal = useMemo(() => totalExpenses(row as Entry), [row]);

  const incomeLineKeys = [
    "matty_w2",
    "matty_1099",
    "matty_other",
    "kara_w2",
    "kara_other",
  ] as const;

  function sumIncomeFromRow(r: Omit<Entry, "id" | "user_id">) {
    return (
      n(r.matty_w2) +
      n(r.matty_1099) +
      n(r.matty_other) +
      n(r.kara_w2) +
      n(r.kara_other)
    );
  }

  function numInput(
    key: keyof Omit<Entry, "id" | "user_id">,
    label: string,
    opts?: { step?: string },
  ) {
    const v = row[key];
    const num = typeof v === "number" ? v : 0;
    return (
      <label className="block">
        <span className="mb-1 block text-xs text-muted">{label}</span>
        <input
          type="number"
          step={opts?.step ?? "1"}
          value={Number.isFinite(num) ? num : 0}
          onChange={(e) => {
            const parsed =
              e.target.value === "" ? 0 : parseFloat(e.target.value);
            const v = Number.isFinite(parsed) ? parsed : 0;
            if (key === "income_net") {
              incomeNetManualRef.current = true;
              setRow((r) => ({ ...r, income_net: v }));
              return;
            }
            if ((incomeLineKeys as readonly string[]).includes(key)) {
              setRow((r) => {
                const next = { ...r, [key]: v } as Omit<Entry, "id" | "user_id">;
                if (!incomeNetManualRef.current) {
                  return { ...next, income_net: sumIncomeFromRow(next) };
                }
                return next;
              });
              return;
            }
            setRow((r) => ({ ...r, [key]: v }));
          }}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
        />
      </label>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    const payload = {
      user_id: user.id,
      year,
      month,
      matty_w2: row.matty_w2,
      matty_1099: row.matty_1099,
      matty_other: row.matty_other,
      kara_w2: row.kara_w2,
      kara_other: row.kara_other,
      income_net: row.income_net,
      exp_home: row.exp_home,
      exp_food: row.exp_food,
      exp_travel: row.exp_travel,
      exp_fun: row.exp_fun,
      exp_gifts: row.exp_gifts,
      exp_transport: row.exp_transport,
      exp_shopping: row.exp_shopping,
      exp_selfcare: row.exp_selfcare,
      exp_loans: row.exp_loans,
      exp_student_loans: row.exp_student_loans,
      exp_taxes: row.exp_taxes,
      sav_btc: row.sav_btc,
      sav_ira: row.sav_ira,
      sav_fund: row.sav_fund,
      asset_cash: row.asset_cash,
      asset_btc: row.asset_btc,
      asset_equities: row.asset_equities,
      asset_retirement: row.asset_retirement,
      asset_other: row.asset_other,
      liab_credit_cards: row.liab_credit_cards,
      liab_student_loan: row.liab_student_loan,
      liab_other_loans: row.liab_other_loans,
    };

    const { error: upErr } = await supabase.from("entries").upsert(payload, {
      onConflict: "user_id,year,month",
    });

    setLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-full pb-16">
      <header className="border-b border-border bg-background/90 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-xs text-muted hover:text-accent"
          >
            ← Dashboard
          </Link>
          <span className="font-display text-sm italic text-accent">
            Add / Edit Month
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-10 rounded-lg border border-border bg-surface p-6 md:p-8"
        >
          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">Period</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Year</span>
                <select
                  value={year}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setYear(y);
                    setRow((r) => ({ ...r, year: y }));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Month</span>
                <select
                  value={month}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setMonth(m);
                    setRow((r) => ({ ...r, month: m }));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
                >
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">Income</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {numInput("matty_w2", "Matty W-2")}
              {numInput("matty_1099", "Matty 1099")}
              {numInput("matty_other", "Matty Other")}
              {numInput("kara_w2", "Kara W-2")}
              {numInput("kara_other", "Kara Other")}
              <div className="sm:col-span-2">
                {numInput("income_net", "Net income after tax")}
                <p className="mt-1 text-xs text-muted">
                  Sum of line items:{" "}
                  {formatCurrency(sumIncomeLineItems(row as Entry))}. Updates
                  automatically unless you edit this field directly.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <button
                type="button"
                className="text-xs text-accent underline-offset-2 hover:underline"
                onClick={() => {
                  incomeNetManualRef.current = false;
                  setRow((r) => ({ ...r, income_net: incomeSum }));
                }}
              >
                Reset net from line items
              </button>
            </div>
          </section>

          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">Expenses</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {numInput("exp_home", "Home")}
              {numInput("exp_food", "Food")}
              {numInput("exp_travel", "Travel")}
              {numInput("exp_fun", "Fun")}
              {numInput("exp_gifts", "Gifts")}
              {numInput("exp_transport", "Transport")}
              {numInput("exp_shopping", "Shopping")}
              {numInput("exp_selfcare", "Selfcare")}
              {numInput("exp_loans", "Loans")}
              {numInput("exp_student_loans", "Student Loans")}
              {numInput("exp_taxes", "Taxes")}
            </div>
            <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-accent-teal">
              Expense running total:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(expenseTotal)}
              </span>
            </p>
          </section>

          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">
              Savings &amp; investments
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {numInput("sav_btc", "Bitcoin purchased")}
              {numInput("sav_ira", "IRA contributions")}
              {numInput("sav_fund", "Emergency / House fund")}
            </div>
          </section>

          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">Assets</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {numInput("asset_cash", "Cash")}
              {numInput("asset_btc", "Bitcoin value")}
              {numInput("asset_equities", "Equities")}
              {numInput("asset_retirement", "Retirement accounts")}
              {numInput("asset_other", "Other")}
            </div>
          </section>

          <section>
            <h2 className="font-display mb-4 text-lg text-foreground">Liabilities</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {numInput("liab_credit_cards", "Credit cards")}
              {numInput("liab_student_loan", "Student loan balance")}
              {numInput("liab_other_loans", "Other loans")}
            </div>
          </section>

          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save month"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-md border border-border px-6 py-2.5 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
