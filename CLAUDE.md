# CLAUDE.md — Project Rules for TX-Dom-Dev
# Texas 42 Dominoes — Claude Code Dev Build
# Owner: go4jc247 | Repo: https://github.com/go4jc247/TX-Dom-Dev

---

## ⚠️ THESE RULES ARE MANDATORY. NO EXCEPTIONS. EVER. ⚠️

This file is automatically loaded by Claude Code at the start of every session.
These are not suggestions. They are hard rules for this project.

---

## SCOPE — Where Claude Is Allowed to Work

- ✅ Working directory: `/Users/jp/TX-Dom-Dev/` ONLY
- ✅ GitHub: `go4jc247/TX-Dom-Dev` repository ONLY
- ❌ NEVER access, read, modify, or touch any files outside of `/Users/jp/TX-Dom-Dev/`
- ❌ NEVER touch any other GitHub repository, organization, settings, tokens, or account data outside of TX-Dom-Dev
- ❌ NEVER access iCloud files directly — originals in iCloud are reference only, never modify them

---

## RULES

### Rule 1 — Never Delete Files Without Confirmation
- NEVER delete any file without explicitly asking the user first and receiving a clear "yes delete it" response
- This includes temporary files, old versions, and anything that looks unused

### Rule 2 — Always Increment the Version Number
- EVERY delivered file must have an incremented version number — no exceptions
- Minor fix/tweak → bump patch: v13.0.1, v13.0.2, etc.
- Significant change → bump minor: v13.1.0, v13.2.0, etc.
- Major upgrade → bump major: v14.0.0, v15.0.0, etc.
- Update ALL THREE locations every version change:
  1. `MP_VERSION` constant in index.html
  2. `CACHE_NAME` in sw.js
  3. The `id="aboutVersion"` default text in index.html (backup, since it's dynamic)

### Rule 3 — Never Overwrite Original iCloud Files
- Our ONLY working directory is `/Users/jp/TX-Dom-Dev/`
- The iCloud folder `/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Texas dominoes /` is READ-ONLY reference
- NEVER write, move, rename, or delete anything in iCloud

### Rule 4 — No Major Feature Removal Without Explicit Approval
- NEVER remove a feature, function, or significant block of code without the user saying clearly "yes delete it" or "remove it"
- Dead code cleanup requires item-by-item confirmation unless user gives blanket approval for a specific list

### Rule 5 — Always Commit to Main Before gh-pages
- Workflow is always: make changes → commit to `main` → then merge to `gh-pages`
- NEVER commit directly to `gh-pages`
- NEVER skip `main`

### Rule 6 — Warn Before Anything That Could Break the Game
- If a change has any risk of breaking gameplay, UI, multiplayer, or audio — STOP and warn the user before proceeding
- Describe the risk clearly and wait for confirmation

### Rule 7 — Never Touch Anything Outside the TX-Dom-Dev Repository
- GitHub access is limited to: `go4jc247/TX-Dom-Dev` only
- NEVER access other repos, GitHub settings, billing, tokens, SSH keys, or any other account data
- NEVER create new repositories without explicit instruction

### Rule 8 — Never Access Files Outside the Project Directory
- File system access is limited to `/Users/jp/TX-Dom-Dev/` only
- Do not read, list, or interact with any other directory on the machine
- If a file is needed from elsewhere, ask the user to provide it

### Rule 9 — Never Restructure the Project Without Approval
- NEVER move, rename, or reorganize files or folders without asking first
- File renames or folder structure changes can break GitHub Pages paths and service worker caching

### Rule 10 — Always Summarize Changes at Delivery
- At the end of every version delivery, provide a brief changelog:
  - What version was delivered
  - What changed (bullet points)
  - What was NOT changed (so user knows scope)

---

## PROJECT CONTEXT

- **Game:** Texas 42 / TN51 Dominoes — HTML5 single-file game
- **Base file:** Started from `Texas Dominoes V12.10.27c 2.html` (clean, no Easter egg)
- **Current version:** v13.0.0
- **Live URL:** https://go4jc247.github.io/TX-Dom-Dev/
- **Dev branch:** main
- **Live branch:** gh-pages
- **Relay server:** wss://tn51-tx42-relay.onrender.com
- **User uses text-to-speech** — expect typos, decipher intent, ask if unclear
- **Version display** is dynamic — `MP_VERSION` drives About panel AND splash screen automatically

---

## VERSIONING LOCATIONS (update all 3 every release)
1. `const MP_VERSION = 'vX.X.X';` — in index.html (~line 7454)
2. `const CACHE_NAME = 'tx-dom-vX.X.X';` — in sw.js (line 8)
3. `<div ... id="aboutVersion">vX.X.X</div>` — in index.html (~line 1981)

---

## MODEL PREFERENCE

- **Default model: Sonnet** — use for all standard tasks
- **Recommend switching to Opus** when the task involves:
  - Complex multiplayer sync logic or race condition debugging
  - Fixing or building out the Monte Carlo simulation
  - Major architectural decisions (restructuring JS, separating files)
  - Subtle game logic bugs that require deep reasoning
  - Any task where Sonnet has already tried and failed
- When recommending Opus, say clearly: **"⚠️ This task may need Opus — consider switching with /model"**

---

## WORKFLOW PREFERENCE

- **Bug fixes: Just do it.** Don't ask permission for fixes — fix it, commit, and report what changed. If it breaks, we roll back.
- **Always commit before and after changes** so every version is recoverable via git history.
- **Keep the user focused.** User has ADHD — reel them back to the current task when they drift. State clearly what the next step is.

---

## BACKLOG (future tasks, not urgent)

### Audio Quality Upgrade
- Current audio files in `assets/audio/` are heavily compressed (were embedded as base64)
- User has original high-quality source files
- When ready: replace compressed files with originals, no HTML changes needed
- Status: **On hold**

### JS Module Split (v14.0.0 candidate)
- Split game.js (~27,000 lines) into ES Modules by feature section
- Suggested sections: game-core, multiplayer, audio, ui, ai, moon-mode, scoring, settings
- Requires adding import/export to all shared globals — major refactor
- Benefits: smaller files, easier editing, significant token savings per session
- Status: **On hold — tackle as v14.0.0 planned rewrite**

---

## CURRENT TASK: game.js Module Split (v13.4.0)

### Audit Complete — here's what goes where:

**MONTE CARLO → `assets/js/monte-carlo.js` (~740 lines)**
- Lines 21632-22375 in game.js
- ZERO external refs — completely self-contained IIFE
- Triggered by #menuMonteCarlo click → mcOpenModal()
- Status: READY TO EXTRACT

**OBSERVER → `assets/js/observer.js` (~720 lines)**
- Lines 8678-9397 in game.js
- 4 functions called from outside: mpRequestRoomStatus(2), mpConnectAsObserver(1), mpHandleObserverMessage(1), mpShowObserverControls(1)
- Need stub functions in game.js that lazy-load observer.js
- Status: READY TO EXTRACT

**REPLAY/SAVE-LOAD → `assets/js/replay.js` (~680 lines)**
- Lines 19324-20005 in game.js
- 8 functions called from outside: resumeGameFromSave(1), hasSavedGame(1), clearSavedGame(5), checkForSavedGame(1), autoSave(7), saveNotes(3), saveHandForReplay(1), replayHand(1)
- autoSave and clearSavedGame are called frequently — need working stubs
- Status: READY TO EXTRACT

**DEV TOOLS → `assets/js/dev-tools.js` (lazy loaded on dev mode toggle)**
- Custom hand system: lines 20005-20575 (~570 lines) — startCustomHand(1 ref outside)
- Game logging: lines 20575-21445 (~870 lines) — logHandStart(4), logTrickStart(1), logPlay(1), logTrickEnd(1), logEvent(13!), loadGameLog(1) — need no-op stubs
- Device presets DATA: lines 23641-24513 (~870 lines) — BUILTIN_DEVICE_PRESETS referenced 9 times but all within orientation panel
- Status: READY TO EXTRACT (logging needs no-op stubs)

**KEEP IN game.js (too intertwined):**
- Orientation & Persistence IIFE (24513-26878) — sets essential window globals (BY2_*, FLIP_TRUMP_ENABLED)
- Popup Config IIFE (26943-27259) — referenced from bid panel code
- Lay Down Hand (1569-1938) — REAL GAME FEATURE not dev tool
- Pass & Play (10124-10434, 21445-21632) — REAL GAME FEATURE
- All core, AI, multiplayer, audio, UI code

### Extraction Order:
1. Monte Carlo (simplest, zero deps)
2. Observer
3. Replay
4. Dev Tools (custom hands + logging + presets)

### Lazy Load Pattern:
```javascript
function _lazyLoad(src, cb) {
  if (document.querySelector('script[src="' + src + '"]')) { if(cb) cb(); return; }
  var s = document.createElement('script');
  s.src = src; s.onload = cb;
  document.head.appendChild(s);
}
```
Extracted files override stub functions when loaded. Auto-invoke if triggered by lazy load.

### After Module Split:
- Version bump to v13.4.0
- Update sw.js cache list with new files
- Update index.html if needed
- Push to main, then gh-pages for testing
