import { useEffect, useMemo, useState } from "react";
import { Icon, AppButton, photos, type IconName } from "./ui";

export const crewCharacters = [
  { name: "Ada", role: "Engineer", initials: "AD" }, { name: "Sam", role: "Doctor", initials: "SA" }, { name: "Lou", role: "Dancer", initials: "LO" },
  { name: "Mira", role: "Chemist", initials: "MI" }, { name: "Jo", role: "Mechanic", initials: "JO" }, { name: "Kit", role: "Eight-year-old", initials: "KI" },
  { name: "Rosa", role: "Gardener", initials: "RO" }, { name: "Theo", role: "Musician", initials: "TH" }, { name: "Nell", role: "Teacher", initials: "NE" },
  { name: "Ines", role: "Architect", initials: "IN" }, { name: "Bo", role: "Farmer", initials: "BO" }, { name: "Max", role: "Comedian", initials: "MA" },
];

/** Worst idea: each round asks a new provocative question. */
export const provocations = [
  "What’s the worst idea you can think of?",
  "What idea would your parents hate?",
  "How could you make this as boring as possible?",
  "What would make everyone leave immediately?",
  "What’s the most expensive way to get this wrong?",
  "What would a cartoon villain do?",
  "How would you solve this badly, with zero effort?",
  "What idea would get you laughed out of the room?",
  "How could you make this as complicated as possible?",
  "What would your grumpiest neighbour suggest?",
];

/** Warm-up shown before each session: one small lesson per screen. */
export const warmupLessons = [
  { rule: "Quantity over quality", quote: "You can’t pick a great idea from an empty basket. Fill it up first.", color: "violet" },
  { rule: "Bad ideas are welcome", quote: "A bad idea is just a good idea that hasn’t had its coffee yet.", color: "rose" },
  { rule: "Forget about perfect", quote: "Perfect is a closed door. Curious is a hallway full of them.", color: "yellow" },
  { rule: "Judge later", quote: "Ideas are like seedlings. Don’t pull them up to check the roots.", color: "green" },
];

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
    setTick(0);
    if (reduced) return;
    const id = setInterval(() => setTick((t) => (t + 1) % length), ms);
    return () => clearInterval(id);
  }, [reduced, length, ms]);
  return reduced ? still : Math.min(tick, length - 1);
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

function Avatar({ initials, small }: { initials: string; small?: boolean }) {
  return <span className={`demo-avatar ${small ? "small" : ""}`}>{initials}</span>;
}

/* ---------- Techniques ---------- */

export type TechniqueKey = "photo" | "role" | "worst";

const demoRoles = [
  { name: "Captain", initials: "CA", cue: "Steer the crew. Set a clear destination." },
  { name: "Chef", initials: "CH", cue: "Combine ingredients into an experience." },
  { name: "Doctor", initials: "DR", cue: "Listen first. Diagnose what really hurts." },
];
const demoCrew = crewCharacters.slice(0, 3);

type Stage = { stimulus: number; thoughts: string[]; crew?: { who: number; idea: string }[] };
const scripts: Record<TechniqueKey, Stage[]> = {
  photo: [
    { stimulus: 0, thoughts: ["stacked colours, like book spines", "a street of tiny shops", "paint each shelf a mood"] },
    { stimulus: 1, thoughts: ["huts = summer pop-up bookshops"] },
  ],
  role: [
    { stimulus: 0, thoughts: ["a reading crew with a shared map", "monthly voyages into one genre", "the bookseller as captain"] },
    { stimulus: 1, thoughts: ["a tasting menu of first chapters"] },
  ],
  worst: [
    {
      stimulus: 0,
      thoughts: ["charge people to leave", "only sell books with no words", "close on weekends"],
      crew: [{ who: 0, idea: "shelves that collapse if you browse" }, { who: 1, idea: "prescribe one book, no refunds" }, { who: 2, idea: "books only sold mid-pirouette" }],
    },
    {
      stimulus: 1,
      thoughts: ["no phones, no cafe, no chairs", "a bookshop that shouts at you"],
      crew: [{ who: 0, idea: "a robot that reads aloud, badly" }, { who: 1, idea: "silence enforced by a nurse" }, { who: 2, idea: "an interpretive dance before checkout" }],
    },
  ],
};
const DEMO_LIMIT = 10;

