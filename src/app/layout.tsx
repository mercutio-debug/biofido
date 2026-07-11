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

// Lancio dell'app: splash bianco a tutto schermo col logo Fido → abbaio → dissolvenza.
// Script INLINE (beforeInteractive) così lo splash copre SUBITO la pagina, prima
// dell'hydration di React (niente lampo di homepage). Lo splash è iniettato via JS
// (non nel tree React → nessun conflitto di hydration) e rimosso dopo la dissolvenza.
// Una sola volta per SESSIONE: non riappare a ogni navigazione interna. File
// precaricati (<link>). Autoplay: tentativo subito, fallback al primo tocco.
const BAU_SRC = `${BASE}/audio/bau.mp3`;
const SPLASH_SRC = `${BASE}/brand/biofido-splash.png`;
const launchScript = `(function(){try{
  if(sessionStorage.getItem('biofido_launch'))return;
  sessionStorage.setItem('biofido_launch','1');
  var ov=document.createElement('div');
  ov.id='biofido-splash';
  ov.setAttribute('aria-hidden','true');
  ov.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#ffffff;opacity:1;transition:opacity .45s ease;';
  var img=document.createElement('img');
  img.src=${JSON.stringify(SPLASH_SRC)};
  img.alt='BioFido';
  img.decoding='async';
  img.style.cssText='width:62vw;max-width:280px;height:auto;';
  ov.appendChild(img);
  (document.body||document.documentElement).appendChild(ov);
  var a=new Audio(${JSON.stringify(BAU_SRC)}); a.preload='auto'; a.volume=0.75;
  var barked=false;
  function bark(){if(barked)return;var p=a.play();if(p&&p.then){p.then(function(){barked=true;}).catch(function(){});}}
  setTimeout(bark,350);
  window.addEventListener('pointerdown',bark);
  window.addEventListener('touchstart',bark);
  window.addEventListener('keydown',bark);
  setTimeout(function(){ov.style.opacity='0';setTimeout(function(){if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);},520);},1400);
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${anton.variable} ${barlow.variable}`}>
      <body className="min-h-full flex flex-col">
        {/* Lancio (splash + abbaio): precarico logo e audio, poi lo script di
            lancio parte prima dell'hydration (vedi launchScript). */}
        <link rel="preload" as="image" href={SPLASH_SRC} />
        <link rel="preload" as="audio" href={BAU_SRC} />
        <Script id="biofido-launch" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: launchScript }} />
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
