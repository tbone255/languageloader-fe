import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../services/supabaseClient';
import './SourceLessonsPage.css';

type Evidence = { text: string; presentation: string; page: number };
type Example = { source: Evidence; translation: Evidence | null; transliteration: Evidence | null };
type Choice = { id: string; text: string };
type Response = { feedback: string; correct?: boolean; answer?: string; selected?: string | Record<string, string>; answers?: Record<string, string>; rating?: string };
type Component = { id: string } & (
  { type: 'explanation'; text: string; citations: Evidence[] } |
  { type: 'example'; example: Example } |
  { type: 'comparison'; caption: string; items: { label: string; example: Example }[] } |
  { type: 'selection'; prompt: string; options: Choice[]; response?: Response } |
  { type: 'matching'; prompt: string; left: Choice[]; right: Choice[]; response?: Response } |
  { type: 'cloze'; prompt: string; before: string; after: string; response?: Response } |
  { type: 'reveal' | 'recall'; prompt: string; response?: Response }
);
type Screen = { id: string; title: string; components: Component[] };
type Session = { id: string; lesson_id: string; title: string; objectives: string[]; screens: Screen[] };
type Lesson = { id: string; title: string; objectives: string[]; screens: number };
async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to access source lessons.');
  const response = await fetch('/api/source-lessons/' + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'Could not load source lessons.');
  return result;
}
function SourceText({ evidence, large = false }: { evidence: Evidence; large?: boolean }) {
  return <div>{evidence.presentation === 'explicit_error' && <strong className="source-error">Deliberately incorrect textbook example</strong>}
    <p dir="auto" className={large ? 'source-form' : ''}>{evidence.text}</p><small>PDF page {evidence.page}</small></div>;
}
function ExampleView({ example }: { example: Example }) {
  return <><SourceText evidence={example.source} large />{example.translation && <SourceText evidence={example.translation} />}
    {example.transliteration && <details><summary>Show transliteration</summary><SourceText evidence={example.transliteration} /></details>}</>;
}
function ComponentView({ component: c, sessionId, onPending }: { component: Component; sessionId: string; onPending: (delta: number) => void }) {
  const [response, setResponse] = useState<Response | undefined>('response' in c ? c.response : undefined);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  // Keep the same event ID on an ambiguous network failure; the server replays it safely.
  const pending = useRef<{ id: string; action: string; value?: string | Record<string, string> } | null>(null);
  async function act(action: string, value?: string | Record<string, string>) {
    setBusy(true); onPending(1); setError('');
    if (!pending.current) pending.current = { id: crypto.randomUUID(), action, value };
    const event = pending.current;
    try { setResponse(await api<Response>(`sessions/${sessionId}/events`, { event_id: event.id, component_id: c.id, action: event.action, value: event.value })); pending.current = null; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save response'); }
    finally { setBusy(false); onPending(-1); }
  }
  if (c.type === 'explanation') return <section><p>{c.text}</p><details><summary>Textbook evidence</summary>{c.citations.map((ref, i) => <SourceText key={i} evidence={ref} />)}</details></section>;
  if (c.type === 'example') return <section><ExampleView example={c.example} /></section>;
  if (c.type === 'comparison') return <section><p>{c.caption}</p><div className="source-comparison">{c.items.map((item, i) => <div key={i}><h3>{item.label}</h3><ExampleView example={item.example} /></div>)}</div></section>;
  const locked = busy || Boolean(response) || Boolean(error);
  return <section aria-label={c.prompt}><h3>{c.prompt}</h3>
    {c.type === 'cloze' && <p className="source-form" dir="auto">{c.before}<span aria-label="missing text"> […] </span>{c.after}</p>}
    {c.type === 'selection' && <div className="source-options">{c.options.map(option => <button key={option.id} dir="auto" disabled={locked} onClick={() => void act('answer', option.id)} aria-pressed={response?.selected === option.id}>{option.text}</button>)}</div>}
    {c.type === 'matching' && <><div className="source-matching">{c.left.map(left => <label key={left.id}><span dir="auto">{left.text}</span><select value={matches[left.id] || ''} disabled={locked} onChange={event => setMatches({ ...matches, [left.id]: event.target.value })}>
      <option value="">Choose a match</option>{c.right.map(right => <option key={right.id} value={right.id}>{right.text}</option>)}</select></label>)}</div><button disabled={locked || Object.keys(matches).length !== c.left.length || new Set(Object.values(matches)).size !== c.left.length || Object.values(matches).some(x => !x)} onClick={() => void act('answer', matches)}>Check matches</button></>}
    {['recall', 'reveal', 'cloze'].includes(c.type) && <>{c.type !== 'reveal' && <p>Try answering before revealing. You’ll rate your own recall.</p>}<button disabled={locked} onClick={() => void act('reveal')}>Reveal answer</button></>}
    {error && <p role="alert" className="source-error">{error} <button disabled={busy} onClick={() => void act(pending.current?.action || 'reveal')}>Retry saving response</button></p>}
    {response && <div className="source-feedback" aria-live="polite">
      {response.correct !== undefined && <strong>{response.correct ? 'Correct' : 'Compare with the supplied answer'}</strong>}
      {response.answer && <p className="source-form" dir="auto">{response.answer}</p>}
      {c.type === 'matching' && response.answers && c.left.map(left => <p key={left.id} dir="auto">{left.text} ↔ {c.right.find(right => right.id === response.answers?.[left.id])?.text}</p>)}
      <p>{response.feedback}</p>
      {['recall', 'cloze'].includes(c.type) && !response.rating && <><button disabled={busy || Boolean(error)} onClick={() => void act('rate', 'again')}>Needed help</button><button disabled={busy || Boolean(error)} onClick={() => void act('rate', 'remembered')}>Remembered</button></>}
      {response.rating && <p>Self-rating saved: {response.rating === 'again' ? 'needed help' : 'remembered'}.</p>}
    </div>}
  </section>;
}
export default function SourceLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]), [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const onPending = useCallback((delta: number) => setPendingCount(count => count + delta), []);
  useEffect(() => { let active = true; api<Lesson[]>('lessons').then(data => { if (active) setLessons(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoaded(true); }); return () => { active = false; }; }, []);
  async function start(id: string) { setBusy(true); setError(''); try { const data = await api<Session>(`lessons/${id}/sessions`, {}); setSession(data); setIndex(0); } catch (err) { setError(err instanceof Error ? err.message : 'Could not start lesson'); } finally { setBusy(false); } }
  async function navigate(next: number) { if (!session) return; setBusy(true); setError(''); try { setSession(await api<Session>(`sessions/${session.id}`)); setIndex(next); heading.current?.focus(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load progress'); } finally { setBusy(false); } }
  const screen = session?.screens[index];
  return <main className="source-lessons"><Link to="/learn">Back to learning</Link><h1>{session?.title || 'Source lessons'}</h1>
    {error && <p role="alert" className="source-error">{error}</p>}
    {!session ? <><p>Lessons built from textbook explanations and examples.</p>{!loaded && <p>Loading lessons…</p>}{loaded && !lessons.length && !error && <p>No lessons have been published yet.</p>}
      {lessons.map(lesson => <section key={lesson.id}><h2>{lesson.title}</h2><ul>{lesson.objectives.map((x, i) => <li key={i}>{x}</li>)}</ul><p>{lesson.screens} screens</p><button disabled={busy} onClick={() => void start(lesson.id)}>Start lesson</button></section>)}</> : screen ? <>
      <p>Screen {index + 1} of {session.screens.length}</p><progress value={index + 1} max={session.screens.length} aria-label="Current lesson screen" />
      <h2 ref={heading} tabIndex={-1}>{screen.title}</h2>
      {index === 0 && <ul>{session.objectives.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {screen.components.map(c => <ComponentView key={`${session.id}:${screen.id}:${c.id}`} component={c} sessionId={session.id} onPending={onPending} />)}
      <nav aria-label="Lesson screens"><button disabled={busy || pendingCount > 0 || index === 0} onClick={() => void navigate(index - 1)}>Previous</button><button disabled={busy || pendingCount > 0} onClick={() => void navigate(index + 1)}>{index + 1 === session.screens.length ? 'Finish lesson' : 'Next screen'}</button></nav>
    </> : <section><h2 ref={heading} tabIndex={-1}>End of lesson</h2><p>Your submitted responses and self-ratings have been saved. You can revisit any screen.</p><button disabled={busy} onClick={() => void navigate(0)}>Revisit lesson</button><button onClick={() => setSession(null)}>Back to lessons</button></section>}
  </main>;
}
