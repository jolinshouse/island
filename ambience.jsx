// Ambient background — each crazy level gets its own weather/atmosphere
// 1 Soft     → drifting morning sunlight, warm gradient sweep + soft beams
// 2 Delulu   → strong wind, swirling clouds + horizontal wind streaks
// 3 Unhinged → heavy rain with lightning strikes
function Ambience({ level, intensity }) {
  return (
    <div className="ambience" aria-hidden="true">
      {level === 1 && <SoftAmbience intensity={intensity} />}
      {level === 2 && <DeluluAmbience intensity={intensity} />}
      {level === 3 && <UnhingedAmbience intensity={intensity} />}
    </div>
  );
}

/* ───── Soft — cool blue morning + sparkles ───── */
function SoftAmbience({ intensity }) {
  const beams = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: 10 + i * 13 + (i % 2) * 5,
      delay: i * 1.6,
      dur: 14 + (i % 3) * 4,
      width: 80 + (i % 2) * 40,
      tilt: -22 + (i % 2) * 4,
    })),
    []
  );
  const stars = React.useMemo(() => {
    let s = 9;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: 34 }, (_, i) => ({
      id: i,
      x: rnd() * 100,
      y: rnd() * 100,
      size: 1.4 + rnd() * 2.6,
      delay: -rnd() * 5,
      dur: 2.4 + rnd() * 3.2,
      tone: rnd() < 0.35 ? "warm" : "cool",
    }));
  }, []);
  return (
    <div className="amb-scene amb-soft" style={{ "--amb-intensity": intensity }}>
      <div className="soft-sky" />
      <div className="soft-warm-sweep" />
      <div className="soft-beams">
        {beams.map((b) => (
          <span
            key={b.id}
            className="soft-beam"
            style={{
              left: `${b.left}%`,
              width: `${b.width}px`,
              transform: `rotate(${b.tilt}deg)`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
      </div>
      <div className="soft-stars">
        {stars.map((s) => (
          <span
            key={s.id}
            className={`soft-star soft-star--${s.tone}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>
      <div className="soft-haze" />
      <div className="amb-grain amb-grain-soft" />
    </div>
  );
}

/* ───── Delulu — retro warped-stripe swirl ───── */
function DeluluAmbience({ intensity }) {
  return (
    <div className="amb-scene amb-delulu" style={{ "--amb-intensity": intensity }}>
      {/* SVG filter that warps the striped layer into a liquid-swirl pattern */}
      <svg className="delulu-defs" aria-hidden="true" width="0" height="0">
        <defs>
          <filter id="delulu-warp" x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.013"
              numOctaves="2"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="28s"
                values="0.008 0.013; 0.012 0.010; 0.009 0.015; 0.008 0.013"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="110" />
          </filter>
        </defs>
      </svg>
      <div className="delulu-bg" />
      <div className="delulu-swirl" />
      <div className="delulu-glow" />
      <div className="delulu-vignette" />
    </div>
  );
}

/* ───── Unhinged — heavy rain + lightning ───── */
function UnhingedAmbience({ intensity }) {
  const drops = React.useMemo(
    () => Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: (i * 7.3) % 100,
      delay: (i * 0.07) % 1.4,
      dur: 1.6 + ((i * 11) % 9) / 6,   // slower rain (~1.6–3.1s)
      len: 32 + ((i * 13) % 28),
      alpha: 0.5 + ((i * 5) % 6) / 11,
    })),
    []
  );
  const [bolt, setBolt] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setBolt((b) => b + 1);
      const next = 2200 + Math.random() * 4200;
      timer = setTimeout(tick, next);
    };
    let timer = setTimeout(tick, 900);
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  return (
    <div className="amb-scene amb-unhinged" style={{ "--amb-intensity": intensity }}>
      <div className="unhinged-sky" />
      <div className="unhinged-clouds" />
      <div className="unhinged-rain">
        {drops.map((d) => (
          <span
            key={d.id}
            className="rain-drop"
            style={{
              left: `${d.left}%`,
              height: `${d.len}px`,
              opacity: d.alpha,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            }}
          />
        ))}
      </div>
      <UnhingedLightning trigger={bolt} />
      <div className="unhinged-vignette" />
    </div>
  );
}

function UnhingedLightning({ trigger }) {
  // Two-stage flash: stark white, then a softer afterglow
  const [active, setActive] = React.useState(false);
  const [path, setPath] = React.useState("");
  React.useEffect(() => {
    if (trigger === 0) return;
    // Generate a jagged bolt path
    const x0 = 20 + Math.random() * 60;
    const segs = [];
    let x = x0, y = -2;
    segs.push(`M ${x} ${y}`);
    while (y < 102) {
      const dy = 6 + Math.random() * 10;
      const dx = -8 + Math.random() * 16;
      x += dx; y += dy;
      segs.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
      // occasional fork
      if (Math.random() < 0.18 && y < 70) {
        const fx = x + (-14 + Math.random() * 28);
        const fy = y + 10 + Math.random() * 14;
        segs.push(`M ${x.toFixed(2)} ${y.toFixed(2)} L ${fx.toFixed(2)} ${fy.toFixed(2)} M ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    }
    setPath(segs.join(" "));
    setActive(true);
    const t = setTimeout(() => setActive(false), 520);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <>
      <div className={`unhinged-flash ${active ? "is-on" : ""}`} />
      <svg
        className={`unhinged-bolt ${active ? "is-on" : ""}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d={path} stroke="white" strokeWidth="0.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path} stroke="white" strokeWidth="0.25" fill="none" opacity="0.9" />
      </svg>
    </>
  );
}

window.Ambience = Ambience;
