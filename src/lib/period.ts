/**
 * Period logic.
 *
 * A "period" is the app's budgeting window and does NOT follow the calendar
 * month. The user picks a start day (e.g. payday on the 25th). The period that
 * covers a given date runs from the most recent start-day up to the day before
 * the next start-day.
 *
 * Example (startDay = 25):
 *   July period  →  25 Jun … 24 Jul
 */

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface PeriodDraft {
  name: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
}

/**
 * Build the period window that contains `date`, given a payday `startDay`.
 * Clamps startDay to the last day of short months (e.g. 31 → 28/29 in Feb).
 */
export function buildPeriodForDate(date: Date, startDay: number): PeriodDraft {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const day = date.getDate();

  const clamp = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Math.min(startDay, lastDay);
  };

  let startYear = y;
  let startMonth = m;
  if (day < clamp(y, m)) {
    // we're before this month's start-day → the period began last month
    startMonth = m - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = y - 1;
    }
  }

  const start = new Date(startYear, startMonth, clamp(startYear, startMonth));

  // end = day before next month's start-day
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }
  const end = new Date(endYear, endMonth, clamp(endYear, endMonth));
  end.setDate(end.getDate() - 1);

  // The period is "named" after the month it mostly falls in (its end month).
  const name = `${MONTHS_ID[end.getMonth()]} ${end.getFullYear()}`;

  return { name, startDate: iso(start), endDate: iso(end) };
}

/** Is `date` (yyyy-mm-dd or Date) inside [start, end] inclusive? */
export function dateInPeriod(date: string | Date, startDate: string, endDate: string): boolean {
  const d = typeof date === "string" ? date : iso(date);
  return d >= startDate && d <= endDate;
}
