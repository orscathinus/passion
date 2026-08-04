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
            <path className="brand-mark-skyline" d="M17 55h78v6H17z" />
            <g className="brand-mark-skyline">
              <circle cx="27" cy="42" r="3.2" />
              <path d="M22.8 48c0-3.4 1.8-5.2 4.2-5.2s4.2 1.8 4.2 5.2v7h-2.5v-5h-1v5h-1.4v-5h-1v5h-2.5v-7Z" />

              <circle cx="41" cy="35.5" r="4" />
              <path d="M35.7 43c0-4.2 2.3-6.4 5.3-6.4s5.3 2.2 5.3 6.4v12h-3v-8h-1v8h-2.6v-8h-1v8h-3V43Z" />

              <circle cx="56" cy="31.5" r="4.4" />
              <path d="M50.1 39.7c0-4.8 2.6-7.1 5.9-7.1s5.9 2.3 5.9 7.1V55h-3.2V44.8h-1.2V55h-3V44.8h-1.2V55h-3.2V39.7Z" />

              <circle cx="72" cy="36" r="3.9" />
              <path d="M66.8 43.3c0-4.1 2.2-6.3 5.2-6.3s5.2 2.2 5.2 6.3V55h-3v-7.8h-1V55h-2.4v-7.8h-1V55h-3V43.3Z" />

              <circle cx="86" cy="42.5" r="3.1" />
              <path d="M81.9 48.2c0-3.3 1.8-5.1 4.1-5.1s4.1 1.8 4.1 5.1V55h-2.4v-4.8h-1V55h-1.4v-4.8h-1V55h-2.4v-6.8Z" />
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
