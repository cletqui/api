import type { Harbour, HarbourDatabase, CloudflareEnv } from "../types";

// ── D1 harbour registry ────────────────────────────────────────────────────
// All reads and writes go through parameterised queries to prevent injection.

/**
 * Returns all harbours from D1 as an { id: name } map.
 */
export async function getHarbourDatabase(
  env: CloudflareEnv
): Promise<HarbourDatabase> {
  const { results } = await env.DB.prepare(
    `SELECT id, name FROM harbour_table;`
  ).all<{ id: string; name: string }>();

  return Object.fromEntries(results.map((r) => [r.id, r.name]));
}

/**
 * Returns a single harbour row by ID, or null if not found.
 */
export async function getHarbourById(
  id: string | number,
  env: CloudflareEnv
): Promise<Harbour | null> {
  try {
    return await env.DB.prepare(
      `SELECT id, name FROM harbour_table WHERE id = ?`
    )
      .bind(id)
      .first<Harbour>();
  } catch {
    return null;
  }
}

/**
 * Returns a single harbour row by name (case-insensitive), or null if not found.
 */
export async function getHarbourByName(
  name: string,
  env: CloudflareEnv
): Promise<Harbour | null> {
  try {
    return await env.DB.prepare(
      `SELECT id, name FROM harbour_table WHERE UPPER(name) LIKE UPPER(?)`
    )
      .bind(name)
      .first<Harbour>();
  } catch {
    return null;
  }
}

/**
 * Syncs the D1 table with a fresh { id: name } map from maree.info.
 * Inserts new harbours and updates any whose name changed.
 */
export async function updateHarbourDatabase(
  harbourData: HarbourDatabase,
  env: CloudflareEnv
): Promise<void> {
  const existing = await getHarbourDatabase(env);

  const writes = Object.entries(harbourData)
    .filter(([id, name]) => existing[id] !== name)
    .map(([id, name]) => insertHarbour(id, name, env));

  await Promise.all(writes);
}

// ── Internal ───────────────────────────────────────────────────────────────

async function insertHarbour(
  id: string,
  name: string,
  env: CloudflareEnv
): Promise<D1Result> {
  return env.DB.prepare(`INSERT OR REPLACE INTO harbour_table (id, name) VALUES (?, ?)`)
    .bind(id, name)
    .run();
}
