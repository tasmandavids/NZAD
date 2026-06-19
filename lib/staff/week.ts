export function getWeekRange(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() + i);
    weekDates.push(cur.toISOString().slice(0, 10));
  }

  return {
    weekStart: weekDates[0]!,
    weekEnd: weekDates[6]!,
    weekDates,
  };
}

export function addWeeks(isoDate: string, weeks: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function formatTimeShort(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${ampm}`;
}
