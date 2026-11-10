import { useEffect, useMemo, useState } from "react";
import { Icon, AppButton, photos, type IconName } from "./ui";

/* ---------- Animation helpers for the homepage demos ---------- */

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Plays through `length` frames on a loop. With reduced motion it holds on `still`. */
function useFrame(length: number, still: number, ms = 70) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTick((t) => (t + 1) % length), ms);
    return () => clearInterval(id);
  }, [reduced, length, ms]);
  return reduced ? still : tick;
}

function hold<T>(frames: T[], frame: T, count: number) { for (let i = 0; i < count; i++) frames.push(frame); }

function MockWindow({ crumb, children, big }: { crumb: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className={`mock-window ${big ? "big" : ""}`}>
      <div className="mock-bar"><span className="brand-mark"><Icon name="spark" size={10} /></span><small>{crumb}</small></div>
      <div className="mock-body">{children}</div>
    </div>
  );
}

/* ---------- Demo: looking and writing ---------- */

type TypeFrame = { photo: number; round: number; chips: string[]; draft: string; press: "enter" | "next" | null };
const typingScript = [
  { photo: 0, thoughts: ["stacked colours, like book spines", "a street of tiny shops"] },
  { photo: 1, thoughts: ["huts = summer pop-up bookshops"] },
  { photo: 2, thoughts: ["arrange books by mood, not genre"] },
];
const DEMO_LIMIT = 10;

function buildTypingFrames() {
  const frames: TypeFrame[] = [];
  typingScript.forEach((step, i) => {
    const chips: string[] = [];
    const round = i + 1;
    hold(frames, { photo: step.photo, round, chips: [], draft: "", press: null }, 12);
    for (const thought of step.thoughts) {
      for (let c = 1; c <= thought.length; c++) frames.push({ photo: step.photo, round, chips: [...chips], draft: thought.slice(0, c), press: null });
      hold(frames, { photo: step.photo, round, chips: [...chips], draft: thought, press: null }, 6);
      hold(frames, { photo: step.photo, round, chips: [...chips], draft: thought, press: "enter" }, 4);
      chips.push(thought);
      hold(frames, { photo: step.photo, round, chips: [...chips], draft: "", press: null }, 8);
    }
    hold(frames, { photo: step.photo, round, chips: [...chips], draft: "", press: "next" }, 8);
  });
  return frames;
}

function TypingDemo() {
  const frames = useMemo(buildTypingFrames, []);
  const still = frames.findIndex((f) => f.chips.length === 2) + 4;
  const f = frames[useFrame(frames.length, still)];
  return (
    <MockWindow big crumb="Community bookstore › Session">
      <div className="demo-exercise">
        <div className="demo-photo">
          {photos.map((p, i) => <img key={p.url} src={p.url} alt="" className={i === f.photo ? "on" : ""} />)}
          <small>PHOTO {String(f.round).padStart(2, "0")} / {DEMO_LIMIT}</small>
        </div>
        <div className="demo-panel">
          <small className="kicker">YOUR THOUGHTS</small>
          <b>What could this photo mean for your project?</b>
          <div className="mock-chips demo-chips">
            {f.chips.length === 0 && <span className="ghost">Your thoughts appear here</span>}
            {f.chips.map((chip) => <span className="you pop" key={chip}>{chip}</span>)}
          </div>
          <div className={`mock-input demo-input ${f.draft ? "typing" : ""}`}>{f.draft || <span className="ph">Write what comes to mind…</span>}<i /></div>
          <div className="mock-row">
            <span className="mock-mic"><Icon name="mic" size={11} /> Speak</span>
            <span className={`key-hint ${f.press === "enter" ? "pressed" : ""}`}>Enter ↵</span>
            <span className={`mock-cta small ${f.press === "next" ? "pressed" : ""}`}>Next photo <Icon name="arrow" size={11} /></span>
          </div>
        </div>
      </div>
      <div className="demo-progress" aria-hidden="true">
        {Array.from({ length: DEMO_LIMIT }, (_, i) => <span key={i} className={i < f.round - 1 ? "done" : i === f.round - 1 ? "now" : ""} />)}
        <small>{f.round} of {DEMO_LIMIT} photos</small>
      </div>
    </MockWindow>
  );
}

/* ---------- Demo: picking from both sides ---------- */

