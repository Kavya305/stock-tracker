export interface CashFlow {
  date: Date;
  amount: number; // negative = investment, positive = return
}

// XIRR via bisection + Newton fallback
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasNeg = flows.some((f) => f.amount < 0);
  const hasPos = flows.some((f) => f.amount > 0);
  if (!hasNeg || !hasPos) return null;

  const t0 = flows[0].date.getTime();
  const years = flows.map((f) => (f.date.getTime() - t0) / (365.25 * 86400e3));

  const npv = (rate: number) =>
    flows.reduce((sum, f, i) => sum + f.amount / Math.pow(1 + rate, years[i]), 0);

  let lo = -0.9999,
    hi = 10;
  let fLo = npv(lo),
    fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-8) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
