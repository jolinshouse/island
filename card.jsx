// Island Card — handles 3D flip, deal-in, exit animations
const { useState, useEffect, useRef, useCallback } = React;

function getCardSize(stageEl) {
  if (!stageEl) return { w: 290, h: 400 };
  const r = stageEl.getBoundingClientRect();
  const maxH = r.height * 0.72;
  const maxW = r.width * 0.78;
  const ratio = 5 / 7; // w/h — original card ratio
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) { w = maxW; h = w / ratio; }
  return { w, h };
}

function IslandCard({ level, prompt, phase, promptFont }) {
  const lvl = window.ISLAND_LEVELS[level];

  // Prompt font size scales with card width via container query / cqw
  const promptFontSize = `clamp(22px, ${11 * lvl.promptScale}cqw, 40px)`;

  // Snap-swap faces at the rotation midpoint using a sub-state. No CSS
  // opacity transitions — they were fighting React renders. The rotation
  // animation supplies all the visual fluidity.
  const dur = lvl.motion.dur;
  const [showingBack, setShowingBack] = React.useState(false);
  React.useEffect(() => {
    if (phase === "reveal") {
      const t = setTimeout(() => setShowingBack(true), dur * 0.5);
      return () => clearTimeout(t);
    }
    if (phase === "idle" || phase === "exit" || phase === "deal") {
      setShowingBack(false);
    }
    // 'revealed' state — keep showingBack=true (no-op)
  }, [phase, dur]);

  return (
    <div className={`card-shell phase-${phase}`}>
      <div className="card-glow" style={{ "--glow-color": lvl.glow }} />
      <div className="card-3d">
        <div className="card-inner">
          {/* FRONT — level art */}
          <div
            className="card-face card-front"
            style={{ opacity: showingBack ? 0 : 1 }}
          >
            <img src={lvl.img} alt={`Island ${lvl.name}`} draggable="false" />
            <div className="card-front-shine" />
          </div>
          {/* BACK — image only; prompt is overlaid outside the 3D context */}
          <div
            className="card-face card-back"
            style={{ opacity: showingBack ? 1 : 0 }}
          >
            <img src="assets/card-back.jpg" alt="Island back" draggable="false" />
            <div className="card-back-shine" />
          </div>
        </div>
      </div>
      {/* Prompt overlay — sits outside the 3D rotation so its animations
          aren't stalled by the parent's 3D transform context. */}
      <div className={`card-prompt-zone ${phase === "revealed" ? "is-on" : ""}`}>
        <p
          className="card-prompt"
          style={{
            fontFamily: promptFont,
            fontSize: promptFontSize,
            color: "#3e5477",
          }}
        >
          {prompt}
        </p>
      </div>
    </div>
  );
}

window.IslandCard = IslandCard;