type TypeFrame = { stimulus: number; round: number; chips: string[]; draft: string; crew: { who: number; idea: string }[]; press: "enter" | "next" | "crew" | null };

function buildTypingFrames(key: TechniqueKey) {
  const frames: TypeFrame[] = [];
  scripts[key].forEach((stage, i) => {
    const chips: string[] = [];
    const base = { stimulus: stage.stimulus, round: i + 1, crew: [] as TypeFrame["crew"] };
    hold(frames, { ...base, chips: [], draft: "", press: null }, 12);
    for (const thought of stage.thoughts) {
      for (let c = 1; c <= thought.length; c++) frames.push({ ...base, chips: [...chips], draft: thought.slice(0, c), press: null });
      hold(frames, { ...base, chips: [...chips], draft: thought, press: null }, 6);
      hold(frames, { ...base, chips: [...chips], draft: thought, press: "enter" }, 4);
      chips.push(thought);
      hold(frames, { ...base, chips: [...chips], draft: "", press: null }, 8);
    }
    if (stage.crew) {
      hold(frames, { ...base, chips: [...chips], draft: "", press: "crew" }, 8);
      const shown: TypeFrame["crew"] = [];
      for (const c of stage.crew) { shown.push(c); hold(frames, { ...base, chips: [...chips], draft: "", crew: [...shown], press: null }, 14); }
      hold(frames, { ...base, chips: [...chips], draft: "", crew: [...shown], press: null }, 24);
      hold(frames, { ...base, chips: [...chips], draft: "", crew: [...shown], press: "next" }, 8);
    } else {
      hold(frames, { ...base, chips: [...chips], draft: "", press: "next" }, 8);
    }
  });
  return frames;
}

const typingCopy: Record<TechniqueKey, { crumb: string; kicker: string; question: (f: TypeFrame) => string; placeholder: string; next: string; unit: string; noun: string }> = {
  photo: { crumb: "Session · Photo sparks", kicker: "YOUR THOUGHTS", question: () => "What could this photo mean for your project?", placeholder: "Write what comes to mind…", next: "Next photo", unit: "photos", noun: "photo" },
  role: { crumb: "Session · Role play", kicker: "YOUR THOUGHTS", question: (f) => `How would a ${demoRoles[f.stimulus].name.toLowerCase()} solve this?`, placeholder: "Write what comes to mind…", next: "Next role", unit: "roles", noun: "role" },
  worst: { crumb: "Session · Worst idea", kicker: "YOUR WORST IDEAS", question: (f) => provocations[f.stimulus], placeholder: "The worst idea I can think of…", next: "Next round", unit: "rounds", noun: "round" },
};

