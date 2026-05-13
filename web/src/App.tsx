import architectureImage from "../../mobile/assets/onboarding/capture-architecture.png";
import cathedralImage from "../../mobile/assets/onboarding/capture-cathedral.png";
import studioImage from "../../mobile/assets/onboarding/capture-studio.png";

function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Palleto</div>
          <h1>
            Capture inspiration before it <span>disappears.</span>
          </h1>
          <p className="hero-body">
            Turn images from the street, the studio, or your camera roll into project-ready
            creative direction with palette, type, material cues, references, and refinement.
          </p>
          <div className="cta-row">
            <a className="button" href="mailto:hello@palleto.app?subject=Palleto early access">
              Join early access
            </a>
            <a className="button secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
        </div>
        <div className="hero-card">
          <div className="preview-frame">
            <img
              alt="Palleto inspiration capture"
              className="preview-image"
              src={studioImage}
            />
            <div className="preview-meta">
              <span>scan 024</span>
              <span>5 colors</span>
            </div>
          </div>
          <div className="preview-panel">
            <span className="eyebrow">Creative read</span>
            <h2>Warm studio restraint</h2>
            <p>
              Soft light, tactile edges, and a neutral field translated into a working visual system.
            </p>
            <div className="palette-row" aria-label="Example palette">
              <span style={{ backgroundColor: "#D8C9AA" }} />
              <span style={{ backgroundColor: "#F3EEE3" }} />
              <span style={{ backgroundColor: "#9D8762" }} />
              <span style={{ backgroundColor: "#4C4439" }} />
              <span style={{ backgroundColor: "#1C1A17" }} />
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h2>Fast capture first. Creative depth when you have time.</h2>
        </div>
        <div className="grid">
          <article className="panel">
            <img alt="" src={architectureImage} />
            <span className="eyebrow">01 / Capture</span>
            <h3>Keep the reference alive.</h3>
            <p>See something in the wild, snap it, and keep moving.</p>
          </article>
          <article className="panel">
            <img alt="" src={cathedralImage} />
            <span className="eyebrow">02 / Translate</span>
            <h3>Turn the image into direction.</h3>
            <p>Get a premium inspiration card grounded in what you are actually building.</p>
          </article>
          <article className="panel">
            <span className="eyebrow">03 / Refine</span>
            <h3>Sharpen the read.</h3>
            <p>Push the card toward a clearer tone, audience, project use, or type system.</p>
            <div className="type-card">
              <strong>Reverence</strong>
              <span>Display serif / quiet system / mono labels</span>
            </div>
          </article>
        </div>
      </section>

      <section className="band band-accent">
        <div className="section-heading">
          <span className="eyebrow">Built for creatives</span>
          <h2>The camera roll is not the creative system.</h2>
        </div>
        <div className="grid">
          <article className="panel">
            <span className="eyebrow">Brand</span>
            <h3>Brand and campaign work</h3>
            <p>Move from found image to usable direction for campaigns, identities, and drops.</p>
          </article>
          <article className="panel">
            <span className="eyebrow">Product</span>
            <h3>Fashion and product teams</h3>
            <p>Track materials, color systems, type lanes, and reference trails without losing the original spark.</p>
          </article>
          <article className="panel">
            <span className="eyebrow">Share</span>
            <h3>Creative collaboration</h3>
            <p>Share a clean public page that explains why the reference matters, not just what it looks like.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;
