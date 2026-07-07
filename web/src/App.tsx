import { useEffect, useState } from "react";
import architectureImage from "../../mobile/assets/onboarding/capture-architecture.png";
import cathedralImage from "../../mobile/assets/onboarding/capture-cathedral.png";
import studioImage from "../../mobile/assets/onboarding/capture-studio.png";
import tileImage from "../../mobile/assets/onboarding/capture-tile.png";
import koiImage from "../../mobile/assets/demo/koi-street-reference.png";
import gardenImage from "../../mobile/assets/demo/garden-objects-reference.png";
import mosaicImage from "../../mobile/assets/onboarding/library-mosaic.png";
import fishSignImage from "../../mobile/assets/onboarding/library-fish-sign.png";
import stainedGlassImage from "../../mobile/assets/demo/stained-glass-reference.png";

const APP_STORE_URL = "https://apps.apple.com/us/app/palleto-633c32/id6762531761";

const MARQUEE_ITEMS = [
  "Palette", "Visual DNA", "Creative Direction", "Typography",
  "Material Culture", "Color Theory", "Composition", "Texture",
  "Reference", "Inspiration", "Brand Identity", "Color Field",
  "Palette", "Visual DNA", "Creative Direction", "Typography",
  "Material Culture", "Color Theory", "Composition", "Texture",
  "Reference", "Inspiration", "Brand Identity", "Color Field",
];

const PALETTES = [
  { label: "Warm Studio Restraint", colors: ["#D8C9AA", "#F3EEE3", "#9D8762", "#4C4439", "#1C1A17"] },
  { label: "Koi Street, Tokyo", colors: ["#D14B2D", "#1F1B19", "#C9B591", "#5A6E64", "#EFE7D7"] },
  { label: "Garden, Overcast", colors: ["#7B4528", "#5A6543", "#A89478", "#E3D7BF", "#1F1A14"] },
  { label: "Cathedral Stone", colors: ["#8C8078", "#C9C0B0", "#4A4038", "#E5DFCF", "#2A2420"] },
  { label: "Stained Glass Light", colors: ["#7B5C8A", "#C4A55D", "#4E7A9B", "#D4956A", "#2B2031"] },
];

const SCAN_CARDS = [
  {
    image: studioImage,
    label: "scan 024",
    title: "Warm Studio Restraint",
    colors: ["#D8C9AA", "#F3EEE3", "#9D8762", "#4C4439", "#1C1A17"],
  },
  {
    image: koiImage,
    label: "scan 031",
    title: "Koi Street, Tokyo",
    colors: ["#D14B2D", "#1F1B19", "#C9B591", "#5A6E64", "#EFE7D7"],
  },
  {
    image: cathedralImage,
    label: "scan 018",
    title: "Cathedral Light",
    colors: ["#8C8078", "#C9C0B0", "#4A4038", "#E5DFCF", "#2A2420"],
  },
];

