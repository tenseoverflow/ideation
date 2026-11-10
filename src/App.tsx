import { SessionContext, useField, api, type Project, type Session } from "./projects";
import type { MuseRequest, MuseResponse } from "./muse";
import { useContext, useEffect, useRef, useState } from "react";
import { Icon, AppButton, photos, type IconName } from "./ui";
import { HomePage } from "./home";


const roles = [
  { name: "Captain", initials: "CA", cue: "Steer the crew. Set a clear destination.", words: ["crew", "map", "signal"] },
  { name: "Astronaut", initials: "AS", cue: "Work with limits. Explore the unknown.", words: ["orbit", "mission", "discovery"] },
  { name: "Doctor", initials: "DR", cue: "Listen first. Diagnose what really hurts.", words: ["care", "check-up", "trust"] },
  { name: "Chef", initials: "CH", cue: "Combine ingredients into an experience.", words: ["menu", "taste", "gather"] },
];

type Technique = "Photo sparks" | "Role play" | "Worst idea";

const crewOptions = [
  { name: "Engineer", initials: "EN" }, { name: "Doctor", initials: "DR" }, { name: "Dancer", initials: "DA" }, { name: "Chemist", initials: "CM" },
  { name: "Mechanic", initials: "ME" }, { name: "Child", initials: "CH" }, { name: "Gardener", initials: "GA" }, { name: "Musician", initials: "MU" },
  { name: "Teacher", initials: "TE" }, { name: "Architect", initials: "AR" }, { name: "Farmer", initials: "FA" }, { name: "Comedian", initials: "CO" },
];
type Stage = "ideate" | "review" | "shortlist";
type View = "home" | "projects";

type SessionEntry = {
  id: number;
  label: string;
  technique: Technique;
  imageUrl?: string;
  stimulus: string;
  userThoughts: string[];
};
type Pick = { entryId: number; source: "you" | "muse"; text: string };
type MuseReading = { status: "loading" | "done" | "error"; ideas: string[] };

const MUSE_PER_SPARK = 6;
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
const samePick = (a: Pick, b: Pick) => a.entryId === b.entryId && a.source === b.source && a.text === b.text;

/* ---------- Shared header (same on every page) ---------- */

function SiteHeader({ crumbs, onHome, onProjects, right }: { crumbs?: string[]; onHome: () => void; onProjects: () => void; right?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header-left">
        <AppButton className="brand" onClick={onHome}><span className="brand-mark"><Icon name="spark" size={14} /></span>Muse</AppButton>
        {crumbs?.length ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            <AppButton onClick={onProjects}>My projects</AppButton>
            {crumbs.map((crumb) => <span key={crumb}><Icon name="chevron" size={12} />{crumb}</span>)}
          </nav>
        ) : (
          <nav className="site-links">
            <a href="#why">Why Muse</a>
            <a href="#techniques">Techniques</a>
            <a href="#how">How it works</a>
            <AppButton onClick={onProjects}>My projects</AppButton>
          </nav>
        )}
      </div>
      <div className="site-header-right">{right}</div>
    </header>
  );
}

/* ---------- Projects dashboard ---------- */

const tones = ["violet", "yellow", "green", "rose"];

