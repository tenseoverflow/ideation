import { SessionContext, useField, api, type Project, type Session } from "./projects";
import type { Photo, MuseRequest, MuseResponse } from "./muse";
import { useContext, useEffect, useRef, useState } from "react";
import { Icon, AppButton, type IconName } from "./ui";
import { HomePage, crewCharacters, provocations, warmupLessons } from "./home";
import { VoiceInput } from "./VoiceInput";


const roles = [
  { name: "Captain", initials: "CA", cue: "Steer the crew. Set a clear destination.", words: ["crew", "map", "signal"] },
  { name: "Astronaut", initials: "AS", cue: "Work with limits. Explore the unknown.", words: ["orbit", "mission", "discovery"] },
  { name: "Doctor", initials: "DR", cue: "Listen first. Diagnose what really hurts.", words: ["care", "check-up", "trust"] },
  { name: "Chef", initials: "CH", cue: "Combine ingredients into an experience.", words: ["menu", "taste", "gather"] },
];

type Technique = "Photo sparks" | "Role play" | "Worst idea";

type Stage = "overview" | "rules" | "ideate" | "review" | "shortlist";
type SessionRecord = { id: string; startedAt: string; finishedAt: string; finished: boolean; techniques: Technique[]; intention: string; pledges: string[]; ideas: { label: string; text: string }[]; museCount: number; kept: Pick[]; keptLabels: Record<string, string> };
type View = "home" | "projects";

type SessionEntry = {
  id: number;
  label: string;
  technique: Technique;
  imageUrl?: string;
  photo?: Photo;
  stimulus: string;
  userThoughts: string[];
};
type Pick = { entryId: number; source: "you" | "muse"; text: string };
type MuseReading = { status: "loading" | "done" | "error"; ideas: string[] };

const MUSE_PER_SPARK = 6;
const withArticle = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
const samePick = (a: Pick, b: Pick) => a.entryId === b.entryId && a.source === b.source && a.text === b.text;

/* ---------- Shared header (same on every page) ---------- */

