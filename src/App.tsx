import {SessionContext,useField,api,type Project,type Session} from "./projects";
import { CHALLENGE, type MuseRequest, type MuseResponse } from "./muse";
import { useContext, useEffect, useRef, useState } from "react";

type IconName =
  | "spark"
  | "grid"
  | "folder"
  | "clock"
  | "bulb"
  | "shuffle"
  | "arrow"
  | "plus"
  | "chevron"
  | "play"
  | "image";

const photos = [
  {
    url: "https://images.unsplash.com/photo-1729179664878-49b8cc390d2b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
    alt: "Abstract multicolored building facade",
    credit: "Steve A Johnson",
  },
  {
    url: "https://images.unsplash.com/photo-1764007022081-01b34518e2c2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
    alt: "Colorful beach huts receding into the distance",
    credit: "the iop",
  },
  {
    url: "https://images.unsplash.com/photo-1579963824410-69e7079bef9d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
    alt: "Colorful abstract painting",
    credit: "Roger Bradshaw",
  },
];

const roles = [
  { name: "Captain", initials: "CA", cue: "Steer the crew. Set a clear destination.", words: ["crew", "map", "signal"] },
  { name: "Astronaut", initials: "AS", cue: "Work with limits. Explore the unknown.", words: ["orbit", "mission", "discovery"] },
  { name: "Doctor", initials: "DR", cue: "Listen first. Diagnose what really hurts.", words: ["care", "check-up", "trust"] },
  { name: "Chef", initials: "CH", cue: "Combine ingredients into an experience.", words: ["menu", "taste", "gather"] },
];

type Technique = "Photo sparks" | "Role play";
type Stage = "ideate" | "review";

type SessionEntry = {
  id: number;
  label: string;
  imageUrl?: string;
  userThoughts: string[];
  aiThoughts: string[];
  selectedAiThoughts: string[];
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    spark: <path d="m12 2 1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2ZM5 14l.7 2.3L8 17.5l-2.3 1.2L5 21l-.7-2.3L2 17.5l2.3-1.2L5 14Z" />,
    grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    folder: <path d="M3 6.5h6l2-2h3l2 2h5v12H3v-12Z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M8.2 14.7A7 7 0 1 1 15.8 14.7c-.8.5-.8 1.3-.8 2.3H9c0-1 0-1.8-.8-2.3Z" /></>,
    shuffle: <><path d="M4 7h3c4 0 5 10 9 10h4" /><path d="m17 14 3 3-3 3M4 17h3c1.1 0 2-.7 2.8-1.7M14.2 8.7C15 7.7 15.8 7 17 7h3M17 4l3 3-3 3" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    play: <path d="m9 7 8 5-8 5V7Z" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 3 3 3-4 5 6" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill={name === "spark" || name === "grid" || name === "play" ? "currentColor" : "none"}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {paths[name]}
    </svg>
  );
}

function AppButton({
  children,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`app-button ${className}`} type={type} {...props}>
      {children}
    </button>
  );
}

