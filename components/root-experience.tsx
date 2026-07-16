"use client";

import { useEffect, useState } from "react";
import { StandaloneShell } from "@/components/standalone-shell";
import { Storefront } from "@/components/storefront";

export function RootExperience() {
  const [embedded, setEmbedded] = useState<boolean | null>(null);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  if (embedded === null) {
    return <div className="min-h-screen bg-white" aria-label="Loading" />;
  }

  return embedded ? <Storefront /> : <StandaloneShell page="Home" />;
}
