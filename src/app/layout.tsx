import type { Metadata } from "next";
import { Libre_Caslon_Text, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo/constants";

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

const DEFAULT_TITLE = "Product Management Resources, Ebooks & Templates · Product Slice HQ";
const DEFAULT_DESCRIPTION =
  "Free product management resources, ebooks, templates, and AI-assisted product development guides. Built by a Top 1% ADPList mentor for PMs, designers, and founders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${libreCaslon.variable} ${plusJakarta.variable}`}>
      <body>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <PostHogPageView />
        {children}
      </body>
    </html>
  );
}
