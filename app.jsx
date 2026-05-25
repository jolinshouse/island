// Island — main app component
const { useState, useEffect, useRef, useCallback, useMemo } = window.React ? React : window.React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "ambienceIntensity": 0.85,
  "motionBlur": true,
  "autoSweep": false,
  "showHints": true
}/*EDITMODE-END*/;

function randomLevel(lastLevel) {
  const levels = [1, 2, 3];
  if (lastLevel == null) return levels[Math.floor(Math.random() * levels.length)];
  let n = lastLevel;
  while (n === lastLevel) n = levels[Math.floor(Math.random() * levels.length)];
  return n;
}

function pickNext(arr, lastIdx) {
  if (arr.length <= 1) return 0;
  let i = lastIdx;
  while (i === lastIdx) i = Math.floor(Math.random() * arr.length);
  return i;
}

function IslandApp() {
  const [tw, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Level is now randomized internally — it controls which back art + prompt pool
  // is drawn on each deal. Initial level is random.
  const [level, setLevel] = useState(() => randomLevel(null));
  const [phase, setPhase] = useState("idle");      // idle | reveal | revealed | exit | deal
  const [promptIdx, setPromptIdx] = useState(0);
  const [cardKey, setCardKey] = useState(0);        // bump to remount card on full swap

  const stageRef = useRef(null);

  const prompts = window.ISLAND_PROMPTS[level] || [];
  const prompt = prompts[promptIdx] || "";
  const levelData = window.ISLAND_LEVELS[level];

  // Haptic helper
  const hap = useCallback((ms = 12) => {
    if (navigator.vibrate) navigator.vibrate(ms);
  }, []);

  // The shake / reveal flow — picks a fresh random prompt from the CURRENT
  // level's pool. The level itself is randomized on each new deal.
  const busyRef = useRef(false);
  const reveal = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    hap([10, 30, 18]);

    setPromptIdx((idx) => pickNext(prompts, idx));

    const dur = levelData.motion.dur;
    setPhase("reveal");

    setTimeout(() => {
      setPhase("revealed");
      hap(20);
      busyRef.current = false;
    }, dur);
  }, [hap, prompts, levelData.motion.dur]);

  // Deal a NEW card: exit current, then swap to a random level + show its back.
  const dealNext = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    hap(8);
    setPhase("exit");
    setTimeout(() => {
      setLevel((cur) => randomLevel(cur));
      setPromptIdx(0);
      setCardKey((k) => k + 1);
      setPhase("deal");
      setTimeout(() => {
        setPhase("idle");
        busyRef.current = false;
      }, 700);
    }, 460);
  }, [hap]);

  // iOS 13+ requires explicit permission for DeviceMotionEvent, gated behind
  // a user gesture. Other platforms expose motion without a prompt.
  const [motionGranted, setMotionGranted] = useState(false);
  useEffect(() => {
    const needsPermission = typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function";
    if (!needsPermission) setMotionGranted(true);
  }, []);
  const requestMotionPermission = useCallback(async () => {
    if (motionGranted) return;
    if (typeof DeviceMotionEvent === "undefined") return;
    if (typeof DeviceMotionEvent.requestPermission !== "function") {
      setMotionGranted(true);
      return;
    }
    try {
      const res = await DeviceMotionEvent.requestPermission();
      if (res === "granted") setMotionGranted(true);
    } catch (_) {}
  }, [motionGranted]);

  // Universal action: shake or tap
  // idle    → reveal current card
  // revealed → deal a new random card
  const onAction = useCallback(() => {
    requestMotionPermission();
    if (busyRef.current) return;
    if (phase === "idle") reveal();
    else if (phase === "revealed") dealNext();
  }, [phase, reveal, dealNext, requestMotionPermission]);

  // Tap / click / space
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        onAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAction]);

  // Shake detection (DeviceMotion). Listen across all phases for replay.
  useEffect(() => {
    if (!motionGranted) return;
    let lastShake = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastT = Date.now();
    let firstReading = true;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const now = Date.now();
      const dt = now - lastT; lastT = now;
      if (dt < 40) return;
      const x = a.x || 0, y = a.y || 0, z = a.z || 0;
      if (firstReading) { lastX = x; lastY = y; lastZ = z; firstReading = false; return; }
      const speed = (Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ)) / dt * 1000;
      lastX = x; lastY = y; lastZ = z;
      if (speed > 22 && now - lastShake > 1200) {
        lastShake = now;
        onAction();
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [onAction, motionGranted]);

  // Auto-sweep tweak (for desktop demo without shaking)
  useEffect(() => {
    if (!tw.autoSweep) return;
    const id = setInterval(() => onAction(), 3000);
    return () => clearInterval(id);
  }, [tw.autoSweep, onAction]);

  // Background CSS vars
  const stageStyle = {
    "--glow": levelData.glow,
    "--ambient": levelData.ambient,
    "--accent": levelData.accent,
    "--motion-blur": tw.motionBlur ? "8px" : "0px",
    "--lift": `${levelData.motion.lift}px`,
    "--rotZ": `${levelData.motion.rotateZ}deg`,
    "--flip-dur": `${levelData.motion.dur}ms`,
  };

  return (
    <div className="island-app" style={stageStyle}>
      <window.Ambience level={level} intensity={tw.ambienceIntensity} />

      <div className="screen-wrap">
        {/* Top bar — logo only */}
        <div className="topbar">
          <div className="brand">
            <img className="brand-logo" src="assets/islandlogo.svg" alt="island" draggable="false" />
          </div>
        </div>

        {/* Stage — card */}
        <div className="stage" ref={stageRef} onClick={onAction}>
          <div className={`card-stage phase-${phase}`} key={cardKey}>
            <window.IslandCard
              level={level}
              prompt={prompt}
              phase={phase}
              promptFont="Italianno"
            />
          </div>
        </div>

        {/* Hint — lives in its own row beneath the stage so it never overlaps */}
        <div className="hint-row">
          {tw.showHints && (
            <div className={`hint hint-${phase}`}>
              {phase === "idle" && (
                <>
                  <ShakeIcon />
                  <span>shake or tap to reveal</span>
                </>
              )}
              {phase === "revealed" && (
                <>
                  <RippleIcon />
                  <span>shake again for another</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reveal flash */}
      <div className={`reveal-flash phase-${phase}`} />

      {/* Tweaks */}
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Atmosphere">
          <window.TweakSlider
            label="Weather intensity"
            value={Math.round(tw.ambienceIntensity * 100)}
            min={0} max={150} step={5} unit="%"
            onChange={(v) => setTweak("ambienceIntensity", v / 100)}
          />
          <window.TweakToggle
            label="Motion blur"
            value={tw.motionBlur}
            onChange={(v) => setTweak("motionBlur", v)}
          />
          <window.TweakToggle
            label="Show hints"
            value={tw.showHints}
            onChange={(v) => setTweak("showHints", v)}
          />
        </window.TweakSection>

        <window.TweakSection label="Demo">
          <window.TweakToggle
            label="Auto-deal demo"
            value={tw.autoSweep}
            onChange={(v) => setTweak("autoSweep", v)}
          />
          <window.TweakButton label="Reveal / next card" onClick={onAction} />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

function ShakeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="8" y="3" width="8" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="18" r="0.8" fill="currentColor"/>
      <path d="M4 9 Q3 12 4 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M2 7 Q0.5 12 2 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none"/>
      <path d="M20 9 Q21 12 20 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M22 7 Q23.5 12 22 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" fill="none"/>
    </svg>
  );
}

function RippleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
    </svg>
  );
}

window.IslandApp = IslandApp;
