import type { Metadata, Viewport } from "next";
import { Anton, Barlow } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BarkOnStart } from "@/components/BarkOnStart";
import { RegisterSW } from "@/components/RegisterSW";
import { InstallPopup } from "@/components/InstallPopup";
import { UpdateChecker } from "@/components/UpdateChecker";
import { CookieBanner } from "@/components/CookieBanner";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "BioFido — il segugio del biologico vicino a te",
  description:
    "BioFido trova sulla mappa i produttori, i negozi e le attività biologiche vicino alla tua posizione, fino a 70 km (chilometro zero), e ti aiuta a raggiungerli.",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "BioFido", statusBarStyle: "default" },
  icons: {
    icon: `${BASE}/brand/icon-192.png`,
    apple: `${BASE}/brand/icon-180.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#5baf38",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${anton.variable} ${barlow.variable}`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BarkOnStart />
        <RegisterSW />
        <InstallPopup />
        <UpdateChecker />
        <CookieBanner />
        <AccessibilityWidget />
      </body>
    </html>
  );
}