function TypingDemo({ technique }: { technique: TechniqueKey }) {
  const frames = useMemo(() => buildTypingFrames(technique), [technique]);
  const still = technique === "worst" ? frames.findIndex((f) => f.crew.length === 3) + 2 : frames.findIndex((f) => f.chips.length === 3) + 2;
  const f = frames[useFrame(frames.length, still)];
  const copy = typingCopy[technique];
  const role = demoRoles[f.stimulus];
  return (
    <MockWindow big crumb={`Community bookstore › ${copy.crumb}`}>
      <div className={`demo-exercise ${technique}`}>
        {technique === "photo" && (
          <div className="demo-photo">
            {photos.map((p, i) => <img key={p.url} src={p.url} alt="" className={i === f.stimulus ? "on" : ""} />)}
            <small>PHOTO {String(f.round).padStart(2, "0")} / {DEMO_LIMIT}</small>
          </div>
        )}
        {technique === "role" && (
          <div className="demo-stage role" key={f.stimulus}>
            <small>ROLE {String(f.round).padStart(2, "0")} / {DEMO_LIMIT}</small>
            <Avatar initials={role.initials} />
            <span className="demo-stage-label">YOU ARE THE</span>
            <strong>{role.name}</strong>
            <p>{role.cue}</p>
          </div>
        )}
        {technique === "worst" && (
          <div className="demo-stage worst">
            <small>ROUND {String(f.round).padStart(2, "0")} / {DEMO_LIMIT}</small>
            <div className="demo-table">
              <span className="demo-you">YOU</span>
              {demoCrew.map((c, i) => <span className={`demo-seat seat-${i} ${f.crew.some((x) => x.who === i) ? "spoke" : ""}`} key={c.name}><Avatar small initials={c.initials} /><em>{c.name}</em></span>)}
            </div>
            <span className="demo-stage-label">BAD IDEAS ONLY</span>
            <p className="demo-question" key={f.stimulus}>{provocations[f.stimulus]}</p>
          </div>
        )}
        <div className="demo-panel">
          <small className="kicker">{copy.kicker}</small>
          <b>{copy.question(f)}</b>
          <div className={`demo-count ${f.chips.length >= 3 ? "met" : ""}`}>{f.chips.length >= 3 ? <Icon name="check" size={11} /> : null}{f.chips.length} {f.chips.length === 1 ? "idea" : "ideas"}{f.chips.length < 3 ? " · aim for 3 or more" : ""}</div>
          <div className="mock-chips demo-chips">
            {f.chips.length === 0 && <span className="ghost">Your ideas appear here</span>}
            {f.chips.map((chip) => <span className={`${technique === "worst" ? "worst" : "you"} pop`} key={chip}>{chip}</span>)}
          </div>
          {f.crew.length > 0 ? (
            <div className="demo-crew-ideas">
              <small>FROM YOUR CREW</small>
              {f.crew.map((c) => <span className="pop" key={c.idea}><Avatar small initials={demoCrew[c.who].initials} />{c.idea}</span>)}
            </div>
          ) : (
            <div className={`mock-input demo-input ${f.draft ? "typing" : ""}`}>{f.draft || <span className="ph">{copy.placeholder}</span>}<i /></div>
          )}
          <div className="mock-row">
            <span className="mock-mic"><Icon name="mic" size={11} /> Speak</span>
            {f.crew.length === 0 && <span className={`key-hint ${f.press === "enter" ? "pressed" : ""}`}>Enter ↵</span>}
            {technique === "worst" && f.crew.length === 0 ? (
              <span className={`mock-cta small crew ${f.press === "crew" ? "pressed" : ""}`}>Pass to the crew <Icon name="arrow" size={11} /></span>
            ) : (
              <span className={`mock-cta small ${f.press === "next" ? "pressed" : ""}`}>{copy.next} <Icon name="arrow" size={11} /></span>
            )}
          </div>
        </div>
      </div>
      <div className="demo-progress" aria-hidden="true">
        {Array.from({ length: DEMO_LIMIT }, (_, i) => <span key={i} className={i < f.round - 1 ? "done" : i === f.round - 1 ? "now" : ""} />)}
        <small>{f.round} of {DEMO_LIMIT} {copy.unit}</small>
      </div>
    </MockWindow>
  );
}

/* ---------- Demo: picking ---------- */

type PickRow = { thumb: { img?: string; initials?: string }; you: string[]; other: { text: string; who?: string }[] };
const pickData: Record<TechniqueKey, { otherLabel: string; rows: PickRow[]; order: string[] }> = {
  photo: {
    otherLabel: "MUSE’S THOUGHTS",
    rows: [
      { thumb: { img: photos[0].url }, you: ["stacked colours, like book spines", "a street of tiny shops"], other: [{ text: "Window displays curated by residents" }, { text: "Shelves sorted by colour" }, { text: "Book swap at the bus stop" }] },
      { thumb: { img: photos[1].url }, you: ["huts = summer pop-up bookshops"], other: [{ text: "Seasonal reading kiosks" }, { text: "A hut for each neighbourhood" }, { text: "Beach library on wheels" }] },
    ],
    order: ["0-you-0", "0-other-0", "1-you-0", "1-other-2"],
  },
  role: {
    otherLabel: "MUSE AS THE SAME ROLE",
    rows: [
      { thumb: { initials: "CA" }, you: ["a reading crew with a shared map", "monthly voyages into one genre"], other: [{ text: "Readers sign on as crew members" }, { text: "A logbook of every book sold" }, { text: "Expeditions to authors’ hometowns" }] },
      { thumb: { initials: "CH" }, you: ["a tasting menu of first chapters"], other: [{ text: "Books paired like wine" }, { text: "A daily special shelf" }, { text: "Open kitchen for readings" }] },
    ],
    order: ["0-you-1", "0-other-0", "1-you-0", "1-other-0"],
  },
  worst: {
    otherLabel: "YOUR CREW’S WORST IDEAS",
    rows: [
      { thumb: { initials: "R1" }, you: ["charge people to leave", "only sell books with no words"], other: [{ text: "shelves that collapse if you browse", who: "AD" }, { text: "prescribe one book, no refunds", who: "SA" }, { text: "books only sold mid-pirouette", who: "LO" }] },
      { thumb: { initials: "R2" }, you: ["make the shop impossible to find"], other: [{ text: "a waiting list to enter", who: "AD" }, { text: "read the ending out loud first", who: "SA" }, { text: "silent disco, books optional", who: "LO" }] },
    ],
    order: ["0-you-0", "0-other-1", "1-you-0", "1-other-2"],
  },
};
type PickFrame = { picked: string[]; hover: string | null };

