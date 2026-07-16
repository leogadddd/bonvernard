"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

type SiteHeaderProps = {
  cartCount?: number;
  onCartClick?: () => void;
  showCart?: boolean;
};

export function SiteHeader({
  cartCount = 0,
  onCartClick,
  showCart = false,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[56px] items-center justify-between gap-4 border-b border-[#dfe7f1] bg-white px-[clamp(20px,1vw+9px,64px)]">
      <Link
        className="inline-flex min-w-0 items-center gap-3 text-[#111827] no-underline"
        href="/"
        aria-label="PhysiCare Therapy Wellness Center home"
      >
        {/* <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden bg-white">
          <img
            src="/logo.png"
            alt=""
            className="h-full w-full object-contain"
          />
        </span> */}
        <div className="min-w-0">
          <strong className="block truncate text-base font-bold sm:text-[20px]">
            PhysiCare Therapy Wellness Center
          </strong>
        </div>
      </Link>
      <div>
        {showCart && (
          <button
            className="inline-flex shrink-0 items-center justify-center gap-2 px-5 py-2 hover:underline"
            type="button"
            onClick={onCartClick}
            aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          >
            <ShoppingCart
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={1.4}
            />
            <span>{cartCount}</span>
          </button>
        )}
        <a
          href="https://sites.google.com/student.fatima.edu.ph/physicare/home"
          target="_top"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm px-5 py-2 text-base font-medium hover:underline"
          aria-label="Return to Physicare website"
        >
          Back to Site
        </a>
      </div>
    </header>
  );
}
