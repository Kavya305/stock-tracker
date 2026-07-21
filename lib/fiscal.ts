// Indian fiscal year runs 1 April – 31 March and is named for the year it
// ends in: April–June 2026 is "Q1 FY27". Yahoo reports calendar quarters
// ("2Q2026" for that same period), so everything user-facing is converted here.

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface FiscalQuarter {
  q: 1 | 2 | 3 | 4;
  fyEnd: number; // e.g. 2027 for FY2026-27
}

/** Calendar month (1-12) + year -> Indian fiscal quarter. */
export function toFiscal(year: number, month: number): FiscalQuarter {
  if (month >= 4 && month <= 6) return { q: 1, fyEnd: year + 1 };
  if (month >= 7 && month <= 9) return { q: 2, fyEnd: year + 1 };
  if (month >= 10 && month <= 12) return { q: 3, fyEnd: year + 1 };
  return { q: 4, fyEnd: year }; // Jan–Mar
}

export function fyShort(fyEnd: number): string {
  return `FY${String(fyEnd).slice(2)}`;
}

/** "Q1 FY27" */
export function fiscalLabel(f: FiscalQuarter): string {
  return `Q${f.q} ${fyShort(f.fyEnd)}`;
}

/** Calendar months a fiscal quarter covers, e.g. { startMonth0: 3, calYear: 2026 } */
export function fiscalMonths(f: FiscalQuarter): {
  startMonth0: number;
  calYear: number;
} {
  const startMonth0 = (f.q % 4) * 3; // Q1->3(Apr) Q2->6(Jul) Q3->9(Oct) Q4->0(Jan)
  const calYear = f.q === 4 ? f.fyEnd : f.fyEnd - 1;
  return { startMonth0, calYear };
}

/** "Q1 FY27 (Apr–Jun 2026)" */
export function fiscalLabelLong(f: FiscalQuarter): string {
  const { startMonth0, calYear } = fiscalMonths(f);
  return `${fiscalLabel(f)} (${MONTH_NAMES[startMonth0]}–${
    MONTH_NAMES[startMonth0 + 2]
  } ${calYear})`;
}

/** Label a results period from its period-end date (YYYY-MM-DD). */
export function fiscalLabelFromPeriodEnd(periodEnd: string | null): string | null {
  if (!periodEnd) return null;
  const [y, m] = periodEnd.split("-").map(Number);
  if (!y || !m) return null;
  return fiscalLabel(toFiscal(y, m));
}

export function currentFiscalQuarter(): FiscalQuarter {
  const now = new Date();
  return toFiscal(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

/** Step back one fiscal quarter. */
export function previousFiscalQuarter(f: FiscalQuarter): FiscalQuarter {
  if (f.q === 1) return { q: 4, fyEnd: f.fyEnd - 1 };
  return { q: (f.q - 1) as 1 | 2 | 3 | 4, fyEnd: f.fyEnd };
}
