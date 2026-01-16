import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Vibrant Staff App",
  description: "Sistem Pengurusan Tugasan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className={publicSans.variable}>
      <body suppressHydrationWarning className="bg-neo-bg text-neo-dark min-h-screen flex flex-col selection:bg-neo-yellow selection:text-neo-dark font-sans transition-colors duration-300 dark:bg-zinc-950 dark:text-white">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
