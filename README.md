# Brag Explorer

A UI that allows prospective employers to ask questions about your work history, powered by Claude Sonnet.

Visitors type a question ("Has she led cross-functional teams?", "Is he good under pressure?") and the app finds the most relevant highlights from your work history, with a bias towards recent experience. A daily question limit encourages curious recruiters to move to the interview stage.

## What's a brag document?

This project is built around the idea of a [brag document](https://jvns.ca/blog/brag-documents/) — a running record of your professional accomplishments, written in your own words. Julia Evans' post is a great introduction: the short version is that it's a document you maintain over time so you don't forget what you've done and can articulate your impact when it counts.

Brag Explorer turns that document into an interactive experience for the people who might want to hire you.

## Fork and deploy

### 1. Fork the repository

Click **Fork** on GitHub, then clone your fork locally.

### 2. Write your brag document

Create a markdown file (e.g. `work-history.md`) describing your work history. Write it in roughly chronological order, with the most recent roles and projects **at the bottom** — the app gives preference to newer examples when answering questions.

There's no required format, but headings per role/project and short bullet points work well. Julia Evans' [brag document template](https://jvns.ca/blog/brag-documents/) is a good starting point.

### 3. Upload your document to Vercel Blob

1. Create a [Vercel account](https://vercel.com) if you don't have one
2. Go to your Vercel dashboard → **Storage** → **Create Database** → **Blob**
3. Upload your `work-history.md` file
4. Copy the public URL — it will look like `https://xxxx.public.blob.vercel-storage.com/work-history.md`

### 4. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key. The app uses Claude Sonnet, which is billed per use — typical costs are a fraction of a cent per question.

### 5. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Import your forked repository in the Vercel dashboard
2. Under **Environment Variables**, add the following:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `WORK_HISTORY_BLOB_URL` | URL of your work history file in Vercel Blob |
| `BLOB_READ_WRITE_TOKEN` | Auth token for your Vercel Blob store. Vercel sets this automatically when you link a blob store to your project. |
| `NEXT_PUBLIC_OWNER_NAME` | Your first name (e.g. `Alice`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Your email address |
| `NEXT_PUBLIC_DAILY_QUESTION_LIMIT` | *(Optional)* Max questions per visitor per day. Omit for unlimited. |

3. Click **Deploy**

That's it. Share the deployed URL with anyone you'd like to impress.

## Running locally

```bash
cp .env.local.example .env.local
# Fill in the four variables in .env.local
npm install
npm run dev
```

For local development you don't need a Vercel Blob store — set `WORK_HISTORY_BLOB_URL` to a local file path instead:

```
WORK_HISTORY_BLOB_URL=./work-history.md
```

The app will read the file directly from disk. Use a Blob URL only for the deployed version on Vercel.

## Behaviour notes

- Each question is answered independently — no conversation history is maintained
- Questions are checked for relevance before being sent to Claude; off-topic questions (maths, trivia, etc.) are rejected
- The question field accepts any name or pronoun ("Is he…", "Has she…", "Does Rhys…" — all work)
- Visitor question limits are enforced via cookie. Set `NEXT_PUBLIC_DAILY_QUESTION_LIMIT` to cap daily questions per visitor; once exceeded, a nudge towards arranging an interview is shown. Omit the variable for no limit.
