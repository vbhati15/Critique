<div align="center">

# Critique
**AI-powered code reviewer directly on GitHub. Reviews your code. Judges your choices.**

<img src="assets/logo.gif" width="240" height="240" alt="Critique logo" />
<br/><br/>

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-LLaMA_3.3_70B-7C3AED?style=flat-square)](https://openrouter.ai)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=google-chrome)](https://chrome.google.com/webstore)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Action-2088FF?style=flat-square&logo=github-actions)](https://github.com/features/actions)

</div>

---

## ✨ Features

- 🐛 **Bug Detection** — flags common issues like null refs, logic errors, and unsafe string handling
- 💡 **Smart Suggestions** — language-aware fixes with exact code recommendations
- 🔍 **PR Review Overlay** — AI review sidebar directly on GitHub PR pages
- 📝 **Commit Message Rater** — real-time quality score as you type
- 📖 **README Summarizer** — 3-line AI summary of any repo in one click
- 🔎 **Code Explainer** — plain English explanation of any selected code
- ⚡ **GitHub Action** — auto-reviews every PR, posts inline comments
- 🔒 **Safety-minded defaults** — rate limited, input validated, generated files skipped

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
npm run dev
```

Add your OpenRouter API key to `.env`. Keep this file out of Git; `backend/.gitignore` already excludes `.env` and `node_modules/`.

The server runs at `http://localhost:3001`.

### Quick Check

```bash
curl http://localhost:3001/health
```

## 🌍 Deploying the Backend

If local tunneling is flaky, deploy the backend to Render and point `CRITIQUE_BACKEND_URL` at the public URL.

### Render

- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `OPENROUTER_API_KEY`, `CRITIQUE_BACKEND_KEY`
- `PORT` is set automatically by the host

After deploy, copy the HTTPS URL into your GitHub secret `CRITIQUE_BACKEND_URL`.

## 🗺 Roadmap

- [x] Phase 1 — Backend API (review, explain, summarize, commit rater)
- [x] Phase 2 — GitHub Action (diff fetching, inline comments, severity labels)
- [x] Phase 3 — Chrome Extension foundation (Manifest V3, content scripts, popup)
- [x] Phase 4 — Chrome Extension PR review overlay + sidebar
- [x] Phase 5 — README summarizer + commit rater + code explainer on hover
- [x] Phase 6 — Prompt engineering + language detection + response caching
- [ ] Phase 7 — Config file support + rate limiting + error states
- [ ] Phase 8 — Publish to Chrome Web Store + GitHub Marketplace + deploy

---