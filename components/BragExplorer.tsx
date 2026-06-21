'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DAILY_LIMIT = process.env.NEXT_PUBLIC_DAILY_QUESTION_LIMIT
  ? parseInt(process.env.NEXT_PUBLIC_DAILY_QUESTION_LIMIT, 10)
  : null;
const MAX_CHARS = 200;
const COOKIE_NAME = 'brag_questions';
const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME ?? 'my';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';

type Status = 'idle' | 'checking' | 'answering';

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCookie(): { count: number; date: string } {
  if (typeof document === 'undefined') return { count: 0, date: getToday() };
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return { count: 0, date: getToday() };
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return { count: 0, date: getToday() };
  }
}

function getDailyCount(): number {
  const data = readCookie();
  return data.date === getToday() ? data.count : 0;
}

function saveDailyCount(count: number) {
  const value = encodeURIComponent(JSON.stringify({ count, date: getToday() }));
  const expires = new Date();
  expires.setDate(expires.getDate() + 2);
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export default function BragExplorer() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const count = getDailyCount();
    setDailyCount(count);
    if (DAILY_LIMIT !== null && count > DAILY_LIMIT) {
      setLimitReached(true);
      setDisabled(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled || status !== 'idle') return;

    const newCount = dailyCount + 1;
    saveDailyCount(newCount);
    setDailyCount(newCount);

    if (DAILY_LIMIT !== null && newCount > DAILY_LIMIT) {
      setShowPopup(true);
      return;
    }

    setError(null);
    setAnswer(null);

    // Preflight: check the question is work-history relevant
    setStatus('checking');
    try {
      const preflightRes = await fetch('/api/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const preflight = await preflightRes.json();
      if (preflight.usageLimitReached) {
        setError('This service has reached its usage limit and will be unavailable for a while. Please try again later.');
        setStatus('idle');
        return;
      }
      if (!preflight.relevant) {
        setError(preflight.reason ?? 'Please ask a question relevant to professional work experience.');
        setStatus('idle');
        return;
      }
    } catch {
      // Fail open — network error on preflight should not block the user
    }

    // Main answer
    setStatus('answering');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (data.error === 'usage_limit') throw new Error('This service has reached its usage limit and will be unavailable for a while. Please try again later.');
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setAnswer(data.answer);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setStatus('idle');
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
    setDisabled(true);
  };

  const charsLeft = MAX_CHARS - question.length;
  const isLoading = status !== 'idle';

  if (limitReached) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-stone-700 leading-relaxed">
          Limit reached for today. Please come back tomorrow, or you can{' '}
          {CONTACT_EMAIL ? (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              contact me to arrange an interview
            </a>
          ) : (
            'contact me to arrange an interview'
          )}
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-4 max-w-sm rounded-xl bg-white p-8 shadow-2xl text-center">
            <p className="text-stone-800 text-base leading-relaxed mb-6">
              I love your curiosity, but isn&apos;t it time we progressed to the interview stage?
            </p>
            <button
              onClick={dismissPopup}
              className="rounded-md bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Fair enough!
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="question"
            className="block text-stone-700 text-sm leading-relaxed mb-3"
          >
            To find out if {OWNER_NAME}&apos;s work experience is a good fit for the role, ask any
            question you like here, and I&apos;ll look it up in their in-depth work history — e.g.
            you can ask &ldquo;Has {OWNER_NAME} ever turned vague requirements into a successful
            product?&rdquo;
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={disabled || isLoading}
            maxLength={MAX_CHARS}
            rows={4}
            className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder-stone-400 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 resize-none transition-colors"
            placeholder={`Ask a question about ${OWNER_NAME}'s experience…`}
          />
          <div className="mt-1 flex items-start justify-between gap-4">
            <p className="text-xs text-stone-400 leading-snug">
              Each question is answered independently — no context is carried between questions.
            </p>
            <span
              className={`shrink-0 text-xs tabular-nums ${
                charsLeft <= 20 ? (charsLeft === 0 ? 'text-red-500' : 'text-amber-500') : 'text-stone-400'
              }`}
            >
              {charsLeft}/{MAX_CHARS}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || isLoading || !question.trim()}
          className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          {status === 'checking' ? 'Checking…' : status === 'answering' ? 'Looking it up…' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-8 rounded-lg border border-stone-200 bg-white px-6 py-6 shadow-sm">
          <div className="prose prose-stone prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </>
  );
}
