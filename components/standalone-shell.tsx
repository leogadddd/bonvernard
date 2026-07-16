import { SiteHeader } from "@/components/site-header";

export function StandaloneShell({ page }: { page: string }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main
        className="grid min-h-[calc(100vh-56px)] place-items-center bg-white px-6 py-12 text-center"
        aria-label={`${page} placeholder page`}
      >
        <div>
          <span className="text-xs font-black uppercase tracking-[.13em] text-[#165bc8]">
            Standalone site shell
          </span>
          <h1 className="my-2 text-[clamp(42px,8vw,88px)] font-black tracking-tight">{page}</h1>
          <p className="m-0 text-[#64748b]">This page is intentionally left as a clean placeholder.</p>
        </div>
      </main>
    </div>
  );
}