function buildPickFrames(order: string[]) {
  const frames: PickFrame[] = [];
  const picked: string[] = [];
  hold(frames, { picked: [], hover: null }, 14);
  for (const id of order) {
    hold(frames, { picked: [...picked], hover: id }, 10);
    picked.push(id);
    hold(frames, { picked: [...picked], hover: null }, 8);
  }
  hold(frames, { picked: [...picked], hover: "continue" }, 18);
  hold(frames, { picked: [...picked], hover: null }, 10);
  return frames;
}

function PickingDemo({ technique }: { technique: TechniqueKey }) {
  const data = pickData[technique];
  const frames = useMemo(() => buildPickFrames(data.order), [data]);
  const f = frames[useFrame(frames.length, frames.length - 1, 90)];
  const yours = f.picked.filter((id) => id.includes("-you-")).length;
  const chip = (row: number, side: "you" | "other", i: number, text: string, who?: string) => {
    const id = `${row}-${side}-${i}`;
    const on = f.picked.includes(id);
    const tone = side === "you" ? (technique === "worst" ? "worst" : "you") : technique === "worst" ? "crew" : "muse";
    return (
      <span key={id} className={`${tone} ${on ? "picked" : ""} ${f.hover === id ? "hovered" : ""}`}>
        {on ? <Icon name="check" size={9} /> : who ? <Avatar small initials={who} /> : side === "other" ? <Icon name="spark" size={8} /> : null}{text}
        {f.hover === id && <span className="demo-pointer"><Icon name="hand" size={16} /></span>}
      </span>
    );
  };
  return (
    <MockWindow big crumb="Community bookstore › Review">
      <div className="demo-compare-head"><small>YOUR IDEAS</small><small>{technique !== "worst" && <Icon name="spark" size={8} />} {data.otherLabel}</small></div>
      {data.rows.map((row, r) => (
        <div className="demo-compare-row" key={r}>
          {row.thumb.img ? <img src={row.thumb.img} alt="" /> : <span className="demo-thumb-initials">{row.thumb.initials}</span>}
          <div className="mock-chips">{row.you.map((t, i) => chip(r, "you", i, t))}</div>
          <div className="mock-chips">{row.other.map((o, i) => chip(r, "other", i, o.text, o.who))}</div>
        </div>
      ))}
      <div className="mock-selection">
        <span><b>{yours}</b> of yours · <b>{f.picked.length - yours}</b> from {technique === "worst" ? "the crew" : "Muse"}</span>
        <span className={`mock-cta small ${f.hover === "continue" ? "pressed" : ""}`}>
          Continue with {f.picked.length} ideas <Icon name="arrow" size={11} />
          {f.hover === "continue" && <span className="demo-pointer"><Icon name="hand" size={16} /></span>}
        </span>
      </div>
    </MockWindow>
  );
}

/* ---------- Walkthrough content per technique ---------- */

type Action = { icon: IconName; label: string };
type WalkStep = { short: string; where: string; title: string; text: string; todo?: string[]; actions?: Action[]; repeat?: string; tip?: string; visual: React.ReactNode; feature?: boolean };

function ActionStrip({ actions }: { actions: Action[] }) {
  return (
    <ol className="action-strip">
      {actions.map((a, i) => <li key={a.label}>{i > 0 && <i aria-hidden="true">→</i>}<b><span><Icon name={a.icon} size={20} /></span>{a.label}</b></li>)}
    </ol>
  );
}

const lensMock = (selected: TechniqueKey) => (
  <div className="mock-lenses">
    <div className={`mock-lens violet ${selected === "photo" ? "selected" : ""}`}><Icon name="image" size={14} /><span><b>Photo sparks</b><small>React to random images</small></span>{selected === "photo" && <i />}</div>
    <div className={`mock-lens yellow ${selected === "role" ? "selected" : ""}`}><Icon name="play" size={14} /><span><b>Role play</b><small>Solve it through new eyes</small></span>{selected === "role" && <i />}</div>
    <div className={`mock-lens rose ${selected === "worst" ? "selected" : ""}`}><Icon name="bulb" size={14} /><span><b>Worst idea</b><small>Bad ideas only</small></span>{selected === "worst" && <i />}</div>
  </div>
);

