# Stock Tracker

A stock research & portfolio app built from the handwritten spec: a universal stock
list, custom watchlists, portfolios with buy/sell tracking, and allocation reports.

Live market data comes from Yahoo Finance across ~750 NSE stocks (Nifty 50, Nifty
Next 50, Nifty Midcap 150, Nifty Smallcap 250, Nifty Microcap 250). Data is stored
in SQLite via libSQL - a local file (`stock.db`) in development, or Turso in
production. Access is gated by Google sign-in restricted to an email allowlist.

**Deploying privately for specific people:** see [DEPLOY.md](DEPLOY.md).

## Run

```bash
cd stock-app
npm install
npm run dev
```

Open http://localhost:3000

## Features (mapped to the spec)

### 1. Universal Stock List (`/`)
Sortable, filterable table with the columns from the notes:
**Price, PE, PEG, 5Y Avg PE, ROE %, ROCE %, Market Cap** — plus a cap category
(Large/Mid/Small), an AI-style rule-based **Rating** (0–10) and a **Buy/Sell/Hold signal**.
An **index selector** switches the universe between Nifty 50, Nifty Next 50, Nifty
Midcap 150, Nifty Smallcap 250 and Nifty Microcap 250 (one index loads at a time; the
larger ones take longer on first load and are then cached). Click any column header to
sort; use the filter box to search by name / symbol / sector.

The constituent lists are generated from the official NSE index CSVs — see
`lib/universe.ts` (each stock is tagged with the highest-cap index it belongs to).

### 2. Watchlists (`/watchlists`)
Create named watchlists and add stocks to them from the Stocks page (the
“+ Watchlist” button). Each watchlist shows the same metric table for its members.

### 3. Portfolios (`/portfolios`, `/portfolios/[id]`)
Create portfolios and record **BUY / SELL** transactions with date, units and price.
Each portfolio computes, per holding and overall:

- **Date of purchase** (first buy) and **date of sale** (last sell)
- **Balance units** and **amount invested** (average-cost basis)
- **Current value** from the live price and **unrealised P/L**
- **XIRR** — money-weighted annualised return (per holding and portfolio-level)
- **AI-style rating** and **Buy / Sell signal**

### 4. Reports (Reports tab inside a portfolio)
Three donut charts by current value:
- **Market-cap proportion** (large / mid / small split)
- **Sector-wise proportion**
- **Stock-wise proportion**

## How the derived metrics work

- **5Y Avg PE** — 5-year average monthly price ÷ current trailing EPS (approximation,
  since Yahoo doesn't expose a historical-average PE directly).
- **ROCE** — approximated from return on assets (Yahoo doesn't expose ROCE directly);
  marked with `*` in the UI.
- **Rating (0–10)** — rule-based blend of ROE, PEG, and current PE vs. its 5Y average.
- **Signal** — BUY/SELL/HOLD from the rating combined with proximity to the 52-week
  high/low.
- **XIRR** — solved by bisection over the dated cash flows (buys negative, sells and
  current market value positive).

> These ratings, signals and XIRR figures are informational indicators computed from
> public data — **not investment advice**. Some fields (notably PEG) are missing for
> stocks where Yahoo Finance doesn't publish them.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind · libSQL/Turso · Auth.js (Google) ·
Recharts · yahoo-finance2.

## Project layout

```
app/
  page.tsx                     Universal stock list
  watchlists/page.tsx          Watchlists
  portfolios/page.tsx          Portfolio list
  portfolios/[id]/page.tsx     Portfolio detail (holdings / reports / transactions)
  components/                  StockTable, Reports (charts), shared types
  api/                         Route handlers (stocks, watchlists, portfolios, transactions)
lib/
  db.ts                        SQLite schema & connection
  universe.ts                  Nifty-50 symbol list
  quotes.ts                    Yahoo Finance fetch + metrics/rating/signal + caching
  portfolio.ts                 Holdings aggregation & XIRR
  xirr.ts                      XIRR solver
```
