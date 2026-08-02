import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero">
          <div className="shell home-hero-inner">
            <div className="hero-copy">
              <h1>Follow the evidence. See where it leads.</h1>
              <div className="button-row">
                <Link className="button button-primary" href="/inquiry">Explore the Tree <span aria-hidden="true">→</span></Link>
                <Link className="button button-hero-quiet" href="/mission">Read our mission</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
