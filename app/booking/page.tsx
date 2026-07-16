import { Suspense } from "react";
import { BookingPageClient } from "./booking-page-client";

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f8fc]" />}>
      <BookingPageClient />
    </Suspense>
  );
}
