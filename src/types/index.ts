// ── Cloudflare bindings ────────────────────────────────────────────────────

export interface CloudflareEnv {
  DB: D1Database;
  TIDE_KV?: KVNamespace;
}

// ── Tide ───────────────────────────────────────────────────────────────────

export type TideType = "high_tide" | "low_tide";

export type CoeffLabel =
  | "morte-eau"
  | "normale"
  | "vive-eau"
  | "vive-eau exceptionnelle";

export interface TideEntry {
  type: TideType;
  time: string;
  high: string;
  coeff?: string;
  coeff_label?: CoeffLabel | null;
  timestamp?: string;
}

export interface DayForecast {
  date: string;
  tide_data: TideEntry[];
}

export interface DayForecastWithIndex extends DayForecast {
  date_index: string;
}

/** Raw tide data keyed by maree.info date key (yyyymmddx). */
export type RawTideData = Record<string, DayForecast>;

export interface TideExtraData {
  forecast: Partial<DayForecastWithIndex>;
  last_tide: TideEntry | null;
  next_tide: TideEntry | null;
  data: RawTideData;
}

export interface TideResponse extends TideExtraData {
  id: string;
  name: string;
  cached: boolean;
}

// ── Harbour ────────────────────────────────────────────────────────────────

export interface Harbour {
  id: string | number;
  name: string;
}

/** All harbours as { id: name }. */
export type HarbourDatabase = Record<string, string>;

export interface NearestHarboursRaw {
  availableHarbours: Array<{ id: number }>;
  nearHarbours: Array<{ id: number }>;
}

export type HarbourLookupResult =
  | { harbour: Harbour }
  | {
      availableHarbours: Array<{ harbour: Harbour | null }>;
      nearHarbours: Array<{ harbour: Harbour | null }>;
    };
