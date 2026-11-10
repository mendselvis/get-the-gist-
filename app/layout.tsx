import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// self-hosted (latin, SIL OFL) so builds don't depend on reaching Google Fonts
const inter = localFont({
  variable: "--font-inter",
  src: "./fonts/Inter-Variable.woff2",
  weight: "100 900",
  display: "swap",
});

const instrumentSerif = localFont({
  variable: "--font-instrument-serif",
  src: [
    { path: "./fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Get the Gist: any slide, explained in seconds",
  description:
    "Add a PDF, screenshot or photo of a lecture slide and watch it turn into a short animated explainer. Built for students who learn by seeing.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white font-sans text-ink">{children}</body>
    </html>
  );
}
