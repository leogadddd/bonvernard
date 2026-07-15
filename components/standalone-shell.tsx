import Link from "next/link";

const pages = [
  ["Home", "/"],
  ["Services", "/services"],
  ["Products", "/products"],
  ["About", "/about"],
  ["Contact", "/contact"],
] as const;

export function StandaloneShell({ page }: { page: string }) {
  return (
    <div className="standalone-site">
      <header className="standalone-header">
        <Link className="brand" href="/" aria-label="PhysiCare home">
          <span className="brand-mark">+</span>
          <span>PhysiCare</span>
        </Link>
        <nav aria-label="Main navigation">
          {pages.map(([label, href]) => (
            <Link className={page === label ? "active" : ""} href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="standalone-empty" aria-label={`${page} placeholder page`}>
        <div>
          <span className="eyebrow">Standalone site shell</span>
          <h1>{page}</h1>
          <p>This page is intentionally left as a clean placeholder.</p>
        </div>
      </main>
    </div>
  );
}