function MainCanvas({ project,
  photoIndex,
  setPhotoIndex,
  roleIndex,
  setRoleIndex,
  round,
  setRound,
  limit,
  setLimit,
  selectedTechnique,
  setSelectedTechnique,
  ideas,
  setIdeas,
  entries,
  setEntries,
  museRevealed,
  setMuseRevealed,
  onFinish,
}: {
  project: Project;
  photoIndex: number;
  setPhotoIndex: (index: number) => void;
  roleIndex: number;
  setRoleIndex: (index: number) => void;
  round: number;
  setRound: (round: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  selectedTechnique: Technique;
  setSelectedTechnique: (technique: Technique) => void;
  ideas: string[];
  setIdeas: (ideas: string[]) => void;
  entries: SessionEntry[];
  setEntries: (entries: SessionEntry[]) => void;
  museRevealed: boolean;
  setMuseRevealed: (revealed: boolean) => void;
  onFinish: () => void;
}) {
  const [draft, setDraft] = useField("draft", "");
  const [currentThoughts, setCurrentThoughts] = useField<string[]>("currentThoughts", []);
  const [selectedMuseThoughts, setSelectedMuseThoughts] = useField<string[]>("selectedMuseThoughts", []);

  const [museIdeas, setMuseIdeas] = useField<string[]>("museIdeas", []);
  const [loading, setLoading] = useState(false);
  const [museError, setMuseError] = useState("");
  const pending = useRef<AbortController | null>(null);
  function cancelMuse() { pending.current?.abort(); pending.current = null; setLoading(false); setMuseIdeas([]); setMuseError(""); }
  useEffect(() => () => pending.current?.abort(), []);
  async function revealMuse() {
    if (pending.current) return;
    const thoughts = draft.trim() ? [...currentThoughts, draft.trim()] : currentThoughts;
    if (!thoughts.length) return;
    if (draft.trim()) { setIdeas([...ideas, draft.trim()]); setCurrentThoughts(thoughts); }
    setDraft(""); setMuseRevealed(true); setLoading(true); setMuseError("");
    const controller = new AbortController(); pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const body: MuseRequest = { projectId: project.id, technique: selectedTechnique, role: selectedTechnique === "Role play" ? roles[roleIndex].name : undefined, thoughts };
      const response = await fetch("/api/muse", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body), signal:controller.signal});
      if (!response.ok) throw Error();
      const data: MuseResponse = await response.json();
      if (!Array.isArray(data.ideas) || !data.ideas.length) throw Error();
      if (pending.current === controller) setMuseIdeas(data.ideas);
    } catch { if (pending.current === controller) setMuseError("Muse could not generate ideas. Please retry or continue without Muse."); }
    finally { clearTimeout(timeout); if (pending.current === controller) { pending.current = null; setLoading(false); } }
  }

  function toggleMuseThought(thought: string) {
    setSelectedMuseThoughts((selected) =>
      selected.includes(thought)
        ? selected.filter((item) => item !== thought)
        : [...selected, thought],
    );
  }

  function captureEntry() {
    const pendingThoughts = draft.trim() ? [...currentThoughts, draft.trim()] : currentThoughts;
    if (draft.trim()) setIdeas([...ideas, draft.trim()]);
    const entry: SessionEntry = {
      id: entries.length + 1,
      label: selectedTechnique === "Photo sparks" ? `Photo ${round}` : roles[roleIndex].name,
      imageUrl: selectedTechnique === "Photo sparks" ? photos[photoIndex].url : undefined,
      userThoughts: pendingThoughts,
      aiThoughts: museIdeas,
      selectedAiThoughts: selectedMuseThoughts,
    };
    cancelMuse();
    const updated = [...entries, entry];
    setEntries(updated);
    setCurrentThoughts([]);
    setSelectedMuseThoughts([]);
    setDraft("");
    setMuseRevealed(false);
    return updated;
  }

  function nextStimulus() {
    captureEntry();
    if (round >= limit) {
      onFinish();
      return;
    }
    if (selectedTechnique === "Photo sparks") {
      setPhotoIndex((photoIndex + 1) % photos.length);
    } else {
      setRoleIndex((roleIndex + 1) % roles.length);
    }
    setRound(round + 1);
  }

  function finishNow() {
    captureEntry();
    onFinish();
  }

  const techniques = [
    { name: "Photo sparks", detail: "React to random images", tone: "violet", icon: "image" as IconName },
    { name: "Role play", detail: "Solve it through new eyes", tone: "yellow", icon: "play" as IconName },
  ];

  const progressStep = Math.max(1, Math.ceil((round / limit) * 10));

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><span>Project workspace</span><Icon name="chevron" size={14} /><strong>{project.name}</strong></div>
        <div className="top-actions">
          
          <AppButton className="share-button">Share</AppButton>
        </div>
      </header>

      <div className="canvas-scroll">
        <section className="intro">
          <div>
            <span className="eyebrow">IDEATION SESSION</span>
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
                  if (draft.trim() || currentThoughts.length || museIdeas.length) captureEntry();
                  cancelMuse();
                  setSelectedTechnique(technique.name as Technique);
                  setCurrentThoughts([]);
                  setSelectedMuseThoughts([]);
                  setDraft("");
                  setMuseRevealed(false);
                }}
              >
                <span className="technique-icon"><Icon name={technique.icon} /></span>
                <span><strong>{technique.name}</strong><small>{technique.detail}</small></span>
                <span className="radio-dot" />
              </AppButton>
            ))}
            <div className="technique-card blank" aria-label="Future ideation technique">
              <span className="technique-icon"><Icon name="plus" /></span>
              <span><strong>Open space</strong><small>A new technique will live here</small></span>
            </div>
          </div>
          <div className="session-length">
            <div><strong>How many sparks?</strong><span>Choose a finish line before you begin.</span></div>
            <div className="length-options">
              {[10, 20, 30].map((count) => (
                <AppButton
                  className={limit === count ? "active" : ""}
                  disabled={round > 1}
                  key={count}
                  onClick={() => setLimit(count)}
                >{count}</AppButton>
              ))}
            </div>
          </div>
        </section>

        <section className="exercise">
          <div className="section-title">
            <div><span className="section-number">02</span><h2>{selectedTechnique === "Photo sparks" ? "Look. React. Connect." : "Step into a new role"}</h2></div>
            <AppButton className="finish-early" onClick={finishNow}>Finish & review</AppButton>
          </div>

          <div className="exercise-grid">
            {selectedTechnique === "Photo sparks" ? (
              <div className="photo-card">
                <img src={photos[photoIndex].url} alt={photos[photoIndex].alt} />
                <div className="photo-topline"><span><Icon name="image" size={15} /> PHOTO SPARK</span><span>{String(round).padStart(2, "0")} / {limit}</span></div>
                <div className="photo-footer">
                  <span>Photo by {photos[photoIndex].credit} on Unsplash</span>
                </div>
              </div>
            ) : (
              <div className="role-card">
                <div className="role-topline"><span><Icon name="play" size={14} /> ROLE {String(round).padStart(2, "0")} / {limit}</span></div>
                <span className="role-avatar">{roles[roleIndex].initials}</span>
                <span className="role-label">THINK LIKE A</span>
                <h3>{roles[roleIndex].name}</h3>
                <p>{roles[roleIndex].cue}</p>
                <div className="role-words">{roles[roleIndex].words.map((word) => <span key={word}>{word}</span>)}</div>
                <AppButton className="next-role-button" onClick={nextStimulus}>{round >= limit ? "Review session" : "Next role"} <Icon name="arrow" size={16} /></AppButton>
              </div>
            )}

            <div className="prompt-panel">
              {!museRevealed ? (
                <div className="thought-step your-thought-step">
                  <div className="thought-exchange-heading">
                    <span className="prompt-kicker">STEP 1 · YOUR THOUGHTS</span>
                    <h3>{selectedTechnique === "Photo sparks" ? "What does this photo spark?" : `How would a ${roles[roleIndex].name.toLowerCase()} solve this?`}</h3>
                    <p>Describe what you notice and what it makes you think. Next sends your words to Muse to build on them.</p>
                  </div>
                  <div className="exchange-label">
                    <span className="exchange-avatar">YOU</span>
                    <div><strong>Your thoughts</strong><small>Words, fragments, or a small idea</small></div>
                  </div>
                  <div className="current-thoughts">
                    {currentThoughts.map((thought) => <span key={thought}>{thought}</span>)}
                  </div>
                  <div className="idea-input">
                    <textarea
                      aria-label="Your thought"
                      maxLength={240}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write down what comes to mind..."
                      value={draft}
                    />
                    <div>
                      <span>{draft.length} / 240</span>
                      <AppButton className="add-button" disabled={!draft.trim() && currentThoughts.length === 0} onClick={revealMuse}>
                        Next <Icon name="arrow" size={16} />
                      </AppButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="thought-step muse-thought-step">
                  <div className="thought-exchange-heading muse-heading">
                    <span className="prompt-kicker"><Icon name="spark" size={14} /> STEP 2 · MUSE’S THOUGHTS</span>
                    <h3>Which ideas feel worth keeping?</h3>
                    <p>{loading ? "Muse is thinking…" : `Muse found ${museIdeas.length} small directions. Select any that spark something for you.`}</p>
                  </div>
                  {!loading && !museIdeas.length && !museError && <AppButton onClick={revealMuse}>Retry Muse</AppButton>}
                  {museError && <div role="alert"><p>{museError}</p><AppButton onClick={revealMuse}>Retry</AppButton></div>}
                  <div className="muse-thoughts">
                    {museIdeas.map((thought) => {
                      const selected = selectedMuseThoughts.includes(thought);
                      return (
                        <AppButton
                          aria-pressed={selected}
                          className={selected ? "selected" : ""}
                          key={thought}
                          onClick={() => toggleMuseThought(thought)}
                        >
                          <Icon name="spark" size={12} /> {thought}
                        </AppButton>
                      );
                    })}
                  </div>
                  <div className="exchange-footer">
                    <span>{selectedMuseThoughts.length} {selectedMuseThoughts.length === 1 ? "idea" : "ideas"} selected and saved</span>
                    <AppButton className="next-spark-button" onClick={nextStimulus}>
                      {round >= limit ? "Review session" : selectedTechnique === "Photo sparks" ? "Next photo" : "Next role"} <Icon name="arrow" size={16} />
                    </AppButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="ideas-section">
          <div className="section-title">
            <div><span className="section-number">03</span><h2>Thought trail</h2></div>
            <span>{ideas.length} small sparks saved</span>
          </div>
          <div className="ideas-list">
            {ideas.length === 0 && <div className="empty-trail">Your words will gather here as you move through the session.</div>}
            {ideas.map((idea, index) => (
              <article className="idea-note" key={`${idea}-${index}`}>
                <span className="idea-count">{String(index + 1).padStart(2, "0")}</span>
                <p>{idea}</p>
                <AppButton className="icon-button" aria-label="Open thought"><Icon name="arrow" /></AppButton>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReviewCanvas({ project, entries, onRestart }: { project: Project; entries: SessionEntry[]; onRestart: () => void }) {
  const [reflection, setReflection] = useField("reflection", "");
  const [aiComparison, setAiComparison] = useField("aiComparison", "");

  function compareWithAi() {
    const userWords = entries.flatMap((entry) => entry.userThoughts).filter(Boolean);
    const aiWords = entries.flatMap((entry) => entry.selectedAiThoughts);
    const userSignal = userWords.slice(0, 3).join(", ") || "open space";
    const aiSignal = aiWords.slice(0, 3).join(", ") || "no saved Muse ideas";
    setAiComparison(`You focused on ${userSignal}. Muse noticed ${aiSignal}. The interesting territory may be where your concrete observations meet Muse’s broader patterns.`);
  }

  return (
    <main className="workspace review-workspace">
      <header className="topbar">
        <div className="breadcrumb"><span>Community bookstore</span><Icon name="chevron" size={14} /><strong>Session review</strong></div>
        <AppButton className="share-button" onClick={onRestart}>Start over</AppButton>
      </header>
      <div className="canvas-scroll review-scroll">
        <section className="review-hero">
          <span className="eyebrow">SESSION COMPLETE</span>
          <h1>Now compare what you saw.</h1>
          <p>Muse built on your observations and associations. Read both sides first. Find your own patterns before asking AI to interpret them.</p>
          <div className="review-stats"><strong>{entries.length}</strong><span>prompts explored</span><strong>{entries.flatMap((entry) => entry.userThoughts).length}</strong><span>thoughts from you</span></div>
        </section>

        <section className="comparison-section">
          <div className="section-title">
            <div><span className="section-number">01</span><h2>Your view, next to Muse</h2></div>
            <span>Look for overlaps, gaps, and surprises</span>
          </div>
          <div className="comparison-list">
            {entries.map((entry) => (
              <article className="comparison-card" key={entry.id}>
                <div className="comparison-source">
                  {entry.imageUrl ? <img src={entry.imageUrl} alt="Session prompt" /> : <span className="role-review-avatar">{entry.label.slice(0, 2).toUpperCase()}</span>}
                  <div><span>SPARK {String(entry.id).padStart(2, "0")}</span><strong>{entry.label}</strong></div>
                </div>
                <div className="thought-column human-column">
                  <span>YOU SAW</span>
                  <div>{entry.userThoughts.length ? entry.userThoughts.map((thought) => <em key={thought}>{thought}</em>) : <em>no words — just a feeling</em>}</div>
                </div>
                <div className="thought-column ai-column">
                  <span>YOU SAVED FROM MUSE</span>
                  <div>
                    {entry.selectedAiThoughts.length
                      ? entry.selectedAiThoughts.map((thought) => <em className="selected" key={thought}>{thought}</em>)
                      : <em className="empty-selection">no Muse ideas saved</em>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="self-review">
          <div className="section-title">
            <div><span className="section-number">02</span><h2>Make your comparison</h2></div>
            <span>Your interpretation comes first</span>
          </div>
          <div className="reflection-card">
            <div>
              <span className="prompt-kicker">WHAT DO YOU NOTICE?</span>
              <h3>Where did you agree? What did Muse miss? What surprised you?</h3>
              <p>Write the pattern in your own words. This is where the ideas start becoming yours.</p>
            </div>
            <textarea aria-label="Your comparison" onChange={(event) => setReflection(event.target.value)} placeholder="I kept noticing... Muse saw... The surprising connection is..." value={reflection} />
          </div>
        </section>

        <section className="ai-review-section">
          <div className="section-title">
            <div><span className="section-number">03</span><h2>Then invite Muse in</h2></div>
            <span>AI adds a second reading, not the final answer</span>
          </div>
          <div className="ai-review-card">
            <div className="agent-orb"><Icon name="spark" size={18} /></div>
            <div>
              <strong>Muse can compare both trails</strong>
              <p>{aiComparison || "Once you write your own comparison, Muse can look for themes across both sets of thoughts."}</p>
            </div>
            <AppButton className="compare-button" disabled={!reflection.trim()} onClick={compareWithAi}>{aiComparison ? "Compare again" : "Ask Muse to compare"}<Icon name="arrow" size={16} /></AppButton>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectSession({project}: {project:Project}) {
 const {set:setSessionField}=useContext(SessionContext);
  const [photoIndex, setPhotoIndex] = useField("photoIndex", 0);
  const [roleIndex, setRoleIndex] = useField("roleIndex", 0);
  const [round, setRound] = useField("round", 1);
  const [limit, setLimit] = useField("limit", 20);
  const [stage, setStage] = useField<Stage>("stage", "ideate");
  const [selectedTechnique, setSelectedTechnique] = useField<Technique>("selectedTechnique", "Photo sparks");
  const [ideas, setIdeas] = useField<string[]>("ideas", []);
  const [entries, setEntries] = useField<SessionEntry[]>("entries", []);
  const [museRevealed, setMuseRevealed] = useField("museRevealed", false);

  function restartSession() {
    if (!confirm("Replace this project’s session and start over?")) return;
    setSessionField("draft", ""); setSessionField("currentThoughts", []); setSessionField("selectedMuseThoughts", []); setSessionField("museIdeas", []); setSessionField("reflection", ""); setSessionField("aiComparison", "");
    setPhotoIndex(0);
    setRoleIndex(0);
    setRound(1);
    setStage("ideate");
    setIdeas([]);
    setEntries([]);
    setMuseRevealed(false);
  }

  return (
    <div className="app-shell">
      {stage === "ideate" ? (
        <MainCanvas project={project}
          entries={entries}
          ideas={ideas}
          limit={limit}
          museRevealed={museRevealed}
          onFinish={() => setStage("review")}
          photoIndex={photoIndex}
          roleIndex={roleIndex}
          round={round}
          selectedTechnique={selectedTechnique}
          setEntries={setEntries}
          setIdeas={setIdeas}
          setLimit={setLimit}
          setMuseRevealed={setMuseRevealed}
          setPhotoIndex={setPhotoIndex}
          setRoleIndex={setRoleIndex}
          setRound={setRound}
          setSelectedTechnique={setSelectedTechnique}
        />
      ) : (
        <ReviewCanvas project={project} entries={entries} onRestart={restartSession} />
      )}
    </div>
  );
}

export default function App(){
 const [projects,setProjects]=useState<Project[]>([]),[project,setProject]=useState<Project|null>(null),[data,setData]=useState<Session>({}),[error,setError]=useState(""),[status,setStatus]=useState(""),[form,setForm]=useState<{id?:string;name:string;challenge:string}|null>(null);
 const revision=useRef(0), latest=useRef(data), saved=useRef(data), saving=useRef<Promise<void>|null>(null);latest.current=data;
 async function list(){try{setProjects(await api<Project[]>("/api/projects"));setError("");}catch(e){setError(String(e));}}
 useEffect(()=>{void list();},[]);
 async function open(id:string){try{const r=await api<{project:Project;data:Session;revision:number}>(`/api/projects/${id}`);revision.current=r.revision;saved.current=r.data;latest.current=r.data;setData(r.data);setProject(r.project);setStatus("Saved");setError("");}catch(e){setError(String(e));}}
 async function flush(){if(saving.current)await saving.current; if(latest.current===saved.current)return;const snapshot=latest.current;setStatus("Saving…");const job=api<{revision:number}>(`/api/projects/${project!.id}/session`,"PUT",{data:snapshot,revision:revision.current}).then(r=>{revision.current=r.revision;saved.current=snapshot;setStatus("Saved");}).catch(e=>{setStatus(String(e).includes("conflict")?"Conflict":"Save failed");throw e;});saving.current=job;try{await job;}finally{saving.current=null;}}
 useEffect(()=>{if(!project||data===saved.current)return;setStatus("Unsaved");const timer=setTimeout(()=>void flush().catch(()=>{}),500);return()=>clearTimeout(timer);},[data,project]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(latest.current!==saved.current){e.preventDefault();}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
 async function leave(){try{while(latest.current!==saved.current)await flush();}catch{if(!confirm("Save failed. Leave without saving?"))return;}setProject(null);void list();}
 return <><nav className="project-nav">{project&&<><button onClick={leave}>My projects</button><span role="status">{status}</span><button onClick={()=>void flush().catch(()=>{})}>Retry save</button>{status==="Conflict"&&<><button onClick={()=>{if(confirm("Discard local changes and reload?"))void open(project.id);}}>Reload saved version</button><button onClick={async()=>{if(!confirm("Replace the saved session with this version?"))return;try{const r=await api<{revision:number}>(`/api/projects/${project.id}`);revision.current=r.revision;await flush();}catch(e){setError(String(e));}}}>Replace with this version</button></>}</>}</nav>{error&&<p role="alert">{error}<button onClick={list}>Retry</button></p>}
 {project?<SessionContext.Provider value={{data,set:(key,value)=>setData(old=>({...old,[key]:value}))}}><ProjectSession key={project.id} project={project}/></SessionContext.Provider>:<main className="projects-page"><h1>My projects</h1><p>A space for each question you want to explore.</p><button onClick={()=>setForm({name:"",challenge:""})}>Create project</button>{!projects.length&&!error&&<p>No projects yet. Create your first project.</p>}{projects.map(p=><article key={p.id}><h2>{p.name}</h2><p>{p.challenge}</p><small>Updated {p.updatedAt}</small><div><button onClick={()=>void open(p.id)}>Open</button><button onClick={()=>setForm(p)}>Edit</button><button onClick={async()=>{if(!confirm("Delete this project and its session?"))return;try{await api(`/api/projects/${p.id}`,"DELETE");await list();}catch(e){setError(String(e));}}}>Delete</button></div></article>)}</main>}
 {form&&<div className="project-modal"><form onSubmit={async e=>{e.preventDefault();try{const r=await api<{id:string}>(form.id?`/api/projects/${form.id}`:"/api/projects",form.id?"PATCH":"POST",form);setForm(null);await list();if(!form.id)await open(r.id);}catch(e){setError(String(e));}}}><h2>{form.id?"Edit project":"Create project"}</h2><label>Name<input required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Challenge<textarea required maxLength={1000} value={form.challenge} onChange={e=>setForm({...form,challenge:e.target.value})}/></label><p>Changes apply to future ideas. Existing work stays saved.</p><button>Save project</button><button type="button" onClick={()=>setForm(null)}>Cancel</button></form></div>}</>;
}
