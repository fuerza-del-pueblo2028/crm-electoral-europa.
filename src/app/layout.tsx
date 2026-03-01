import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://centinelaelectoralsaeeuropa.com"),
  title: {
    default: "CRM Electoral - Fuerza del Pueblo Europa",
    template: "%s | CRM Electoral FP Europa"
  },
  description: "Fuerza del Pueblo Europa. Secretaría de Asuntos Electorales. Plataforma oficial para la gestión de afiliados, centinelas electorales y procesos democráticos en la circunscripción de Europa. Centinelas de la democracia.",
  keywords: ["Fuerza del Pueblo", "CRM Electoral", "Europa", "Leonel Fernández", "Afiliados FP", "Estatutos FP", "Voto en el exterior"],
  authors: [{ name: "Fuerza del Pueblo Europa" }],
  creator: "Dirección de Tecnología FP Europa",
  publisher: "Fuerza del Pueblo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/logo-fp.png?v=1",
    apple: "/logo-fp.png?v=1",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CRM Electoral - FP Europa",
    description: "Fuerza del Pueblo Europa. Secretaría de Asuntos Electorales. Gestión eficiente de afiliados y procesos electorales en el exterior.",
    url: "https://centinelaelectoralsaeeuropa.com",
    siteName: "CRM Electoral FP Europa",
    images: [
      {
        url: "/logo-fp.png",
        width: 800,
        height: 600,
        alt: "Logo Fuerza del Pueblo",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRM Electoral - Fuerza del Pueblo Europa",
    description: "Plataforma de gestión electoral y afiliados.",
    images: ["/logo-fp.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col h-screen bg-gray-100/50`}
      >
        <Providers>
          <Header />

          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <main className="flex-1 overflow-y-auto p-3 md:p-6">
                {children}
              </main>
              <Footer />
            </div>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
