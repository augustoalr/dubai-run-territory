import type { Metadata, Viewport } from "next";
import { Oswald, Outfit } from "next/font/google";
import { RegisterSw } from "@/components/RegisterSw";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Territorio · Jumeirah",
  description:
    "Mapa de celdas de la pista de running entre Jumeirah Beach y Kite Beach. Cada liga compite en su propio territorio.",
  applicationName: "Territorio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Territorio",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${outfit.variable} ${oswald.variable} h-full`}>
      <body className="h-full bg-ink text-paper antialiased">
        {children}
        <RegisterSw />
      </body>
    </html>
  );
}
