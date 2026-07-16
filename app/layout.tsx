import type { Metadata } from "next";
import { PT_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const ptSans = PT_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://physicare-checkout.vercel.app",
  ),
  title: "PhysiCare Therapy Wellness Center",
  description:
    "Book therapy services and shop recovery essentials from PhysiCare Therapy Wellness Center.",
  openGraph: {
    title: "PhysiCare Therapy Wellness Center",
    description:
      "Book therapy services and shop recovery essentials from PhysiCare Therapy Wellness Center.",
    siteName: "PhysiCare Therapy Wellness Center",
    images: [
      {
        url: "/logo.png",
        width: 510,
        height: 458,
        alt: "PhysiCare Therapy Wellness Center logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PhysiCare Therapy Wellness Center",
    description:
      "Book therapy services and shop recovery essentials from PhysiCare Therapy Wellness Center.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={ptSans.className}>
        {children}
        <Toaster
          richColors
          position="top-right"
          offset={65}
          className="!right-8"
        />
      </body>
    </html>
  );
}