const pickRows = [
  { photo: 0, you: ["stacked colours, like book spines", "a street of tiny shops"], muse: ["Window displays curated by residents", "Shelves sorted by colour", "Book swap at the bus stop"] },
  { photo: 1, you: ["huts = summer pop-up bookshops"], muse: ["Seasonal reading kiosks", "A hut for each neighbourhood", "Beach library on wheels"] },
];
const pickOrder = ["0-you-0", "0-muse-0", "1-you-0", "1-muse-2"];
type PickFrame = { picked: string[]; hover: string | null };

function buildPickFrames() {
  const frames: PickFrame[] = [];
  const picked: string[] = [];
  hold(frames, { picked: [], hover: null }, 14);
  for (const id of pickOrder) {
    hold(frames, { picked: [...picked], hover: id }, 10);
    picked.push(id);
    hold(frames, { picked: [...picked], hover: null }, 8);
  }
  hold(frames, { picked: [...picked], hover: "continue" }, 18);
  hold(frames, { picked: [...picked], hover: null }, 10);
  return frames;
}

function PickingDemo() {
  const frames = useMemo(buildPickFrames, []);
  const f = frames[useFrame(frames.length, frames.length - 1, 90)];
  const yours = f.picked.filter((id) => id.includes("-you-")).length;
  const chip = (row: number, side: "you" | "muse", i: number, text: string) => {
    const id = `${row}-${side}-${i}`;
    const on = f.picked.includes(id);
    return (
      <span key={id} className={`${side} ${on ? "picked" : ""} ${f.hover === id ? "hovered" : ""}`}>
        {on ? <Icon name="check" size={9} /> : side === "muse" ? <Icon name="spark" size={8} /> : null}{text}
        {f.hover === id && <span className="demo-pointer"><Icon name="hand" size={16} /></span>}
      </span>
    );
  };
  return (
    <MockWindow big crumb="Community bookstore › Compare with Muse">
      <div className="demo-compare-head"><small>YOUR THOUGHTS</small><small><Icon name="spark" size={8} /> MUSE’S THOUGHTS</small></div>
      {pickRows.map((row, r) => (
        <div className="demo-compare-row" key={r}>
          <img src={photos[row.photo].url} alt="" />
          <div className="mock-chips">{row.you.map((t, i) => chip(r, "you", i, t))}</div>
          <div className="mock-chips">{row.muse.map((t, i) => chip(r, "muse", i, t))}</div>
        </div>
      ))}
      <div className="mock-selection">
        <span><b>{yours}</b> of yours · <b>{f.picked.length - yours}</b> from Muse</span>
        <span className={`mock-cta small ${f.hover === "continue" ? "pressed" : ""}`}>
          Continue with {f.picked.length} ideas <Icon name="arrow" size={11} />
          {f.hover === "continue" && <span className="demo-pointer"><Icon name="hand" size={16} /></span>}
        </span>
      </div>
    </MockWindow>
  );
}

/* ---------- Walkthrough content ---------- */

type Action = { icon: IconName; label: string };
type WalkStep = { short: string; where: string; title: string; text: string; todo?: string[]; actions?: Action[]; repeat?: string; tip?: string; visual: React.ReactNode; feature?: boolean };

function ActionStrip({ actions }: { actions: Action[] }) {
  return (
    <ol className="action-strip">
      {actions.map((a, i) => <li key={a.label}>{i > 0 && <i aria-hidden="true">→</i>}<b><span><Icon name={a.icon} size={20} /></span>{a.label}</b></li>)}
    </ol>
  );
}

