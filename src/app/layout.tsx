import type { Metadata, Viewport } from "next";
import { Anton, Barlow } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { BarkOnStart } from "@/components/BarkOnStart";
import { RegisterSW } from "@/components/RegisterSW";
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
const SITE = "https://biofido.it";
// Il mirror su GitHub Pages (build con GITHUB_PAGES=true) è un DOPPIONE di
// biofido.it: lo marchiamo noindex così Google indicizza solo il dominio vero.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const TITLE = "BioFido — il segugio del biologico vicino a te";
const DESCRIPTION =
  "BioFido trova sulla mappa i produttori, i negozi e le attività biologiche vicino alla tua posizione, fino a 70 km (chilometro zero), e ti aiuta a raggiungerli.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  robots: isGitHubPages ? { index: false, follow: true } : { index: true, follow: true },
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "BioFido",
  keywords: [
    "biologico vicino a me",
    "produttori bio km0",
    "negozi bio",
    "mercato contadino",
    "filiera corta",
    "prodotti biologici locali",
  ],
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "BioFido", statusBarStyle: "default" },
  icons: {
    icon: `${BASE}/brand/icon-192.png`,
    apple: `${BASE}/brand/icon-180.png`,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "BioFido",
    url: SITE,
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE}/demo/onboarding/img/campagna.jpg`],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE}/demo/onboarding/img/campagna.jpg`],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "BioFido",
      url: SITE,
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      url: SITE,
      name: "BioFido",
      inLanguage: "it-IT",
      publisher: { "@id": `${SITE}/#org` },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer portale="BioFido" />
        <BarkOnStart />
        <RegisterSW />
        <UpdateChecker />
        <CookieBanner />
        <AccessibilityWidget />
      </body>
    </html>
  );
}