function walkthroughFor(t: TechniqueKey): WalkStep[] {
  const create: WalkStep = {
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
  };
  const promise: WalkStep = {
    short: "Warm up",
    where: "BEFORE EACH SESSION",
    title: "A ten-second warm-up for the right mindset",
    text: "Before each session, four short reminders appear one at a time, like “Quantity over quality” and “Bad ideas are welcome”. Press Enter to go to the next one. On the last screen you can add an intention, or turn the warm-up off.",
    todo: ["Read the reminder", "Press Enter or Next", "Start ideating"],
    visual: (
      <MockWindow crumb="Community bookstore › Warm-up">
        <div className="mock-warmup">
          <div className="mock-warmup-dots">{warmupLessons.map((l, i) => <span className={i === 1 ? "on" : i < 1 ? "done" : ""} key={l.rule} />)}<span /></div>
          <small>2 / 5</small>
          <strong>{warmupLessons[1].rule}</strong>
          <p>“{warmupLessons[1].quote}”</p>
          <div className="mock-row"><span className="key-hint">Enter ↵</span><span className="mock-cta small">Next <Icon name="arrow" size={11} /></span></div>
        </div>
      </MockWindow>
    ),
  };
  const roundTwo: WalkStep = {
    short: "Round two",
    where: "SESSION · PART 3 · COMING SOON",
    title: "Take your shortlist into round two",
    text: t === "worst" ? "The bad ideas you picked move into a second round, where you flip them into good ones. We are designing this step now." : "The ideas you picked move on together into a second round, where you combine and develop them. We are designing this step now.",
    visual: t === "worst" ? (
      <MockWindow crumb="Community bookstore › Round two">
        <div className="mock-pair">
          <div className="mock-card worst">charge people to leave</div>
          <span className="mock-plus"><Icon name="repeat" size={14} /></span>
          <div className="mock-card you">pay people to stay: free coffee for every hour you read</div>
        </div>
        <div className="mock-result"><small><Icon name="spark" size={9} /> FLIPPED</small>A reading lounge where staying longer earns you something</div>
      </MockWindow>
    ) : (
      <MockWindow crumb="Community bookstore › Round two">
        <div className="mock-pair">
          <div className="mock-card you">huts = summer pop-up bookshops</div>
          <span className="mock-plus"><Icon name="plus" size={14} /></span>
          <div className="mock-card muse">Shelves sorted by colour</div>
        </div>
        <div className="mock-result"><small><Icon name="spark" size={9} /> NEW DIRECTION</small>Colour-coded summer book huts, one per neighbourhood</div>
      </MockWindow>
    ),
  };

  if (t === "worst") return [
    create,
    promise,
    {
      short: "Pick your crew",
      where: "SESSION · SETUP",
      title: "Choose Worst idea and invite your crew",
      text: "You stay yourself the whole time. Your crew is a set of characters with their own backgrounds, like Ada the engineer or Sam the doctor. Each of them brings bad ideas from their own point of view.",
      todo: ["Choose Worst idea", "Pick the characters who join your crew", "Choose how many rounds"],
      tip: "Mix very different people. The further apart their worlds, the more surprising the ideas.",
      visual: (
        <MockWindow crumb="Community bookstore › Session">
          {lensMock("worst")}
          <div className="mock-crew">
            <span>Who joins your crew?</span>
            <div>{crewCharacters.slice(0, 6).map((c, i) => <b className={i < 3 ? "on" : ""} key={c.name}><Avatar small initials={c.initials} />{c.name} · {c.role}</b>)}</div>
          </div>
        </MockWindow>
      ),
    },
    {
      short: "Write, then pass",
      where: "SESSION · PART 1 · YOU AND YOUR CREW",
      title: "Answer the question badly. Then hear your crew.",
      text: "Each round asks a new question, like “What idea would your parents hate?” or “What would a cartoon villain do?”. Write the worst answers you can, at least 3. Then pass to the crew: each character adds their own. The next round brings a new question.",
      actions: [{ icon: "eye", label: "Read the question" }, { icon: "pen", label: "Write a bad idea" }, { icon: "repeat", label: "Do it 3+ times" }, { icon: "spark", label: "Pass to the crew" }, { icon: "arrow", label: "Next round" }],
      repeat: "Every round brings a new question. Keep going, and build on each other’s bad ideas, until you reach your finish line.",
      tip: "Nobody is judging. The sillier it gets, the more freely ideas start to flow.",
      feature: true,
      visual: <TypingDemo technique="worst" />,
    },
    {
      short: "Pick the gems",
      where: "SESSION · PART 2 · REVIEW",
      title: "Find the bad ideas with something in them",
      text: "All the worst ideas, yours and the crew’s, end up side by side. Tap the ones that make you think: there is something here.",
      actions: [{ icon: "eye", label: "Read them all" }, { icon: "hand", label: "Tap to keep" }, { icon: "arrow", label: "Continue" }],
      tip: "Look for a bad idea that would become good if you turned it upside down.",
      feature: true,
      visual: <PickingDemo technique="worst" />,
    },
    roundTwo,
  ];

  const isPhoto = t === "photo";
  return [
    create,
    promise,
    {
      short: "Choose a technique",
      where: "SESSION · SETUP",
      title: "Pick a technique and how long to go",
      text: isPhoto ? "Photo sparks shows you random pictures to react to." : "Role play gives you a new role each round, so you see the problem through someone else’s eyes.",
      todo: [`Choose ${isPhoto ? "Photo sparks" : "Role play"}`, "Choose 10, 20 or 30 sparks as your finish line"],
      tip: "New here? Start with 10 sparks.",
      visual: (
        <MockWindow crumb="Community bookstore › Session">
          {lensMock(t)}
          <div className="mock-length"><span>How many sparks?</span><div><b className="on">10</b><b>20</b><b>30</b></div></div>
        </MockWindow>
      ),
    },
    isPhoto ? {
      short: "Look and write",
      where: "SESSION · PART 1 · ON YOUR OWN",
      title: "Look at the photo. Write what it makes you think of.",
      text: "Write one thought and press Enter. It appears above the box. Then keep going: try at least 3 different ideas for each photo before you click Next photo. There is no upper limit. Muse isn’t involved yet, so every idea here is yours.",
      actions: [{ icon: "eye", label: "Look" }, { icon: "pen", label: "Write a thought" }, { icon: "check", label: "Press Enter" }, { icon: "repeat", label: "Do it 3+ times" }, { icon: "arrow", label: "Next photo" }],
      repeat: "Repeat for every photo until you reach your finish line: 10, 20 or 30.",
      tip: "Your first idea is usually the obvious one. The second and third are where it gets interesting.",
      feature: true,
      visual: <TypingDemo technique="photo" />,
    } : {
      short: "Become the role",
      where: "SESSION · PART 1 · ON YOUR OWN",
      title: "Step into the role. Solve it the way they would.",
      text: "Each round, you become someone else, like a captain or a chef. Write how they would tackle your challenge and press Enter. Try at least 3 ideas before you click Next role. Muse isn’t involved yet, so every idea here is yours.",
      actions: [{ icon: "play", label: "Become the role" }, { icon: "pen", label: "Write as them" }, { icon: "check", label: "Press Enter" }, { icon: "repeat", label: "Do it 3+ times" }, { icon: "arrow", label: "Next role" }],
      repeat: "Repeat for every role until you reach your finish line: 10, 20 or 30.",
      tip: "Use the role’s own words. A captain talks about crews and maps, a chef about taste and timing.",
      feature: true,
      visual: <TypingDemo technique="role" />,
    },
    {
      short: "Pick with Muse",
      where: "SESSION · PART 2 · WITH MUSE",
      title: "Tap the ideas you like, yours and Muse’s",
      text: isPhoto
        ? "When you finish, you see Muse’s ideas for the same photos next to yours. Muse did the exercise on its own, so expect overlaps, gaps and surprises. Now you choose and mix."
        : "When you finish, you see how Muse answered as the same roles, next to your ideas. Muse did the exercise on its own, so expect overlaps, gaps and surprises. Now you choose and mix.",
      actions: [{ icon: "eye", label: "Read yours" }, { icon: "spark", label: "See Muse’s" }, { icon: "hand", label: "Tap to keep" }, { icon: "arrow", label: "Continue" }],
      tip: "Look for places where you and Muse saw the same thing differently. That gap is often where the best idea is.",
      feature: true,
      visual: <PickingDemo technique={t} />,
    },
    roundTwo,
  ];
}

