import 'server-only';
import { v4 as uuid } from 'uuid';

type Row = Record<string, any>;
type DBAdapter = {
  exec: (sql: string) => Promise<void>;
  all: <T = Row>(sql: string, params?: any[]) => Promise<T[]>;
  get: <T = Row>(sql: string, params?: any[]) => Promise<T | undefined>;
  run: (sql: string, params?: any[]) => Promise<void>;
};

let adapter: DBAdapter | null = null;
let initialized = false;

const SCHEMA_SQLITE = `
CREATE TABLE IF NOT EXISTS survey_schema (
  id INTEGER PRIMARY KEY,
  version INTEGER NOT NULL,
  schema_json TEXT NOT NULL,
  pushed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  schema_version INTEGER,
  answers_json TEXT NOT NULL,
  ip TEXT, country TEXT, region TEXT, city TEXT,
  ua TEXT, device TEXT, os TEXT, browser TEXT,
  session_id TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  ts TEXT DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,
  path TEXT,
  payload_json TEXT,
  session_id TEXT,
  ip TEXT, country TEXT, region TEXT, city TEXT,
  ua TEXT, device TEXT, os TEXT, browser TEXT,
  referrer TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_responses_submitted ON responses(submitted_at);
CREATE TABLE IF NOT EXISTS ip_geo (
  ip TEXT PRIMARY KEY,
  country TEXT, region TEXT, city TEXT,
  resolved_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

const SCHEMA_PG = `
CREATE TABLE IF NOT EXISTS survey_schema (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL,
  schema_json TEXT NOT NULL,
  pushed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  schema_version INTEGER,
  answers_json TEXT NOT NULL,
  ip TEXT, country TEXT, region TEXT, city TEXT,
  ua TEXT, device TEXT, os TEXT, browser TEXT,
  session_id TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  path TEXT,
  payload_json TEXT,
  session_id TEXT,
  ip TEXT, country TEXT, region TEXT, city TEXT,
  ua TEXT, device TEXT, os TEXT, browser TEXT,
  referrer TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_responses_submitted ON responses(submitted_at);
CREATE TABLE IF NOT EXISTS ip_geo (
  ip TEXT PRIMARY KEY,
  country TEXT, region TEXT, city TEXT,
  resolved_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function makeSqlite(): Promise<DBAdapter> {
  const Database = (await import('better-sqlite3')).default;
  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, 'relay.db'));
  db.pragma('journal_mode = WAL');
  return {
    exec: async (sql) => { db.exec(sql); },
    all: async (sql, params = []) => db.prepare(sql).all(...params) as any,
    get: async (sql, params = []) => db.prepare(sql).get(...params) as any,
    run: async (sql, params = []) => { db.prepare(sql).run(...params); },
  };
}

async function makePostgres(): Promise<DBAdapter> {
  const { neon } = await import('@neondatabase/serverless');
  const url = (process.env.POSTGRES_URL || process.env.DATABASE_URL) || process.env.DATABASE_URL;
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL must be set for the Neon adapter');
  const sql = neon(url);
  // Convert ?-style placeholders to $1, $2...
  const conv = (s: string) => {
    let i = 0;
    return s.replace(/\?/g, () => `$${++i}`);
  };
  // Replace SQLite-only constructs the seed schema doesn't use anymore.
  return {
    exec: async (raw) => {
      const stmts = raw.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const s of stmts) await sql(s);
    },
    all: async (raw, params = []) => (await sql(conv(raw), params)) as any,
    get: async (raw, params = []) => ((await sql(conv(raw), params))[0]) as any,
    run: async (raw, params = []) => { await sql(conv(raw), params); },
  };
}

export async function db(): Promise<DBAdapter> {
  if (adapter && initialized) return adapter;
  if (!adapter) {
    adapter = (process.env.POSTGRES_URL || process.env.DATABASE_URL) ? await makePostgres() : await makeSqlite();
  }
  if (!initialized) {
    const schema = (process.env.POSTGRES_URL || process.env.DATABASE_URL) ? SCHEMA_PG : SCHEMA_SQLITE;
    await adapter.exec(schema);
    // Seed default survey if none exists
    const existing = await adapter.get('SELECT version FROM survey_schema ORDER BY version DESC LIMIT 1');
    if (!existing) {
      const seed = defaultSurvey();
      await adapter.run(
        'INSERT INTO survey_schema (version, schema_json) VALUES (?, ?)',
        [1, JSON.stringify(seed)]
      );
    }
    initialized = true;
  }
  return adapter;
}

export function newId() { return uuid(); }

export function defaultSurvey() {
  return {
    title: 'RELAY Clinical Pilot Application',
    intro: 'Tell us about your organization and how you envision RELAY in your facility.',
    questions: [
      { id: 'q_org', type: 'short_text', label: 'Organization name', required: true },
      { id: 'q_type', type: 'multi_choice', label: 'Organization type', required: true,
        choices: ['Hospital', 'Health system', 'Specialty clinic', 'Long-term care facility', 'Other'] },
      { id: 'q_name', type: 'short_text', label: 'Your name', required: true },
      { id: 'q_role', type: 'short_text', label: 'Your role / title', required: true },
      { id: 'q_email', type: 'email', label: 'Work email', required: true },
      { id: 'q_phone', type: 'phone', label: 'Phone (optional)', required: false },
      { id: 'q_beds', type: 'number', label: 'Number of beds at the pilot site', required: true },
      { id: 'q_system', type: 'short_text', label: 'Current call bell vendor / system', required: false },
      { id: 'q_lang', type: 'multi_choice', label: 'Top patient languages spoken', required: false,
        choices: ['English', 'Spanish', 'Mandarin', 'Arabic', 'Vietnamese', 'Tagalog', 'Russian', 'Other'] },
      { id: 'q_why', type: 'long_text', label: 'Why is RELAY a fit for your facility?', required: true },
      { id: 'q_when', type: 'single_choice', label: 'Ideal pilot start window', required: false,
        choices: ['Within 30 days', '1–3 months', '3–6 months', '6+ months'] },
    ],
  };
}
