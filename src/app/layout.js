import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/pwa/PWARegister";
import SWRProvider from "@/components/layout/SWRProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kanban - Gestão de Projetos",
  description: "Plataforma de gerenciamento visual de tarefas baseada em Kanban",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  );
}
