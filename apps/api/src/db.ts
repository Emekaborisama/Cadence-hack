import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AppState } from '@cadence/shared';

// SQLite persistence — document-store pattern for the hackathon: the full
// AppState is one JSON row, written through on every mutation and hydrated on
// boot. Survives restarts/redeploys with zero query surface to maintain.
// Production path: promote hot entities (readings, messages, inbox) to their
// own tables; the store API in store.ts doesn't change when that happens.

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'cadence.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

const selectStmt = db.prepare('SELECT data FROM app_state WHERE id = 1');
const upsertStmt = db.prepare(`
  INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)
  ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);

export function loadPersistedState(): AppState | null {
  try {
    const row = selectStmt.get() as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as AppState) : null;
  } catch (err) {
    console.error('[db] failed to load persisted state (starting fresh):', err);
    return null;
  }
}

export function persistState(state: AppState): void {
  try {
    upsertStmt.run(JSON.stringify(state), state.updatedAt);
  } catch (err) {
    // Persistence must never take down a request — worst case we degrade to
    // in-memory behavior until the next successful write.
    console.error('[db] failed to persist state:', err);
  }
}

export function dbPath(): string {
  return DB_PATH;
}
