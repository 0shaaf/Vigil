import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createSupabaseServerClient } from "./lib/supabase/server-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vigil — Dead Man's Switch Engine",
  description: "Automated fail-safe telemetry and privileged credential dissemination",
};

export default async function RootLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}