/* ---------- Page ---------- */

const mindsets: { icon: IconName; title: string; text: string }[] = [
  { icon: "compass", title: "Curiosity", text: "Ask why a photo pulls at you, or why an idea feels off. That question is where new ideas start." },
  { icon: "eye", title: "Noticing", text: "Small surprises are signals. One prompt at a time gives you room to catch them." },
  { icon: "repeat", title: "Reflection", text: "At the end, you look at your own thinking next to other views before you decide anything." },
  { icon: "hand", title: "Ownership", text: "You choose which ideas move on. The creative decisions stay with you, so the result is yours." },
];

const techniques: { key: TechniqueKey; tone: string; icon: IconName; name: string; origin: string; text: string; good: string }[] = [
  { key: "photo", tone: "violet", icon: "image", name: "Photo sparks", origin: "the random picture generator", text: "A random picture appears and you connect it to your question. Because the image has nothing to do with your problem, your brain has to build new bridges, which pulls you away from the obvious answer.", good: "Breaking out of familiar ideas" },
  { key: "role", tone: "yellow", icon: "play", name: "Role play", origin: "classic role play", text: "You become someone else, like a captain or a chef, and solve the problem the way they would. Each round brings a new role.", good: "Seeing the problem from a new angle" },
  { key: "worst", tone: "rose", icon: "bulb", name: "Worst idea", origin: "the classic worst idea exercise", text: "You stay yourself and answer provocative questions as badly as you can, like “What idea would your parents hate?”. A crew of characters, like an engineer, a doctor and a dancer, adds their own. A terrible idea often flips into a great one.", good: "Getting unstuck and loosening up" },
];

