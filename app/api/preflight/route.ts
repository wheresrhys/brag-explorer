import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';

    if (!question) {
      return NextResponse.json({ relevant: false, reason: 'Please enter a question.' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `You are a gatekeeper for a work history explorer tool. Users ask questions that are answered using a job candidate's work history.

Decide if the question is appropriate. It should relate to professional experience, skills, achievements, or personal qualities relevant to work — the kind of question a recruiter or interviewer might ask.

The candidate may be referred to by any name or pronoun (he/she/they, their name, "the candidate", "you", etc.) — this is always fine.

Broad character questions ARE allowed (e.g. "is he a good communicator?", "are they reliable?", "would she work well in a team?").
Off-topic questions with no connection to professional work (maths, trivia, recipes, general knowledge, etc.) are NOT allowed.

Respond with JSON only — no text outside the JSON:
{ "relevant": true }
or
{ "relevant": false, "reason": "one short sentence explaining why" }

Question: ${question}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const text = content.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(text);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Preflight error:', err);
    // Fail open — a preflight error should not block a legitimate question
    return NextResponse.json({ relevant: true });
  }
}
