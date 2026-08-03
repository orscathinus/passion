"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCmsDocument } from "./CmsProvider";

const navItems = [
  ["/qa-rules", "Q&A + Rules"],
  ["/contact", "Contact + Contributions"],
] as const;

export function SiteHeader() {
  const cms = useCmsDocument();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <svg className="brand-mark" viewBox="0 0 112 72" aria-hidden="true">
            <path className="brand-mark-leg" d="M3 68 31 9c.8-1.9 2-3 4.4-3H46L22 68H3Z" />
            <path className="brand-mark-leg" d="M66 6h10.6c2.4 0 3.6 1.1 4.4 3l28 59H90L66 6Z" />
            <path className="brand-mark-spire" d="M55 18v7" />
            <path className="brand-mark-skyline" d="M17 59v-8h7v-6h6v6h5V39h7v-6h6v10h4V26h7v13h5V31h7v14h5V37h7v-6h7v16h6v4h7v8H17Z" />
            <g className="brand-mark-windows">
              <path d="M38 44h2.5v4H38zM44 38h2.5v4H44zM54.25 31h2.5v4h-2.5zM66 36h2.5v4H66zM78.5 41h2.5v4H78.5zM86 36h2.5v4H86z" />
            </g>
          </svg>
          <span>{cms.site.brandName}</span>
        </Link>
        <button className="menu-button" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">Toggle menu</span><i /><i />
        </button>
        <nav id="site-nav" className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <Link className={pathname === "/mission" ? "active" : ""} href="/mission" onClick={() => setOpen(false)}>Mission</Link>
          <Link className={pathname === "/who-we-are" ? "active" : ""} href="/who-we-are" onClick={() => setOpen(false)}>Who We Are</Link>
          <div className={`nav-dropdown ${pathname.startsWith("/inquiry") ? "active" : ""}`}>
            <Link href="/inquiry" onClick={() => setOpen(false)}>Tree of Inquiry <span aria-hidden="true">⌄</span></Link>
            <div className="nav-popover"><span>Projects</span><Link href="/inquiry" onClick={() => setOpen(false)}><b>Family Court</b><small>Tree + focused claims</small></Link></div>
          </div>
          <div className={`nav-dropdown ${pathname.startsWith("/exhibits") ? "active" : ""}`}>
            <Link href="/exhibits" onClick={() => setOpen(false)}>Exhibits <span aria-hidden="true">⌄</span></Link>
            <div className="nav-popover"><span>Projects</span><Link href="/exhibits" onClick={() => setOpen(false)}><b>Family Court</b><small>Exhibit collection</small></Link></div>
          </div>
          {navItems.map(([href, label]) => (
            <Link className={pathname === href ? "active" : ""} href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const cms = useCmsDocument();
  return (
    <footer className="site-footer">
      <div className="shell footer-bottom">
        <span>{cms.site.footerLeft}</span>
        <span className="footer-notes">
          <span>{cms.site.footerRight}</span>
          <span className="footer-credit">AllegoryNow’s name and guiding metaphor are inspired by Plato’s “Allegory of the Cave.”</span>
        </span>
      </div>
    </footer>
  );
}

export function PageIntro({ eyebrow, title, lede }: { eyebrow: ReactNode; title: ReactNode; lede: ReactNode }) {
  return (
    <section className="page-intro shell">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{lede}</p>
    </section>
  );
}