export function HomePage({ onStart }: { onStart: () => void }) {
  const [tour, setTour] = useState<TechniqueKey>("photo");
  const steps = walkthroughFor(tour);
  const showHow = (key: TechniqueKey) => { setTour(key); document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">QUANTITY OVER QUALITY</span>
          <h1>Don’t look for the perfect idea. Make a hundred.</h1>
          <p>Great ideas come from having lots to choose from. Muse helps you generate many possibilities fast with short, classic creative exercises, and only then pick the ones worth keeping. You lead, and AI adds more options.</p>
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
          <p>Muse is about growing a mindset of curiosity and reflection. Creativity is something you practise, and the practice is the point. When AI hands you a finished answer, you skip the looking, wondering and choosing where your thinking actually grows.</p>
          <p>So in Muse, you do that work yourself. AI assists along the way as a second pair of eyes, not a shortcut, and every creative decision stays with you.</p>
        </div>

        <ol className="loop-strip">
          <li><small>FIRST</small><strong>You explore on your own</strong><p>You write your own ideas for each prompt. The direction is yours.</p></li>
          <li className="muse"><small><Icon name="spark" size={10} /> ALONGSIDE</small><strong>Muse explores separately</strong><p>Muse does the same exercise: it looks at your question and the same prompts and comes up with its own ideas, loose ones too.</p></li>
          <li><small>THEN</small><strong>You mix and decide</strong><p>You put both sets side by side, notice what differs, and choose what moves on.</p></li>
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
              <AppButton className="text-button see-how" onClick={() => showHow(t.key)}>See how it works <Icon name="arrow" size={14} /></AppButton>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" id="how">
        <div className="home-section-head">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Your first session, step by step</h2>
          <p>A session takes about 15 minutes. Choose a technique to see what you will do on each screen.</p>
        </div>

        <div className="tour-tabs" role="tablist" aria-label="Technique">
          {techniques.map((t) => (
            <button aria-selected={tour === t.key} className={`tour-tab ${t.tone} ${tour === t.key ? "on" : ""}`} key={t.key} onClick={() => setTour(t.key)} role="tab" type="button">
              <span className="technique-icon"><Icon name={t.icon} size={16} /></span>{t.name}
            </button>
          ))}
        </div>

        <ol className="journey-map" aria-label="Session overview">
          {steps.map((step, index) => (
            <li key={step.short}><a href={`#step-${index + 1}`}><span>{index + 1}</span>{step.short}</a></li>
          ))}
        </ol>

        <div className="walkthrough" key={tour}>
          {steps.map((step, index) => (
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
