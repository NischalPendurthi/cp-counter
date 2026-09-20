# 🎯 CP Counter — Competitive Programming Practice Tracker

A sleek, responsive web tracker for competitive programming problems solved across **LeetCode**, **Codeforces**, **AtCoder**, and **CSES**.

Designed specifically to be published for free on **GitHub Pages** (`username.github.io`), with **GitHub OAuth Login** and **per-account cloud database persistence** via **Supabase**.

![Preview](data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 400%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%230b0f19%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2338bdf8%22 font-family=%22sans-serif%22 font-size=%2228%22 font-weight=%22bold%22>CP Counter Dashboard</text></svg>)

---

## ✨ Features

- **4 Dedicated Platform Counters**:
  - 🟡 **LeetCode** (Algorithms & DS)
  - 🔵 **Codeforces** (Div. Contests & Practice)
  - 🔷 **AtCoder** (ABC / ARC / AGC)
  - 🟢 **CSES Problem Set** (300+ Classic problems)
- **Flexible Controls**:
  - Large **`−`** and **`+`** increment/decrement buttons.
  - **Click-to-edit**: Type any exact number directly into the counter input (e.g., if you already solved 185 problems).
  - Quick-add buttons (**+5**, **+10**) for rapid logging.
  - Quick **reset (↺)** button per card.
  - **Total Solved Banner**: Automatic sum aggregation across all 4 platforms in real-time.
- **GitHub OAuth Login**:
  - Sign in directly with your GitHub account.
  - Displays user avatar and GitHub username.
- **Cloud Database Persistence**:
  - Counters saved per user account in a PostgreSQL database via Supabase.
  - Debounced auto-save so rapid clicking won't spam the database.
- **Zero-Setup Guest Mode**:
  - Works immediately out of the box using browser `localStorage` even before setting up Supabase.
  - When you first sign in with GitHub, your existing local counts are automatically migrated to your cloud account!
- **In-App Settings UI**:
  - Configure your Supabase project keys directly from the web interface (gear icon) without editing source code.

---

## 🚀 How to Publish on GitHub Pages (`github.io`)

### Step 1: Push this code to a new GitHub repository
Open your terminal in this directory (`contest-counter-site`):

```bash
git init
git add .
git commit -m "Initial commit of CP Counter site"
```

Create a new repository on GitHub (e.g., `cp-counter` or `<your-username>.github.io`), then run:

```bash
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

### Step 2: Turn on GitHub Pages
1. On GitHub, navigate to your repository.
2. Click **Settings** (tab at the top) &rarr; **Pages** (in the left sidebar).
3. Under **Build and deployment** &rarr; **Branch**:
   - Select branch: `main`
   - Folder: `/ (root)`
4. Click **Save**.
5. Within 1–2 minutes, GitHub will publish your site at:
   ```text
   https://<your-username>.github.io/<repo-name>/
   ```
   *(Or `https://<your-username>.github.io/` if you named the repo `<your-username>.github.io`)*.

---

## 🔐 GitHub Login & Cloud Storage Setup (Free with Supabase)

Because GitHub Pages is a purely static host (no server-side Node/Python backend), we use **Supabase** (free hosted PostgreSQL + Auth) to handle GitHub OAuth and per-user storage.

### 1. Create a free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and click **Sign Up** (you can sign in with GitHub).
2. Click **New project**, choose a name (e.g., `cp-counter`), set a database password, and create it.

### 2. Create the Database Table
1. In your Supabase dashboard, click **SQL Editor** on the left menu.
2. Click **New Query**, paste the following SQL script, and click **Run**:

```sql
-- Create the counters table linked to authenticated users
create table public.user_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  leetcode integer not null default 0,
  codeforces integer not null default 0,
  atcoder integer not null default 0,
  cses integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) so each user only accesses their own data
alter table public.user_counters enable row level security;

-- Policy: Users can view their own counter
create policy "Users can view own row"
on public.user_counters for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own counter
create policy "Users can insert own row"
on public.user_counters for insert
with check (auth.uid() = user_id);

-- Policy: Users can update their own counter
create policy "Users can update own row"
on public.user_counters for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 3. Create a GitHub OAuth App
1. Go to GitHub: **Settings** &rarr; **Developer Settings** &rarr; **OAuth Apps** &rarr; **New OAuth App** ([Direct link](https://github.com/settings/applications/new)).
2. Fill in the fields:
   - **Application name**: `CP Counter`
   - **Homepage URL**: Your GitHub Pages URL (e.g., `https://<your-username>.github.io/<repo-name>/`) or `http://localhost:8000/` for local testing.
   - **Authorization callback URL**:
     ```text
     https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
     *(You can find your Project Reference under Supabase Project Settings &rarr; General).*
3. Click **Register application**.
4. Click **Generate a new client secret**. Copy both your **Client ID** and **Client Secret**.

### 4. Enable GitHub Provider in Supabase
1. In Supabase, go to **Authentication** &rarr; **Providers** &rarr; **GitHub**.
2. Toggle GitHub to **Enabled**.
3. Paste the **Client ID** and **Client Secret** you got from GitHub.
4. Click **Save**.

### 5. Add Redirect URLs in Supabase
1. In Supabase, go to **Authentication** &rarr; **URL Configuration**.
2. Set **Site URL** to:
   ```text
   https://<your-username>.github.io/<repo-name>/
   ```
3. Under **Redirect URLs**, add:
   - `https://<your-username>.github.io/**`
   - `http://localhost:8000/**` (for local testing)
4. Click **Save**.

---

## ⚙️ Connecting Your Site to Supabase

You have two easy ways to set your Supabase keys:

### Option A: Via the Web UI (No code editing needed)
1. Open your published website (or local preview).
2. Click the **Settings (⚙️ gear icon)** in the top right.
3. Paste your **Supabase Project URL** and **Anon Public Key** (found in Supabase &rarr; **Project Settings** &rarr; **API**).
4. Click **Save & Connect**.
*(These keys are saved safely in your browser).*

### Option B: In `config.js` (Pre-configured for all visitors)
Edit `config.js` in this folder:
```javascript
window.APP_CONFIG = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsIn...'
};
```
Commit and push to GitHub. Now anyone opening your site will immediately have the GitHub login connected!

---

## 💻 Local Preview & Testing

To test the website locally before pushing:

```bash
cd contest-counter-site
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 📁 File Structure

```text
contest-counter-site/
├── index.html        # Main dashboard UI with 4 counter cards & modals
├── style.css         # Modern dark-theme responsive styling
├── app.js            # Counters logic, debounced cloud sync, & OAuth
├── config.js         # Supabase connection configuration
└── README.md         # Documentation & GitHub Pages deployment guide
```
