# 🎯 CP Counter — Practice Problem Tracker

A sleek, responsive practice counter for competitive programmers tracking **LeetCode**, **Codeforces**, **AtCoder**, and **CSES**.

Designed for **GitHub Pages** (`username.github.io`) with **100% native GitHub storage** using **Private GitHub Gists**. 

> **Zero third-party services** — No Supabase, no Firebase, no external databases or servers. Everything is stored directly under your own personal GitHub account!

---

## ✨ Features

- **4 Dedicated Platform Counters**:
  - 🟡 **LeetCode**: Algorithms & Data Structures
  - 🔵 **Codeforces**: Div. 1/2/3/4 Contests & Practice
  - 🔷 **AtCoder**: ABC / ARC / AGC Contests
  - 🟢 **CSES**: Classic 300+ Problem Set
- **Multiple Input & Control Methods**:
  - **`−`** and **`+`** stepper buttons with smooth click response.
  - **Click-to-Edit**: Type any number directly into the counter input.
  - **Quick shortcuts**: **+5** and **+10** buttons for rapid logging.
  - **Card Reset (↺)**: Reset any platform counter to 0 with confirmation toast.
  - **Total Solved Banner**: Automatic real-time sum of problems solved across all 4 platforms.
- **100% Native GitHub Cloud Storage**:
  - Automatically creates and updates a **Private GitHub Gist** (`cp_counters.json`) in your GitHub account.
  - Full version history: every save is recorded as a commit on GitHub!
  - Click **"View Gist ↗"** to view your raw stats directly on `gist.github.com`.
  - Displays your real GitHub avatar and username.
- **Offline / Guest Mode Out-of-the-Box**:
  - Works instantly in any browser with local storage even without logging in.
  - When you connect your GitHub account for the first time, your local counters are automatically imported to your GitHub Gist.

---

## 🚀 How to Publish to GitHub Pages (`github.io`)

### Step 1: Push this code to a GitHub repository
Open your terminal in this directory (`contest-counter-site`):

```bash
git init
git add .
git commit -m "feat: CP counter site with native GitHub Gist storage"
```

Create a new repository on GitHub (e.g. `cp-counter` or `<your-username>.github.io`), then run:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. On GitHub, go to your repository.
2. Click **Settings** (tab at the top) &rarr; **Pages** (in the left sidebar).
3. Under **Build and deployment** &rarr; **Branch**:
   - Select branch: `main`
   - Folder: `/ (root)`
4. Click **Save**.
5. GitHub will deploy your site at:
   ```text
   https://<your-username>.github.io/<repo-name>/
   ```
   *(Or `https://<your-username>.github.io/` if you named the repo `<your-username>.github.io`)*.

---

## 🔐 How to Connect Your GitHub Storage

1. Open your published website (or local preview).
2. Click the **Connect GitHub** button in the top right.
3. Click **"Generate Token on GitHub ↗"** (or open [GitHub Token Generator](https://github.com/settings/tokens/new?description=CP+Counters+Tracker&scopes=gist)).
4. Click **Generate token** at the bottom of the GitHub page.
   *(Note: It only requires the `gist` permission so it can create and update your private counters Gist).*
5. Paste the token into the app and click **Connect & Sync**.

That's it! Your site will immediately:
- Authenticate and display your GitHub avatar & username.
- Create a private Gist named `cp_counters.json` under your account.
- Synchronize all your counter increments in real-time.

---

## 💻 Local Preview & Testing

To test locally:

```bash
cd contest-counter-site
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 📁 File Structure

```text
contest-counter-site/
├── index.html        # Semantic HTML5 UI with cards, modals & SVG badges
├── style.css         # Modern dark-theme stylesheet with platform glows
├── app.js            # GitHub REST API client & counters state logic
└── README.md         # Documentation & GitHub Pages deployment guide
```
