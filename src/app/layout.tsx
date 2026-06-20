import type { Metadata } from "next";
import { Libre_Caslon_Text, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const libreCaslon = Libre_Caslon_Text({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--loaded-serif",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--loaded-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Product Slice HQ | Practical Product Thinking",
  description: "Resources, frameworks, and community for product managers across Africa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${libreCaslon.variable} ${plusJakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
