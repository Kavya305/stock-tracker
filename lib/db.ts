import { createClient, type Client, type InArgs } from "@libsql/client";

// One libSQL client for the process. Locally it uses a file (file:stock.db);
// in production it points at Turso via env vars. libSQL speaks SQLite, so the
// schema and queries are unchanged from the better-sqlite3 version.
let client: Client | null = null;
let ready: Promise<void> | null = null;

function raw(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? "file:stock.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient(authToken ? { url, authToken } : { url });
  }
  return client;
}

async function init(): Promise<void> {
  const db = raw();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      UNIQUE (profile_id, name)
    );
    CREATE TABLE IF NOT EXISTS watchlist_stocks (
      watchlist_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      PRIMARY KEY (watchlist_id, symbol)
    );
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      UNIQUE (profile_id, name)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('BUY','SELL')),
      date TEXT NOT NULL,
      units REAL NOT NULL,
      price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_stocks (
      symbol TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sector TEXT NOT NULL DEFAULT 'Other',
      added_at TEXT NOT NULL
    );
  `);

  await migrate(db);

  const r = await db.execute("SELECT COUNT(*) AS c FROM profiles");
  if (Number(r.rows[0].c) === 0) {
    await db.execute("INSERT INTO profiles (id, name) VALUES (1, 'Default')");
  }
}

// Upgrade databases created before profiles existed.
async function migrate(db: Client) {
  for (const table of ["watchlists", "portfolios"]) {
    const info = await db.execute(`PRAGMA table_info(${table})`);
    const cols = info.rows.map((row) => row.name as string);
    if (cols.length > 0 && !cols.includes("profile_id")) {
      await db.executeMultiple(`
        CREATE TABLE ${table}_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER NOT NULL DEFAULT 1,
          name TEXT NOT NULL,
          UNIQUE (profile_id, name)
        );
        INSERT INTO ${table}_new (id, name, profile_id)
          SELECT id, name, 1 FROM ${table};
        DROP TABLE ${table};
        ALTER TABLE ${table}_new RENAME TO ${table};
      `);
    }
  }
}

function ensureReady(): Promise<void> {
  if (!ready) ready = init();
  return ready;
}

export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = []
): Promise<T[]> {
  await ensureReady();
  const res = await raw().execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function dbGet<T = Record<string, unknown>>(
  sql: string,
  args: InArgs = []
): Promise<T | undefined> {
  return (await dbAll<T>(sql, args))[0];
}

export async function dbRun(
  sql: string,
  args: InArgs = []
): Promise<{ lastInsertRowid: number | null; rowsAffected: number }> {
  await ensureReady();
  const res = await raw().execute({ sql, args });
  return {
    lastInsertRowid:
      res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
    rowsAffected: res.rowsAffected,
  };
}

// Run several statements atomically (used for manual cascading deletes, since
// libSQL's remote connection model makes PRAGMA foreign_keys unreliable).
export async function dbBatch(
  statements: { sql: string; args?: InArgs }[]
): Promise<void> {
  await ensureReady();
  await raw().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write"
  );
}

// Resolve the active profile from the request header set by the client.
export function profileIdFrom(req: Request): number {
  const n = Number(req.headers.get("x-profile-id"));
  return Number.isFinite(n) && n > 0 ? n : 1;
}