const walkthrough: WalkStep[] = [
  {
    short: "Create a project",
    where: "MY PROJECTS",
    title: "Write down the question you want to explore",
    text: "Every session starts from a project. A project is one challenge question, written as “How might we…”.",
    todo: ["Click “New project”", "Give it a short name", "Write your challenge question and click “Create project”"],
    tip: "Keep the question open. “How might we make bookstores feel essential?” works better than “Should we open a café?”",
    visual: (
      <MockWindow crumb="My projects">
        <div className="mock-form">
          <small>NEW PROJECT</small>
          <strong>What do you want to explore?</strong>
          <label>Name</label><div className="mock-input">Community bookstore</div>
          <label>Challenge question</label><div className="mock-input tall">How might we make local bookstores feel essential again?<i /></div>
          <div className="mock-cta">Create project</div>
        </div>
      </MockWindow>
    ),
  },
  {
    short: "Choose a technique",
    where: "SESSION · SETUP",
    title: "Pick a technique and how long to go",
    text: "Choose what you want to react to, and set a finish line for the session.",
    todo: ["Choose Photo sparks or Role play", "Choose 10, 20 or 30 sparks"],
    tip: "New here? Start with Photo sparks and 10 sparks.",
    visual: (
      <MockWindow crumb="Community bookstore › Session">
        <div className="mock-lenses">
          <div className="mock-lens violet selected"><Icon name="image" size={14} /><span><b>Photo sparks</b><small>React to random images</small></span><i /></div>
          <div className="mock-lens yellow"><Icon name="play" size={14} /><span><b>Role play</b><small>Solve it through new eyes</small></span></div>
        </div>
        <div className="mock-length"><span>How many sparks?</span><div><b className="on">10</b><b>20</b><b>30</b></div></div>
      </MockWindow>
    ),
  },
  {
    short: "Look and write",
    where: "SESSION · PART 1 · ON YOUR OWN",
    title: "Look at the photo. Write what it makes you think of.",
    text: "One photo at a time. Any word, feeling or half idea counts. Muse stays quiet, so every idea here is yours.",
    actions: [{ icon: "eye", label: "Look" }, { icon: "pen", label: "Type or speak" }, { icon: "check", label: "Press Enter" }, { icon: "arrow", label: "Next photo" }],
    repeat: "Repeat for every photo until you reach your finish line: 10, 20 or 30.",
    feature: true,
    visual: <TypingDemo />,
  },
  {
    short: "Pick with Muse",
    where: "SESSION · PART 2 · WITH MUSE",
    title: "Tap the ideas you like, yours and Muse’s",
    text: "When you finish, Muse reads every photo and your words, and adds its own ideas next to yours. Now you choose.",
    actions: [{ icon: "eye", label: "Read yours" }, { icon: "spark", label: "See Muse’s" }, { icon: "hand", label: "Tap to keep" }, { icon: "arrow", label: "Continue" }],
    tip: "Look for places where you and Muse saw the same photo differently. That gap is often where the best idea is.",
    feature: true,
    visual: <PickingDemo />,
  },
  {
    short: "Round two",
    where: "SESSION · PART 3 · COMING SOON",
    title: "Take your shortlist into round two",
    text: "The ideas you picked move on together into a second round, where you combine and develop them. We are designing this step now.",
    visual: (
      <MockWindow crumb="Community bookstore › Round two">
        <div className="mock-pair">
          <div className="mock-card you">huts = summer pop-up bookshops</div>
          <span className="mock-plus"><Icon name="plus" size={14} /></span>
          <div className="mock-card muse">Shelves sorted by colour</div>
        </div>
        <div className="mock-result"><small><Icon name="spark" size={9} /> NEW DIRECTION</small>Colour-coded summer book huts, one per neighbourhood</div>
      </MockWindow>
    ),
  },
];

/* ---------- Page ---------- */

const mindsets: { icon: IconName; title: string; text: string }[] = [
  { icon: "compass", title: "Curiosity", text: "Ask why a photo pulls at you, or why an idea feels off. That question is where new ideas start." },
  { icon: "eye", title: "Noticing", text: "Small surprises are signals. One photo at a time gives you room to catch them." },
  { icon: "repeat", title: "Reflection", text: "After the session, you look at your own thinking next to Muse’s before you decide anything." },
  { icon: "hand", title: "Ownership", text: "You choose which ideas move on. The creative decisions stay with you, so the result is yours." },
];

const techniques = [
  { tone: "violet", icon: "image" as IconName, name: "Photo sparks", origin: "Random stimulus", text: "An unrelated image forces your brain to build a bridge back to your problem. It is a classic lateral-thinking method for escaping the obvious answer.", good: "Breaking out of familiar ideas" },
  { tone: "yellow", icon: "play" as IconName, name: "Role play", origin: "Role storming", text: "Step into someone else’s shoes, like a captain or a chef, and solve the problem the way they would.", good: "Seeing the problem from a new angle" },
];

