import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

export const metadata: Metadata = {
  // Without metadataBase, Next cannot turn the relative OG/Twitter image paths
  // below into the absolute URLs those tags require — so the card renders
  // without an image on every platform that fetches it.
  metadataBase: new URL("https://www.integramarkets.app"),
  // The apex answers 307 to www. Without a canonical, both forms can be indexed
  // separately and the ranking signal is split between them.
  alternates: { canonical: "/" },
  title: "Integra Markets | Commodity Trading Intelligence",
  description: "Real time sentiment analysis, trade ideas, and market insights for commodities. Track oil, gold, natural gas, and agricultural markets with intelligent alerts.",
  keywords: ["commodity trading", "oil prices", "gold trading", "sentiment analysis", "market intelligence", "natural gas", "commodities", "trading platform"],
  authors: [{ name: "Integra Markets" }],
  creator: "Integra Markets",
  publisher: "Integra Markets",
  robots: "index, follow",
  icons: {
    icon: "/NewLogoInt.png.png",
    shortcut: "/NewLogoInt.png.png",
    apple: "/NewLogoInt.png.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://integramarkets.app",
    siteName: "Integra Markets",
    title: "Integra Markets | Commodity Trading Intelligence",
    description: "Real time sentiment analysis, trade ideas, and market insights for commodities. Track oil, gold, natural gas, and agricultural markets.",
    images: [
      {
        url: "/NewLogoInt.png.png",
        width: 512,
        height: 512,
        alt: "Integra Markets Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integra Markets | Commodity Trading Intelligence",
    description: "Real time sentiment analysis and trade ideas for commodity traders.",
    images: ["/NewLogoInt.png.png"],
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#000000",
};


/**
 * Structured data, for two readers.
 *
 * Google uses SoftwareApplication to render a rich result — rating, price,
 * platform — instead of a plain blue link. And an LLM crawling the page gets a
 * machine-readable description of what this is, rather than having to infer it
 * from marketing copy. The site previously offered neither: no JSON-LD at all,
 * so both had to guess.
 *
 * Kept deliberately narrow. No aggregateRating, because inventing review counts
 * is the fastest way to get structured data ignored or penalised, and no
 * offers block until the pricing is settled.
 */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.integramarkets.app/#organization",
      name: "Integra Markets",
      url: "https://www.integramarkets.app",
      logo: "https://www.integramarkets.app/NewLogoInt.png.png",
      email: "support@integramarkets.app",
    },
    {
      "@type": "SoftwareApplication",
      name: "Integra Markets",
      applicationCategory: "FinanceApplication",
      operatingSystem: "iOS, Web",
      url: "https://www.integramarkets.app",
      publisher: { "@id": "https://www.integramarkets.app/#organization" },
      description:
        "Commodity news sentiment with the evidence attached: every score names " +
        "the rule that produced it and quotes the words from the article. " +
        "Energy, metals, agriculture and the macro subjects they transmit " +
        "through, continuous from 2020.",
      featureList: [
        "Named sentiment signals with quoted source evidence",
        "Sample size reported on every aggregate",
        "Daily sentiment history per commodity",
        "Prediction-market divergence against Polymarket and Kalshi",
        "REST API and Claude MCP connector",
        "CSV and XLSX export",
      ],
    },
    {
      "@type": "WebSite",
      url: "https://www.integramarkets.app",
      name: "Integra Markets",
      publisher: { "@id": "https://www.integramarkets.app/#organization" },
      inLanguage: "en",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="icon" href="/NewLogoInt.png.png" type="image/png" />
        <link rel="apple-touch-icon" href="/NewLogoInt.png.png" />
      </head>
      <body className="antialiased bg-black text-white selection:bg-emerald-500/30">
        <script
          type="application/ld+json"
          // Serialised server-side; the object above is a literal, so there is
          // no user input in this string.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {children}
      </body>
    </html>
  );
}
