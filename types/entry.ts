export type YearFilter = "all" | "2025" | "2026";

export interface Entry {
  id: string;
  user_id: string;
  year: number;
  month: number;
  matty_w2: number | null;
  matty_1099: number | null;
  matty_other: number | null;
  kara_w2: number | null;
  kara_other: number | null;
  income_net: number | null;
  exp_home: number | null;
  exp_food: number | null;
  exp_travel: number | null;
  exp_fun: number | null;
  exp_gifts: number | null;
  exp_transport: number | null;
  exp_shopping: number | null;
  exp_selfcare: number | null;
  exp_loans: number | null;
  exp_student_loans: number | null;
  exp_taxes: number | null;
  sav_btc: number | null;
  sav_ira: number | null;
  sav_fund: number | null;
  asset_cash: number | null;
  asset_btc: number | null;
  asset_equities: number | null;
  asset_retirement: number | null;
  asset_other: number | null;
  liab_credit_cards: number | null;
  liab_student_loan: number | null;
  liab_other_loans: number | null;
}

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const INCOME_FIELDS = [
  { key: "matty_w2" as const, label: "Matty W2" },
  { key: "matty_1099" as const, label: "Matty 1099" },
  { key: "matty_other" as const, label: "Matty Other" },
  { key: "kara_w2" as const, label: "Kara W2" },
  { key: "kara_other" as const, label: "Kara Other" },
];

export const EXPENSE_FIELDS = [
  { key: "exp_home" as const, label: "Home" },
  { key: "exp_food" as const, label: "Food" },
  { key: "exp_travel" as const, label: "Travel" },
  { key: "exp_fun" as const, label: "Fun" },
  { key: "exp_gifts" as const, label: "Gifts" },
  { key: "exp_transport" as const, label: "Transport" },
  { key: "exp_shopping" as const, label: "Shopping" },
  { key: "exp_selfcare" as const, label: "Selfcare" },
  { key: "exp_loans" as const, label: "Loans" },
  { key: "exp_student_loans" as const, label: "Student Loans" },
  { key: "exp_taxes" as const, label: "Taxes" },
];

export const SAVINGS_FIELDS = [
  { key: "sav_btc" as const, label: "BTC", color: "#f0b460" },
  { key: "sav_ira" as const, label: "IRA", color: "#a08cf0" },
  { key: "sav_fund" as const, label: "Fund", color: "#60d4b8" },
];

export const ASSET_FIELDS = [
  { key: "asset_cash" as const, label: "Cash" },
  { key: "asset_btc" as const, label: "Bitcoin" },
  { key: "asset_equities" as const, label: "Equities" },
  { key: "asset_retirement" as const, label: "Retirement" },
  { key: "asset_other" as const, label: "Other" },
];

export const LIABILITY_FIELDS = [
  { key: "liab_credit_cards" as const, label: "Credit cards" },
  { key: "liab_student_loan" as const, label: "Student loan" },
  { key: "liab_other_loans" as const, label: "Other loans" },
];