export function HomePage({ onStart }: { onStart: () => void }) {
  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">IDEATION THAT KEEPS YOU IN CHARGE</span>
          <h1>Look first. Think for yourself. Then let Muse widen the view.</h1>
          <p>Muse guides you through short, classic creative exercises. You come up with your own ideas first. Only then does the AI add its view, and you decide what to keep.</p>
          <div className="home-ctas">
            <AppButton className="primary-button" onClick={onStart}>Start a session <Icon name="arrow" size={16} /></AppButton>
            <a className="ghost-button" href="#why">First time? Take the tour</a>
          </div>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-photo"><img src={photos[0].url} alt="" /><span><Icon name="image" size={13} /> PHOTO SPARK 03 / 20</span></div>
          <div className="hero-note you"><small>YOU</small>stacked colours, like spines on a shelf</div>
          <div className="hero-note muse"><small><Icon name="spark" size={10} /> MUSE</small>Window displays curated by residents</div>
        </div>
      </section>

      <section className="home-section" id="why">
        <div className="home-section-head">
          <span className="eyebrow">WHY MUSE</span>
          <h2>AI shouldn’t be your easy button</h2>
          <p>AI can hand you a polished answer in seconds. But when it skips the searching, you skip the part where your thinking grows. Muse keeps the effort that matters and brings AI in where it helps.</p>
        </div>

        <ol className="loop-strip">
          <li><small>BEFORE</small><strong>You set the direction</strong><p>You look, notice and write first. The intent is yours.</p></li>
          <li className="muse"><small><Icon name="spark" size={10} /> IN BETWEEN</small><strong>Muse adds a second view</strong><p>It builds on your words with directions you might not have tried.</p></li>
          <li><small>AFTER</small><strong>You decide what matters</strong><p>You compare, choose and combine. Every idea that moves on was picked by you.</p></li>
        </ol>

        <div className="mindset-head">
          <h3>Four habits each session trains</h3>
          <p>Creativity is a muscle. A Muse session is a short workout for it.</p>
        </div>
        <div className="mindsets">
          {mindsets.map((m) => (
            <article className="mindset" key={m.title}>
              <span><Icon name={m.icon} size={20} /></span>
              <h4>{m.title}</h4>
              <p>{m.text}</p>
            </article>
          ))}
        </div>
        <p className="credit">Inspired by <a href="https://dschool.stanford.edu/stories/creativity-ai-easy-button" target="_blank" rel="noreferrer">Creativity in the Age of AI</a>, a three-part series by Glenn Fajardo at the Stanford d.school.</p>
      </section>

      <section className="home-section" id="techniques">
        <div className="home-section-head">
          <span className="eyebrow">TECHNIQUES</span>
          <h2>Simple tools that have worked for decades</h2>
          <p>Muse doesn’t invent new methods. It uses classic ideation techniques that designers and teams have relied on for years, because they are easy to start and they put you in control.</p>
        </div>
        <div className="technique-cards">
          {techniques.map((t) => (
            <article className={`technique-big ${t.tone}`} key={t.name}>
              <span className="technique-icon"><Icon name={t.icon} /></span>
              <small>BASED ON {t.origin.toUpperCase()}</small>
              <h3>{t.name}</h3>
              <p>{t.text}</p>
              <p className="good"><strong>Good for</strong>{t.good}</p>
            </article>
          ))}
          <article className="technique-big blank">
            <span className="technique-icon"><Icon name="plus" /></span>
            <small>COMING LATER</small>
            <h3>More techniques</h3>
            <p>New classic techniques will be added over time, each one short and easy to try.</p>
          </article>
        </div>
      </section>

      <section className="home-section" id="how">
        <div className="home-section-head">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Your first session, step by step</h2>
          <p>A session takes about 15 minutes. Here is what you will see and what to do on each screen.</p>
        </div>

        <ol className="journey-map" aria-label="Session overview">
          {walkthrough.map((step, index) => (
            <li key={step.title}><a href={`#step-${index + 1}`}><span>{index + 1}</span>{step.short}</a></li>
          ))}
        </ol>

        <div className="walkthrough">
          {walkthrough.map((step, index) => (
            <article className={`walk-step ${step.feature ? "feature" : ""}`} id={`step-${index + 1}`} key={step.title}>
              <div className="walk-copy">
                <span className="walk-number">{index + 1}</span>
                <span className="eyebrow">{step.where}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.actions && <ActionStrip actions={step.actions} />}
                {step.todo && <ul>{step.todo.map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>}
                {step.tip && <p className="walk-tip"><strong>Tip</strong>{step.tip}</p>}
              </div>
              <div className="walk-visual" aria-hidden="true">{step.visual}</div>
              {step.repeat && <p className="repeat-banner"><Icon name="repeat" size={20} />{step.repeat}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="home-band">
        <h2>Your ideas come first. AI adds a second reading, not the final answer.</h2>
        <AppButton className="primary-button light" onClick={onStart}>Start a session <Icon name="arrow" size={16} /></AppButton>
      </section>
    </main>
  );
}
