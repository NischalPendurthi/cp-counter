/**
 * Competitive Programming Counters Application Logic
 * Supports LeetCode, Codeforces, AtCoder, CSES
 * With GitHub OAuth & Supabase Persistence + Offline LocalStorage fallback
 */

(function () {
  'use strict';

  // --- Constants & Defaults ---
  const PLATFORMS = ['leetcode', 'codeforces', 'atcoder', 'cses'];
  const STORAGE_KEY_DATA = 'cp_counter_counts_v1';
  const STORAGE_KEY_CONFIG = 'cp_counter_supabase_cfg_v1';

  const defaultCounts = {
    leetcode: 0,
    codeforces: 0,
    atcoder: 0,
    cses: 0,
  };

  // --- State ---
  let counts = { ...defaultCounts };
  let currentUser = null;
  let supabaseClient = null;
  let saveDebounceTimer = null;
  let toastTimer = null;

  // --- DOM Elements ---
  const totalSolvedEl = document.getElementById('totalSolved');
  const syncStatusEl = document.getElementById('syncStatus');
  const syncStatusTextEl = document.getElementById('syncStatusText');
  const storageLabelEl = document.getElementById('storageLabel');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userProfileEl = document.getElementById('userProfile');
  const userAvatarEl = document.getElementById('userAvatar');
  const userNameEl = document.getElementById('userName');
  const toastEl = document.getElementById('toast');

  // Modals
  const settingsModal = document.getElementById('settingsModal');
  const helpModal = document.getElementById('helpModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const clearSettingsBtn = document.getElementById('clearSettingsBtn');
  const cfgSupabaseUrlInput = document.getElementById('cfgSupabaseUrl');
  const cfgSupabaseAnonKeyInput = document.getElementById('cfgSupabaseAnonKey');
  const suggestedCallbackUrlEl = document.getElementById('suggestedCallbackUrl');
  const copyCallbackBtn = document.getElementById('copyCallbackBtn');

  const openHelpBtn = document.getElementById('openHelpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const closeHelpFooterBtn = document.getElementById('closeHelpFooterBtn');

  // --- Utility Functions ---
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.add('hidden');
    }, 2800);
  }

  function getStoredConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not parse stored config:', e);
    }

    if (window.APP_CONFIG && window.APP_CONFIG.supabaseUrl) {
      return {
        supabaseUrl: window.APP_CONFIG.supabaseUrl.trim(),
        supabaseAnonKey: (window.APP_CONFIG.supabaseAnonKey || '').trim(),
      };
    }

    return { supabaseUrl: '', supabaseAnonKey: '' };
  }

  function saveConfigToStorage(url, key) {
    localStorage.setItem(
      STORAGE_KEY_CONFIG,
      JSON.stringify({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim() })
    );
  }

  function updateCallbackUrlPreview(url) {
    if (!suggestedCallbackUrlEl) return;
    try {
      if (url && url.includes('supabase.co')) {
        const parsed = new URL(url);
        suggestedCallbackUrlEl.textContent = `${parsed.origin}/auth/v1/callback`;
      } else {
        suggestedCallbackUrlEl.textContent = 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback';
      }
    } catch (e) {
      suggestedCallbackUrlEl.textContent = 'https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback';
    }
  }

  // --- Supabase Setup ---
  function initSupabase() {
    const config = getStoredConfig();
    const isConfigured =
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !config.supabaseUrl.includes('YOUR_PROJECT_ID') &&
      !config.supabaseAnonKey.includes('YOUR_ANON_KEY') &&
      window.supabase;

    if (!isConfigured) {
      supabaseClient = null;
      updateSyncStatus('local');
      return false;
    }

    try {
      supabaseClient = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      );
      updateSyncStatus('configured');
      return true;
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      supabaseClient = null;
      updateSyncStatus('local');
      return false;
    }
  }

  function updateSyncStatus(status) {
    if (!syncStatusEl || !syncStatusTextEl || !storageLabelEl) return;

    syncStatusEl.classList.remove('status-local', 'status-cloud');

    if (status === 'cloud' && currentUser) {
      syncStatusEl.classList.add('status-cloud');
      syncStatusTextEl.textContent = 'Cloud Synced';
      storageLabelEl.textContent = `Supabase Cloud (${currentUser.user_metadata?.user_name || 'Logged in'})`;
      storageLabelEl.style.color = '#34d399';
    } else if (status === 'configured') {
      syncStatusEl.classList.add('status-local');
      syncStatusTextEl.textContent = 'Ready (Sign in to sync)';
      storageLabelEl.textContent = 'Local (Supabase connected)';
      storageLabelEl.style.color = '#38bdf8';
    } else {
      syncStatusEl.classList.add('status-local');
      syncStatusTextEl.textContent = 'Local Storage';
      storageLabelEl.textContent = 'Guest (Local Device)';
      storageLabelEl.style.color = '#f59e0b';
    }
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

  // --- Rendering UI ---
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

  function renderAuth() {
    if (currentUser) {
      loginBtn.classList.add('hidden');
      userProfileEl.classList.remove('hidden');

      const meta = currentUser.user_metadata || {};
      const username = meta.user_name || meta.preferred_username || meta.full_name || 'GitHub User';
      userNameEl.textContent = username;

      if (meta.avatar_url) {
        userAvatarEl.src = meta.avatar_url;
        userAvatarEl.alt = username;
      } else {
        userAvatarEl.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%2338bdf8%22/></svg>';
      }

      updateSyncStatus('cloud');
    } else {
      loginBtn.classList.remove('hidden');
      userProfileEl.classList.add('hidden');

      if (!supabaseClient) {
        updateSyncStatus('local');
      } else {
        updateSyncStatus('configured');
      }
    }
  }

  // --- Cloud Syncing ---
  async function persistToCloud() {
    if (!currentUser || !supabaseClient) return;

    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        const payload = {
          user_id: currentUser.id,
          leetcode: counts.leetcode,
          codeforces: counts.codeforces,
          atcoder: counts.atcoder,
          cses: counts.cses,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseClient
          .from('user_counters')
          .upsert(payload, { onConflict: 'user_id' });

        if (error) {
          console.error('Failed to sync to Supabase:', error);
          showToast('Failed to save to cloud: ' + (error.message || 'Error'));
        }
      } catch (err) {
        console.error('Error during cloud persist:', err);
      }
    }, 350);
  }

  async function loadCloudCounts() {
    if (!currentUser || !supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from('user_counters')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load cloud counts:', error);
        return;
      }

      if (data) {
        counts = {
          leetcode: Number(data.leetcode) || 0,
          codeforces: Number(data.codeforces) || 0,
          atcoder: Number(data.atcoder) || 0,
          cses: Number(data.cses) || 0,
        };
        saveLocalCounts();
        renderAll();
        showToast('Counters synchronized with cloud!');
      } else {
        // No row in cloud yet. If local has counters, migrate them to cloud!
        const hasLocal = Object.values(counts).some((v) => v > 0);
        if (hasLocal) {
          persistToCloud();
          showToast('Uploaded your local counters to your cloud account!');
        } else {
          persistToCloud();
        }
      }
    } catch (err) {
      console.error('Error loading cloud counts:', err);
    }
  }

  // --- Counter Actions ---
  function changeCount(platform, delta) {
    if (!PLATFORMS.includes(platform)) return;
    const current = counts[platform] || 0;
    const updated = Math.max(0, current + delta);
    counts[platform] = updated;

    renderAll();
    saveLocalCounts();

    if (currentUser && supabaseClient) {
      persistToCloud();
    }
  }

  function setCountDirectly(platform, value) {
    if (!PLATFORMS.includes(platform)) return;
    const parsed = Math.max(0, parseInt(value, 10) || 0);
    counts[platform] = parsed;

    renderAll();
    saveLocalCounts();

    if (currentUser && supabaseClient) {
      persistToCloud();
    }
  }

  function resetCounter(platform) {
    if (!PLATFORMS.includes(platform)) return;
    if (counts[platform] === 0) return;

    counts[platform] = 0;
    renderAll();
    saveLocalCounts();

    if (currentUser && supabaseClient) {
      persistToCloud();
    }
    showToast(`Reset ${platform.toUpperCase()} count to 0`);
  }

  // --- Auth Handlers ---
  async function signInWithGitHub() {
    if (!supabaseClient) {
      // Prompt user to configure Supabase
      openSettingsModal();
      showToast('Please enter your Supabase Project URL & Anon Key first.');
      return;
    }

    try {
      // Redirect back to current location without hashes
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        showToast('GitHub Sign-in failed: ' + error.message);
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      showToast('Sign-in error occurred.');
    }
  }

  async function signOut() {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }

    currentUser = null;
    loadLocalCounts();
    renderAll();
    renderAuth();
    showToast('Signed out. Local guest mode active.');
  }

  // --- Modal Logic ---
  function openSettingsModal() {
    const config = getStoredConfig();
    cfgSupabaseUrlInput.value = config.supabaseUrl || '';
    cfgSupabaseAnonKeyInput.value = config.supabaseAnonKey || '';
    updateCallbackUrlPreview(config.supabaseUrl);
    settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
  }

  function saveSettings() {
    const url = cfgSupabaseUrlInput.value.trim();
    const key = cfgSupabaseAnonKeyInput.value.trim();

    if (url && !url.startsWith('https://')) {
      showToast('Supabase URL must start with https://');
      return;
    }

    saveConfigToStorage(url, key);
    closeSettingsModal();

    const ok = initSupabase();
    if (ok) {
      showToast('Supabase connected successfully! You can now Sign In with GitHub.');
      checkAuthSession();
    } else if (url || key) {
      showToast('Supabase credentials saved.');
    } else {
      showToast('Switched to local offline mode.');
    }
    renderAuth();
  }

  function clearSettings() {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    cfgSupabaseUrlInput.value = '';
    cfgSupabaseAnonKeyInput.value = '';
    updateCallbackUrlPreview('');
    supabaseClient = null;
    currentUser = null;
    closeSettingsModal();
    renderAuth();
    showToast('Cleared Supabase credentials. Operating in Local Mode.');
  }

  function openHelpModal() {
    helpModal.classList.remove('hidden');
  }

  function closeHelpModal() {
    helpModal.classList.add('hidden');
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Increment / Decrement (+ and -) and Quick actions (+5, +10)
    document.querySelectorAll('[data-counter][data-step]').forEach((button) => {
      button.addEventListener('click', (e) => {
        const platform = button.getAttribute('data-counter');
        const step = parseInt(button.getAttribute('data-step'), 10);
        changeCount(platform, step);
      });
    });

    // Reset button per card
    document.querySelectorAll('.card-reset-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const platform = button.getAttribute('data-counter');
        resetCounter(platform);
      });
    });

    // Editable number inputs
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
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    });

    // Auth buttons
    if (loginBtn) loginBtn.addEventListener('click', signInWithGitHub);
    if (logoutBtn) logoutBtn.addEventListener('click', signOut);

    // Settings Modal
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    if (clearSettingsBtn) clearSettingsBtn.addEventListener('click', clearSettings);

    if (cfgSupabaseUrlInput) {
      cfgSupabaseUrlInput.addEventListener('input', (e) => {
        updateCallbackUrlPreview(e.target.value);
      });
    }

    if (copyCallbackBtn) {
      copyCallbackBtn.addEventListener('click', () => {
        const text = suggestedCallbackUrlEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          const originalText = copyCallbackBtn.textContent;
          copyCallbackBtn.textContent = 'Copied!';
          setTimeout(() => (copyCallbackBtn.textContent = originalText), 1800);
        });
      });
    }

    // Help Modal
    if (openHelpBtn) openHelpBtn.addEventListener('click', openHelpModal);
    if (closeHelpBtn) closeHelpBtn.addEventListener('click', closeHelpModal);
    if (closeHelpFooterBtn) closeHelpFooterBtn.addEventListener('click', closeHelpModal);

    // Close modals on overlay backdrop click
    [settingsModal, helpModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  }

  // --- Auth & Session Initialization ---
  async function checkAuthSession() {
    if (!supabaseClient) return;

    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.warn('Get session error:', error);
      }

      if (session?.user) {
        currentUser = session.user;
        renderAuth();
        await loadCloudCounts();
      } else {
        currentUser = null;
        renderAuth();
      }

      // Listen for future auth changes (e.g. redirected after GitHub OAuth)
      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          currentUser = session.user;
          renderAuth();
          await loadCloudCounts();
        } else {
          currentUser = null;
          renderAuth();
        }
      });
    } catch (e) {
      console.error('Session check error:', e);
    }
  }

  // --- App Initialization ---
  function init() {
    loadLocalCounts();
    renderAll();
    setupEventListeners();

    const isConfigured = initSupabase();
    renderAuth();

    if (isConfigured) {
      checkAuthSession();
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
