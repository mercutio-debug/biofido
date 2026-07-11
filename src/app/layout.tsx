import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Anton, Barlow } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
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

// Fido saluta con un "bau" all'apertura. Script INLINE (eseguito durante il
// parsing dell'HTML, PRIMA dell'hydration di React) così parte subito e non
// "dopo qualche secondo". Tentativo immediato d'autoplay; se bloccato, al primo
// tocco/tasto. Una sola volta per sessione. Il file è precaricato (<link>).
const BAU_SRC = `${BASE}/audio/bau.mp3`;
const barkScript = `(function(){try{
  if(sessionStorage.getItem('biofido_bark'))return;
  var d=false, a=new Audio(${JSON.stringify(BAU_SRC)});
  a.preload='auto'; a.volume=0.75;
  function c(){window.removeEventListener('pointerdown',g);window.removeEventListener('keydown',g);window.removeEventListener('touchstart',g);}
  function g(){if(d)return;var p=a.play();if(p&&p.then){p.then(function(){d=true;try{sessionStorage.setItem('biofido_bark','1');}catch(e){}c();}).catch(function(){});}}
  g();
  window.addEventListener('pointerdown',g);
  window.addEventListener('keydown',g);
  window.addEventListener('touchstart',g);
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${anton.variable} ${barlow.variable}`}>
      <body className="min-h-full flex flex-col">
        {/* Abbaio all'apertura: precarico il file e lo faccio partire subito,
            prima dell'hydration (vedi barkScript). */}
        <link rel="preload" as="audio" href={BAU_SRC} />
        <Script id="bark-on-start" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: barkScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer portale="BioFido" />
        <RegisterSW />
        <UpdateChecker />
        <CookieBanner />
        <AccessibilityWidget />
      </body>
    </html>
  );
}