type Crumb = { label: string; onClick?: () => void };
function SiteHeader({ crumbs, onHome, onProjects, right }: { crumbs?: Crumb[]; onHome: () => void; onProjects: () => void; right?: React.ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header-left">
        <AppButton className="brand" onClick={onHome}><span className="brand-mark"><Icon name="spark" size={14} /></span>Muse</AppButton>
        {crumbs?.length ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            <AppButton onClick={onProjects}>My projects</AppButton>
            {crumbs.map((crumb) => <span key={crumb.label}><Icon name="chevron" size={12} />{crumb.onClick ? <AppButton onClick={crumb.onClick}>{crumb.label}</AppButton> : crumb.label}</span>)}
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

function EditableThought({text,onSave,onDelete}:{text:string;onSave:(text:string)=>void;onDelete:()=>void}) {
 const [editing,setEditing]=useState(false); const [value,setValue]=useState(text);
 return editing ? <div className="thought-tag-editor"><input aria-label="Edit thought" size={Math.max(1, value.length)} autoFocus value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter" && value.trim()){onSave(value.trim());setEditing(false)} if(e.key==="Escape")setEditing(false)}} /><AppButton className="save-thought" aria-label="Save idea" title="Save idea" disabled={!value.trim()} onClick={()=>{onSave(value.trim());setEditing(false)}}><Icon name="check" size={15} /></AppButton><AppButton className="delete-thought" aria-label="Delete idea" title="Delete idea" onClick={()=>{setEditing(false);onDelete()}}><Icon name="trash" size={15} /></AppButton></div> : <AppButton className="thought-tag" title="Edit thought" onClick={()=>{setValue(text);setEditing(true)}}>{text}<Icon name="pen" size={12} /></AppButton>;
}

function MainCanvas({ project, onFinish }: { project: Project; onFinish: () => void }) {
  const [photoIndex, setPhotoIndex] = useField("photoIndex", 0);
  const [photos, setPhotos] = useField<Photo[]>("photoQueue", []);
  const [photoError, setPhotoError] = useState("");
  const fetchingPhotos = useRef(false);
  async function loadPhotos() {
    if (fetchingPhotos.current) return;
    fetchingPhotos.current = true; setPhotoError("");
    try { const batch = await api<Photo[]>("/api/photos/random"); setPhotos(old => [...old, ...batch.filter(photo => !old.some(item => item.id === photo.id))]); }
    catch { setPhotoError("Could not load photos. Check Unsplash configuration and retry."); }
    finally { fetchingPhotos.current = false; }
  }
  useEffect(() => { if (photos.length - photoIndex < 4) void loadPhotos(); }, [photos.length, photoIndex]);
  const [roleIndex, setRoleIndex] = useField("roleIndex", 0);
  const [round, setRound] = useField("round", 1);
  const [limit, setLimit] = useField("limit", 20);
  const [selectedTechnique, setSelectedTechnique] = useField<Technique>("selectedTechnique", "Photo sparks");
  const [entries, setEntries] = useField<SessionEntry[]>("entries", []);
  const [draft, setDraft] = useField("draft", "");
  const [currentThoughts, setCurrentThoughts] = useField<string[]>("currentThoughts", []);
  const [crew, setCrew] = useField<string[]>("crewNames", ["Ada", "Sam", "Lou"]);
  const [crewNow, setCrewNow] = useField<{ who: string; idea: string }[]>("crewNow", []);
  const [readings, setReadings] = useField<Record<string, MuseReading>>("museReadings", {});
  const [crewLoading, setCrewLoading] = useState(false);
  const [crewError, setCrewError] = useState("");

  const [voiceActive, setVoiceActive] = useState(false);

  const isPhoto = selectedTechnique === "Photo sparks";
  const isWorst = selectedTechnique === "Worst idea";
  const crewMembers = crewCharacters.filter((c) => crew.includes(c.name));
  const question = provocations[(round - 1) % provocations.length];
  const [intention] = useField("intention", "");
  const promptNoun = isPhoto ? "photo" : isWorst ? "round" : "role";
  function toggleCrew(name: string) {
    if (voiceActive) return;
    if (crew.includes(name)) { if (crew.length > 1) setCrew(crew.filter((c) => c !== name)); }
    else setCrew([...crew, name]);
  }

  async function passToCrew() {
    setCrewLoading(true); setCrewError("");
    try {
      const results = await Promise.all(crewMembers.map(async (c) => {
        const body: MuseRequest = { projectId: project.id, technique: "Worst idea", role: `${c.name}, ${withArticle(c.role.toLowerCase())}`, stimulus: `Answer this as ${c.name}, ${withArticle(c.role.toLowerCase())}: ${question}` };
        const data = await api<MuseResponse>("/api/muse", "POST", body);
        return { who: c.name, idea: data.ideas[0] };
      }));
      setCrewNow(results);
    } catch {
      setCrewError("The crew couldn’t answer. Try again, or go to the next round.");
    } finally {
      setCrewLoading(false);
    }
  }
  useEffect(() => { const next = photos[photoIndex + 1]; if (next) { const image = new Image(); image.src = next.url; } }, [photos, photoIndex]);
  const allThoughts = [...entries.flatMap((e) => e.userThoughts), ...currentThoughts];

  function addThought() {
    const text = draft.trim();
    if (voiceActive || !text || text.length > 240) return;
    setCurrentThoughts([...currentThoughts, text]);
    setDraft("");
  }

  function captureEntry(extra: string[] = []) {
    const thoughts = [...currentThoughts, ...extra, ...(draft.trim() ? [draft.trim()] : [])];
    const entry: SessionEntry = {
      id: entries.length + 1,
      label: isPhoto ? `Photo ${round}` : isWorst ? `Round ${round}` : roles[roleIndex].name,
      technique: selectedTechnique,
      photo: isPhoto ? photos[photoIndex] : undefined,
      imageUrl: isPhoto ? photos[photoIndex].url : undefined,
      stimulus: isPhoto ? photos[photoIndex].alt : isWorst ? question : `Think like ${withArticle(roles[roleIndex].name)}: ${roles[roleIndex].cue}`,
      userThoughts: thoughts,
    };
    setEntries([...entries, entry]);
    if (isWorst && crewNow.length) { setReadings({ ...readings, [entry.id]: { status: "done", ideas: crewNow.map((c) => `${c.who}: ${c.idea}`) } }); setCrewNow([]); }
    setCurrentThoughts([]);
    setDraft("");
  }

  /** Moves to the next prompt. Returns false when the session is finished. */
  function advance() {
    if (round >= limit) { onFinish(); return false; }
    if (isPhoto) setPhotoIndex(photoIndex + 1);
    else if (!isWorst) setRoleIndex((roleIndex + 1) % roles.length);
    setRound(round + 1);
    return true;
  }

  function nextStimulus() {
    if (voiceActive || draft.length > 240) return;
    captureEntry();
    advance();
  }

  function finishNow() {
    if (voiceActive || draft.length > 240) return;
    if (draft.trim() || currentThoughts.length) captureEntry();
    onFinish();
  }

  const techniques = [
    { name: "Photo sparks", detail: "React to random images", tone: "violet", icon: "image" as IconName },
    { name: "Role play", detail: "Solve it through new eyes", tone: "yellow", icon: "play" as IconName },
    { name: "Worst idea", detail: "Bad ideas only, on purpose", tone: "rose", icon: "bulb" as IconName },
  ];
  const progressStep = Math.max(1, Math.ceil((round / limit) * 10));
  const finishLabel = isWorst ? "Finish & review" : "Finish & see Muse";
  const nextLabel = round >= limit ? finishLabel : isPhoto ? "Next photo" : isWorst ? "Next round" : "Next role";

  if (!photos[photoIndex] && isPhoto) return <div className="canvas-scroll"><p role="status">{photoError || "Loading photos…"}</p>{photoError && <AppButton onClick={() => void loadPhotos()}>Retry</AppButton>}</div>;

  return (
    <div className="canvas-scroll">
      <section className="intro">
        <div>
          <span className="eyebrow">STEP 1 OF 3 · YOUR IDEAS</span>
          <h1>{project.challenge}</h1>
          <div className="session-rules" aria-label="Reminders for this session">
            {warmupLessons.map((l) => <span key={l.rule}>{l.rule}</span>)}
            {intention && <em>Your intention: “{intention}”</em>}
          </div>
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
                if (voiceActive || selectedTechnique === technique.name || draft.length > 240) return;
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
            <div><strong>Who joins your crew?</strong><span>You stay yourself. Pick the characters who add their own worst ideas after each round.</span></div>
            <div className="crew-options">
              {crewCharacters.map((c) => (
                <AppButton aria-pressed={crew.includes(c.name)} className={crew.includes(c.name) ? "on" : ""} key={c.name} onClick={() => toggleCrew(c.name)}>
                  <span>{c.initials}</span>{c.name} · {c.role}{crew.includes(c.name) && <Icon name="check" size={12} />}
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
          <AppButton className="finish-early" disabled={voiceActive || draft.length > 240} onClick={finishNow}>{finishLabel}</AppButton>
        </div>

        <div className="exercise-grid">
          {isPhoto ? (
            <div className="photo-card">
              <img src={photos[photoIndex].url} alt={photos[photoIndex].alt} />
              <div className="photo-topline"><span><Icon name="image" size={15} /> PHOTO SPARK</span><span>{String(round).padStart(2, "0")} / {limit}</span></div>
              <div className="photo-footer"><span>Photo by <a href={photos[photoIndex].profileUrl} target="_blank" rel="noreferrer">{photos[photoIndex].credit}</a> on <a href={photos[photoIndex].pageUrl} target="_blank" rel="noreferrer">Unsplash</a></span></div>
            </div>
          ) : isWorst ? (
            <div className="role-card worst-card">
              <div className="role-topline"><span><Icon name="bulb" size={14} /> WORST IDEA · ROUND {String(round).padStart(2, "0")} / {limit}</span></div>
              <div className="crew-table">
                <span className="crew-you">YOU</span>
                {crewMembers.map((c, k) => (
                  <span className={`crew-seat ${crewNow.some((x) => x.who === c.name) ? "spoke" : ""}`} key={c.name} style={{ "--angle": `${(360 / crewMembers.length) * k - 90}deg` } as React.CSSProperties}>
                    <b>{c.initials}</b><em>{c.name}</em>
                  </span>
                ))}
              </div>
              <span className="role-label">BAD IDEAS ONLY</span>
              <p className="worst-question">{question}</p>
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
                <span className="prompt-kicker">{isWorst ? "YOUR WORST IDEAS" : "YOUR THOUGHTS"}</span>
                <h3>{isPhoto ? "What could this photo mean for your project?" : isWorst ? question : `How would ${withArticle(roles[roleIndex].name.toLowerCase())} solve this?`}</h3>
                <p>{isWorst ? "Go for terrible, silly or impossible. This is about getting ideas out, not getting them right. Write at least 3, then pass to your crew to hear theirs." : "Write one thought and press Enter. Then keep going: aim for at least 3 different ideas before you move on. There is no limit."}</p>
              </div>
              <div className="current-thoughts">
                {currentThoughts.length === 0 && <span className="placeholder-chip">Your {isWorst ? "worst ideas" : "thoughts"} for this {promptNoun} appear here</span>}
                {currentThoughts.map((thought, index) => <EditableThought key={index} text={thought} onDelete={() => setCurrentThoughts(currentThoughts.filter((_, i) => i !== index))} onSave={text => setCurrentThoughts(currentThoughts.map((old, i) => i === index ? text : old))} />)}
              </div>
              <div className="idea-input">
                <textarea
                  hidden={voiceActive}
                  aria-label="Your thought"
                  maxLength={240}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); addThought(); } }}
                  placeholder={isWorst ? "The worst idea I can think of… (Enter adds it)" : "Write down what comes to mind… (Enter adds it)"}
                  value={draft}
                />
                <div>
                  <VoiceInput projectId={project.id} onActiveChange={setVoiceActive} onThoughts={(thoughts, next) => { if (next) captureEntry(thoughts); else setCurrentThoughts([...currentThoughts, ...thoughts]); }} onAdvance={advance} />
                  <span hidden={voiceActive}>{draft.length} / 240</span>
                  <AppButton hidden={voiceActive} className="add-button" disabled={voiceActive || !draft.trim() || draft.length > 240} onClick={addThought}><Icon name="plus" size={14} /> Add</AppButton>
                </div>
              </div>
              {draft.length > 240 && <p role="alert">Shorten this thought to 240 characters before adding or continuing.</p>}
              {isWorst && (crewNow.length > 0 || crewLoading || crewError) && (
                <div className="crew-ideas">
                  <small>FROM YOUR CREW</small>
                  {crewLoading && <em className="loading-chip">Your crew is thinking of something terrible…</em>}
                  {crewError && <em className="crew-error">{crewError}</em>}
                  {crewNow.map((c) => <span key={c.who}><b>{crewCharacters.find((x) => x.name === c.who)?.initials}</b>{c.idea}</span>)}
                  {crewNow.length > 0 && <p>Steal one, twist it or make it worse in the next round.</p>}
                </div>
              )}
              <div className="exchange-footer">
                <span className={`thought-count ${currentThoughts.length >= 3 ? "met" : ""}`}>{currentThoughts.length >= 3 && <Icon name="check" size={12} />}{currentThoughts.length} {currentThoughts.length === 1 ? "thought" : "thoughts"} for this {promptNoun}{currentThoughts.length < 3 ? " · aim for 3 or more" : ""}</span>
                {isWorst && !crewNow.length ? (
                  <AppButton className="next-spark-button crew-button" disabled={voiceActive || !currentThoughts.length || crewLoading} onClick={() => void passToCrew()}>Pass to the crew <Icon name="arrow" size={16} /></AppButton>
                ) : (
                  <AppButton className="next-spark-button" disabled={voiceActive || draft.length > 240} onClick={nextStimulus}>{nextLabel} <Icon name="arrow" size={16} /></AppButton>
                )}
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
      const body: MuseRequest = { projectId: project.id, imageUrl: entry.imageUrl, technique, role: technique !== "Photo sparks" ? entry.label : undefined, stimulus: entry.stimulus ?? entry.label, thoughts: entry.userThoughts };
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
  if (entry.technique === "Worst idea") return <span className="role-review-avatar worst">R{entry.id}</span>;
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
                  <span>{entry.technique === "Worst idea" ? "YOUR CREW’S WORST IDEAS" : <><Icon name="spark" size={10} /> MUSE’S THOUGHTS</>}</span>
                  <div>
                    {(!reading || reading.status === "loading") && <em className="loading-chip">Muse is looking at this {entry.imageUrl ? "photo" : "role"}…</em>}
                    {reading?.status === "error" && <AppButton className="pick-chip retry" onClick={() => void retry(entry)}>Muse couldn’t answer. Retry</AppButton>}
                    {reading?.status === "done" && reading.ideas.map((text) => {
                      const pick: Pick = { entryId: entry.id, source: "muse", text };
                      const who = entry.technique === "Worst idea" ? crewCharacters.find((c) => text.startsWith(`${c.name}: `)) : undefined;
                      return <AppButton aria-pressed={isPicked(pick)} className={`pick-chip muse ${who ? "crew" : ""} ${isPicked(pick) ? "picked" : ""}`} key={text} onClick={() => toggle(pick)}>{isPicked(pick) ? <Icon name="check" size={11} /> : who ? <b className="chip-avatar">{who.initials}</b> : <Icon name="spark" size={10} />}{who ? text.slice(who.name.length + 2) : text}</AppButton>;
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

function ShortlistCanvas({ entries, onBack, onFinish }: { entries: SessionEntry[]; onBack: () => void; onFinish: () => void }) {
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
        <AppButton className="primary-button" onClick={onFinish}><Icon name="check" size={16} /> Finish and save to project log</AppButton>
      </div>
    </div>
  );
}

const freshSession = { draft: "", currentThoughts: [], entries: [], picks: [], museReadings: {}, photoIndex: 0, roleIndex: 0, crewNow: [], round: 1, intention: "", startedAt: "" };

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* ---------- Warm-up: one small lesson at a time ---------- */

const WARMUP_KEY = "muse.skipWarmup";
export function warmupSkipped() { try { return localStorage.getItem(WARMUP_KEY) === "1"; } catch { return false; } }
function setWarmupSkipped(skip: boolean) { try { if (skip) localStorage.setItem(WARMUP_KEY, "1"); else localStorage.removeItem(WARMUP_KEY); } catch { /* storage unavailable */ } }

function WarmupCanvas({ onStart }: { onStart: () => void }) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useField("intention", "");
  const [skip, setSkip] = useState(false);
  const last = step === warmupLessons.length;
  const next = () => { if (last) { setWarmupSkipped(skip); onStart(); } else setStep(step + 1); };
  const back = () => setStep(Math.max(0, step - 1));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); next(); }
      if (e.key === "ArrowRight" && !last) next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const lesson = warmupLessons[step];
  return (
    <div className={`warmup ${last ? "final" : lesson.color}`}>
      <div className="warmup-inner">
        <div className="warmup-top">
          <div className="warmup-dots" aria-hidden="true">{[...warmupLessons, null].map((_, k) => <span className={k < step ? "done" : k === step ? "on" : ""} key={k} />)}</div>
          <span>{step + 1} / {warmupLessons.length + 1}</span>
        </div>
        {!last ? (
          <div className="warmup-card" key={step}>
            <span className="eyebrow">WARM-UP · REMINDER {step + 1}</span>
            <h1>{lesson.rule}</h1>
            <p>“{lesson.quote}”</p>
          </div>
        ) : (
          <div className="warmup-card" key="final">
            <span className="eyebrow">READY?</span>
            <h1>Let’s make a mess.</h1>
            <p className="warmup-why">We show this warm-up before every session because the right mindset matters more than the right idea. When bad ideas feel welcome, the good ones follow.</p>
            <label htmlFor="intention">What do you want from this session? <small>Optional</small></label>
            <input id="intention" maxLength={140} placeholder="For example: loosen up, or find ideas for the summer opening" value={intention} onChange={(e) => setIntention(e.target.value)} />
            <label className="warmup-skip"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Don’t show this warm-up again</label>
          </div>
        )}
        <div className="warmup-nav">
          {step > 0 ? <AppButton className="text-button" onClick={back}><Icon name="back" size={14} /> Back</AppButton> : <span />}
          <span className="warmup-hint">Press <kbd>Enter</kbd> to continue</span>
          <AppButton className="primary-button" onClick={next}>{last ? "Start ideating" : "Next"} <Icon name="arrow" size={16} /></AppButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- Project overview with the session log ---------- */

const techniqueTone: Record<Technique, string> = { "Photo sparks": "violet", "Role play": "yellow", "Worst idea": "rose" };

function SessionLogCard({ record, index }: { record: SessionRecord; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="log-card">
      <div className="log-dot" aria-hidden="true" />
      <header>
        <div>
          <span className="eyebrow">SESSION {index}{record.finished ? "" : " · NOT FINISHED"}</span>
          <h3>{formatDate(record.startedAt)}</h3>
        </div>
        <div className="log-tags">{record.techniques.map((t) => <span className={`log-tag ${techniqueTone[t]}`} key={t}>{t}</span>)}</div>
      </header>
      {record.intention && <p className="log-intention">“{record.intention}”</p>}
      <div className="log-stats"><span><strong>{record.ideas.length}</strong> your ideas</span><span><strong>{record.museCount}</strong> from Muse or crew</span><span><strong>{record.kept.length}</strong> kept</span></div>
      {record.kept.length > 0 && (
        <div className="log-kept">
          <small>KEPT</small>
          <div>{record.kept.map((k) => <span className={`pick-chip ${k.source} picked-soft`} key={`${k.entryId}-${k.source}-${k.text}`}>{k.text}</span>)}</div>
        </div>
      )}
      {record.ideas.length > 0 && (
        <>
          <AppButton className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} all {record.ideas.length} of your ideas <Icon name="chevron" size={12} /></AppButton>
          {open && <ul className="log-ideas">{record.ideas.map((idea, k) => <li key={k}><small>{idea.label}</small>{idea.text}</li>)}</ul>}
        </>
      )}
    </article>
  );
}

function WarmupToggle() {
  const [skipped, setSkipped] = useState(warmupSkipped());
  if (!skipped) return null;
  return <AppButton className="text-button warmup-toggle" onClick={() => { setWarmupSkipped(false); setSkipped(false); }}>Warm-up is off. Turn it back on</AppButton>;
}

function ProjectOverview({ project, inProgress, onContinue, onNew }: { project: Project; inProgress: boolean; onContinue: () => void; onNew: () => void }) {
  const [history] = useField<SessionRecord[]>("history", []);
  const totalIdeas = history.reduce((n, r) => n + r.ideas.length, 0);
  const totalKept = history.reduce((n, r) => n + r.kept.length, 0);
  return (
    <div className="canvas-scroll overview">
      <section className="overview-hero">
        <div>
          <span className="eyebrow">PROJECT · {project.name.toUpperCase()}</span>
          <h1>{project.challenge}</h1>
        </div>
        <div className="overview-actions">
          {inProgress && <AppButton className="primary-button" onClick={onContinue}>Continue current session <Icon name="arrow" size={16} /></AppButton>}
          <AppButton className={inProgress ? "ghost-button" : "primary-button"} onClick={onNew}><Icon name="plus" size={16} /> Start a new session</AppButton>
        </div>
      </section>
      <div className="overview-stats">
        <div><strong>{history.length}</strong><span>sessions</span></div>
        <div><strong>{totalIdeas}</strong><span>ideas from you</span></div>
        <div><strong>{totalKept}</strong><span>ideas kept</span></div>
        <WarmupToggle />
      </div>
      <section>
        <div className="section-title"><div><h2>Session log</h2></div><span>Every session you finish is saved here, newest first</span></div>
        {history.length === 0 ? (
          <div className="empty-trail">No sessions yet. When you finish a session, its ideas, your promises and what you kept are saved here, so you can look back at how the project grew.</div>
        ) : (
          <div className="log-list">{[...history].reverse().map((r, k) => <SessionLogCard key={r.id} record={r} index={history.length - k} />)}</div>
        )}
      </section>
    </div>
  );
}

function ProjectSession({ project }: { project: Project }) {
  const { data, set } = useContext(SessionContext);
  const [stage, setStage] = useField<Stage>("stage", "overview");
  const [entries] = useField<SessionEntry[]>("entries", []);
  const [history, setHistory] = useField<SessionRecord[]>("history", []);
  const inProgress = entries.length > 0 || ((data.currentThoughts as string[] | undefined)?.length ?? 0) > 0;

  function archive(finished: boolean) {
    const picks = (data.picks as Pick[] | undefined) ?? [];
    const readings = (data.museReadings as Record<string, MuseReading> | undefined) ?? {};
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      startedAt: (data.startedAt as string) || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      finished,
      techniques: [...new Set(entries.map((e) => e.technique ?? "Photo sparks"))],
      intention: (data.intention as string) ?? "",
      pledges: [],
      ideas: entries.flatMap((e) => e.userThoughts.map((text) => ({ label: e.label, text }))),
      museCount: Object.values(readings).reduce((n, r) => n + r.ideas.length, 0),
      kept: picks,
      keptLabels: {},
    };
    setHistory([...history, record]);
  }

  function reset(next: Stage) {
    for (const [key, value] of Object.entries(freshSession)) set(key, value);
    setStage(next);
    window.scrollTo(0, 0);
  }

  function startNew() {
    if (inProgress) {
      if (!confirm("Your current session will be saved to the log as not finished. Start a new one?")) return;
      archive(false);
    }
    if (warmupSkipped()) { reset("ideate"); set("startedAt", new Date().toISOString()); } else reset("rules");
  }

  return (
    <main className="workspace">
      {stage === "overview" && <ProjectOverview project={project} inProgress={inProgress} onContinue={() => setStage("ideate")} onNew={startNew} />}
      {stage === "rules" && <WarmupCanvas onStart={() => { set("startedAt", new Date().toISOString()); setStage("ideate"); window.scrollTo(0, 0); }} />}
      {stage === "ideate" && <MainCanvas project={project} onFinish={() => setStage("review")} />}
      {stage === "review" && <ReviewCanvas project={project} entries={entries} onBack={() => setStage("ideate")} onContinue={() => setStage("shortlist")} />}
      {stage === "shortlist" && <ShortlistCanvas entries={entries} onBack={() => setStage("review")} onFinish={() => { archive(true); reset("overview"); }} />}
    </main>
  );
}

/* ---------- App shell: data, saving, routing ---------- */

const stageNames: Record<Stage, string> = { overview: "Overview", rules: "Warm-up", ideate: "Session", review: "Review", shortlist: "Shortlist" };

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

  const stage = (data.stage as Stage | undefined) ?? "overview";
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
        crumbs={project ? (stage === "overview" ? [{ label: project.name }] : [{ label: project.name, onClick: () => setData((d) => ({ ...d, stage: "overview" })) }, { label: stageNames[stage] }]) : view === "projects" ? [] : undefined}
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
          <form onSubmit={async (e) => { e.preventDefault(); try { const r = await api<{ id: string }>(form.id ? `/api/projects/${form.id}` : "/api/projects", form.id ? "PATCH" : "POST", form); setForm(null); await list(); if (!form.id) { await open(r.id); setData((d) => ({ ...d, stage: warmupSkipped() ? "ideate" : "rules", startedAt: new Date().toISOString() })); } } catch (e) { setError(String(e)); } }}>
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