function AppStoreBadge({ variant = "dark", size = "md" }: { variant?: "dark" | "light"; size?: "sm" | "md" | "lg" }) {
  return (
    <a
      href={APP_STORE_URL}
      className={`appstore-badge appstore-badge--${variant} appstore-badge--${size}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download Palleto on the App Store"
    >
      <svg className="appstore-apple-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.665 16.811a10.316 10.316 0 0 1-1.021 1.837c-.537.767-.978 1.297-1.316 1.592-.525.482-1.089.73-1.692.744-.432 0-.954-.123-1.562-.373-.61-.249-1.17-.371-1.683-.371-.537 0-1.113.122-1.73.371-.616.25-1.114.381-1.495.393-.578.025-1.154-.229-1.729-.764-.367-.32-.826-.87-1.377-1.648-.59-.829-1.075-1.794-1.455-2.891-.407-1.187-.611-2.335-.611-3.447 0-1.273.275-2.372.826-3.292a4.857 4.857 0 0 1 1.73-1.751 4.65 4.65 0 0 1 2.34-.662c.46 0 1.063.142 1.81.422s1.227.422 1.436.422c.158 0 .689-.167 1.593-.498.853-.307 1.573-.434 2.163-.384 1.6.129 2.801.759 3.6 1.895-1.43.867-2.137 2.08-2.123 3.637.012 1.213.453 2.222 1.317 3.023a4.33 4.33 0 0 0 1.315.863c-.106.307-.218.6-.336.882zM15.998 2.38c0 .95-.348 1.838-1.039 2.659-.836.976-1.846 1.541-2.941 1.452a2.955 2.955 0 0 1-.021-.36c0-.913.396-1.889 1.103-2.688.352-.404.8-.741 1.343-1.009.542-.264 1.054-.41 1.536-.435.013.127.019.254.019.381z" />
      </svg>
      <span className="appstore-badge-text">
        <small>Download on the</small>
        <strong>App Store</strong>
      </span>
    </a>
  );
}

function PaletteCycler() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % PALETTES.length);
        setFading(false);
      }, 400);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const pal = PALETTES[idx];
  return (
    <div className="palette-cycler">
      <div className={`palette-cycler-inner ${fading ? "fading" : ""}`}>
        <span className="palette-cycler-label eyebrow">{pal.label}</span>
        <div className="palette-cycler-swatches">
          {pal.colors.map((c, i) => (
            <span key={i} className="palette-cycler-swatch" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroCardStack() {
  return (
    <div className="hero-stack">
      {SCAN_CARDS.map((card, i) => (
        <div key={i} className={`hero-stack-card hero-stack-card--${i}`}>
          <div className="stack-card-img-wrap">
            <img src={card.image} alt={card.title} />
          </div>
          <div className="stack-card-meta">
            <span className="eyebrow">{card.label}</span>
            <span className="stack-card-title">{card.title}</span>
            <div className="stack-card-palette">
              {card.colors.map((c, j) => (
                <span key={j} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("is-visible");
      }),
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" }
    );
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Nav */}
      <header className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <span className="nav-mark">◆</span>
            <span className="nav-wordmark">Palleto</span>
          </a>
          <AppStoreBadge variant="dark" size="sm" />
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow hero-eyebrow">Creative capture · iOS</span>
            <h1>
              Capture inspiration<br />
              before it <em>disappears.</em>
            </h1>
            <p className="hero-body">
              Turn images from the street, the studio, or your camera roll into
              project-ready creative direction — palette, type, material cues,
              references, and AI refinement.
            </p>
            <div className="hero-actions">
              <AppStoreBadge variant="dark" size="md" />
              <a className="ghost-btn" href="#how-it-works">See how it works ↓</a>
            </div>
            <PaletteCycler />
          </div>
          <div className="hero-visual">
            <HeroCardStack />
          </div>
        </section>

        {/* ── Marquee ── */}
        <div className="marquee-strip" aria-hidden="true">
          <div className="marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="marquee-item">
                {item} <span className="marquee-dot">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── How it works ── */}
        <section className="section" id="how-it-works">
          <div className="section-head reveal">
            <span className="eyebrow">How it works</span>
            <h2>Fast capture first.<br /><em>Creative depth when you have time.</em></h2>
          </div>
          <div className="steps-grid">
            <article className="step-card reveal">
              <div className="step-img-wrap">
                <img src={architectureImage} alt="Capture step" />
                <span className="step-num">01</span>
              </div>
              <div className="step-body">
                <span className="eyebrow">Capture</span>
                <h3>Keep the reference alive.</h3>
                <p>See something in the wild, snap it, and keep moving. No notes needed.</p>
              </div>
            </article>
            <article className="step-card reveal" style={{ transitionDelay: "80ms" }}>
              <div className="step-img-wrap">
                <img src={cathedralImage} alt="Translate step" />
                <span className="step-num">02</span>
              </div>
              <div className="step-body">
                <span className="eyebrow">Translate</span>
                <h3>Turn the image into direction.</h3>
                <p>Get a full inspiration card — palette, type, materials, and a creative read.</p>
              </div>
            </article>
            <article className="step-card reveal" style={{ transitionDelay: "160ms" }}>
              <div className="step-img-wrap step-img-wrap--type">
                <img src={stainedGlassImage} alt="Refine step" />
                <span className="step-num">03</span>
              </div>
              <div className="step-body">
                <span className="eyebrow">Refine</span>
                <h3>Sharpen the read.</h3>
                <p>Push the card toward a clearer tone, audience, or type system with AI.</p>
              </div>
            </article>
          </div>
        </section>

        {/* ── Gallery strip ── */}
        <div className="gallery-strip">
          {[tileImage, gardenImage, mosaicImage, fishSignImage, koiImage, studioImage].map((src, i) => (
            <div key={i} className="gallery-tile">
              <img src={src} alt="" />
            </div>
          ))}
        </div>

        {/* ── Features ── */}
        <section className="section section--dark">
          <div className="section-head reveal">
            <span className="eyebrow" style={{ color: "rgba(250,247,240,0.5)" }}>Built for creatives</span>
            <h2 style={{ color: "#FAF7F0" }}>
              The camera roll is not<br /><em>the creative system.</em>
            </h2>
          </div>
          <div className="features-grid">
            <article className="feature-card reveal">
              <div className="feature-num eyebrow">01</div>
              <h3>Brand &amp; campaign work</h3>
              <p>Move from found image to usable direction for campaigns, identities, and product drops.</p>
            </article>
            <article className="feature-card reveal" style={{ transitionDelay: "80ms" }}>
              <div className="feature-num eyebrow">02</div>
              <h3>Fashion &amp; product teams</h3>
              <p>Track materials, color systems, and reference trails without losing the original spark.</p>
            </article>
            <article className="feature-card reveal" style={{ transitionDelay: "160ms" }}>
              <div className="feature-num eyebrow">03</div>
              <h3>Creative collaboration</h3>
              <p>Share a clean public link that explains why the reference matters — not just what it looks like.</p>
            </article>
          </div>
        </section>

        {/* ── Proof strip / scan showcase ── */}
        <section className="section">
          <div className="scan-showcase">
            <div className="scan-showcase-copy reveal">
              <span className="eyebrow">Living palettes</span>
              <h2>Every image becomes<br /><em>a working color system.</em></h2>
              <p>
                Palleto extracts palette, visual DNA, type direction, and project-specific
                applications from any image. Then refines it until it's actually useful.
              </p>
              <AppStoreBadge variant="dark" size="md" />
            </div>
            <div className="scan-showcase-cards reveal" style={{ transitionDelay: "100ms" }}>
              {SCAN_CARDS.slice(0, 2).map((card, i) => (
                <div key={i} className="showcase-card">
                  <img src={card.image} alt={card.title} />
                  <div className="showcase-card-footer">
                    <span className="showcase-card-title">{card.title}</span>
                    <div className="showcase-palette">
                      {card.colors.map((c, j) => (
                        <span key={j} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Download CTA ── */}
        <section className="section cta-section">
          <div className="cta-inner reveal">
            <span className="eyebrow">Available now</span>
            <h2>Start capturing.<br /><em>Keep the good stuff.</em></h2>
            <p>One-time purchase. No subscription. Yours forever.</p>
            <AppStoreBadge variant="dark" size="lg" />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="nav-brand footer-brand">
            <span className="nav-mark">◆</span>
            <span className="nav-wordmark">Palleto</span>
          </span>
          <nav className="footer-links">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">App Store</a>
            <a href="/privacy.html">Privacy</a>
            <a href="/support.html">Support</a>
            <a href="mailto:hello@palleto.app">Contact</a>
          </nav>
          <span className="footer-copy">© 2025 Palleto. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
