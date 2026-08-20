import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Essence Store";

// Every page here reads live, personalized Firestore/Auth state (raffle
// status, entry status, admin data) — none of it is a valid static-export
// candidate, so the whole app renders per-request rather than being
// prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: `${companyName} Raffles`,
    template: `%s · ${companyName} Raffles`,
  },
  description: `Enter official ${companyName} raffles — register, pay by bank transfer, upload your receipt, and track your entry through to the live draw.`,
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