function ProjectsPage({ projects, onOpen, onEdit, onCreate, onDelete }: { projects: Project[]; onOpen: (id: string) => void; onEdit: (p: Project) => void; onCreate: () => void; onDelete: (p: Project) => void }) {
  return (
    <main className="dashboard">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">MY PROJECTS</span>
          <h1>A space for each question you want to explore.</h1>
        </div>
        <AppButton className="primary-button" onClick={onCreate}><Icon name="plus" size={16} /> New project</AppButton>
      </div>
      <div className="project-grid">
        <AppButton className="project-tile new-tile" onClick={onCreate}>
          <span className="technique-icon"><Icon name="plus" /></span>
          <strong>New project</strong>
          <small>Start with a challenge question</small>
        </AppButton>
        {projects.map((p, index) => (
          <article className="project-tile" key={p.id}>
            <button className={`project-cover ${tones[index % tones.length]}`} onClick={() => onOpen(p.id)} type="button" aria-label={`Open ${p.name}`}>
              <Icon name="spark" size={22} />
            </button>
            <div className="project-body">
              <strong>{p.name}</strong>
              <p>{p.challenge}</p>
              <small>Updated {p.updatedAt}</small>
            </div>
            <div className="project-actions">
              <AppButton className="primary-button small" onClick={() => onOpen(p.id)}>Open</AppButton>
              <AppButton className="text-button" onClick={() => onEdit(p)}>Edit</AppButton>
              <AppButton className="text-button danger" onClick={() => onDelete(p)}>Delete</AppButton>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

/* ---------- Step 1: ideate (your own thoughts only) ---------- */

function MainCanvas({ project, onFinish }: { project: Project; onFinish: () => void }) {
  const [photoIndex, setPhotoIndex] = useField("photoIndex", 0);
  const [roleIndex, setRoleIndex] = useField("roleIndex", 0);
  const [round, setRound] = useField("round", 1);
  const [limit, setLimit] = useField("limit", 20);
  const [selectedTechnique, setSelectedTechnique] = useField<Technique>("selectedTechnique", "Photo sparks");
  const [entries, setEntries] = useField<SessionEntry[]>("entries", []);
  const [draft, setDraft] = useField("draft", "");
  const [currentThoughts, setCurrentThoughts] = useField<string[]>("currentThoughts", []);
  const [voiceNote, setVoiceNote] = useState(false);
  const [crew, setCrew] = useField<string[]>("crew", ["Engineer", "Doctor", "Dancer"]);
  const [crewIndex, setCrewIndex] = useField("crewIndex", 0);

  const isPhoto = selectedTechnique === "Photo sparks";
  const isWorst = selectedTechnique === "Worst idea";
  const member = crewOptions.find((c) => c.name === crew[crewIndex % crew.length]) ?? crewOptions[0];
  const promptNoun = isPhoto ? "photo" : isWorst ? "person" : "role";
  function toggleCrew(name: string) {
    if (crew.includes(name)) { if (crew.length > 1) setCrew(crew.filter((c) => c !== name)); }
    else setCrew([...crew, name]);
    setCrewIndex(0);
  }
  const allThoughts = [...entries.flatMap((e) => e.userThoughts), ...currentThoughts];

  function addThought() {
    const text = draft.trim();
    if (!text) return;
    setCurrentThoughts([...currentThoughts, text]);
    setDraft("");
  }

  function captureEntry() {
    const thoughts = draft.trim() ? [...currentThoughts, draft.trim()] : currentThoughts;
    const entry: SessionEntry = {
      id: entries.length + 1,
      label: isPhoto ? `Photo ${round}` : isWorst ? member.name : roles[roleIndex].name,
      technique: selectedTechnique,
      imageUrl: isPhoto ? photos[photoIndex].url : undefined,
      stimulus: isPhoto ? photos[photoIndex].alt : isWorst ? `The worst possible idea, as ${withArticle(member.name)}` : `Think like ${withArticle(roles[roleIndex].name)}: ${roles[roleIndex].cue}`,
      userThoughts: thoughts,
    };
    setEntries([...entries, entry]);
    setCurrentThoughts([]);
    setDraft("");
  }

  function nextStimulus() {
    captureEntry();
    if (round >= limit) return onFinish();
    if (isPhoto) setPhotoIndex((photoIndex + 1) % photos.length);
    else if (isWorst) setCrewIndex((crewIndex + 1) % crew.length);
    else setRoleIndex((roleIndex + 1) % roles.length);
    setRound(round + 1);
  }

  function finishNow() {
    if (draft.trim() || currentThoughts.length) captureEntry();
    onFinish();
  }

  const techniques = [
    { name: "Photo sparks", detail: "React to random images", tone: "violet", icon: "image" as IconName },
    { name: "Role play", detail: "Solve it through new eyes", tone: "yellow", icon: "play" as IconName },
    { name: "Worst idea", detail: "Bad ideas only, on purpose", tone: "rose", icon: "bulb" as IconName },
  ];
  const progressStep = Math.max(1, Math.ceil((round / limit) * 10));
  const nextLabel = round >= limit ? "Finish & see Muse" : isPhoto ? "Next photo" : isWorst ? "Next person" : "Next role";

  return (
    <div className="canvas-scroll">
      <section className="intro">
        <div>
          <span className="eyebrow">STEP 1 OF 3 · YOUR IDEAS</span>
          <h1>{project.challenge}</h1>
        </div>
        <div className="progress-wrap">
          <div><span>Idea sparks</span><strong>{round} of {limit}</strong></div>
          <div className="progress"><span className={`progress-step progress-step-${progressStep}`} /></div>
        </div>
      </section>

      <section className="techniques-section">
        <div className="section-title">
          <div><span className="section-number">01</span><h2>Choose your lens</h2></div>
          <span>Switch techniques anytime</span>
        </div>
        <div className="technique-grid">
          {techniques.map((technique) => (
            <AppButton
              className={`technique-card ${technique.tone} ${selectedTechnique === technique.name ? "selected" : ""}`}
              key={technique.name}
              onClick={() => {
                if (selectedTechnique === technique.name) return;
                if (draft.trim() || currentThoughts.length) captureEntry();
                setSelectedTechnique(technique.name as Technique);
              }}
            >
              <span className="technique-icon"><Icon name={technique.icon} /></span>
              <span><strong>{technique.name}</strong><small>{technique.detail}</small></span>
              <span className="radio-dot" />
            </AppButton>
          ))}
        </div>
        {isWorst && (
          <div className="crew-picker">
            <div><strong>Who joins your brainstorm?</strong><span>Pick the people whose worst ideas you want. You take turns being each of them.</span></div>
            <div className="crew-options">
              {crewOptions.map((c) => (
                <AppButton aria-pressed={crew.includes(c.name)} className={crew.includes(c.name) ? "on" : ""} key={c.name} onClick={() => toggleCrew(c.name)}>
                  <span>{c.initials}</span>{c.name}{crew.includes(c.name) && <Icon name="check" size={12} />}
                </AppButton>
              ))}
            </div>
          </div>
        )}
        <div className="session-length">
          <div><strong>How many sparks?</strong><span>Choose a finish line before you begin.</span></div>
          <div className="length-options">
            {[10, 20, 30].map((count) => (
              <AppButton className={limit === count ? "active" : ""} disabled={round > 1} key={count} onClick={() => setLimit(count)}>{count}</AppButton>
            ))}
          </div>
        </div>
      </section>

      <section className="exercise">
        <div className="section-title">
          <div><span className="section-number">02</span><h2>{isPhoto ? "Look. React. Connect." : isWorst ? "Bad ideas only" : "Step into a new role"}</h2></div>
          <AppButton className="finish-early" onClick={finishNow}>Finish & see Muse</AppButton>
        </div>

        <div className="exercise-grid">
          {isPhoto ? (
            <div className="photo-card">
              <img src={photos[photoIndex].url} alt={photos[photoIndex].alt} />
              <div className="photo-topline"><span><Icon name="image" size={15} /> PHOTO SPARK</span><span>{String(round).padStart(2, "0")} / {limit}</span></div>
              <div className="photo-footer"><span>Photo by {photos[photoIndex].credit} on Unsplash</span></div>
            </div>
          ) : isWorst ? (
            <div className="role-card worst-card">
              <div className="role-topline"><span><Icon name="bulb" size={14} /> WORST IDEA {String(round).padStart(2, "0")} / {limit}</span></div>
              <span className="role-avatar">{member.initials}</span>
              <span className="role-label">YOU ARE THE</span>
              <h3>{member.name}</h3>
              <p>What is the worst idea {withArticle(member.name.toLowerCase())} could have for this challenge?</p>
              <div className="role-words"><span>no filter</span><span>the worse, the better</span><span>no wrong answers</span></div>
            </div>
          ) : (
            <div className="role-card">
              <div className="role-topline"><span><Icon name="play" size={14} /> ROLE {String(round).padStart(2, "0")} / {limit}</span></div>
              <span className="role-avatar">{roles[roleIndex].initials}</span>
              <span className="role-label">THINK LIKE A</span>
              <h3>{roles[roleIndex].name}</h3>
              <p>{roles[roleIndex].cue}</p>
              <div className="role-words">{roles[roleIndex].words.map((word) => <span key={word}>{word}</span>)}</div>
            </div>
          )}

          <div className="prompt-panel">
            <div className="thought-step your-thought-step">
              <div className="thought-exchange-heading">
                <span className="prompt-kicker">YOUR THOUGHTS</span>
                <h3>{isPhoto ? "What could this photo mean for your project?" : isWorst ? `As ${withArticle(member.name.toLowerCase())}, what’s the worst idea you can think of?` : `How would ${withArticle(roles[roleIndex].name.toLowerCase())} solve this?`}</h3>
                <p>{isWorst ? "Go for terrible, silly or impossible. This is about getting ideas out, not getting them right. Aim for at least 3 before you pass to the next person." : "Write one thought and press Enter. Then keep going: aim for at least 3 different ideas before you move on. There is no limit."}</p>
              </div>
              <div className="current-thoughts">
                {currentThoughts.length === 0 && <span className="placeholder-chip">Your {isWorst ? "worst ideas" : "thoughts"} for this {promptNoun} appear here</span>}
                {currentThoughts.map((thought) => <span key={thought}>{thought}</span>)}
              </div>
              <div className="idea-input">
                <textarea
                  aria-label="Your thought"
                  maxLength={240}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); addThought(); } }}
                  placeholder={isWorst ? "The worst idea I can think of… (Enter adds it)" : "Write down what comes to mind… (Enter adds it)"}
                  value={draft}
                />
                <div>
                  <AppButton className={`mic-button ${voiceNote ? "active" : ""}`} aria-label="Speak your thought (coming soon)" title="Voice input is coming soon" onClick={() => setVoiceNote(!voiceNote)}>
                    <Icon name="mic" size={16} /> {voiceNote ? "Voice input is coming soon" : "Speak"}
                  </AppButton>
                  <span>{draft.length} / 240</span>
                  <AppButton className="add-button" disabled={!draft.trim()} onClick={addThought}><Icon name="plus" size={14} /> Add</AppButton>
                </div>
              </div>
              <div className="exchange-footer">
                <span className={`thought-count ${currentThoughts.length >= 3 ? "met" : ""}`}>{currentThoughts.length >= 3 && <Icon name="check" size={12} />}{currentThoughts.length} {currentThoughts.length === 1 ? "thought" : "thoughts"} from this {promptNoun}{currentThoughts.length < 3 ? " · aim for 3 or more" : ""}</span>
                <AppButton className="next-spark-button" onClick={nextStimulus}>{nextLabel} <Icon name="arrow" size={16} /></AppButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ideas-section">
        <div className="section-title">
          <div><span className="section-number">03</span><h2>Thought trail</h2></div>
          <span>{allThoughts.length} {allThoughts.length === 1 ? "thought" : "thoughts"} so far</span>
        </div>
        <div className="ideas-list">
          {allThoughts.length === 0 && <div className="empty-trail">Your words will gather here as you move through the session.</div>}
          {allThoughts.map((idea, index) => (
            <article className="idea-note" key={`${idea}-${index}`}>
              <span className="idea-count">{String(index + 1).padStart(2, "0")}</span>
              <p>{idea}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- Step 2: review (Muse appears, pick from both) ---------- */

function useMuseReadings(project: Project, entries: SessionEntry[]) {
  const [readings, setReadings] = useField<Record<string, MuseReading>>("museReadings", {});
  const latest = useRef(readings);
  latest.current = readings;
  const running = useRef(false);

  async function load(entry: SessionEntry) {
    const put = (r: MuseReading) => { latest.current = { ...latest.current, [entry.id]: r }; setReadings(latest.current); };
    put({ status: "loading", ideas: [] });
    try {
      const technique: Technique = entry.technique ?? (entry.imageUrl ? "Photo sparks" : "Role play");
      const body: MuseRequest = { projectId: project.id, technique, role: technique !== "Photo sparks" ? entry.label : undefined, stimulus: entry.stimulus ?? entry.label };
      const data = await api<MuseResponse>("/api/muse", "POST", body);
      put({ status: "done", ideas: data.ideas.slice(0, MUSE_PER_SPARK) });
    } catch {
      put({ status: "error", ideas: [] });
    }
  }

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    (async () => {
      for (const entry of entries) {
        const r = latest.current[entry.id];
        if (r && r.status !== "loading") continue;
        await load(entry);
      }
      running.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  return { readings, retry: load };
}

function SourceThumb({ entry }: { entry: SessionEntry }) {
  return entry.imageUrl ? <img src={entry.imageUrl} alt={entry.stimulus} /> : <span className="role-review-avatar">{entry.label.slice(0, 2).toUpperCase()}</span>;
}

function ReviewCanvas({ project, entries, onBack, onContinue }: { project: Project; entries: SessionEntry[]; onBack: () => void; onContinue: () => void }) {
  const [picks, setPicks] = useField<Pick[]>("picks", []);
  const { readings, retry } = useMuseReadings(project, entries);
  const toggle = (pick: Pick) => setPicks((old) => (old.some((p) => samePick(p, pick)) ? old.filter((p) => !samePick(p, pick)) : [...old, pick]));
  const isPicked = (pick: Pick) => picks.some((p) => samePick(p, pick));
  const yours = picks.filter((p) => p.source === "you").length;
  const muse = picks.length - yours;

  return (
    <div className="canvas-scroll review-scroll">
      <section className="review-hero">
        <span className="eyebrow">STEP 2 OF 3 · COMPARE WITH MUSE</span>
        <h1>Now see what Muse noticed.</h1>
        <p>Muse did the same exercise on its own: it looked at the same {entries.some((e) => e.imageUrl) ? "photos" : "prompts"} with your challenge in mind. Read your own thoughts first, then Muse’s. Tap the ideas worth keeping, from either side. They move on with you to the next round.</p>
        <div className="review-stats"><strong>{entries.length}</strong><span>sparks explored</span><strong>{entries.flatMap((e) => e.userThoughts).length}</strong><span>thoughts from you</span></div>
      </section>

      <section className="comparison-section">
        <div className="section-title">
          <div><span className="section-number">01</span><h2>Your view, next to Muse</h2></div>
          <span>Look for overlaps, gaps and surprises</span>
        </div>
        <div className="comparison-list">
          {entries.length === 0 && <div className="empty-trail">No sparks were captured in this session. Go back and write a few thoughts first.</div>}
          {entries.map((entry) => {
            const reading = readings[entry.id];
            return (
              <article className="comparison-card" key={entry.id}>
                <div className="comparison-source">
                  <SourceThumb entry={entry} />
                  <div><span>SPARK {String(entry.id).padStart(2, "0")}</span><strong>{entry.label}</strong></div>
                </div>
                <div className="thought-column human-column">
                  <span>YOUR THOUGHTS</span>
                  <div>
                    {entry.userThoughts.length ? entry.userThoughts.map((text) => {
                      const pick: Pick = { entryId: entry.id, source: "you", text };
                      return <AppButton aria-pressed={isPicked(pick)} className={`pick-chip you ${isPicked(pick) ? "picked" : ""}`} key={text} onClick={() => toggle(pick)}>{isPicked(pick) && <Icon name="check" size={11} />}{text}</AppButton>;
                    }) : <em className="empty-selection">You skipped this one</em>}
                  </div>
                </div>
                <div className="thought-column ai-column">
                  <span><Icon name="spark" size={10} /> MUSE’S THOUGHTS</span>
                  <div>
                    {(!reading || reading.status === "loading") && <em className="loading-chip">Muse is looking at this {entry.imageUrl ? "photo" : "role"}…</em>}
                    {reading?.status === "error" && <AppButton className="pick-chip retry" onClick={() => void retry(entry)}>Muse couldn’t answer. Retry</AppButton>}
                    {reading?.status === "done" && reading.ideas.map((text) => {
                      const pick: Pick = { entryId: entry.id, source: "muse", text };
                      return <AppButton aria-pressed={isPicked(pick)} className={`pick-chip muse ${isPicked(pick) ? "picked" : ""}`} key={text} onClick={() => toggle(pick)}>{isPicked(pick) ? <Icon name="check" size={11} /> : <Icon name="spark" size={10} />}{text}</AppButton>;
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="selection-bar">
        <AppButton className="text-button" onClick={onBack}><Icon name="back" size={14} /> Back to session</AppButton>
        <span><strong>{yours}</strong> of yours · <strong>{muse}</strong> from Muse selected</span>
        <AppButton className="primary-button" disabled={!picks.length} onClick={onContinue}>Continue with {picks.length || ""} {picks.length === 1 ? "idea" : "ideas"} <Icon name="arrow" size={16} /></AppButton>
      </div>
    </div>
  );
}

/* ---------- Step 3: shortlist (new session, pairing comes later) ---------- */

function ShortlistCanvas({ entries, onBack, onRestart }: { entries: SessionEntry[]; onBack: () => void; onRestart: () => void }) {
  const [picks] = useField<Pick[]>("picks", []);
  const entryFor = (id: number) => entries.find((e) => e.id === id);
  const groups: { source: Pick["source"]; title: string }[] = [{ source: "you", title: "Your ideas" }, { source: "muse", title: "From Muse" }];

  return (
    <div className="canvas-scroll review-scroll">
      <section className="review-hero">
        <span className="eyebrow">STEP 3 OF 3 · BUILD ON THE SHORTLIST</span>
        <h1>Your shortlist.</h1>
        <p>These are the ideas you kept. Next, you will pair one of yours with one from Muse and develop the combination into a stronger direction.</p>
      </section>

      <section className="shortlist-columns">
        {groups.map((group) => {
          const items = picks.filter((p) => p.source === group.source);
          return (
            <div className="shortlist-column" key={group.source}>
              <div className="section-title"><div><h2>{group.title}</h2></div><span>{items.length} selected</span></div>
              {items.length === 0 && <div className="empty-trail">None selected</div>}
              {items.map((pick) => {
                const entry = entryFor(pick.entryId);
                return (
                  <article className={`shortlist-card ${pick.source}`} key={`${pick.entryId}-${pick.text}`}>
                    {entry && <SourceThumb entry={entry} />}
                    <div><small>{entry?.label ?? "Spark"}</small><p>{pick.text}</p></div>
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="pairing-teaser">
        <span className="agent-orb"><Icon name="spark" size={18} /></span>
        <div>
          <strong>Pairing comes next</strong>
          <p>Combine an idea of yours with one from Muse to form a new direction. This part of the flow is still being designed.</p>
        </div>
        <AppButton className="primary-button" disabled>Start pairing <Icon name="arrow" size={16} /></AppButton>
      </section>

      <div className="selection-bar plain">
        <AppButton className="text-button" onClick={onBack}><Icon name="back" size={14} /> Back to review</AppButton>
        <AppButton className="text-button danger" onClick={onRestart}>Start a new session</AppButton>
      </div>
    </div>
  );
}

function ProjectSession({ project }: { project: Project }) {
  const { set } = useContext(SessionContext);
  const [stage, setStage] = useField<Stage>("stage", "ideate");
  const [entries] = useField<SessionEntry[]>("entries", []);

  function restartSession() {
    if (!confirm("Clear this project’s session and start over?")) return;
    for (const [key, value] of Object.entries({ draft: "", currentThoughts: [], entries: [], picks: [], museReadings: {}, photoIndex: 0, roleIndex: 0, crewIndex: 0, round: 1 })) set(key, value);
    setStage("ideate");
  }

  return (
    <main className="workspace">
      {stage === "ideate" && <MainCanvas project={project} onFinish={() => setStage("review")} />}
      {stage === "review" && <ReviewCanvas project={project} entries={entries} onBack={() => setStage("ideate")} onContinue={() => setStage("shortlist")} />}
      {stage === "shortlist" && <ShortlistCanvas entries={entries} onBack={() => setStage("review")} onRestart={restartSession} />}
    </main>
  );
}

/* ---------- App shell: data, saving, routing ---------- */

const stageNames: Record<Stage, string> = { ideate: "Session", review: "Compare with Muse", shortlist: "Shortlist" };

export default function App() {
  const [view, setView] = useState<View>("home");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [data, setData] = useState<Session>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<{ id?: string; name: string; challenge: string } | null>(null);
  const revision = useRef(0), latest = useRef(data), saved = useRef(data), saving = useRef<Promise<void> | null>(null);
  latest.current = data;

  async function list() { try { setProjects(await api<Project[]>("/api/projects")); setError(""); } catch (e) { setError(String(e)); } }
  useEffect(() => { void list(); }, []);
  async function open(id: string) { try { const r = await api<{ project: Project; data: Session; revision: number }>(`/api/projects/${id}`); revision.current = r.revision; saved.current = r.data; latest.current = r.data; setData(r.data); setProject(r.project); setStatus("Saved"); setError(""); window.scrollTo(0, 0); } catch (e) { setError(String(e)); } }
  async function flush() { if (saving.current) await saving.current; if (latest.current === saved.current) return; const snapshot = latest.current; setStatus("Saving…"); const job = api<{ revision: number }>(`/api/projects/${project!.id}/session`, "PUT", { data: snapshot, revision: revision.current }).then((r) => { revision.current = r.revision; saved.current = snapshot; setStatus("Saved"); }).catch((e) => { setStatus(String(e).includes("conflict") ? "Conflict" : "Save failed"); throw e; }); saving.current = job; try { await job; } finally { saving.current = null; } }
  useEffect(() => { if (!project || data === saved.current) return; setStatus("Unsaved"); const timer = setTimeout(() => void flush().catch(() => {}), 500); return () => clearTimeout(timer); }, [data, project]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (latest.current !== saved.current) e.preventDefault(); }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, []);
  async function leave(to: View) { if (project) { try { while (latest.current !== saved.current) await flush(); } catch { if (!confirm("Save failed. Leave without saving?")) return; } setProject(null); void list(); } setView(to); window.scrollTo(0, 0); }

  const stage = (data.stage as Stage | undefined) ?? "ideate";
  const statusTone = status === "Saved" ? "ok" : status === "Conflict" || status === "Save failed" ? "bad" : "busy";

  const right = project ? (
    <>
      <span className={`save-pill ${statusTone}`} role="status"><span />{status}</span>
      {status === "Save failed" && <AppButton className="text-button" onClick={() => void flush().catch(() => {})}>Retry save</AppButton>}
      {status === "Conflict" && <>
        <AppButton className="text-button" onClick={() => { if (confirm("Discard local changes and reload?")) void open(project.id); }}>Reload saved</AppButton>
        <AppButton className="text-button" onClick={async () => { if (!confirm("Replace the saved session with this version?")) return; try { const r = await api<{ revision: number }>(`/api/projects/${project.id}`); revision.current = r.revision; await flush(); } catch (e) { setError(String(e)); } }}>Keep this version</AppButton>
      </>}
    </>
  ) : view === "home" ? (
    <AppButton className="primary-button small" onClick={() => void leave("projects")}>Start a session</AppButton>
  ) : null;

  return (
    <div className="app-shell">
      <SiteHeader
        crumbs={project ? [project.name, stageNames[stage]] : view === "projects" ? [] : undefined}
        onHome={() => void leave("home")}
        onProjects={() => void leave("projects")}
        right={right}
      />
      {error && <p className="error-banner" role="alert">{error} <AppButton className="text-button" onClick={list}>Retry</AppButton></p>}
      {project ? (
        <SessionContext.Provider value={{ data, set: (key, value) => setData((old) => ({ ...old, [key]: value })) }}>
          <ProjectSession key={project.id} project={project} />
        </SessionContext.Provider>
      ) : view === "home" ? (
        <HomePage onStart={() => void leave("projects")} />
      ) : (
        <ProjectsPage
          projects={projects}
          onOpen={(id) => void open(id)}
          onEdit={(p) => setForm(p)}
          onCreate={() => setForm({ name: "", challenge: "" })}
          onDelete={async (p) => { if (!confirm(`Delete “${p.name}” and its session?`)) return; try { await api(`/api/projects/${p.id}`, "DELETE"); await list(); } catch (e) { setError(String(e)); } }}
        />
      )}
      {form && (
        <div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
          <form onSubmit={async (e) => { e.preventDefault(); try { const r = await api<{ id: string }>(form.id ? `/api/projects/${form.id}` : "/api/projects", form.id ? "PATCH" : "POST", form); setForm(null); await list(); if (!form.id) await open(r.id); } catch (e) { setError(String(e)); } }}>
            <span className="eyebrow">{form.id ? "EDIT PROJECT" : "NEW PROJECT"}</span>
            <h2 id="project-form-title">{form.id ? "Edit project" : "What do you want to explore?"}</h2>
            <label htmlFor="project-name">Name</label>
            <input id="project-name" required maxLength={100} placeholder="Community bookstore" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label htmlFor="project-challenge">Challenge question</label>
            <textarea id="project-challenge" required maxLength={1000} placeholder="How might we…" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
            <p>Changes apply to future ideas. Existing work stays saved.</p>
            <div className="modal-actions">
              <AppButton className="text-button" onClick={() => setForm(null)}>Cancel</AppButton>
              <AppButton className="primary-button" type="submit">{form.id ? "Save changes" : "Create project"}</AppButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
