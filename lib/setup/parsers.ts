// ============================================================================
//  Smart paste parsers for bulk student / class import during setup.
//  Accepts tab- or comma-separated rows copied from Excel, Google Sheets,
//  or exports from common studio management systems.
// ============================================================================

export type ParsedStudent = {
  fullName: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentEmail?: string;
};

export type ParsedClass = {
  name: string;
  discipline?: string;
  level?: string;
  dayOfWeek: number;
  startTime?: string;
  endTime?: string;
  capacity: number;
  priceCents: number;
};

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  // Simple CSV — doesn't handle quoted commas; good enough for paste-from-Excel
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findCol(headers: string[], needles: string[], exclude?: RegExp): number {
  const norm = headers.map(normHeader);
  for (const needle of needles) {
    const i = norm.findIndex((h, idx) => {
      if (exclude && exclude.test(headers[idx] ?? "")) return false;
      return h.includes(needle);
    });
    if (i >= 0) return i;
  }
  return -1;
}

function parseTime(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2] ? parseInt(m12[2], 10) : 0;
    if (m12[3].toLowerCase() === "pm" && h < 12) h += 12;
    if (m12[3].toLowerCase() === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})/);
  if (m24) {
    return `${String(parseInt(m24[1], 10)).padStart(2, "0")}:${m24[2]}`;
  }
  return undefined;
}

function parseDay(raw: string): number {
  const key = raw.trim().toLowerCase().slice(0, 3);
  if (DAY_MAP[key] !== undefined) return DAY_MAP[key];
  const full = raw.trim().toLowerCase();
  return DAY_MAP[full] ?? 1;
}

function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function parseStudentPaste(text: string): ParsedStudent[] {
  const lines = splitLines(text);
  if (lines.length === 0) return [];

  const rows = lines.map(splitRow);
  const first = rows[0];
  const hasHeader =
    first.some((c) => /name|email|phone|student|parent|guardian/i.test(c));

  let dataRows = rows;
  let nameCol = 0;
  let emailCol = 1;
  let phoneCol = 2;
  let parentCol = -1;
  let parentEmailCol = -1;

  if (hasHeader) {
    const headers = first;
    const norm = headers.map(normHeader);
    dataRows = rows.slice(1);
    nameCol = findCol(headers, ["student name", "student", "dancer"]);
    if (nameCol < 0) {
      const exactName = norm.findIndex((h) => h === "name");
      if (exactName >= 0) nameCol = exactName;
    }
    if (nameCol < 0) {
      const firstCol = findCol(headers, ["first"]);
      const lastCol = findCol(headers, ["last"]);
      if (firstCol >= 0 && lastCol >= 0) {
        nameCol = -2;
      }
    }
    emailCol = findCol(headers, ["student email", "e mail", "email"], /parent|guardian|family/i);
    phoneCol = findCol(headers, ["phone", "mobile", "cell"]);
    parentCol = findCol(headers, ["parent name", "guardian name", "parent guardian", "guardian", "parent", "family"], /email/i);
    parentEmailCol = findCol(headers, ["parent email", "guardian email", "family email"]);
  }

  const out: ParsedStudent[] = [];
  for (const row of dataRows) {
    if (row.every((c) => !c)) continue;

    let fullName: string;
    if (nameCol === -2 && hasHeader) {
      const firstCol = findCol(first, ["first"]);
      const lastCol = findCol(first, ["last"]);
      fullName = `${row[firstCol] ?? ""} ${row[lastCol] ?? ""}`.trim();
    } else {
      fullName = row[nameCol >= 0 ? nameCol : 0]?.trim() ?? "";
    }
    if (!fullName) continue;

    out.push({
      fullName,
      email: emailCol >= 0 ? row[emailCol]?.trim() || undefined : undefined,
      phone: phoneCol >= 0 ? row[phoneCol]?.trim() || undefined : undefined,
      parentName: parentCol >= 0 ? row[parentCol]?.trim() || undefined : undefined,
      parentEmail: parentEmailCol >= 0 ? row[parentEmailCol]?.trim() || undefined : undefined,
    });
  }
  return out;
}

export function parseClassPaste(text: string): ParsedClass[] {
  const lines = splitLines(text);
  if (lines.length === 0) return [];

  const rows = lines.map(splitRow);
  const first = rows[0];
  const hasHeader = first.some((c) =>
    /class|name|day|time|style|discipline|level|capacity|price/i.test(c),
  );

  let dataRows = rows;
  let nameCol = 0;
  let discCol = 1;
  let levelCol = -1;
  let dayCol = 2;
  let startCol = 3;
  let endCol = -1;
  let capCol = -1;
  let priceCol = -1;

  if (hasHeader) {
    const headers = first;
    dataRows = rows.slice(1);
    nameCol = findCol(headers, ["class name", "class", "name"]);
    discCol = findCol(headers, ["discipline", "style", "genre"]);
    levelCol = findCol(headers, ["level", "grade", "age"]);
    dayCol = findCol(headers, ["day", "weekday"]);
    startCol = findCol(headers, ["start time", "start"]);
    endCol = findCol(headers, ["end time", "end"]);
    capCol = findCol(headers, ["capacity", "max", "spots"]);
    priceCol = findCol(headers, ["price", "fee", "cost"]);
  }

  const out: ParsedClass[] = [];
  for (const row of dataRows) {
    if (row.every((c) => !c)) continue;
    const name = row[nameCol >= 0 ? nameCol : 0]?.trim();
    if (!name) continue;

    const dayRaw = dayCol >= 0 ? row[dayCol] ?? "Mon" : "Mon";
    const startRaw = startCol >= 0 ? row[startCol] ?? "" : "";
    const endRaw = endCol >= 0 ? row[endCol] ?? "" : "";

    out.push({
      name,
      discipline: discCol >= 0 ? row[discCol]?.trim() || undefined : undefined,
      level: levelCol >= 0 ? row[levelCol]?.trim() || undefined : undefined,
      dayOfWeek: parseDay(dayRaw),
      startTime: parseTime(startRaw),
      endTime: parseTime(endRaw),
      capacity: capCol >= 0 ? parseInt(row[capCol] ?? "20", 10) || 20 : 20,
      priceCents: priceCol >= 0 ? parsePrice(row[priceCol] ?? "0") : 0,
    });
  }
  return out;
}

export function suggestClassesFromStyles(styles: string[]): ParsedClass[] {
  const templates: Record<string, Omit<ParsedClass, "discipline">> = {
    Ballet: { name: "Ballet — Beginners", level: "Beginners", dayOfWeek: 1, startTime: "16:00", endTime: "17:00", capacity: 15, priceCents: 1800 },
    Jazz: { name: "Jazz — Juniors", level: "Juniors", dayOfWeek: 2, startTime: "16:30", endTime: "17:30", capacity: 18, priceCents: 1600 },
    "Hip-Hop": { name: "Hip-Hop — Teens", level: "Teens", dayOfWeek: 3, startTime: "17:00", endTime: "18:00", capacity: 20, priceCents: 1600 },
    Contemporary: { name: "Contemporary — Open", level: "Open", dayOfWeek: 4, startTime: "17:30", endTime: "18:30", capacity: 16, priceCents: 1700 },
    Tap: { name: "Tap — All levels", level: "Mixed", dayOfWeek: 5, startTime: "16:00", endTime: "17:00", capacity: 14, priceCents: 1500 },
  };

  return styles
    .filter((s) => templates[s])
    .map((s) => ({ ...templates[s], discipline: s }));
}
