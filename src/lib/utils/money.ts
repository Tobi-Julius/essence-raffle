/**
 * Money is always an integer (whole Naira) paired with an explicit currency
 * code. Never use floating point for monetary math anywhere in this codebase.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const formatted = new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
  }).format(Math.trunc(amount));
  return `${symbol}${formatted}`;
}
