function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Palleto</div>
          <h1>Capture inspiration before it disappears.</h1>
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
              src="../mobile/assets/onboarding/capture-studio.png"
            />
          </div>
          <div className="preview-panel">
            <span className="eyebrow">What you get</span>
            <ul>
              <li>Immediate creative read tied to your active project</li>
              <li>Palette, type direction, and related inspiration links</li>
              <li>Refine with AI when you want a sharper angle</li>
              <li>Shareable public inspiration pages for collaborators</li>
            </ul>
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
            <h3>1. Capture</h3>
            <p>See something in the wild, snap it, and keep moving.</p>
          </article>
          <article className="panel">
            <h3>2. Translate</h3>
            <p>Get a premium inspiration card grounded in what you are actually building.</p>
          </article>
          <article className="panel">
            <h3>3. Refine</h3>
            <p>Push the card toward a clearer tone, audience, project use, or type system.</p>
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
            <h3>Brand and campaign work</h3>
            <p>Move from found image to usable direction for campaigns, identities, and drops.</p>
          </article>
          <article className="panel">
            <h3>Fashion and product teams</h3>
            <p>Track materials, color systems, type lanes, and reference trails without losing the original spark.</p>
          </article>
          <article className="panel">
            <h3>Creative collaboration</h3>
            <p>Share a clean public page that explains why the reference matters, not just what it looks like.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;
