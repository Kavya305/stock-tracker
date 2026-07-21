import { Txn } from "./portfolio";
import { StockData } from "./quotes";
import { getHistory, getBenchmark, toMap, BENCHMARK_NAME } from "./history";
import {
  buildValueSeries,
  twr,
  periodReturn,
  indexOnOrAfter,
} from "./analysis";
import { getResults, CompanyResults } from "./results";

export interface QuarterInfo {
  year: number;
  q: number; // 1-4 (calendar)
  label: string; // "Q2 2026 (Apr–Jun)"
  start: string;
  end: string;
}

export interface QuarterContribution {
  symbol: string;
  name: string;
  sector: string;
  contribution: number; // rupees gained/lost during the quarter
  priceReturn: number | null;
}

export interface SectorWeight {
  sector: string;
  startWeight: number;
  endWeight: number;
  drift: number;
}

export interface QuarterReport {
  quarter: QuarterInfo;
  startValue: number;
  endValue: number;
  netInvested: number;
  gain: number;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  benchmarkName: string;
  contributors: QuarterContribution[];
  detractors: QuarterContribution[];
  allocation: SectorWeight[];
  results: CompanyResults[]; // results reported during the quarter
  isPartial: boolean; // quarter still in progress
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function makeQuarter(year: number, q: number): QuarterInfo {
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0)); // last day of quarter
  return {
    year,
    q,
    label: `Q${q} ${year} (${MONTH_NAMES[startMonth]}–${MONTH_NAMES[startMonth + 2]})`,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function currentQuarter(): QuarterInfo {
  const now = new Date();
  return makeQuarter(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) + 1);
}

/** Quarters from the most recent back to the one containing the first trade. */
export function listQuarters(firstTxnDate: string | null, max = 12): QuarterInfo[] {
  const out: QuarterInfo[] = [];
  let { year, q } = currentQuarter();
  for (let i = 0; i < max; i++) {
    const info = makeQuarter(year, q);
    out.push(info);
    if (firstTxnDate && info.start <= firstTxnDate) break;
    q -= 1;
    if (q === 0) {
      q = 4;
      year -= 1;
    }
  }
  return out;
}

export async function buildQuarterReport(
  txns: Txn[],
  stocks: StockData[],
  quarter: QuarterInfo
): Promise<QuarterReport> {
  const symbols = [...new Set(txns.map((t) => t.symbol))];
  const [hist, bench, results] = await Promise.all([
    getHistory(symbols, 3),
    getBenchmark(3),
    getResults(symbols),
  ]);

  let axis = bench.map((p) => p.date);
  if (axis.length === 0) {
    axis = [...new Set([...hist.values()].flatMap((p) => p.map((x) => x.date)))].sort();
  }
  const series = buildValueSeries(txns, hist, axis);

  const todayIso = new Date().toISOString().slice(0, 10);
  const endBound = quarter.end > todayIso ? todayIso : quarter.end;
  const fromIdx = indexOnOrAfter(axis, quarter.start);
  let toIdx = axis.findIndex((d) => d > endBound);
  toIdx = toIdx === -1 ? axis.length - 1 : Math.max(fromIdx, toIdx - 1);

  const startValue = series[fromIdx]?.value ?? 0;
  const endValue = series[toIdx]?.value ?? 0;
  let netInvested = 0;
  for (let i = fromIdx + 1; i <= toIdx; i++) netInvested += series[i].flow;

  const startD = axis[fromIdx];
  const endD = axis[toIdx];
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  // Per-stock rupee contribution during the quarter
  const rows: QuarterContribution[] = symbols.map((s) => {
    const pts = hist.get(s) ?? [];
    const priceMap = toMap(pts);
    const priceAt = (d: string) => {
      const before = pts.filter((p) => p.date <= d);
      return priceMap.get(d) ?? before[before.length - 1]?.close ?? null;
    };
    const sTxns = txns.filter((t) => t.symbol === s);
    const unitsAt = (d: string) =>
      sTxns
        .filter((t) => t.date <= d)
        .reduce((u, t) => u + (t.type === "BUY" ? t.units : -t.units), 0);
    const p0 = priceAt(startD);
    const p1 = priceAt(endD);
    const flowIn = sTxns
      .filter((t) => t.date > startD && t.date <= endD)
      .reduce((f, t) => f + (t.type === "BUY" ? t.units * t.price : -t.units * t.price), 0);
    const contribution =
      p0 != null && p1 != null ? unitsAt(endD) * p1 - unitsAt(startD) * p0 - flowIn : 0;
    const meta = stockMap.get(s);
    return {
      symbol: s,
      name: meta?.name ?? s,
      sector: meta?.sector ?? "Other",
      contribution,
      priceReturn: periodReturn(pts, startD, endD),
    };
  });
  const sorted = [...rows].sort((a, b) => b.contribution - a.contribution);

  // Sector allocation at start vs end of the quarter
  const weightsAt = (d: string) => {
    const w = new Map<string, number>();
    let total = 0;
    for (const s of symbols) {
      const pts = hist.get(s) ?? [];
      const before = pts.filter((p) => p.date <= d);
      const price = before[before.length - 1]?.close ?? null;
      const units = txns
        .filter((t) => t.symbol === s && t.date <= d)
        .reduce((u, t) => u + (t.type === "BUY" ? t.units : -t.units), 0);
      if (price == null || units <= 1e-9) continue;
      const val = units * price;
      const sector = stockMap.get(s)?.sector ?? "Other";
      w.set(sector, (w.get(sector) ?? 0) + val);
      total += val;
    }
    const out = new Map<string, number>();
    for (const [k, v] of w) out.set(k, total > 0 ? v / total : 0);
    return out;
  };
  const wStart = weightsAt(startD);
  const wEnd = weightsAt(endD);
  const allocation: SectorWeight[] = [...new Set([...wStart.keys(), ...wEnd.keys()])]
    .map((sector) => {
      const a = wStart.get(sector) ?? 0;
      const b = wEnd.get(sector) ?? 0;
      return { sector, startWeight: a, endWeight: b, drift: b - a };
    })
    .sort((a, b) => b.endWeight - a.endWeight);

  // Results actually reported inside this quarter
  const resultsInQuarter: CompanyResults[] = results
    .map((r) => ({
      ...r,
      quarters: r.quarters.filter(
        (q) => q.reportedDate && q.reportedDate >= quarter.start && q.reportedDate <= endBound
      ),
    }))
    .filter((r) => r.quarters.length > 0);

  return {
    quarter,
    startValue,
    endValue,
    netInvested,
    gain: endValue - startValue - netInvested,
    portfolioReturn: twr(series, fromIdx, toIdx),
    benchmarkReturn: periodReturn(bench, startD, endD),
    benchmarkName: BENCHMARK_NAME,
    contributors: sorted.filter((r) => r.contribution > 0).slice(0, 5),
    detractors: sorted.filter((r) => r.contribution < 0).reverse().slice(0, 5),
    allocation,
    results: resultsInQuarter,
    isPartial: quarter.end > todayIso,
  };
}
