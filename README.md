<div align="center">

# Critique
**AI-powered code reviewer directly on GitHub. Reviews your code. Judges your choices.**

<img src="assets/anime.gif" width="300" height="207" alt="Critique" />


[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-LLaMA_3.3_70B-7C3AED?style=flat-square)](https://openrouter.ai)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome)](https://chrome.google.com/webstore)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Action-2088FF?style=flat-square&logo=github-actions)](https://github.com/features/actions)

</div>

---

## ✨ Features

- 🐛 **Bug Detection** — catches SQL injection, null refs, logic errors and more
- 💡 **Smart Suggestions** — language-aware fixes with exact code recommendations
- 🔍 **PR Review Overlay** — AI review sidebar directly on GitHub PR pages
- 📝 **Commit Message Rater** — real-time quality score as you type
- 📖 **README Summarizer** — 3-line AI summary of any repo in one click
- 🔎 **Code Explainer** — plain English explanation of any selected code
- ⚡ **GitHub Action** — auto-reviews every PR, posts inline comments
- 🔒 **Secure** — rate limited, input validated, generated files skipped

---

## 🏗 Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Chrome Extension | Manifest V3 + Content Scripts | PR overlay, summarizer, commit rater |
| GitHub Action | TypeScript + Octokit | Auto-review on every PR |
| Backend | Node.js + Express | API gateway, rate limiting, validation |
| AI | OpenRouter → LLaMA 3.3 70B | Code analysis and review generation |
---

## 🌐 What It Does on GitHub

**On any PR page:**
- Injects an **AI Review** button next to existing review buttons
- Click → sidebar slides in with full review
- Severity labels: 🐛 Bug · ⚠️ Warning · 💡 Suggestion · ✅ Good
- Overall quality score (1–10) at the top

**On any repo page:**
- **Summarize** button on README → instant 3-line AI summary

**On commit message box:**
- Rates your message in real time as you type
- Shows: `Too vague ⚠️` or `Clear and specific ✅`

**GitHub Action — on every PR:**
- Automatically triggered on PR open/update
- Reads the full diff, posts inline comments on specific lines
- Posts a summary comment at the top of the PR
- Skips generated files: `package-lock.json`, `dist/`, `node_modules/`

---

## 🚀 Running Locally

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Add your OpenRouter API key to `.env`
```bash
npm run dev
```

Server runs at `http://localhost:3001`

### Test

```bash
curl http://localhost:3001/health
```

```bash
curl -X POST http://localhost:3001/review \
  -H "Content-Type: application/json" \
  -d '{"code": "function getUser(id) { return db.query(\"SELECT * FROM users WHERE id = \" + id); }", "language": "javascript"}'
```

## 🗺 Roadmap

- [x] Phase 1 — Backend API (review, explain, summarize, commit rater)
- [ ] Phase 2 — GitHub Action (diff fetching, inline comments, severity labels)
- [ ] Phase 3 — Chrome Extension foundation (Manifest V3, content scripts, popup)
- [ ] Phase 4 — Chrome Extension PR review overlay + sidebar
- [ ] Phase 5 — README summarizer + commit rater + code explainer on hover
- [ ] Phase 6 — Prompt engineering + language detection + response caching
- [ ] Phase 7 — Config file support + rate limiting + error states
- [ ] Phase 8 — Publish to Chrome Web Store + GitHub Marketplace + deploy

---