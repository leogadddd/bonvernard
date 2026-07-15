import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Shop and Checkout | PhysiCare",
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return <Storefront />;
}
