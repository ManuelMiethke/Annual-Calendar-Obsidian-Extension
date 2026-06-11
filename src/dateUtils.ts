const MONTH_NAMES = {
  de: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
} as const;

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function isValidDate(year: number, monthIndex: number, day: number): boolean {
  if (day < 1 || day > 31 || monthIndex < 0 || monthIndex > 11) {
    return false;
  }

  return day <= getDaysInMonth(year, monthIndex);
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateYYYYMMDD(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function normalizeDateRange(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } {
  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

export function isDateWithinRange(date: string, startDate: string, endDate: string): boolean {
  const normalized = normalizeDateRange(startDate, endDate);
  return date >= normalized.startDate && date <= normalized.endDate;
}

export function formatDateWithPattern(
  year: number,
  monthIndex: number,
  day: number,
  pattern: string,
): string {
  return pattern
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, pad2(monthIndex + 1))
    .replace(/DD/g, pad2(day));
}

export function isToday(year: number, monthIndex: number, day: number): boolean {
  const today = new Date();
  return (
    year === today.getFullYear() &&
    monthIndex === today.getMonth() &&
    day === today.getDate()
  );
}

export function isPast(year: number, monthIndex: number, day: number): boolean {
  const candidate = new Date(year, monthIndex, day);
  candidate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return candidate.getTime() < today.getTime();
}

export function isWeekend(year: number, monthIndex: number, day: number): boolean {
  const date = new Date(year, monthIndex, day);
  const weekday = date.getDay();
  return weekday === 0 || weekday === 6;
}

export function getMonthNames(language: "de" | "en"): readonly string[] {
  return MONTH_NAMES[language];
}
