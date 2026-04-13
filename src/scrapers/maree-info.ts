import { load } from "cheerio";
import { parse } from "acorn";
import type {
  TideEntry,
  TideType,
  CoeffLabel,
  DayForecast,
  RawTideData,
  TideExtraData,
  DayForecastWithIndex,
  HarbourDatabase,
  NearestHarboursRaw,
} from "../types";

const BASE_URL = "https://maree.info/";
const HTML_OPTIONS: RequestInit = {
  method: "GET",
  headers: { "Content-Type": "text/html;charset=utf-8" },
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches and parses the full harbour list from maree.info.
 * Returns an object mapping harbour ID → harbour name.
 */
export async function fetchHarboursData(): Promise<HarbourDatabase> {
  try {
    const html = await fetchPage(BASE_URL);
    const content = extractElementHtml(html, "PortsListe_Content_0");
    return parseHarbourList(content);
  } catch (error) {
    console.error("Error fetching harbour list:", error);
    (error as any).status = 404;
    throw error;
  }
}

/**
 * Fetches and parses tide data for a given harbour ID.
 * Returns an object keyed by date (yyyymmddx) with tide entries for each day.
 */
export async function fetchTideData(harbourId: string): Promise<RawTideData> {
  try {
    const html = await fetchPage(`${BASE_URL}${harbourId}`);
    const content = extractElementHtml(html, "MareeJours_Content");
    return parseTideTable(content);
  } catch (error) {
    console.error(`Error fetching tide data for harbour ${harbourId}:`, error);
    (error as any).status = 404;
    throw error;
  }
}

/**
 * Searches maree.info for harbours matching a given name.
 * Returns { availableHarbours, nearHarbours } or throws on failure.
 */
export async function fetchNearestHarbours(
  name: string
): Promise<NearestHarboursRaw> {
  try {
    const js = await fetchNearestHarboursJs(name);
    const innerHtml = extractInnerHtmlFromJs(js);
    return parseHarbourSearchResults(innerHtml);
  } catch (error) {
    console.error("Error fetching nearest harbours:", error);
    (error as any).status = 404;
    throw error;
  }
}

/**
 * Processes raw tide data into a summary object.
 * Always computed fresh — never cached — so last_tide and next_tide are accurate.
 */
export function extractExtraData(tideData: RawTideData): TideExtraData {
  let forecast: Partial<DayForecastWithIndex> = {};
  let lastTide: TideEntry | null = null;
  let nextTide: TideEntry | null = null;
  let nowFound = false;

  const now = new Date();
  // Tide times from maree.info are in Europe/Paris local time. We store them
  // with a Z suffix so the UTC numeric value equals the Paris clock value.
  // Mirror that trick for `now` so both sides are directly comparable.
  const nowParisNaive = new Date(
    now.toLocaleString("sv", { timeZone: "Europe/Paris" }).replace(" ", "T") +
      ".000Z"
  );

  for (const [key, value] of Object.entries(tideData)) {
    const dateIndex = key.slice(0, -1);
    const dayOffset = Number(key.slice(-1));
    const year = dateIndex.slice(0, 4);
    const month = dateIndex.slice(4, 6);
    const day = dateIndex.slice(6, 8);

    if (dayOffset === 0) {
      forecast = { date_index: dateIndex, ...value };
    }

    for (const tide of value.tide_data) {
      const dateString = `${year}-${month}-${day}T${tide.time.replace("h", ":")}:00.000Z`;
      const date = new Date(dateString);
      date.setDate(date.getDate() + dayOffset);

      tide.timestamp = date.toLocaleString("fr-FR");

      if (!nowFound) {
        if (date > nowParisNaive) {
          nextTide = tide;
          nowFound = true;
        } else {
          lastTide = tide;
        }
      }
    }
  }

  return { forecast, last_tide: lastTide, next_tide: nextTide, data: tideData };
}

// ── Fetching ───────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, HTML_OPTIONS);
  return response.text();
}

