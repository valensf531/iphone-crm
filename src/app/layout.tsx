import type { Metadata, Viewport } from "next";
import { Manrope, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const ui = Manrope({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://iphone-crm.vercel.app"),
  title: "iPhone CRM - Stock, Canje y Garantías",
  description:
    "CRM para tienda de iPhones: stock por IMEI, dólar Blue/Oficial Argentina, plan canje y garantías.",
  openGraph: {
    title: "iPhone CRM",
    description:
      "Stock por IMEI, dólar Blue/Oficial, plan canje y garantías.",
    images: ["/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "iPhone CRM",
    description:
      "Stock por IMEI, dólar Blue/Oficial, plan canje y garantías.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${ui.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.bluelytics.com.ar" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
