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
    <header className="sticky top-0 z-20 flex min-h-[56px] items-center justify-between gap-2 border-b border-[#dfe7f1] bg-white px-4 sm:gap-4 sm:px-[clamp(20px,1vw+9px,64px)]">
      <Link
        className="inline-flex min-w-0 flex-1 items-center gap-3 text-[#111827] no-underline"
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
      <div className="flex shrink-0 items-center gap-2">
        {showCart && (
          <button
            className="relative inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#dfe7f1] text-[#0a388f] transition hover:bg-[#eff6ff] sm:h-10 sm:w-10"
            type="button"
            onClick={onCartClick}
            aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          >
            <ShoppingCart
              aria-hidden="true"
              className="h-5 w-5"
              strokeWidth={1.4}
            />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 grid h-5 min-w-5 translate-x-1/3 -translate-y-1/3 place-items-center rounded-full bg-[#0a388f] px-1 text-[11px] font-bold leading-none text-white">
                {cartCount}
              </span>
            )}
          </button>
        )}
        <a
          href="https://sites.google.com/student.fatima.edu.ph/physicare/home"
          target="_top"
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-2 py-2 text-sm font-medium hover:underline sm:px-5 sm:text-base"
          aria-label="Return to Physicare website"
        >
          Back to Site
        </a>
      </div>
    </header>
  );
}