async function fetchNearestHarboursJs(name: string): Promise<string> {
  // maree.info requires a session cookie for the search endpoint
  const page = await fetch(BASE_URL, HTML_OPTIONS);
  const cookies = page.headers.get("set-cookie");

  const response = await fetch(
    `${BASE_URL}do/ports-liste-recherche.php?q=${encodeURIComponent(name)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "text/javascript;charset=utf-8",
        Cookie: cookies ?? "",
      },
    }
  );
  return response.text();
}

// ── Parsing ────────────────────────────────────────────────────────────────

function extractElementHtml(html: string, elementId: string): string {
  const $ = load(html);
  const el = $(`#${elementId}`);
  if (el.length === 0) {
    console.error(`Element #${elementId} not found in HTML`);
    return "";
  }
  return el.html() ?? "";
}

function parseHarbourList(html: string): HarbourDatabase {
  const $ = load(html);
  const result: HarbourDatabase = {};
  $("a").each((_, el) => {
    const id = $(el).attr("href")?.replace("/", "") ?? "";
    const name = $(el).text();
    if (id) result[id] = name;
  });
  return result;
}

function parseTideTable(html: string): RawTideData {
  const $ = load(html);
  const result: RawTideData = {};

  $("#MareeJours tr.MJ").each((_, element) => {
    const row = $(element);
    const dateLink = row.find("th a");

    const onmouseover = dateLink.attr("onmouseover") ?? "";
    const match = onmouseover.match(/\?d=(\d+)/);
    if (!match) return;
    const dateKey = match[1];

    const dateNum = dateLink.find("b").text();
    const dayName = dateLink.text().replace(dateNum, "").trim();
    const year = dateKey.slice(0, 4);
    const monthNum = parseInt(dateKey.slice(4, 6), 10) - 1;
    const monthName = Intl.DateTimeFormat("fr", { month: "long" }).format(
      new Date(parseInt(year, 10), monthNum, 1)
    );

    // The cell text combines times (00h00), heights (0,00m) and coefficients
    const cellText = row
      .find("td")
      .text()
      .split("\n")
      .map((s) => s.trim())
      .join("");

    const timeIndex = cellText.lastIndexOf("h") + 3;
    const highIndex = cellText.lastIndexOf("m") + 1;

    const times = cellText.slice(0, timeIndex).match(/.{1,5}/g) ?? [];
    const heights = cellText.slice(timeIndex, highIndex).match(/[\d.,]+m/g) ?? [];
    const coeffs = cellText
      .slice(highIndex)
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    result[dateKey] = {
      date: `${dayName} ${dateNum} ${monthName} ${year}`,
      tide_data: buildTideArray(times, heights, coeffs),
    };
  });

  return result;
}

function buildTideArray(
  times: string[],
  heights: string[],
  coeffs: string[]
): TideEntry[] {
  const firstType = inferFirstTideType(heights);
  const secondType: TideType = firstType === "high_tide" ? "low_tide" : "high_tide";

  return times.map((time, i) => {
    const entry: TideEntry = {
      type: i % 2 === 0 ? firstType : secondType,
      time,
      high: heights[i],
    };
    if (i % 2 === 0) {
      const coeff = coeffs[i / 2];
      entry.coeff = coeff;
      entry.coeff_label = coefficientLabel(coeff);
    }
    return entry;
  });
}

/**
 * Returns a French tidal range label for a given coefficient (0–120).
 *
 * Standard French classification:
 *   ≤ 45  → morte-eau (neap tide — weak range)
 *   ≤ 70  → normale
 *   ≤ 95  → vive-eau (spring tide)
 *   > 95  → vive-eau exceptionnelle
 */
function coefficientLabel(coeff: string): CoeffLabel | null {
  const n = parseInt(coeff, 10);
  if (isNaN(n)) return null;
  if (n <= 45) return "morte-eau";
  if (n <= 70) return "normale";
  if (n <= 95) return "vive-eau";
  return "vive-eau exceptionnelle";
}

function inferFirstTideType(heights: string[]): TideType {
  try {
    const first = parseFloat(heights[0].replace(",", "."));
    const second = parseFloat(heights[1].replace(",", "."));
    return first > second ? "high_tide" : "low_tide";
  } catch {
    return "high_tide";
  }
}

// maree.info returns a JS snippet that sets e.innerHTML; we parse the AST to
// extract the HTML string rather than relying on fragile regex.
function extractInnerHtmlFromJs(jsString: string): string {
  try {
    const ast = parse(jsString, { ecmaVersion: "latest" });
    let value: string | undefined;

    function traverse(node: any): void {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "AssignmentExpression" &&
        node.left?.object?.name === "e" &&
        node.left?.property?.name === "innerHTML" &&
        node.right?.type === "Literal"
      ) {
        value = node.right.value as string;
      } else {
        for (const key in node) {
          if (node[key] && typeof node[key] === "object") traverse(node[key]);
        }
      }
    }

    traverse(ast);
    return value ?? "";
  } catch (error) {
    console.error("Error parsing maree.info JS response:", error);
    return "";
  }
}

function parseHarbourSearchResults(html: string): NearestHarboursRaw {
  const $ = load(html);

  const pick = (selector: string): Array<{ id: number }> =>
    $(selector)
      .map((_, el) => ({
        id: parseInt($(el).attr("href")?.split("/").pop() ?? "0", 10),
      }))
      .get();

  return {
    availableHarbours: pick('div.TYPE:contains("ports disponibles") + a'),
    nearHarbours: pick('div.TYPE:contains("au plus proche d\'un port") + a'),
  };
}
