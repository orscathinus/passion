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
            <path className="brand-mark-leg" d="M3 68 46 7h13L22 68H3Z" />
            <path className="brand-mark-leg" d="M54 7h13l42 61H90L54 7Z" />
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
