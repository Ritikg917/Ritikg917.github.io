/**
 * Poki Games Portal - Main Application Logic
 * Fast, responsive, authentic Poki experience
 */

(function () {
  'use strict';

  // State Management
  const state = {
    games: [...gamesData],
    activeCategory: 'all',
    searchQuery: '',
    sortBy: 'popular',
    favorites: JSON.parse(localStorage.getItem('poki_favorites') || '[]'),
    recentGames: JSON.parse(localStorage.getItem('poki_recent') || '[]'),
    likes: JSON.parse(localStorage.getItem('poki_likes') || '{}'),
    soundEnabled: localStorage.getItem('poki_sound') !== 'false',
    currentGameId: null
  };

  // Audio System using Web Audio API (Zero external assets needed!)
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playPop() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    playClick() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    }

    playFanfare() {
      if (!state.soundEnabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.07);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.07 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + index * 0.07);
        osc.stop(this.ctx.currentTime + index * 0.07 + 0.18);
      });
    }
  }

  const sfx = new SoundFX();

  // DOM Elements Cache
  const elements = {
    grid: document.getElementById('pokiGrid'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    categoryChips: document.querySelectorAll('.category-chip'),
    sortSelect: document.getElementById('sortSelect'),
    randomBtn: document.getElementById('randomGameBtn'),
    favNavBtn: document.getElementById('favoritesNavBtn'),
    favNavCount: document.getElementById('favNavCount'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    emptyState: document.getElementById('emptyState'),
    resetSearchBtn: document.getElementById('resetSearchBtn'),
    sectionTitle: document.getElementById('sectionTitle'),
    sectionCount: document.getElementById('sectionCount'),
    
    // Player Stage
    playerModal: document.getElementById('playerModal'),
    playerBackBtn: document.getElementById('playerBackBtn'),
    playerIframe: document.getElementById('gameIframe'),
    playerLoader: document.getElementById('gameLoader'),
    playerGameIcon: document.getElementById('playerGameIcon'),
    playerGameTitle: document.getElementById('playerGameTitle'),
    playerCategoryBadge: document.getElementById('playerCategoryBadge'),
    playerFavBtn: document.getElementById('playerFavBtn'),
    playerLikeBtn: document.getElementById('playerLikeBtn'),
    playerDislikeBtn: document.getElementById('playerDislikeBtn'),
    playerRestartBtn: document.getElementById('playerRestartBtn'),
    playerFullscreenBtn: document.getElementById('playerFullscreenBtn'),
    playerShareBtn: document.getElementById('playerShareBtn'),
    gameViewportCard: document.getElementById('gameViewportCard'),
    gameDescText: document.getElementById('gameDescText'),
    gameControlsGuide: document.getElementById('gameControlsGuide'),
    gameTagsContainer: document.getElementById('gameTagsContainer'),
    relatedGamesContainer: document.getElementById('relatedGamesContainer'),
    toast: document.getElementById('toastNotification'),

    // Mobile & Phone Connect Elements
    playOnPhoneBtn: document.getElementById('playOnPhoneBtn'),
    phoneModal: document.getElementById('phoneConnectModal'),
    phoneModalCloseBtn: document.getElementById('phoneModalCloseBtn'),
    phoneModalBackdrop: document.getElementById('phoneModalBackdrop'),
    phoneUrlInput: document.getElementById('phoneUrlInput'),
    phoneCopyBtn: document.getElementById('phoneCopyBtn'),
    phoneQrImg: document.getElementById('phoneQrImg'),
    floatingExitFullscreenBtn: document.getElementById('floatingExitFullscreenBtn'),
    fullscreenFloatingHud: document.getElementById('fullscreenFloatingHud')
  };

  // Toast Notification
  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2800);
  }

  // Update Favorites Counter in Header
  function updateFavoritesBadge() {
    if (elements.favNavCount) {
      elements.favNavCount.textContent = state.favorites.length;
    }
  }

  // Filter & Sort Logic
  function getFilteredGames() {
    let result = [...state.games];

    // Category Filter
    if (state.activeCategory === 'favorites') {
      result = result.filter(g => state.favorites.includes(g.id));
    } else if (state.activeCategory === 'recent') {
      result = state.recentGames
        .map(id => state.games.find(g => g.id === id))
        .filter(Boolean);
    } else if (state.activeCategory === 'hot') {
      result = result.filter(g => (g.badge && (g.badge.includes('HOT') || g.badge.includes('TOP') || g.badge.includes('HIT'))) || g.rating >= 4.8);
    } else if (state.activeCategory === 'racing') {
      result = result.filter(g => (g.tags && g.tags.some(t => t.toLowerCase() === 'racing')) || g.title.toLowerCase().includes('racing') || g.title.toLowerCase().includes('racer'));
    } else if (state.activeCategory !== 'all') {
      result = result.filter(g => g.category.toLowerCase() === state.activeCategory.toLowerCase());
    }

    // Search Query Filter
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(g => 
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.tags && g.tags.some(t => t.toLowerCase().includes(q))) ||
        g.description.toLowerCase().includes(q)
      );
    }

    // Sort Logic
    if (state.sortBy === 'top-rated') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (state.sortBy === 'name-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sortBy === 'name-desc') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    } else {
      // 'popular' - Sort by plays & featured
      const parsePlays = (p) => parseFloat(p) * (p.includes('M') ? 1000 : 1);
      result.sort((a, b) => parsePlays(b.plays) - parsePlays(a.plays));
    }

    return result;
  }

  // Render Grid
  function renderGrid() {
    const filtered = getFilteredGames();

    // Section title & count updates
    let title = 'All Games';
    if (state.activeCategory === 'favorites') title = '❤️ Favorite Games';
    else if (state.activeCategory === 'recent') title = '🕒 Recently Played';
    else if (state.activeCategory === 'hot') title = '🔥 Trending & Popular';
    else if (state.activeCategory === 'racing') title = '🏎️ Racing & Car Games';
    else if (state.activeCategory !== 'all') {
      title = state.activeCategory.charAt(0).toUpperCase() + state.activeCategory.slice(1) + ' Games';
    }

    if (state.searchQuery) {
      title = `Results for "${state.searchQuery}"`;
    }

    if (elements.sectionTitle) elements.sectionTitle.textContent = title;
    if (elements.sectionCount) elements.sectionCount.textContent = `(${filtered.length})`;

    if (filtered.length === 0) {
      elements.grid.style.display = 'none';
      elements.emptyState.style.display = 'block';
      return;
    }

    elements.grid.style.display = 'grid';
    elements.emptyState.style.display = 'none';

    elements.grid.innerHTML = filtered.map((game, index) => {
      const isFav = state.favorites.includes(game.id);
      
      // Determine card size
      let sizeClass = '';
      if (!state.searchQuery && state.activeCategory === 'all') {
        if (game.featured === 'large') sizeClass = 'card-large';
        else if (game.featured === 'wide') sizeClass = 'card-wide';
      }

      // Badge class
      let badgeClass = 'game-badge';
      if (game.badge === 'HOT') badgeClass += ' badge-hot';
      else if (game.badge === 'TOP') badgeClass += ' badge-top';
      else if (game.badge === 'RETRO') badgeClass += ' badge-retro';

      return `
        <div class="game-card ${sizeClass}" data-id="${game.id}" tabindex="0" role="button" aria-label="Play ${game.title}">
          <div class="card-canvas" style="background: ${game.gradient};">
            ${game.logo ? `<img class="card-logo-img" src="${game.logo}" alt="${game.title}" loading="lazy">` : `<span class="card-icon-big">${game.icon}</span>`}
          </div>

          <div class="card-header-overlay">
            <span class="${badgeClass}">${game.badge}</span>
            <button class="fav-toggle-btn ${isFav ? 'is-favorite' : ''}" data-fav-id="${game.id}" title="Add to Favorites" aria-label="Favorite">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>

          <div class="card-footer-overlay">
            <div class="game-title">${game.title}</div>
            <div class="card-meta">
              <span class="card-rating">★ ${game.rating.toFixed(1)}</span>
              <span class="card-plays">${game.plays} plays</span>
            </div>
          </div>

          <div class="card-hover-overlay">
            <span class="play-action-pill">PLAY NOW 🎮</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners to cards
    elements.grid.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('mouseenter', () => sfx.playPop());
      card.addEventListener('click', (e) => {
        // Prevent opening game if clicking favorite button
        if (e.target.closest('.fav-toggle-btn')) return;
        const id = card.dataset.id;
        openGamePlayer(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.dataset.id;
          openGamePlayer(id);
        }
      });
    });

    // Attach listeners to favorite buttons
    elements.grid.querySelectorAll('.fav-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.favId;
        toggleFavorite(id);
      });
    });
  }

  // Toggle Favorite
  function toggleFavorite(gameId) {
    sfx.playClick();
    const idx = state.favorites.indexOf(gameId);
    if (idx > -1) {
      state.favorites.splice(idx, 1);
      showToast('Removed from Favorites');
    } else {
      state.favorites.push(gameId);
      showToast('Added to Favorites ❤️');
    }
    localStorage.setItem('poki_favorites', JSON.stringify(state.favorites));
    updateFavoritesBadge();

    // Re-render favorite state on active cards & player modal
    if (state.activeCategory === 'favorites') {
      renderGrid();
    } else {
      const favBtns = document.querySelectorAll(`[data-fav-id="${gameId}"]`);
      favBtns.forEach(btn => {
        const isFav = state.favorites.includes(gameId);
        btn.classList.toggle('is-favorite', isFav);
        btn.textContent = isFav ? '❤️' : '🤍';
      });
    }

    if (state.currentGameId === gameId && elements.playerFavBtn) {
      const isFav = state.favorites.includes(gameId);
      elements.playerFavBtn.classList.toggle('is-active', isFav);
      elements.playerFavBtn.innerHTML = `${isFav ? '❤️' : '🤍'} <span>${isFav ? 'Favorited' : 'Favorite'}</span>`;
    }
  }

  // Add to Recent Games
  function addToRecent(gameId) {
    state.recentGames = state.recentGames.filter(id => id !== gameId);
    state.recentGames.unshift(gameId);
    if (state.recentGames.length > 20) state.recentGames.pop();
    localStorage.setItem('poki_recent', JSON.stringify(state.recentGames));
  }

  // Open Game in Theater Arena
  function openGamePlayer(gameId) {
    const game = state.games.find(g => g.id === gameId);
    if (!game) return;

    state.currentGameId = gameId;
    addToRecent(gameId);
    sfx.playFanfare();

    // Update URL Hash without reload
    window.location.hash = `game=${gameId}`;

    // Update Topbar
    if (game.logo) {
      elements.playerGameIcon.innerHTML = `<img src="${game.logo}" alt="${game.title}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; vertical-align: middle;">`;
    } else {
      elements.playerGameIcon.textContent = game.icon;
    }
    elements.playerGameTitle.textContent = game.title;
    elements.playerCategoryBadge.textContent = game.category;

    // Favorite state
    const isFav = state.favorites.includes(gameId);
    elements.playerFavBtn.classList.toggle('is-active', isFav);
    elements.playerFavBtn.innerHTML = `${isFav ? '❤️' : '🤍'} <span>${isFav ? 'Favorited' : 'Favorite'}</span>`;

    // Like state
    const userVote = state.likes[gameId];
    elements.playerLikeBtn.classList.toggle('liked', userVote === 'like');
    elements.playerDislikeBtn.classList.toggle('disliked', userVote === 'dislike');

    // Details & Instructions
    elements.gameDescText.textContent = game.description;
    elements.gameControlsGuide.textContent = game.controls;

    // Tags
    elements.gameTagsContainer.innerHTML = (game.tags || []).map(tag => `
      <span class="tag-pill">#${tag}</span>
    `).join('');

    // Load iframe with Smart Static Host + CDN Fallback
    elements.playerLoader.classList.remove('is-hidden');
    loadGameIntoIframe(game);

    // Render Related Games
    renderRelatedGames(game);

    // Show Modal
    elements.playerModal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  // Smart Game Loader: Prioritizes local files on host; automatically streams on-demand from CDN if host misses file
  let currentBlobUrl = null;

  function loadGameIntoIframe(game) {
    const iframe = elements.playerIframe;
    const localPath = game.path;

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    iframe.removeAttribute('srcdoc');

    const onIframeLoaded = () => {
      elements.playerLoader.classList.add('is-hidden');
      try {
        iframe.focus();
        injectIframeResponsiveFix();
      } catch (err) {}
    };

    iframe.onload = onIframeLoaded;

    // Standard games (1v1.LOL, Among Us, FNF, Drift Hunters, Minecraft, etc.) load directly
    if (!localPath.startsWith('html-css-javascript-games-main/offline/')) {
      iframe.src = localPath;
      return;
    }

    // Offline games pack: check if file exists on this web host
    fetch(localPath, { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          // File exists on current static host / localhost
          iframe.src = localPath;
        } else {
          // File is missing on host (404) -> stream on demand via GitHub raw with CORS
          streamOfflineGame(localPath);
        }
      })
      .catch(() => {
        // If HEAD fetch is restricted, attempt local load
        iframe.src = localPath;
      });
  }

  function streamOfflineGame(localPath) {
    const fileName = localPath.replace('html-css-javascript-games-main/offline/', '');
    const remoteUrl = `https://raw.githubusercontent.com/CoolDude2349/Offline-HTML-Games-Pack/master/offline/${encodeURIComponent(fileName)}`;

    fetch(remoteUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        currentBlobUrl = URL.createObjectURL(blob);
        elements.playerIframe.src = currentBlobUrl;
      })
      .catch(err => {
        console.warn(`[CDN stream error] Falling back to local:`, err);
        elements.playerIframe.src = localPath;
      });
  }

  // Inject Responsive Mobile CSS & Viewport inside the Game Document
  function injectIframeResponsiveFix() {
    try {
      const iframe = elements.playerIframe;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // 1. Ensure viewport meta exists
      let meta = doc.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = doc.createElement('meta');
        meta.name = 'viewport';
        doc.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      // 2. Inject responsive & direct touch styles
      let style = doc.getElementById('rs-game-responsive-fix');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'rs-game-responsive-fix';
        doc.head.appendChild(style);
      }
      style.textContent = `
        html, body {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #000000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          touch-action: auto !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        canvas, #canvas, #gameCanvas, .game-canvas, #unityContainer, #unity-container, #c2canvas, #canvas-container {
          max-width: 100vw !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          touch-action: none !important;
          pointer-events: auto !important;
        }
      `;

      if (doc.body) {
        doc.body.style.maxWidth = '100vw';
        doc.body.style.maxHeight = '100dvh';
        doc.body.style.overflow = 'hidden';
      }
    } catch (err) {
      // Cross-origin safe
    }
  }

  // Close Game Player
  function closeGamePlayer() {
    if (state.isFullscreen) {
      toggleFullscreen();
    }
    sfx.playClick();
    elements.playerModal.classList.remove('is-active');
    elements.playerModal.classList.remove('is-mobile-fullscreen');
    elements.gameViewportCard.classList.remove('fullscreen-mode');
    document.body.classList.remove('game-fullscreen-active');
    document.body.style.overflow = '';
    elements.playerIframe.src = 'about:blank';
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    state.currentGameId = null;

    // Clear hash
    if (window.location.hash) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }

  // Render Related Games
  function renderRelatedGames(currentGame) {
    const related = state.games
      .filter(g => g.id !== currentGame.id && (g.category === currentGame.category || g.badge === 'HOT'))
      .slice(0, 6);

    elements.relatedGamesContainer.innerHTML = related.map(g => `
      <div class="game-card" data-id="${g.id}" style="height: 140px;">
        <div class="card-canvas" style="background: ${g.gradient};">
          <span class="card-icon-big" style="font-size: 42px;">${g.icon}</span>
        </div>
        <div class="card-footer-overlay" style="padding: 8px 12px;">
          <div class="game-title" style="font-size: 13px;">${g.title}</div>
          <div class="card-meta">
            <span class="card-rating">★ ${g.rating.toFixed(1)}</span>
          </div>
        </div>
        <div class="card-hover-overlay">
          <span class="play-action-pill" style="padding: 6px 14px; font-size: 11px;">PLAY 🎮</span>
        </div>
      </div>
    `).join('');

    elements.relatedGamesContainer.querySelectorAll('.game-card').forEach(c => {
      c.addEventListener('click', () => {
        openGamePlayer(c.dataset.id);
      });
    });
  }

  // Pick Random Game
  function pickRandomGame() {
    sfx.playClick();
    const available = getFilteredGames();
    if (available.length === 0) return;
    const randomGame = available[Math.floor(Math.random() * available.length)];
    openGamePlayer(randomGame.id);
    showToast(`🎲 Playing: ${randomGame.title}!`);
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderGrid();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      elements.searchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      renderGrid();
      elements.searchInput.focus();
    });

    elements.resetSearchBtn.addEventListener('click', () => {
      state.searchQuery = '';
      elements.searchInput.value = '';
      elements.clearSearchBtn.style.display = 'none';
      state.activeCategory = 'all';
      updateActiveCategoryChip();
      renderGrid();
    });

    // Category chips
    elements.categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        sfx.playClick();
        state.activeCategory = chip.dataset.category;
        updateActiveCategoryChip();
        renderGrid();
      });
    });

    // Favorites nav shortcut
    if (elements.favNavBtn) {
      elements.favNavBtn.addEventListener('click', () => {
        sfx.playClick();
        state.activeCategory = 'favorites';
        updateActiveCategoryChip();
        renderGrid();
      });
    }

    // Sort Select
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderGrid();
    });

    // Random Game
    elements.randomBtn.addEventListener('click', pickRandomGame);

    // Sound Toggle
    elements.soundToggleBtn.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem('poki_sound', state.soundEnabled);
      elements.soundToggleBtn.textContent = state.soundEnabled ? '🔊' : '🔇';
      showToast(state.soundEnabled ? 'Sound Enabled 🔊' : 'Sound Muted 🔇');
      if (state.soundEnabled) sfx.playPop();
    });
    elements.soundToggleBtn.textContent = state.soundEnabled ? '🔊' : '🔇';

    // Player Topbar Buttons
    elements.playerBackBtn.addEventListener('click', closeGamePlayer);

    elements.playerRestartBtn.addEventListener('click', () => {
      sfx.playClick();
      elements.playerLoader.classList.remove('is-hidden');
      elements.playerIframe.src = elements.playerIframe.src;
    });

    elements.playerFavBtn.addEventListener('click', () => {
      if (state.currentGameId) toggleFavorite(state.currentGameId);
    });

    elements.playerLikeBtn.addEventListener('click', () => {
      if (!state.currentGameId) return;
      sfx.playClick();
      const current = state.likes[state.currentGameId];
      if (current === 'like') {
        delete state.likes[state.currentGameId];
        elements.playerLikeBtn.classList.remove('liked');
      } else {
        state.likes[state.currentGameId] = 'like';
        elements.playerLikeBtn.classList.add('liked');
        elements.playerDislikeBtn.classList.remove('disliked');
        showToast('Glad you liked it! 👍');
      }
      localStorage.setItem('poki_likes', JSON.stringify(state.likes));
    });

    elements.playerDislikeBtn.addEventListener('click', () => {
      if (!state.currentGameId) return;
      sfx.playClick();
      const current = state.likes[state.currentGameId];
      if (current === 'dislike') {
        delete state.likes[state.currentGameId];
        elements.playerDislikeBtn.classList.remove('disliked');
      } else {
        state.likes[state.currentGameId] = 'dislike';
        elements.playerDislikeBtn.classList.add('disliked');
        elements.playerLikeBtn.classList.remove('liked');
      }
      localStorage.setItem('poki_likes', JSON.stringify(state.likes));
    });

    elements.playerFullscreenBtn.addEventListener('click', () => {
      sfx.playClick();
      toggleFullscreen();
    });

    if (elements.floatingExitFullscreenBtn) {
      elements.floatingExitFullscreenBtn.addEventListener('click', () => {
        sfx.playClick();
        toggleFullscreen();
      });
    }

    // Sync fullscreen change with native browser Esc / F11 / Back
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    elements.playerShareBtn.addEventListener('click', () => {
      sfx.playClick();
      const shareUrl = `${window.location.origin}${window.location.pathname}#game=${state.currentGameId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Direct game link copied! 📋');
      }).catch(() => {
        showToast('Link: ' + shareUrl);
      });
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // '/' to focus search
      if (e.key === '/' && document.activeElement !== elements.searchInput && !elements.playerModal.classList.contains('is-active')) {
        e.preventDefault();
        elements.searchInput.focus();
      }

      // ESC to close player
      if (e.key === 'Escape' && elements.playerModal.classList.contains('is-active')) {
        closeGamePlayer();
      }

      // 'f' or 'F' for fullscreen in player
      if ((e.key === 'f' || e.key === 'F') && elements.playerModal.classList.contains('is-active') && document.activeElement.tagName !== 'INPUT') {
        toggleFullscreen();
      }
    });

    // Handle Hash on Load & Back/Forward button
    window.addEventListener('hashchange', checkUrlHash);

    // Auto re-scale game on resize / orientation change
    window.addEventListener('resize', () => {
      if (state.currentGameId) injectIframeResponsiveFix();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(injectIframeResponsiveFix, 300);
    });
  }

  // Update Active Category Pill
  function updateActiveCategoryChip() {
    elements.categoryChips.forEach(chip => {
      const match = chip.dataset.category === state.activeCategory;
      chip.classList.toggle('active', match);
    });
  }

  // Device Detection Helper
  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Fullscreen Controllers (Desktop Browser Native API + Mobile Fallback)
  function enterFullscreen() {
    const card = elements.gameViewportCard;
    const modal = elements.playerModal;
    state.isFullscreen = true;

    // Apply CSS Fullscreen styling
    card.classList.add('fullscreen-mode');
    document.body.classList.add('game-fullscreen-active');
    if (isMobileDevice()) {
      modal.classList.add('is-mobile-fullscreen');
    }

    // Standard Desktop / Laptop Fullscreen API
    try {
      if (card.requestFullscreen) {
        card.requestFullscreen().catch(() => {});
      } else if (card.webkitRequestFullscreen) {
        card.webkitRequestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (err) {}

    if (elements.playerFullscreenBtn) {
      elements.playerFullscreenBtn.innerHTML = `⛶ <span>Exit Fullscreen</span>`;
    }
    showToast('⛶ Fullscreen Active');
    setTimeout(injectIframeResponsiveFix, 150);
  }

  function exitFullscreen() {
    const card = elements.gameViewportCard;
    const modal = elements.playerModal;
    state.isFullscreen = false;

    // Native browser exit fullscreen
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (err) {}

    card.classList.remove('fullscreen-mode');
    modal.classList.remove('is-mobile-fullscreen');
    document.body.classList.remove('game-fullscreen-active');

    if (elements.playerFullscreenBtn) {
      elements.playerFullscreenBtn.innerHTML = `⛶ <span>Fullscreen</span>`;
    }
    showToast('Exit Fullscreen');
    setTimeout(injectIframeResponsiveFix, 150);
  }

  function toggleFullscreen() {
    const isCurrentlyFs = !!(document.fullscreenElement || document.webkitFullscreenElement || state.isFullscreen);
    if (isCurrentlyFs) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  function handleFullscreenChange() {
    const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isNativeFs && state.isFullscreen) {
      exitFullscreen();
    } else if (isNativeFs && !state.isFullscreen) {
      enterFullscreen();
    }
  }

  // URL Hash Deep Linking Check
  function checkUrlHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#game=')) {
      const gameId = hash.replace('#game=', '').trim();
      const game = state.games.find(g => g.id === gameId);
      if (game && state.currentGameId !== gameId) {
        openGamePlayer(gameId);
      }
    } else if (!hash && elements.playerModal.classList.contains('is-active')) {
      closeGamePlayer();
    }
  }



  // Setup Phone Connect Modal
  function setupPhoneConnectModal() {
    if (!elements.playOnPhoneBtn || !elements.phoneModal) return;

    // Fetch real LAN IP from server
    fetch('/api/network-info')
      .then(res => res.json())
      .then(info => {
        if (info.mobileUrl && elements.phoneUrlInput) {
          elements.phoneUrlInput.value = info.mobileUrl;
          if (elements.phoneQrImg) {
            elements.phoneQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(info.mobileUrl)}`;
          }
        }
      })
      .catch(() => {});

    elements.playOnPhoneBtn.addEventListener('click', () => {
      elements.phoneModal.classList.add('is-active');
    });

    if (elements.phoneModalCloseBtn) {
      elements.phoneModalCloseBtn.addEventListener('click', () => {
        elements.phoneModal.classList.remove('is-active');
      });
    }

    if (elements.phoneModalBackdrop) {
      elements.phoneModalBackdrop.addEventListener('click', () => {
        elements.phoneModal.classList.remove('is-active');
      });
    }

    if (elements.phoneCopyBtn && elements.phoneUrlInput) {
      elements.phoneCopyBtn.addEventListener('click', () => {
        elements.phoneUrlInput.select();
        navigator.clipboard.writeText(elements.phoneUrlInput.value)
          .then(() => showToast('📋 Link copied! Phone me paste karein.'))
          .catch(() => showToast('Link selected'));
      });
    }
  }

  // Initialize App
  function init() {
    const allChipCount = document.querySelector('.category-chip[data-category="all"] .chip-count');
    if (allChipCount) allChipCount.textContent = state.games.length;
    updateFavoritesBadge();
    renderGrid();
    setupEventListeners();
    setupPhoneConnectModal();
    checkUrlHash();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
