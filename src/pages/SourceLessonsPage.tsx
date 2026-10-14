import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../services/supabaseClient';
import './SourceLessonsPage.css';

type LessonSummary = { id: string; title: string; saved_for_review: boolean };
type Row = { native_text: string; transliteration: string | null; number: string; gloss: string };
type Activity = { id: string; kind: string; prompt: string; options: { id: string; text: string }[]; answer?: Row };
type Session = { session_id: string; lesson_id: string; title: string; route: string; activities: Activity[];
  demonstration: Row[]; explanation: { statement: string; scope: string | null; conditions: string[]; exceptions: string[] }[];
  notice: string | null; sources: { heading: string; pdf_page: number }[]; transliteration: boolean };
type Feedback = { result: string; feedback?: string; answer?: Row; rows?: Row[]; message?: string };
async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to access source lessons.');
  const response = await fetch('/api/source-lessons/' + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'Could not load source lessons.');
  return result;
}
function Comparison({ rows, transliteration }: { rows: Row[]; transliteration: boolean }) {
  return <div className="source-table-wrap"><table><thead><tr><th>Number</th><th>Form</th>{transliteration && <th>Transliteration</th>}<th>Meaning</th></tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}><td>{r.number}</td><td className="source-form" dir="auto">{r.native_text}</td>
      {transliteration && <td dir="ltr">{r.transliteration?.includes('+') ? <>{r.transliteration.split('+')[0]}+<strong>{r.transliteration.split('+').slice(1).join('+')}</strong></> : r.transliteration || 'Not supplied'}</td>}<td>{r.gloss}</td></tr>)}</tbody></table></div>;
}
export default function SourceLessonsPage() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(-1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [help, setHelp] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(false);
  const [transliteration, setTransliteration] = useState(false);
  useEffect(() => { let mounted = true; api<LessonSummary[]>('lessons').then(x => { if (mounted) setLessons(x); }).catch(e => { if (mounted) setError(e.message); }); return () => { mounted = false; }; }, []);
  async function perform(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); } finally { setBusy(false); } }
  function start(id: string, route: string) { void perform(async () => { const s = await api<Session>(`lessons/${id}/sessions`, { route, skip_recognition: skip }); setSession(s); setIndex(route === 'test' ? 0 : -1); setFeedback(null); setHelp([]); setTransliteration(s.transliteration); }); }
  const activity = session?.activities[index];
  async function event(action: string, value?: string | boolean) {
    if (!session || !activity) return;
    await perform(async () => {
      const f = await api<Feedback>(`sessions/${session.session_id}/events`, { activity_id: activity.id, event_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, action, value });
      if (f.rows) setHelp(f.rows);
      if (action === 'help') { /* comparison only */ }
      else if (action === 'transliteration') setTransliteration(Boolean(value));
      else setFeedback(f);
    });
  }
  return <main className="source-lessons"><Link to="/learn">Back to learning</Link><h1>{session?.title || 'Source lessons'}</h1>
    <p>Learn from verified textbook examples. No invented language exercises.</p>
    {error && <p role="alert" className="source-error">{error} <Link to="/login">Sign in</Link></p>}
    {!session ? <><label><input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} /> Skip recognition questions</label>
      {!lessons.length && !error && <p>No lessons have been published yet.</p>}
      {lessons.map(l => <section key={l.id}><h2>{l.title}</h2>{l.saved_for_review && <p>Saved for manual review</p>}<button disabled={busy} onClick={() => start(l.id, 'teach')}>Teach me</button><button disabled={busy} onClick={() => start(l.id, 'test')}>{l.saved_for_review ? 'Review now' : 'Test me'}</button></section>)}</> : <>
      {index < 0 ? <><p>{session.notice}</p>{session.explanation.map((x, i) => <section key={i}><p>{x.statement}</p>{x.scope && <p>Applies to: {x.scope}</p>}{x.conditions.length > 0 && <p>Conditions: {x.conditions.join('; ')}</p>}{x.exceptions.length > 0 && <p>Exceptions: {x.exceptions.join('; ')}</p>}</section>)}
        <Comparison rows={session.demonstration} transliteration={true} /><p>Compare the forms and their labels. Where the source provides a plus sign, it separates the displayed transliteration into parts.</p><button onClick={() => setIndex(0)}>Practise</button></> : activity ? <section>
        <p>Practice {index + 1} of {session.activities.length}</p><h2>{activity.prompt}</h2>
        {activity.kind === 'select_form' ? <div className="source-options">{activity.options.map(o => <button key={o.id} dir="auto" disabled={busy || Boolean(feedback)} onClick={() => void event('answer', o.id)}>{o.text}</button>)}</div> : <><p>Say or write your answer before revealing it. Your rating is self-reported.</p><button disabled={busy || Boolean(feedback)} onClick={() => void event('reveal')}>Reveal answer</button></>}
        <button disabled={busy} onClick={() => void event('help')}>Show comparison</button>
        <label><input type="checkbox" checked={transliteration} disabled={busy} onChange={e => void event('transliteration', e.target.checked)} /> Show transliteration in feedback and comparison</label>
        {help.length > 0 && <Comparison rows={help} transliteration={transliteration} />}
        {feedback && <div aria-live="polite"><p>{feedback.feedback || feedback.result.replaceAll('_', ' ')}</p>{feedback.answer && <Comparison rows={[feedback.answer]} transliteration={transliteration} />}
          {activity.kind === 'reveal_recall' && feedback.result === 'revealed' && <><button disabled={busy} onClick={() => void event('self_rating', 'remembered')}>Remembered</button><button disabled={busy} onClick={() => void event('self_rating', 'needed_help')}>Needed help</button></>}
          {(activity.kind === 'select_form' || feedback.result.startsWith('self_reported')) && <button onClick={() => { setIndex(index + 1); setFeedback(null); setHelp([]); }}>Continue</button>}</div>}
      </section> : <section><h2>Practice complete</h2><p>You practised the source’s number contrast. This does not establish mastery of all verb forms.</p><button disabled={busy} onClick={() => void perform(async () => { const result = await api<Feedback>(`lessons/${session.lesson_id}/review-enrollment`, {}); setFeedback(result); setLessons(await api<LessonSummary[]>('lessons')); })}>Save for review</button><p aria-live="polite">{feedback?.message}</p><p>Automatic spaced scheduling and audio practice are not enabled for these lessons.</p><button onClick={() => { setSession(null); setFeedback(null); }}>Return to lessons</button></section>}
      <details><summary>Textbook sources</summary>{session.sources.map((s, i) => <p key={i}>{s.heading} · PDF page {s.pdf_page}</p>)}</details>
    </>}
  </main>;
}
