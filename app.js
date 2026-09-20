/**
 * CP Counter Tracker
 * 100% Native GitHub Architecture
 * Uses GitHub Gists API for per-user private cloud persistence
 * Zero external databases or third-party servers required!
 */

(function () {
  'use strict';

  // --- Constants & Config ---
  const PLATFORMS = ['leetcode', 'codeforces', 'atcoder', 'cses'];
  const GIST_FILENAME = 'cp_counters.json';
  const GIST_DESCRIPTION = '[CP-Counters] Practice Problem Tracker Data';

  const STORAGE_KEY_DATA = 'cp_counter_counts_v2';
  const STORAGE_KEY_TOKEN = 'cp_counter_gh_token_v2';
  const STORAGE_KEY_GIST_ID = 'cp_counter_gist_id_v2';

  const defaultCounts = {
    leetcode: 0,
    codeforces: 0,
    atcoder: 0,
    cses: 0,
  };

  // --- State ---
  let counts = { ...defaultCounts };
  let githubToken = null;
  let currentUser = null;
  let currentGistId = null;
  let saveDebounceTimer = null;
  let toastTimer = null;

  // --- DOM Elements ---
  const totalSolvedEl = document.getElementById('totalSolved');
  const syncStatusEl = document.getElementById('syncStatus');
  const syncStatusTextEl = document.getElementById('syncStatusText');
  const storageLabelEl = document.getElementById('storageLabel');
  const openAuthModalBtn = document.getElementById('openAuthModalBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userProfileEl = document.getElementById('userProfile');
  const userAvatarEl = document.getElementById('userAvatar');
  const userNameEl = document.getElementById('userName');
  const viewGistLinkEl = document.getElementById('viewGistLink');
  const toastEl = document.getElementById('toast');

  // Modals
  const authModal = document.getElementById('authModal');
  const helpModal = document.getElementById('helpModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const cancelAuthModalBtn = document.getElementById('cancelAuthModalBtn');
  const connectGitHubBtn = document.getElementById('connectGitHubBtn');
  const githubTokenInput = document.getElementById('githubTokenInput');

  const openHelpBtn = document.getElementById('openHelpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpFooterBtn = document.getElementById('closeHelpFooterBtn');

  // --- Toast ---
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 3000);
  }

  // --- Local Persistence ---
  function loadLocalCounts() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_DATA) || '{}');
      counts = { ...defaultCounts };
      PLATFORMS.forEach((p) => {
        if (typeof saved[p] === 'number' && !isNaN(saved[p])) {
          counts[p] = Math.max(0, Math.floor(saved[p]));
        }
      });
    } catch (e) {
      counts = { ...defaultCounts };
    }
  }

  function saveLocalCounts() {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(counts));
  }

  // --- UI Rendering ---
  function renderAll() {
    let total = 0;
    PLATFORMS.forEach((platform) => {
      const inputEl = document.getElementById(`${platform}Value`);
      const val = counts[platform] || 0;
      if (inputEl && document.activeElement !== inputEl) {
        inputEl.value = val;
      }
      total += val;
    });

    if (totalSolvedEl) {
      totalSolvedEl.textContent = total;
    }
  }

  function updateSyncStatus(status) {
    if (!syncStatusEl || !syncStatusTextEl || !storageLabelEl) return;

    syncStatusEl.classList.remove('status-local', 'status-cloud');

    if (status === 'syncing') {
      syncStatusEl.classList.add('status-local');
      syncStatusTextEl.textContent = 'Syncing...';
      storageLabelEl.textContent = 'Saving to GitHub Gist...';
      storageLabelEl.style.color = '#38bdf8';
    } else if (status === 'cloud' && currentUser) {
      syncStatusEl.classList.add('status-cloud');
      syncStatusTextEl.textContent = 'Gist Synced';
      storageLabelEl.textContent = `GitHub Gist (@${currentUser.login})`;
      storageLabelEl.style.color = '#34d399';
    } else {
      syncStatusEl.classList.add('status-local');
      syncStatusTextEl.textContent = 'Local Guest';
      storageLabelEl.textContent = 'Guest (Local Browser)';
      storageLabelEl.style.color = '#f59e0b';
    }
  }

  function renderAuthUI() {
    if (currentUser) {
      if (openAuthModalBtn) openAuthModalBtn.classList.add('hidden');
      if (userProfileEl) userProfileEl.classList.remove('hidden');

      if (userNameEl) userNameEl.textContent = `@${currentUser.login}`;
      if (userAvatarEl) {
        userAvatarEl.src = currentUser.avatar_url || '';
        userAvatarEl.alt = currentUser.login;
      }

      if (viewGistLinkEl && currentGistId) {
        viewGistLinkEl.href = `https://gist.github.com/${currentUser.login}/${currentGistId}`;
        viewGistLinkEl.classList.remove('hidden');
      }

      updateSyncStatus('cloud');
    } else {
      if (openAuthModalBtn) openAuthModalBtn.classList.remove('hidden');
      if (userProfileEl) userProfileEl.classList.add('hidden');
      updateSyncStatus('local');
    }
  }

  // --- GitHub REST API Client ---
  async function fetchGitHub(endpoint, token, options = {}) {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `GitHub API Error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.message) errorMsg = errJson.message;
      } catch (e) {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Verify Token & get profile
  async function verifyToken(token) {
    return fetchGitHub('/user', token);
  }

  // Find existing Gist or create new one
  async function getOrCreateGist(token) {
    // 1. Check if cached Gist ID still exists
    const cachedGistId = localStorage.getItem(STORAGE_KEY_GIST_ID);
    if (cachedGistId) {
      try {
        const gist = await fetchGitHub(`/gists/${cachedGistId}`, token);
        if (gist && gist.files && gist.files[GIST_FILENAME]) {
          return gist;
        }
      } catch (e) {
        console.warn('Cached Gist could not be loaded, searching user gists...', e);
      }
    }

    // 2. Search recent gists for GIST_FILENAME
    try {
      const userGists = await fetchGitHub('/gists?per_page=50', token);
      const found = userGists.find(
        (g) => g.files && g.files[GIST_FILENAME]
      );
      if (found) {
        // Fetch full gist details
        return await fetchGitHub(`/gists/${found.id}`, token);
      }
    } catch (e) {
      console.warn('Error searching existing gists:', e);
    }

    // 3. Create a new private Gist
    const payload = {
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(
            {
              ...counts,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      },
    };

    const newGist = await fetchGitHub('/gists', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return newGist;
  }

  // Parse counters from Gist file content
  function applyGistData(gist) {
    if (!gist || !gist.files || !gist.files[GIST_FILENAME]) return;

    try {
      const contentStr = gist.files[GIST_FILENAME].content;
      const parsed = JSON.parse(contentStr);

      const hasLocalCounts = Object.values(counts).some((v) => v > 0);
      const hasGistCounts = PLATFORMS.some((p) => (parsed[p] || 0) > 0);

      // If Gist has counts, load them
      if (hasGistCounts || !hasLocalCounts) {
        PLATFORMS.forEach((p) => {
          counts[p] = Math.max(0, parseInt(parsed[p], 10) || 0);
        });
        saveLocalCounts();
        renderAll();
      } else if (hasLocalCounts && !hasGistCounts) {
        // User had local counts but gist is empty, migrate to gist!
        syncToGist();
        showToast('Uploaded your local counters to your GitHub Gist!');
      }
    } catch (err) {
      console.error('Failed to parse Gist content:', err);
    }
  }

  // Auto-save counters to Gist (debounced)
  function syncToGist() {
    if (!githubToken || !currentGistId) return;

    updateSyncStatus('syncing');
    clearTimeout(saveDebounceTimer);

    saveDebounceTimer = setTimeout(async () => {
      try {
        const payload = {
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(
                {
                  ...counts,
                  updated_at: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          },
        };

        await fetchGitHub(`/gists/${currentGistId}`, githubToken, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        updateSyncStatus('cloud');
      } catch (err) {
        console.error('Failed to update Gist:', err);
        updateSyncStatus('local');
        showToast('Could not save to GitHub Gist: ' + err.message);
      }
    }, 450);
  }

  // --- Counter Handlers ---
  function changeCount(platform, delta) {
    if (!PLATFORMS.includes(platform)) return;
    const current = counts[platform] || 0;
    const updated = Math.max(0, current + delta);
    counts[platform] = updated;

    renderAll();
    saveLocalCounts();

    if (githubToken && currentGistId) {
      syncToGist();
    }
  }

  function setCountDirectly(platform, value) {
    if (!PLATFORMS.includes(platform)) return;
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    counts[platform] = parsed;

    renderAll();
    saveLocalCounts();

    if (githubToken && currentGistId) {
      syncToGist();
    }
  }

  function resetCounter(platform) {
    if (!PLATFORMS.includes(platform)) return;
    if (counts[platform] === 0) return;

    counts[platform] = 0;
    renderAll();
    saveLocalCounts();

    if (githubToken && currentGistId) {
      syncToGist();
    }
    showToast(`Reset ${platform.toUpperCase()} to 0`);
  }

  // --- Auth Handlers ---
  async function handleConnect() {
    const rawToken = (githubTokenInput.value || '').trim();
    if (!rawToken) {
      showToast('Please enter your GitHub Personal Access Token.');
      return;
    }

    connectGitHubBtn.disabled = true;
    connectGitHubBtn.textContent = 'Connecting...';

    try {
      // 1. Verify token
      const user = await verifyToken(rawToken);

      // 2. Find or create private Gist
      const gist = await getOrCreateGist(rawToken);

      // 3. Save state
      githubToken = rawToken;
      currentUser = user;
      currentGistId = gist.id;

      localStorage.setItem(STORAGE_KEY_TOKEN, rawToken);
      localStorage.setItem(STORAGE_KEY_GIST_ID, gist.id);

      applyGistData(gist);
      renderAuthUI();
      closeAuthModal();

      showToast(`Connected as @${user.login}! Synced with private Gist.`);
    } catch (err) {
      console.error('Connection failed:', err);
      showToast('Connection failed: ' + err.message);
    } finally {
      connectGitHubBtn.disabled = false;
      connectGitHubBtn.textContent = 'Connect & Sync';
    }
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_GIST_ID);
    githubToken = null;
    currentUser = null;
    currentGistId = null;

    if (githubTokenInput) githubTokenInput.value = '';

    loadLocalCounts();
    renderAll();
    renderAuthUI();
    showToast('Disconnected from GitHub. Local guest mode active.');
  }

  // --- Modals ---
  function openAuthModal() {
    if (githubTokenInput) githubTokenInput.value = githubToken || '';
    if (authModal) authModal.classList.remove('hidden');
  }

  function closeAuthModal() {
    if (authModal) authModal.classList.add('hidden');
  }

  function openHelpModal() {
    if (helpModal) helpModal.classList.remove('hidden');
  }

  function closeHelpModal() {
    if (helpModal) helpModal.classList.add('hidden');
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Steppers (+ and -) and quick (+5, +10)
    document.querySelectorAll('[data-counter][data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const platform = btn.getAttribute('data-counter');
        const step = parseInt(btn.getAttribute('data-step'), 10);
        changeCount(platform, step);
      });
    });

    // Reset buttons
    document.querySelectorAll('.card-reset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const platform = btn.getAttribute('data-counter');
        resetCounter(platform);
      });
    });

    // Numeric inputs
    PLATFORMS.forEach((platform) => {
      const input = document.getElementById(`${platform}Value`);
      if (!input) return;

      input.addEventListener('change', () => {
        setCountDirectly(platform, input.value);
      });

      input.addEventListener('blur', () => {
        setCountDirectly(platform, input.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
    });

    // Modal buttons
    if (openAuthModalBtn) openAuthModalBtn.addEventListener('click', openAuthModal);
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener('click', closeAuthModal);
    if (cancelAuthModalBtn) cancelAuthModalBtn.addEventListener('click', closeAuthModal);
    if (connectGitHubBtn) connectGitHubBtn.addEventListener('click', handleConnect);
    if (logoutBtn) logoutBtn.addEventListener('click', handleDisconnect);

    if (openHelpBtn) openHelpBtn.addEventListener('click', openHelpModal);
    if (closeHelpBtn) closeHelpBtn.addEventListener('click', closeHelpModal);
    if (closeHelpFooterBtn) closeHelpFooterBtn.addEventListener('click', closeHelpModal);

    // Close on overlay backdrop click
    [authModal, helpModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  // --- App Initialization ---
  async function init() {
    loadLocalCounts();
    renderAll();
    setupEventListeners();

    // Check for existing saved token
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken) {
      try {
        const user = await verifyToken(savedToken);
        const gist = await getOrCreateGist(savedToken);

        githubToken = savedToken;
        currentUser = user;
        currentGistId = gist.id;
        localStorage.setItem(STORAGE_KEY_GIST_ID, gist.id);

        applyGistData(gist);
        renderAuthUI();
      } catch (err) {
        console.warn('Saved GitHub token session invalid:', err);
        handleDisconnect();
      }
    } else {
      renderAuthUI();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
