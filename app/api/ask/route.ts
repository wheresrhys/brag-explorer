import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function getWorkHistory(): Promise<string> {
  const source = process.env.WORK_HISTORY_BLOB_URL;
  if (!source) throw new Error('WORK_HISTORY_BLOB_URL is not configured');

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(source, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Failed to fetch work history: ${res.status}`);
    return res.text();
  }

  return fs.readFile(source, 'utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const workHistory = await getWorkHistory();

    const ownerName = process.env.NEXT_PUBLIC_OWNER_NAME ?? 'the candidate';

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are helping potential employers or collaborators explore ${ownerName}'s work history.

The question may refer to the candidate by any name or pronoun (he/she/they, their name, "the candidate", "you", etc.) — treat all of these as referring to the same person whose work history is provided below.

The work history is in rough chronological order with the most recent experience at the bottom. When multiple examples are similarly relevant, prefer the more recent ones.

First decide which type of question this is:

**Competency questions** ask about a quality, skill, or behaviour — e.g. "Can Rhys lead a team?", "Is he good under pressure?", "Has she managed stakeholders?"
→ Answer with up to 3 concrete examples from the work history. Bold the role/company/project for each, then 1–2 sentences of detail. Prefer more recent examples when relevance is similar.

**Itemisable questions** ask about a list of things — e.g. "What tech stack does Rhys prefer?", "What databases has he used?", "What kinds of projects has she worked on?"
→ Choose a structure that fits the content rather than forcing three examples. For instance, organise by item (technology, project type, etc.) and briefly note relevant projects or context under each. Cover the most important items fully, then if there are others worth mentioning add a short footnote after a horizontal rule (---), e.g. "*${ownerName} has also used X, Y and Z to deliver projects.*"

Across both types:
- Be concrete — reference actual projects, technologies, or outcomes from the work history
- No preamble, introduction, or closing statement — just the answer

<work_history>
${workHistory}
</work_history>

Question: ${question}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return NextResponse.json({ answer: content.text });
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status === 402) {
      console.error('ANTHROPIC_USAGE_LIMIT_REACHED', err);
      return NextResponse.json({ error: 'usage_limit' }, { status: 503 });
    }
    console.error('API error:', err);
    const message = err instanceof Error ? err.message : 'Failed to process question';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
