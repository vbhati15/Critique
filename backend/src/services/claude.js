import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openrouter/auto';
async function generate(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Critique',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenRouter API error');
  }

  return data.choices[0].message.content;
}

// ── Core review function ──
export async function reviewCode({ code, language, filename, context }) {
  const prompt = buildReviewPrompt({ code, language, filename, context });
  const raw = await generate(prompt);
  return parseReviewResponse(raw);
}

// ── Summarize a README ──
export async function summarizeRepo({ readme, repoName }) {
  const prompt = `Summarize this GitHub repository in exactly 3 bullet points.
Each bullet should be one clear sentence.
Be specific — mention the actual tech stack and purpose.
No preamble, no "here is a summary", just the 3 bullets.

Repository: ${repoName}

README:
${readme.slice(0, 4000)}`;

  return await generate(prompt);
}

// ── Explain code in plain English ──
export async function explainCode({ code, language }) {
  const prompt = `Explain this ${language} code in 2-3 plain English sentences.
No code in your response. No preamble.
Write as if explaining to a junior developer.

Code:
${code}`;

  return await generate(prompt);
}

// ── Rate a commit message ──
export async function rateCommitMessage({ message: commitMsg }) {
  const prompt = `Rate this git commit message on a scale of 1-10 for clarity and specificity.

Commit message: "${commitMsg}"

Respond in this exact JSON format only, no other text, no markdown:
{
  "score": <number 1-10>,
  "label": "<one of: Poor, Vague, Okay, Good, Excellent>",
  "tip": "<one short sentence improvement tip, or empty string if score >= 8>"
}`;

  const raw = await generate(prompt);
  try {
    const cleaned = raw
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return { score: 5, label: 'Okay', tip: 'Could not parse rating.' };
  }
}

// ── Build review prompt ──
function buildReviewPrompt({ code, language, filename, context }) {
  const focus = reviewFocus(language, filename);
  return `You are an expert code reviewer. Review the following ${language} code${filename ? ` from file "${filename}"` : ''}.

${context ? `Context: ${context}\n` : ''}

If this input is a diff or patch, use the new-file line numbers provided in the diff context when assigning line numbers in issues.

Analyze for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style and readability
5. Best practice violations

Additional focus for this change: ${focus}

Respond in this exact JSON format only. No markdown backticks, no preamble, no explanation — just raw JSON:

{
  "summary": "<2-3 sentence overall assessment>",
  "score": <overall quality score 1-10>,
  "issues": [
    {
      "severity": "<bug|warning|suggestion|good>",
      "line": <line number or null if general>,
      "title": "<short issue title>",
      "description": "<detailed explanation>",
      "fix": "<specific fix suggestion or empty string>"
    }
  ],
  "positives": ["<thing done well>", "<another positive>"]
}

Code to review:
\`\`\`${language}
${code}
\`\`\``;
}

// ── Parse review response ──
function reviewFocus(language = '', filename = '') {
  const languageFocus = {
    python: 'type hints, exception handling, Pythonic iteration, and PEP 8',
    javascript: 'async error handling, null/undefined safety, and unsafe browser or Node APIs',
    typescript: 'type safety, narrowing, async error handling, and unsafe assertions',
    cpp: 'memory ownership, pointer safety, lifetime bugs, and resource cleanup',
    java: 'exception handling, null safety, OOP boundaries, and resource management',
    sql: 'parameterized queries, injection risks, transaction safety, and query performance',
  };
  const lower = filename.toLowerCase();
  const extra = [];
  if (lower.includes('test')) extra.push('test quality, edge cases, determinism, and meaningful assertions');
  if (lower.includes('auth') || lower.includes('payment')) extra.push('security boundaries, secrets exposure, authorization, and input validation');
  return [languageFocus[language] || 'correctness and maintainability', ...extra].join('; ');
}

function parseReviewResponse(raw) {
  try {
    const cleaned = raw
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    parsed.issues = (parsed.issues || []).map((issue) => ({
      ...issue,
      severity: normalizeSeverity(issue.severity),
      emoji: severityEmoji(issue.severity),
    }));

    return { success: true, review: parsed };
  } catch {
    return {
      success: true,
      review: {
        summary: raw,
        score: null,
        issues: [],
        positives: [],
      },
    };
  }
}

function normalizeSeverity(s = '') {
  const map = {
    bug: 'bug', error: 'bug', critical: 'bug',
    warning: 'warning', warn: 'warning',
    suggestion: 'suggestion', info: 'suggestion', style: 'suggestion',
    good: 'good', positive: 'good',
  };
  return map[s.toLowerCase()] || 'suggestion';
}

function severityEmoji(s = '') {
  const map = {
    bug: '🐛', error: '🐛',
    warning: '⚠️', warn: '⚠️',
    suggestion: '💡',
    good: '✅', positive: '✅',
  };
  return map[s.toLowerCase()] || '💡';
}
