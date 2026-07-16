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
  title: "PhysiCare Therapy Wellness Center",
  description:
    "products, services, and cart flow for PhysiCare Therapy Wellness Center.",
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
