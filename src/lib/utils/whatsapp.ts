/**
 * Builds a wa.me deep link to the support WhatsApp number, prefilled with a
 * message. Payment proof verification happens entirely over WhatsApp — there
 * is no in-app upload step.
 */
export function whatsappLink(message: string): string | null {
  const number = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
