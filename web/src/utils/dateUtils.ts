/**
 * Date Utility for Jalali (Shamsi) Date Formatting & Grouping
 */

const toPersianDigits = (str: string): string => {
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d, 10)]);
};

export function formatJalaliDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const formatted = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    // standard fa-IR output format: "1405/05/12" or "۱۴۰۵/۰۵/۱۲"
    // normalize slashes and force Persian digits
    const cleaned = formatted.replace(/\//g, "/");
    return toPersianDigits(cleaned);
  } catch {
    return "";
  }
}

export function formatDateGroupHeader(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (msgDate.getTime() === today.getTime()) {
      return "امروز";
    }
    if (msgDate.getTime() === yesterday.getTime()) {
      return "دیروز";
    }

    return formatJalaliDate(isoString);
  } catch {
    return "";
  }
}

export function formatTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
