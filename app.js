/**
 * QUADRO OPERACIONAL DE CRACHÁS E POSTOS DE TRABALHO
 * Aplicação interativa de gestão de efetivo com Drag-and-Drop
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'quadro_operacional_state_v2';

  // Application State
  const THEME_KEY = 'quadro_operacional_theme';
  const API_BASE = '/api';

  let isOfflineMode = false;

  let state = {
    posts: [],
    reserve: []
  };

  let historyStack = [];
  const MAX_HISTORY = 30;

  // UI View States
  let currentFilter = {
    search: '',
    equipe: 'all',
    funcao: 'all',
    status: 'all'
  };

  let currentViewMode = 'dual'; // 'dual' (colunas 1 e 2) or 'compact' (geral)
  let draggedItem = null; // { colabId, sourcePostId, sourceEquipe }

  // DOM Elements Cache
  const elements = {
    postsGrid: document.getElementById('posts-grid'),
    reserveDropzone: document.getElementById('reserve-dropzone'),
    reserveDrawer: document.getElementById('reserve-drawer'),
    reserveHeader: document.getElementById('reserve-header'),
    reserveCountTag: document.getElementById('reserve-count-tag'),
    btnReserveBadge: document.getElementById('btn-reserve-badge'),
    btnToggleReserve: document.getElementById('btn-toggle-reserve'),
    btnCollapseReserve: document.getElementById('btn-collapse-reserve'),
    btnAddReserveColab: document.getElementById('btn-add-reserve-colab'),

    // Stats
    statPosts: document.getElementById('stat-posts'),
    statColabs: document.getElementById('stat-colabs'),
    statAtivos: document.getElementById('stat-ativos'),
    statFerias: document.getElementById('stat-ferias'),
    statReserva: document.getElementById('stat-reserva'),

    // Search and Filters
    inputSearch: document.getElementById('input-search'),
    btnSearchClear: document.getElementById('btn-search-clear'),
    filterEquipe: document.getElementById('filter-equipe'),
    filterFuncao: document.getElementById('filter-funcao'),
    filterStatus: document.getElementById('filter-status'),

    // View toggles
    viewModeDual: document.getElementById('view-mode-dual'),
    viewModeCompact: document.getElementById('view-mode-compact'),
    zoomRange: document.getElementById('zoom-range'),

    // Auto-Scroll / Modo Apresentação (Play & Pause)
    btnToggleAutoscroll: document.getElementById('btn-toggle-autoscroll'),
    iconPlayMain: document.getElementById('icon-play-main'),
    iconPauseMain: document.getElementById('icon-pause-main'),
    labelAutoscrollMain: document.getElementById('label-autoscroll-main'),
    selectAutoscrollSpeed: document.getElementById('select-autoscroll-speed'),

    // Floating HUD
    floatingHud: document.getElementById('floating-hud'),
    hudStatusDot: document.getElementById('hud-status-dot'),
    hudStatusText: document.getElementById('hud-status-text'),
    hudBtnToggle: document.getElementById('hud-btn-toggle'),
    hudIconPause: document.getElementById('hud-icon-pause'),
    hudIconPlay: document.getElementById('hud-icon-play'),
    hudBtnLabel: document.getElementById('hud-btn-label'),
    hudSpeedSelect: document.getElementById('hud-speed-select'),
    hudBtnTop: document.getElementById('hud-btn-top'),
    hudBtnClose: document.getElementById('hud-btn-close'),

    // Top actions
    btnAddColab: document.getElementById('btn-add-colab'),
    btnAddPosto: document.getElementById('btn-add-posto'),
    btnUndo: document.getElementById('btn-undo'),
    btnToggleTheme: document.getElementById('btn-toggle-theme'),
    iconTheme: document.getElementById('icon-theme'),
    saveIndicator: document.getElementById('save-indicator'),

    // Dropdown & Export/Import
    btnMoreOptions: document.getElementById('btn-more-options'),
    dropdownMenuActions: document.getElementById('dropdown-menu-actions'),
    btnPrintCrachas: document.getElementById('btn-print-crachas'),
    btnExportExcel: document.getElementById('btn-export-excel'),
    btnExportBackup: document.getElementById('btn-export-backup'),
    fileImportBackup: document.getElementById('file-import-backup'),
    btnResetData: document.getElementById('btn-reset-data'),

    // Modal Colab
    modalColabOverlay: document.getElementById('modal-colab-overlay'),
    formColab: document.getElementById('form-colab'),
    modalColabTitle: document.getElementById('modal-colab-title'),
    btnCloseColabModal: document.getElementById('btn-close-colab-modal'),
    btnCancelColab: document.getElementById('btn-cancel-colab'),
    btnDeleteColab: document.getElementById('btn-delete-colab'),
    inputColabPhoto: document.getElementById('input-colab-photo'),
    btnRemovePhoto: document.getElementById('btn-remove-photo'),
    modalPhotoImg: document.getElementById('modal-photo-img'),
    modalPhotoPlaceholder: document.getElementById('modal-photo-placeholder'),
    colabId: document.getElementById('colab-id'),
    colabCurrentPostoId: document.getElementById('colab-current-posto-id'),
    colabNome: document.getElementById('colab-nome'),
    colabMatricula: document.getElementById('colab-matricula'),
    colabFuncao: document.getElementById('colab-funcao'),
    colabDataAdmissao: document.getElementById('colab-data-admissao'),
    colabEscala: document.getElementById('colab-escala'),
    colabEquipe: document.getElementById('colab-equipe'),
    colabStatus: document.getElementById('colab-status'),
    colabPostoSelect: document.getElementById('colab-posto-select'),
    colabObs: document.getElementById('colab-obs'),

    // Modal Posto
    modalPostoOverlay: document.getElementById('modal-posto-overlay'),
    formPosto: document.getElementById('form-posto'),
    modalPostoTitle: document.getElementById('modal-posto-title'),
    btnClosePostoModal: document.getElementById('btn-close-posto-modal'),
    btnCancelPosto: document.getElementById('btn-cancel-posto'),
    btnDeletePosto: document.getElementById('btn-delete-posto'),
    postoId: document.getElementById('posto-id'),
    postoCodigo: document.getElementById('posto-codigo'),
    postoNome: document.getElementById('posto-nome'),
    postoCategoria: document.getElementById('posto-categoria'),
    postoEndereco: document.getElementById('posto-endereco'),

    // Modal Alocar (Reserva -> Posto)
    modalAllocateOverlay: document.getElementById('modal-allocate-overlay'),
    btnCloseAllocateModal: document.getElementById('btn-close-allocate-modal'),
    btnCancelAllocate: document.getElementById('btn-cancel-allocate'),
    formAllocate: document.getElementById('form-allocate'),
    allocateColabId: document.getElementById('allocate-colab-id'),
    allocateAvatarPreview: document.getElementById('allocate-avatar-preview'),
    allocateColabName: document.getElementById('allocate-colab-name'),
    allocateColabMatricula: document.getElementById('allocate-colab-matricula'),
    allocateColabFuncao: document.getElementById('allocate-colab-funcao'),
    allocatePostoSelect: document.getElementById('allocate-posto-select'),
    allocateEquipeSelect: document.getElementById('allocate-equipe-select'),

    // Modal Print
    modalPrintOverlay: document.getElementById('modal-print-overlay'),
    btnClosePrintModal: document.getElementById('btn-close-print-modal'),
    printSelectScope: document.getElementById('print-select-scope'),
    printSelectPost: document.getElementById('print-select-post'),
    btnTriggerPrint: document.getElementById('btn-trigger-print'),
    printSheetArea: document.getElementById('print-sheet-area'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // ========================================================
  // INITIALIZATION
  // ========================================================
  function init() {
    initTheme();
    setupEventListeners();
    loadFromAPI();
  }

  function normalizeState(st) {
    if (!st || !st.posts) return;
    st.posts.forEach(p => {
      const isGestao = p.id === 'posto-gestao-operacional' || p.code === '00001' || (p.category && p.category.toLowerCase().includes('gestão'));
      if (isGestao && Array.isArray(p.employees)) {
        p.employees.forEach(c => {
          if (c.equipe && (c.equipe.includes('1') || c.equipe.includes('2'))) {
            c.equipe = 'Gestão';
          }
        });
      }
    });
  }

  async function loadFromAPI() {
    // Primeiro tenta carregar do backend local
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/state`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        state = await res.json();
        normalizeState(state);
        isOfflineMode = false;
        renderAll();
        return;
      }
    } catch (e) {
      // Backend local offline (ex: rodando na Vercel estática ou sem servidor node)
      isOfflineMode = true;
    }

    // Modo Standalone / Vercel (salva no localStorage do navegador)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = JSON.parse(saved);
        normalizeState(state);
        renderAll();
        return;
      } catch (e) {
        console.warn('Erro ao restaurar do localStorage, usando inicial:', e);
      }
    }

    // Se não tiver no localStorage, usa os dados da planilha embutidos
    if (window.INITIAL_OPERATIONAL_DATA) {
      state = JSON.parse(JSON.stringify(window.INITIAL_OPERATIONAL_DATA));
      normalizeState(state);
      renderAll();
    }
  }

  function showLoadingOverlay(show) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;background:rgba(2,4,8,0.85);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
        color:#93c5fd;font-size:14px;font-weight:600;letter-spacing:0.5px;
        backdrop-filter:blur(4px);transition:opacity 0.3s ease;
      `;
      overlay.innerHTML = `
        <svg viewBox="0 0 50 50" width="48" height="48" style="animation:spin 1s linear infinite;">
          <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" stroke-width="4" stroke-dasharray="80 20" stroke-linecap="round"/>
        </svg>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        <span>Carregando Banco de Dados...</span>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = show ? 'flex' : 'none';
  }

  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function apiPut(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function saveState(pushToHistory = true) {
    if (pushToHistory) {
      historyStack.push(JSON.stringify(state));
      if (historyStack.length > MAX_HISTORY) historyStack.shift();
      updateUndoButtonState();
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Quota localStorage atingida para imagens:', e);
    }
    showSaveIndicator();
  }

  function undoLastAction() {
    if (historyStack.length === 0) return;
    const previous = historyStack.pop();
    state = JSON.parse(previous);
    updateUndoButtonState();
    renderAll();
    showToast('Ação desfeita. Recarregue para sincronizar com o banco.');
  }

  function updateUndoButtonState() {
    elements.btnUndo.disabled = historyStack.length === 0;
  }

  let saveTimer = null;
  function showSaveIndicator() {
    elements.saveIndicator.classList.add('visible');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      elements.saveIndicator.classList.remove('visible');
    }, 2000);
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function fallbackToInitial() {
    if (window.INITIAL_OPERATIONAL_DATA) {
      state = JSON.parse(JSON.stringify(window.INITIAL_OPERATIONAL_DATA));
    } else {
      state = { posts: [], reserve: [] };
    }
    renderAll();
    showToast('Visualizando dados da planilha original (offline).');
  }

  // ========================================================
  // THEME MANAGEMENT
  // ========================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      elements.iconTheme.innerHTML = `
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      `;
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      elements.iconTheme.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark');
  }

  // ========================================================
  // AVATAR GENERATION HELPERS
  // ========================================================
  function getInitials(name) {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarGradient(name) {
    const gradients = [
      ['#1e3a8a', '#3b82f6'],
      ['#065f46', '#10b981'],
      ['#581c87', '#a855f7'],
      ['#9a3412', '#f97316'],
      ['#374151', '#6b7280'],
      ['#831843', '#ec4899'],
      ['#164e63', '#06b6d4']
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  }

  function renderAvatarSvg(name) {
    const initials = getInitials(name);
    const [c1, c2] = getAvatarGradient(name);
    return `
      <svg class="cracha-photo-svg" viewBox="0 0 80 95" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${c1}" />
            <stop offset="100%" stop-color="${c2}" />
          </linearGradient>
        </defs>
        <rect width="80" height="95" fill="url(#grad-${initials})" />
        <circle cx="40" cy="38" r="20" fill="rgba(255,255,255,0.18)" />
        <path d="M12 95 C 12 68, 68 68, 68 95 Z" fill="rgba(255,255,255,0.22)" />
        <text x="40" y="44" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="19" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">${initials}</text>
      </svg>
    `;
  }

  function calculateTenure(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const adm = new Date(year, month, day);
    if (isNaN(adm.getTime())) return '';

    const today = new Date();
    let years = today.getFullYear() - adm.getFullYear();
    let months = today.getMonth() - adm.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years <= 0 && months <= 0) return 'Recente';
    if (years <= 0) return `${months} m`;
    if (months === 0) return `${years} a`;
    return `${years}a ${months}m`;
  }

  // ========================================================
  // RENDERING ENGINE
  // ========================================================
  function renderAll() {
    updateStatistics();
    renderBoard();
    renderReserve();
    populatePostSelectOptions();
  }

  function updateStatistics() {
    let totalColabs = 0;
    let totalAtivos = 0;
    let totalFerias = 0;

    const countColab = (c) => {
      totalColabs++;
      if (c.status === 'Férias' || (c.observacoes && c.observacoes.toUpperCase().includes('FÉRIAS'))) {
        totalFerias++;
      } else {
        totalAtivos++;
      }
    };

    state.posts.forEach(p => {
      p.employees.forEach(countColab);
    });

    state.reserve.forEach(c => {
      totalColabs++;
      if (c.status === 'Férias') totalFerias++;
      else totalAtivos++;
    });

    elements.statPosts.textContent = state.posts.length;
    elements.statColabs.textContent = totalColabs;
    elements.statAtivos.textContent = totalAtivos;
    elements.statFerias.textContent = totalFerias;
    elements.statReserva.textContent = state.reserve.length;

    elements.reserveCountTag.textContent = `${state.reserve.length} colaboradores`;
    elements.btnReserveBadge.textContent = state.reserve.length;
  }

  function isColabMatchingFilter(colab, post) {
    // Search
    if (currentFilter.search) {
      const q = currentFilter.search.toLowerCase();
      const matchName = (colab.nome || '').toLowerCase().includes(q);
      const matchMat = (colab.matricula || '').toLowerCase().includes(q);
      const matchRole = (colab.funcao || '').toLowerCase().includes(q);
      const matchPost = post ? (post.name || '').toLowerCase().includes(q) : false;
      const matchAddr = post ? (post.address || '').toLowerCase().includes(q) : false;

      if (!matchName && !matchMat && !matchRole && !matchPost && !matchAddr) {
        return false;
      }
    }

    // Equipe
    if (currentFilter.equipe !== 'all') {
      if (currentFilter.equipe === 'Reserva') {
        if (colab.postoId !== 'reserva') return false;
      } else if (currentFilter.equipe === 'Gestão') {
        const isGest = (colab.equipe && colab.equipe.includes('Gestão')) || colab.postoId === 'posto-gestao-operacional';
        if (!isGest) return false;
      } else if (!colab.equipe || !colab.equipe.includes(currentFilter.equipe)) {
        return false;
      }
    }

    // Role / Função
    if (currentFilter.funcao !== 'all') {
      const roleUpper = (colab.funcao || '').toUpperCase();
      if (!roleUpper.includes(currentFilter.funcao.toUpperCase())) {
        return false;
      }
    }

    // Status
    if (currentFilter.status !== 'all') {
      if (currentFilter.status === 'Férias') {
        const isF = colab.status === 'Férias' || (colab.observacoes && colab.observacoes.toUpperCase().includes('FÉRIAS'));
        if (!isF) return false;
      } else if (currentFilter.status === 'Ativo') {
        const isF = colab.status === 'Férias' || (colab.observacoes && colab.observacoes.toUpperCase().includes('FÉRIAS'));
        if (isF) return false;
      }
    }

    return true;
  }

  function sortPosts(posts) {
    return [...posts].sort((a, b) => {
      if (a.id === 'posto-gestao-operacional') return -1;
      if (b.id === 'posto-gestao-operacional') return 1;
      return 0;
    });
  }

  function sortEmployeesByHierarchy(employees) {
    const hierarchy = {
      'GERENTE': 1,          // GERENTE DE CONTRATO, GERENTE OPERACIONAL, GERENTE (qualquer variação) — sempre 1º
      'COORDENADOR': 2,      // COORDENADOR DE CONTRATO, COORDENADOR OPERACIONAL — sempre 2º
      'SUPERVISOR': 3,
      'LIDER': 4,
      'ASSISTENTE ADMINISTRATIVO': 5,
      'ADMINISTRATIVO': 6,
      'VIGILANTE': 20,
      'PORTEIRO': 21
    };

    return [...employees].sort((a, b) => {
      const getRank = (func) => {
        const upper = (func || '').toUpperCase();
        for (const [key, rank] of Object.entries(hierarchy)) {
          if (upper.includes(key)) return rank;
        }
        return 50;
      };
      return getRank(a.funcao) - getRank(b.funcao);
    });
  }

  function renderBoard() {
    elements.postsGrid.innerHTML = '';
    elements.postsGrid.className = 'posts-grid' + (currentViewMode === 'compact' ? ' view-compact-grid' : '');

    const orderedPosts = sortPosts(state.posts);

    orderedPosts.forEach(post => {
      // Filter employees
      let filteredEmployees = post.employees.filter(c => isColabMatchingFilter(c, post));
      filteredEmployees = sortEmployeesByHierarchy(filteredEmployees);

      // If user is searching and no match in this post, skip post
      if (currentFilter.search && filteredEmployees.length === 0 && !post.name.toLowerCase().includes(currentFilter.search.toLowerCase())) {
        return;
      }

      const postCard = document.createElement('div');
      postCard.className = 'posto-card';
      postCard.dataset.postoId = post.id;

      // Post Header
      const header = document.createElement('div');
      header.className = 'posto-header';
      header.innerHTML = `
        <div class="posto-header-main">
          <div class="posto-badges-line">
            ${post.code ? `<span class="posto-code-badge">#${post.code}</span>` : ''}
            <span class="posto-category-badge ${post.category === 'Portaria' ? 'portaria' : ''}">
              ${post.category || 'Vigilância'}
            </span>
          </div>
          <h2 class="posto-name">${post.shortName || post.name}</h2>
          ${post.address ? `
            <div class="posto-address" title="${post.address}">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${post.address}</span>
            </div>
          ` : ''}
        </div>
        <div class="posto-header-actions">
          <span class="posto-count-badge" title="Colaboradores neste posto">
            ${post.employees.length} efetivo
          </span>
          <button class="btn-icon-sm" title="Adicionar colaborador a este posto" onclick="window.QuadroApp.openAddColabToPost('${post.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="btn-icon-sm" title="Editar dados do posto" onclick="window.QuadroApp.openEditPostModal('${post.id}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        </div>
      `;
      postCard.appendChild(header);

      // Post Body
      const body = document.createElement('div');
      body.className = 'posto-body';

      const isGestao = post.id === 'posto-gestao-operacional' || post.code === '00001' || (post.category && post.category.toLowerCase().includes('gestão'));

      if (isGestao) {
        // Posto de Gestão não possui divisão de escala/equipe 1 e 2
        const wrapper = document.createElement('div');
        wrapper.className = 'posto-teams-wrapper gestao-teams-wrapper';

        // Separate into active and férias
        const feriasColabs = filteredEmployees.filter(e =>
          e.status === 'Férias' ||
          (e.equipe && e.equipe.toLowerCase().includes('férias')) ||
          (e.observacoes && e.observacoes.toUpperCase().includes('FÉRIAS'))
        );

        const gestaoColabs = filteredEmployees.filter(e => !feriasColabs.includes(e));

        // 1. Coluna de Gestão
        const gestaoCol = document.createElement('div');
        gestaoCol.className = 'team-column team-gestao';
        gestaoCol.innerHTML = `
          <div class="team-column-header">
            <span>EQUIPE DE GESTÃO</span>
            <span class="team-count">${gestaoColabs.length}</span>
          </div>
        `;
        const dropGestao = document.createElement('div');
        dropGestao.className = 'drop-zone';
        dropGestao.dataset.postoId = post.id;
        dropGestao.dataset.equipeTarget = 'Gestão';
        setupDropZoneEvents(dropGestao);

        if (gestaoColabs.length === 0) {
          dropGestao.innerHTML = `<div class="drop-zone-empty-hint">Nenhum gestor ativo. Arraste crachás para cá.</div>`;
        } else {
          // ── Classificar por função ──
          const isGerente = c => (c.funcao || '').toUpperCase().includes('GERENTE');
          const isCoordenador = c => (c.funcao || '').toUpperCase().includes('COORDENADOR');
          const isSupervisor = c => (c.funcao || '').toUpperCase().includes('SUPERVISOR');
          const isAssistente = c => {
            const f = (c.funcao || '').toUpperCase();
            return f.includes('ASSISTENTE') || f.includes('ADMINISTRATIVO');
          };

          const gerenteColabs = gestaoColabs.filter(c => isGerente(c));
          const coordColabs = gestaoColabs.filter(c => !isGerente(c) && isCoordenador(c));
          const supervisorColabs = gestaoColabs.filter(c => !isGerente(c) && !isCoordenador(c) && isSupervisor(c));
          const assistenteColabs = gestaoColabs.filter(c => !isGerente(c) && !isCoordenador(c) && !isSupervisor(c) && isAssistente(c));
          const outrosColabs = gestaoColabs.filter(c => !isGerente(c) && !isCoordenador(c) && !isSupervisor(c) && !isAssistente(c));

          // ── 1ª Linha: GERENTE — 1 crachá centralizado ──
          if (gerenteColabs.length > 0) {
            const gerenteRow = document.createElement('div');
            gerenteRow.className = 'gestao-row gestao-row-gerente';
            gerenteColabs.forEach(colab => {
              gerenteRow.appendChild(createCrachaElement(colab, post));
            });
            dropGestao.appendChild(gerenteRow);
          }

          // ── 2ª Linha: COORDENADOR — individual (1 crachá por coordenador) ──
          if (coordColabs.length > 0) {
            const coordRow = document.createElement('div');
            coordRow.className = 'gestao-row gestao-row-coord';
            coordColabs.forEach(colab => {
              coordRow.appendChild(createCrachaElement(colab, post));
            });
            dropGestao.appendChild(coordRow);
          }

          // ── 3ª Linha+: SUPERVISORES — 4 por linha ──
          if (supervisorColabs.length > 0) {
            const sepSup = document.createElement('div');
            sepSup.className = 'gestao-section-label';
            sepSup.textContent = '— Supervisores —';
            dropGestao.appendChild(sepSup);

            const supRow = document.createElement('div');
            supRow.className = 'gestao-row gestao-row-4col';
            supervisorColabs.forEach(colab => {
              supRow.appendChild(createCrachaElement(colab, post));
            });
            dropGestao.appendChild(supRow);
          }

          // ── 4ª Linha+: ASSISTENTES / ADMINISTRATIVOS — 4 por linha ──
          if (assistenteColabs.length > 0) {
            const sepAdm = document.createElement('div');
            sepAdm.className = 'gestao-section-label';
            sepAdm.textContent = '— Assistentes / Administrativos —';
            dropGestao.appendChild(sepAdm);

            const admRow = document.createElement('div');
            admRow.className = 'gestao-row gestao-row-4col';
            assistenteColabs.forEach(colab => {
              admRow.appendChild(createCrachaElement(colab, post));
            });
            dropGestao.appendChild(admRow);
          }

          // ── Outros cargos ──
          if (outrosColabs.length > 0) {
            const outrosRow = document.createElement('div');
            outrosRow.className = 'gestao-row gestao-row-4col';
            outrosColabs.forEach(colab => {
              outrosRow.appendChild(createCrachaElement(colab, post));
            });
            dropGestao.appendChild(outrosRow);
          }
        }
        gestaoCol.appendChild(dropGestao);
        wrapper.appendChild(gestaoCol);

        // 2. Coluna Férias no Mês
        const teamFeriasCol = document.createElement('div');
        teamFeriasCol.className = 'team-column team-ferias';
        teamFeriasCol.innerHTML = `
          <div class="team-column-header">
            <span>🌴 FÉRIAS NO MÊS</span>
            <span class="team-count" style="background:#d97706;color:#fff;">${feriasColabs.length}</span>
          </div>
        `;
        const dropFerias = document.createElement('div');
        dropFerias.className = 'drop-zone';
        dropFerias.dataset.postoId = post.id;
        dropFerias.dataset.equipeTarget = 'Férias';
        setupDropZoneEvents(dropFerias);

        if (feriasColabs.length === 0) {
          dropFerias.innerHTML = `<div class="drop-zone-empty-hint" style="font-size:11px;">Arraste aqui quem estiver de férias no mês</div>`;
        } else {
          feriasColabs.forEach(colab => {
            dropFerias.appendChild(createCrachaElement(colab, post));
          });
        }
        teamFeriasCol.appendChild(dropFerias);
        wrapper.appendChild(teamFeriasCol);

        body.appendChild(wrapper);
      } else if (currentViewMode === 'dual') {
        // Triple column: Equipe 1, Equipe 2 & Férias no Mês
        const wrapper = document.createElement('div');
        wrapper.className = 'posto-teams-wrapper';

        // Separate employees into Equipe 1, Equipe 2, and Férias
        const feriasColabs = filteredEmployees.filter(e =>
          e.status === 'Férias' ||
          (e.equipe && e.equipe.toLowerCase().includes('férias')) ||
          (e.observacoes && e.observacoes.toUpperCase().includes('FÉRIAS'))
        );

        const team1Colabs = filteredEmployees.filter(e =>
          !feriasColabs.includes(e) && e.equipe && e.equipe.includes('1')
        );

        const team2Colabs = filteredEmployees.filter(e =>
          !feriasColabs.includes(e) && (!e.equipe || e.equipe.includes('2'))
        );

        // 1. Team 1 Column
        const team1Col = document.createElement('div');
        team1Col.className = 'team-column team-1';
        team1Col.innerHTML = `
          <div class="team-column-header">
            <span>EQUIPE 1 (ÍMPARES)</span>
            <span class="team-count">${team1Colabs.length}</span>
          </div>
        `;
        const drop1 = document.createElement('div');
        drop1.className = 'drop-zone';
        drop1.dataset.postoId = post.id;
        drop1.dataset.equipeTarget = 'Equipe 1 (Ímpares)';
        setupDropZoneEvents(drop1);

        if (team1Colabs.length === 0) {
          drop1.innerHTML = `<div class="drop-zone-empty-hint">Arraste um crachá para cá</div>`;
        } else {
          team1Colabs.forEach(colab => {
            drop1.appendChild(createCrachaElement(colab, post));
          });
        }
        team1Col.appendChild(drop1);
        wrapper.appendChild(team1Col);

        // 2. Team 2 Column
        const team2Col = document.createElement('div');
        team2Col.className = 'team-column team-2';
        team2Col.innerHTML = `
          <div class="team-column-header">
            <span>EQUIPE 2 (PARES)</span>
            <span class="team-count">${team2Colabs.length}</span>
          </div>
        `;
        const drop2 = document.createElement('div');
        drop2.className = 'drop-zone';
        drop2.dataset.postoId = post.id;
        drop2.dataset.equipeTarget = 'Equipe 2 (Pares)';
        setupDropZoneEvents(drop2);

        if (team2Colabs.length === 0) {
          drop2.innerHTML = `<div class="drop-zone-empty-hint">Arraste um crachá para cá</div>`;
        } else {
          team2Colabs.forEach(colab => {
            drop2.appendChild(createCrachaElement(colab, post));
          });
        }
        team2Col.appendChild(drop2);
        wrapper.appendChild(team2Col);

        // 3. Férias no Mês Column
        const teamFeriasCol = document.createElement('div');
        teamFeriasCol.className = 'team-column team-ferias';
        teamFeriasCol.innerHTML = `
          <div class="team-column-header">
            <span>🌴 FÉRIAS NO MÊS</span>
            <span class="team-count" style="background:#d97706;color:#fff;">${feriasColabs.length}</span>
          </div>
        `;
        const dropFerias = document.createElement('div');
        dropFerias.className = 'drop-zone';
        dropFerias.dataset.postoId = post.id;
        dropFerias.dataset.equipeTarget = 'Férias';
        setupDropZoneEvents(dropFerias);

        if (feriasColabs.length === 0) {
          dropFerias.innerHTML = `<div class="drop-zone-empty-hint" style="font-size:11px;">Arraste aqui quem estiver de férias no mês</div>`;
        } else {
          feriasColabs.forEach(colab => {
            dropFerias.appendChild(createCrachaElement(colab, post));
          });
        }
        teamFeriasCol.appendChild(dropFerias);
        wrapper.appendChild(teamFeriasCol);

        body.appendChild(wrapper);
      } else {
        // Unified compact view
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.dataset.postoId = post.id;
        dropZone.dataset.equipeTarget = 'Equipe 1 (Ímpares)';
        setupDropZoneEvents(dropZone);

        if (filteredEmployees.length === 0) {
          dropZone.innerHTML = `<div class="drop-zone-empty-hint">Nenhum colaborador alocado neste posto. Arraste crachás aqui.</div>`;
        } else {
          filteredEmployees.forEach(colab => {
            dropZone.appendChild(createCrachaElement(colab, post));
          });
        }
        body.appendChild(dropZone);
      }

      postCard.appendChild(body);
      setupPostCardDropEvents(postCard, post);
      elements.postsGrid.appendChild(postCard);
    });
  }

  function renderReserve() {
    elements.reserveDropzone.innerHTML = '';
    const filteredReserves = state.reserve.filter(c => isColabMatchingFilter(c, null));

    if (filteredReserves.length === 0) {
      elements.reserveDropzone.innerHTML = `
        <div class="drop-zone-empty-hint" style="min-width: 300px;">
          Nenhum colaborador na reserva. Arraste crachás de qualquer posto para armazenar aqui.
        </div>
      `;
    } else {
      filteredReserves.forEach(colab => {
        colab.postoId = 'reserva';
        colab.equipe = 'Reserva';
        elements.reserveDropzone.appendChild(createCrachaElement(colab, null));
      });
    }

    setupDropZoneEvents(elements.reserveDropzone);
  }

  // ========================================================
  // CRACHÁ ELEMENT CREATION
  // ========================================================
  function createCrachaElement(colab, post) {
    const card = document.createElement('div');
    card.className = 'cracha-card';
    card.draggable = true;
    card.dataset.colabId = colab.id;
    card.dataset.postoId = colab.postoId || (post ? post.id : 'reserva');

    // Role css class
    let roleClass = 'default';
    const roleUpper = (colab.funcao || '').toUpperCase();
    if (roleUpper.includes('GERENTE')) roleClass = 'gerente';
    else if (roleUpper.includes('COORDENADOR') || roleUpper.includes('COORD')) roleClass = 'coordenador';
    else if (roleUpper.includes('SUPERVISOR') || roleUpper.includes('SUPERV')) roleClass = 'supervisor';
    else if (roleUpper.includes('ADMINISTRATIVO') || roleUpper.includes('ASSISTENTE') || roleUpper.includes('ADM')) roleClass = 'administrativo';
    else if (roleUpper.includes('LIDER')) roleClass = 'lider';
    else if (roleUpper.includes('VIGILANTE')) roleClass = 'vigilante';
    else if (roleUpper.includes('PORTEIRO') || roleUpper.includes('CONTROL')) roleClass = 'porteiro';
    else if (roleUpper.includes('FOLG') || roleUpper.includes('FER')) roleClass = 'folguista';

    // Status class
    const isFerias = colab.status === 'Férias' || (colab.observacoes && colab.observacoes.toUpperCase().includes('FÉRIAS'));
    let statusClass = 'ativo';
    if (isFerias) statusClass = 'ferias';
    else if (colab.status === 'Afastado') statusClass = 'afastado';
    else if (colab.postoId === 'reserva') statusClass = 'disponivel';

    // Equipe pill
    const isColabGestao = (post && (post.id === 'posto-gestao-operacional' || post.code === '00001' || (post.category && post.category.toLowerCase().includes('gestão')))) ||
      (colab.postoId === 'posto-gestao-operacional') ||
      (colab.equipe === 'Gestão');

    let equipePillClass = 'reserva';
    let equipeLabel = colab.equipe || 'Reserva';
    if (isColabGestao) {
      equipePillClass = 'gestao';
      equipeLabel = 'Gestão';
    } else if (colab.equipe && colab.equipe.includes('1')) {
      equipePillClass = 'equipe-1';
      equipeLabel = 'Equipe 1 (Ímpar)';
    } else if (colab.equipe && colab.equipe.includes('2')) {
      equipePillClass = 'equipe-2';
      equipeLabel = 'Equipe 2 (Par)';
    }

    // Photo HTML
    let photoHtml = '';
    if (colab.foto) {
      photoHtml = `<img class="cracha-photo-img" src="${colab.foto}" alt="${colab.nome}">`;
    } else {
      photoHtml = renderAvatarSvg(colab.nome);
    }

    const tenure = calculateTenure(colab.dataAdmissao);

    card.innerHTML = `
      <!-- Top Slot for Clip/Lanyard with Grupo GPS Brand -->
      <div class="cracha-slot-holder">
        <div class="cracha-gps-brand">
          <img src="logo-gps.png" class="mini-gps-logo" alt="GPS">
          <span>GRUPO GPS</span>
        </div>
        <div class="cracha-slot" title="Clip para cordão"></div>
      </div>

      <!-- Top Header Strip -->
      <div class="cracha-badge-strip">
        <span class="cracha-equipe-pill ${equipePillClass}">${equipeLabel}</span>
        <span class="cracha-drag-handle" title="Clique e arraste para mudar de posto">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </span>
      </div>

      <!-- Main Content: Photo + Identification -->
      <div class="cracha-content">
        <div class="cracha-photo-wrapper" title="Clique para alterar foto" onclick="window.QuadroApp.triggerPhotoUpload('${colab.id}')">
          ${photoHtml}
          <div class="cracha-photo-hover-btn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Foto</span>
          </div>
          <span class="cracha-status-dot ${statusClass}" title="Status: ${colab.status || 'Ativo'}"></span>
        </div>

        <div class="cracha-info">
          ${colab.matricula ? `<div class="cracha-matricula">MAT: ${colab.matricula}</div>` : ''}
          <h4 class="cracha-nome" title="${colab.nome}">${colab.nome}</h4>
          <span class="cracha-funcao-tag ${roleClass}">${colab.funcao || 'VIGILANTE'}</span>
        </div>
      </div>

      <!-- Details: Admission & Schedule -->
      <div class="cracha-details">
        <div class="cracha-detail-item">
          <span class="label">Admissão:</span>
          <span class="val">
            ${colab.dataAdmissao || 'Não inf.'}
            ${tenure ? `<span class="cracha-tenure-badge">${tenure}</span>` : ''}
          </span>
        </div>
        <div class="cracha-detail-item">
          <span class="label">Escala:</span>
          <span class="val">${formatShortEscala(colab.escala)}</span>
        </div>
        ${isFerias ? `
          <div class="cracha-vacation-badge">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            EM FÉRIAS
          </div>
        ` : ''}
      </div>

      <!-- Actions Toolbar on Badge -->
      <div class="cracha-actions">
        <button class="cracha-action-btn edit" title="Editar dados completos" onclick="window.QuadroApp.openEditColabModal('${colab.id}')">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Editar
        </button>

        ${isFerias ? `
          <button class="cracha-action-btn" style="color:#60a5fa;" title="Retornar para a escala ativa" onclick="window.QuadroApp.toggleColabFerias('${colab.id}')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            Voltar
          </button>
        ` : (colab.postoId !== 'reserva' && post ? `
          <button class="cracha-action-btn" style="color:#fbbf24;" title="Colocar em Férias no Mês" onclick="window.QuadroApp.toggleColabFerias('${colab.id}')">
            🌴 Férias
          </button>
        ` : '')}

        ${(colab.postoId !== 'reserva' && post) ? `
          <button class="cracha-action-btn reserve" title="Mover para banco de reserva" onclick="window.QuadroApp.moveToReserve('${colab.id}')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Reserva
          </button>
        ` : `
          <button class="cracha-action-btn allocate" style="color:#38bdf8; font-weight:700;" title="Alocar este colaborador em um posto de trabalho" onclick="window.QuadroApp.openAllocateModal('${colab.id}')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="7" y1="17" x2="17" y2="7"/>
              <polyline points="7 7 17 7 17 17"/>
            </svg>
            Alocar
          </button>
        `}

        <button class="cracha-action-btn delete" title="Excluir este crachá" onclick="event.stopPropagation(); window.QuadroApp.deleteColab('${colab.id}')">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          Excluir
        </button>
      </div>
    `;

    // Attach Drag Events
    setupCardDragEvents(card, colab);

    return card;
  }

  function formatShortEscala(escala) {
    if (!escala) return '12x36';
    let s = escala.replace(/ESCALA\s*/gi, '').trim();
    if (s.includes('19:00 ÀS 07:00')) return '12x36 (19h-07h)';
    if (s.includes('07:00 ÀS 19:00')) return '12x36 (07h-19h)';
    if (s.length > 20) return s.substring(0, 18) + '...';
    return s;
  }

  // ========================================================
  // DRAG AND DROP ENGINE
  // ========================================================
  function setupCardDragEvents(card, colab) {
    card.addEventListener('dragstart', (e) => {
      pauseAutoScroll('drag');
      const inReserve = card.closest('#reserve-drawer') !== null || card.closest('#reserve-dropzone') !== null || colab.postoId === 'reserva';
      draggedItem = {
        colabId: colab.id,
        sourcePostId: inReserve ? 'reserva' : (colab.postoId || 'reserva'),
        sourceEquipe: colab.equipe
      };
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', colab.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.drop-zone').forEach(dz => dz.classList.remove('drag-over'));
      document.querySelectorAll('.posto-card').forEach(pc => pc.classList.remove('drag-over-post'));
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      draggedItem = null;
    });
  }

  function setupDropZoneEvents(dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dropZone.classList.add('drag-over');

      // Visual placeholder insertion
      const afterElement = getDragAfterElement(dropZone, e.clientY);
      let placeholder = dropZone.querySelector('.drop-placeholder');
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'drop-placeholder';
      }
      if (afterElement == null) {
        dropZone.appendChild(placeholder);
      } else {
        dropZone.insertBefore(placeholder, afterElement);
      }
    });

    dropZone.addEventListener('dragleave', (e) => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
        const placeholder = dropZone.querySelector('.drop-placeholder');
        if (placeholder) placeholder.remove();
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      const placeholder = dropZone.querySelector('.drop-placeholder');
      if (placeholder) placeholder.remove();

      const colabId = (draggedItem && draggedItem.colabId) || e.dataTransfer.getData('text/plain');
      if (!colabId) return;

      const sourcePostId = draggedItem ? draggedItem.sourcePostId : 'reserva';
      const targetPostId = dropZone.dataset.postoId;
      const targetEquipe = dropZone.dataset.equipeTarget;

      handleCardDrop(colabId, sourcePostId, targetPostId, targetEquipe);
    });
  }

  function setupPostCardDropEvents(postCard, post) {
    postCard.addEventListener('dragover', (e) => {
      if (!draggedItem) return;
      if (e.target.closest('.drop-zone')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      postCard.classList.add('drag-over-post');
    });

    postCard.addEventListener('dragleave', (e) => {
      if (!postCard.contains(e.relatedTarget)) {
        postCard.classList.remove('drag-over-post');
      }
    });

    postCard.addEventListener('drop', (e) => {
      if (!draggedItem) return;
      if (e.target.closest('.drop-zone')) return;
      e.preventDefault();
      e.stopPropagation();
      postCard.classList.remove('drag-over-post');

      const colabId = (draggedItem && draggedItem.colabId) || e.dataTransfer.getData('text/plain');
      if (!colabId) return;

      const isGestao = post.id === 'posto-gestao-operacional' || post.code === '00001' || (post.category && post.category.toLowerCase().includes('gestão'));
      const targetEquipe = isGestao ? 'Gestão' : 'Equipe 1 (Ímpares)';
      handleCardDrop(colabId, draggedItem.sourcePostId || 'reserva', post.id, targetEquipe);
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.cracha-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Smooth viewport scrolling during dragging near window borders
  window.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    const y = e.clientY;
    const topThreshold = 90;
    const bottomThreshold = 140;
    const scrollSpeed = 18;

    if (y < topThreshold) {
      window.scrollBy(0, -scrollSpeed);
    } else if (y > window.innerHeight - bottomThreshold) {
      window.scrollBy(0, scrollSpeed);
    }
  });

  async function handleCardDrop(colabId, sourcePostId, targetPostId, targetEquipe) {
    if (!colabId || !targetPostId) return;

    // Robust lookup: search reserve first, then all posts
    let colab = null;

    const resIdx = state.reserve.findIndex(c => c.id === colabId);
    if (resIdx !== -1) {
      colab = state.reserve.splice(resIdx, 1)[0];
    } else {
      for (const p of state.posts) {
        const idx = (p.employees || []).findIndex(c => c.id === colabId);
        if (idx !== -1) {
          colab = p.employees.splice(idx, 1)[0];
          break;
        }
      }
    }

    if (!colab) {
      console.warn('Colaborador não encontrado para movimentação:', colabId);
      return;
    }

    let newStatus = colab.status;
    let newEquipe = targetEquipe || colab.equipe;
    let equipeOrigem = colab.equipeOrigem;

    if (targetPostId === 'reserva') {
      newStatus = colab.status === 'Férias' ? 'Férias' : 'Disponível';
      newEquipe = 'Reserva';
      colab.postoId = 'reserva';
      colab.equipe = newEquipe;
      colab.status = newStatus;
      state.reserve.push(colab);
      showToast(`${colab.nome} movido para a Reserva.`);
    } else {
      const targetPost = state.posts.find(p => p.id === targetPostId);
      if (targetPost) {
        if (targetEquipe === 'Férias') {
          newStatus = 'Férias';
          equipeOrigem = colab.equipeOrigem || colab.equipe;
          newEquipe = 'Férias';
          showToast(`🌴 ${colab.nome} colocado em FÉRIAS.`);
        } else {
          if (colab.status === 'Disponível') newStatus = 'Ativo';
          equipeOrigem = null;
          const isTargetGestao = targetPost.id === 'posto-gestao-operacional' || targetPost.code === '00001' || (targetPost.category && targetPost.category.toLowerCase().includes('gestão'));
          if (isTargetGestao) {
            newEquipe = 'Gestão';
          }
          showToast(`${colab.nome} → ${targetPost.shortName || targetPost.name}`);
        }
        colab.postoId = targetPost.id;
        colab.equipe = newEquipe;
        colab.status = newStatus;
        colab.equipeOrigem = equipeOrigem;
        targetPost.employees.push(colab);
      }
    }

    saveState(true);
    renderAll();

    // Persist to DB via API se disponível
    if (!isOfflineMode) {
      try {
        await apiPost(`/colaboradores/${colabId}/mover`, {
          postoId: targetPostId,
          equipe: newEquipe,
          status: newStatus,
          equipeOrigem: equipeOrigem || null
        });
      } catch (e) {
        console.warn('API local indisponível, salvo no navegador.');
      }
    }
  }

  // ========================================================
  // MODALS & FORMS
  // ========================================================
  let currentEditingColab = null;
  let currentEditingPhotoData = '';

  function openEditColabModal(colabId) {
    // Find colab
    let found = null;
    let foundPostId = 'reserva';

    for (const post of state.posts) {
      const c = post.employees.find(e => e.id === colabId);
      if (c) {
        found = c;
        foundPostId = post.id;
        break;
      }
    }
    if (!found) {
      found = state.reserve.find(e => e.id === colabId);
      foundPostId = 'reserva';
    }

    if (!found) return;

    pauseAutoScroll('modal');
    currentEditingColab = found;
    currentEditingPhotoData = found.foto || '';

    elements.modalColabTitle.textContent = 'Editar Crachá do Colaborador';
    elements.colabId.value = found.id;
    elements.colabCurrentPostoId.value = foundPostId;
    elements.colabNome.value = found.nome || '';
    elements.colabMatricula.value = found.matricula || '';
    elements.colabFuncao.value = found.funcao || 'VIGILANTE';
    elements.colabDataAdmissao.value = found.dataAdmissao || '';
    const isGest = foundPostId === 'posto-gestao-operacional' || found.equipe === 'Gestão';
    elements.colabEscala.value = found.escala || (isGest ? 'COMERCIAL / ADM (08:00 ÀS 18:00)' : 'ESCALA 12X36 - 19:00 ÀS 07:00');
    elements.colabEquipe.value = found.equipe || (isGest ? 'Gestão' : 'Equipe 1 (Ímpares)');
    elements.colabStatus.value = found.status || 'Ativo';
    elements.colabPostoSelect.value = foundPostId;
    elements.colabObs.value = found.observacoes || '';

    updateModalPhotoPreview(currentEditingPhotoData, found.nome);
    elements.btnDeleteColab.style.display = 'inline-flex';
    elements.modalColabOverlay.classList.add('active');
  }

  function openNewColabModal(targetPostId = null) {
    pauseAutoScroll('modal');
    currentEditingColab = null;
    currentEditingPhotoData = '';

    const isGest = targetPostId === 'posto-gestao-operacional';
    elements.modalColabTitle.textContent = 'Cadastrar Novo Crachá';
    elements.colabId.value = '';
    elements.colabCurrentPostoId.value = targetPostId || 'reserva';
    elements.colabNome.value = '';
    elements.colabMatricula.value = '';
    elements.colabFuncao.value = isGest ? 'SUPERVISOR OPERACIONAL' : 'VIGILANTE';
    elements.colabDataAdmissao.value = getTodayFormatted();
    elements.colabEscala.value = isGest ? 'COMERCIAL / ADM (08:00 ÀS 18:00)' : 'ESCALA 12X36 - 19:00 ÀS 07:00';
    elements.colabEquipe.value = isGest ? 'Gestão' : 'Equipe 1 (Ímpares)';
    elements.colabStatus.value = 'Ativo';
    elements.colabPostoSelect.value = targetPostId || 'reserva';
    elements.colabObs.value = '';

    updateModalPhotoPreview('', 'NOVO');
    elements.btnDeleteColab.style.display = 'none';
    elements.modalColabOverlay.classList.add('active');
  }

  function getTodayFormatted() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  }

  function updateModalPhotoPreview(photoUrl, name) {
    if (photoUrl) {
      elements.modalPhotoImg.src = photoUrl;
      elements.modalPhotoImg.style.display = 'block';
      elements.modalPhotoPlaceholder.style.display = 'none';
      elements.btnRemovePhoto.style.display = 'inline-flex';
    } else {
      elements.modalPhotoImg.src = '';
      elements.modalPhotoImg.style.display = 'none';
      elements.modalPhotoPlaceholder.style.display = 'flex';
      elements.btnRemovePhoto.style.display = 'none';
    }
  }

  function closeColabModal() {
    elements.modalColabOverlay.classList.remove('active');
    currentEditingColab = null;
    currentEditingPhotoData = '';
  }

  // ========================================================
  // ALLOCATION MODAL (BANCO DE RESERVA -> POSTO)
  // ========================================================
  let currentAllocatingColab = null;

  function openAllocateModal(colabId) {
    let found = state.reserve.find(c => c.id === colabId);
    if (!found) {
      for (const p of state.posts) {
        found = p.employees.find(e => e.id === colabId);
        if (found) break;
      }
    }
    if (!found) return;

    pauseAutoScroll('modal');
    currentAllocatingColab = found;

    elements.allocateColabId.value = found.id;
    elements.allocateColabName.textContent = found.nome;
    elements.allocateColabMatricula.textContent = found.matricula ? `MAT: ${found.matricula}` : 'SEM MATRÍCULA';
    elements.allocateColabFuncao.textContent = found.funcao || 'VIGILANTE';

    if (found.foto) {
      elements.allocateAvatarPreview.innerHTML = `<img src="${found.foto}" alt="${found.nome}">`;
    } else {
      elements.allocateAvatarPreview.innerHTML = renderAvatarSvg(found.nome);
    }

    elements.allocatePostoSelect.innerHTML = '';
    state.posts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const codePart = p.code ? `[${p.code}] ` : '';
      opt.textContent = `${codePart}${p.shortName || p.name}`;
      elements.allocatePostoSelect.appendChild(opt);
    });

    elements.allocateEquipeSelect.value = 'Equipe 1 (Ímpares)';
    elements.modalAllocateOverlay.classList.add('active');
  }

  function closeAllocateModal() {
    elements.modalAllocateOverlay.classList.remove('active');
    currentAllocatingColab = null;
  }

  // Handle Photo Compression & Upload
  function handlePhotoUpload(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress to badge size (240 x 300 max)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 240;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function triggerDirectPhotoUpload(colabId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handlePhotoUpload(file, async (compressed) => {
          // Update colab photo
          for (const post of state.posts) {
            const c = post.employees.find(x => x.id === colabId);
            if (c) {
              c.foto = compressed;
              saveState(true);
              renderAll();
              showToast(`Foto de ${c.nome} atualizada.`);
              try {
                await apiPost(`/colaboradores/${colabId}/foto`, { foto: compressed });
              } catch (err) {
                console.error('Erro ao salvar foto no banco:', err);
              }
              return;
            }
          }
          const resC = state.reserve.find(x => x.id === colabId);
          if (resC) {
            resC.foto = compressed;
            saveState(true);
            renderAll();
            showToast(`Foto de ${resC.nome} atualizada.`);
            try {
              await apiPost(`/colaboradores/${colabId}/foto`, { foto: compressed });
            } catch (err) {
              console.error('Erro ao salvar foto no banco:', err);
            }
          }
        });
      }
    };
    input.click();
  }

  // Save Colab Form
  elements.formColab.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = elements.colabId.value;
    const isNew = !id;
    const newId = id || 'emp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const targetPostId = elements.colabPostoSelect.value;

    const colabData = {
      id: newId,
      matricula: elements.colabMatricula.value.trim(),
      nome: elements.colabNome.value.trim().toUpperCase(),
      funcao: elements.colabFuncao.value.trim().toUpperCase(),
      dataAdmissao: elements.colabDataAdmissao.value.trim(),
      escala: elements.colabEscala.value.trim(),
      equipe: elements.colabEquipe.value,
      status: elements.colabStatus.value,
      observacoes: elements.colabObs.value.trim(),
      foto: currentEditingPhotoData,
      postoId: targetPostId
    };

    // Optimistic local update
    const currentPostId = elements.colabCurrentPostoId.value;
    if (currentPostId === 'reserva') {
      const idx = state.reserve.findIndex(c => c.id === newId);
      if (idx !== -1) state.reserve.splice(idx, 1);
    } else {
      const oldPost = state.posts.find(p => p.id === currentPostId);
      if (oldPost) {
        const idx = oldPost.employees.findIndex(c => c.id === newId);
        if (idx !== -1) oldPost.employees.splice(idx, 1);
      }
    }

    if (targetPostId === 'reserva') {
      colabData.postoId = 'reserva';
      state.reserve.push(colabData);
    } else {
      const newPost = state.posts.find(p => p.id === targetPostId);
      if (newPost) {
        colabData.postoId = newPost.id;
        newPost.employees.push(colabData);
      } else {
        colabData.postoId = 'reserva';
        state.reserve.push(colabData);
      }
    }

    closeColabModal();
    saveState(true);
    renderAll();
    showToast(`Crachá de ${colabData.nome} salvo!`);

    // Persist to DB se disponível
    if (!isOfflineMode) {
      try {
        if (isNew) {
          await apiPost('/colaboradores', {
            id: newId, matricula: colabData.matricula, nome: colabData.nome,
            funcao: colabData.funcao, dataAdmissao: colabData.dataAdmissao,
            escala: colabData.escala, equipe: colabData.equipe,
            status: colabData.status, observacoes: colabData.observacoes,
            foto: colabData.foto, postoId: colabData.postoId
          });
        } else {
          await apiPut(`/colaboradores/${newId}`, {
            matricula: colabData.matricula, nome: colabData.nome,
            funcao: colabData.funcao, dataAdmissao: colabData.dataAdmissao,
            escala: colabData.escala, equipe: colabData.equipe,
            status: colabData.status, observacoes: colabData.observacoes,
            foto: colabData.foto, postoId: colabData.postoId
          });
        }
      } catch (err) {
        console.warn('API local indisponível, salvo no navegador.');
      }
    }
  });

  // Delete Colab
  elements.btnDeleteColab.addEventListener('click', async () => {
    if (!currentEditingColab) return;
    await window.QuadroApp.deleteColab(currentEditingColab.id);
  });

  // Photo change in modal
  elements.inputColabPhoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePhotoUpload(file, (dataUrl) => {
        currentEditingPhotoData = dataUrl;
        updateModalPhotoPreview(dataUrl, elements.colabNome.value || 'FOTO');
      });
    }
  });

  elements.btnRemovePhoto.addEventListener('click', () => {
    currentEditingPhotoData = '';
    elements.inputColabPhoto.value = '';
    updateModalPhotoPreview('', elements.colabNome.value);
  });

  // ========================================================
  // POST MODAL
  // ========================================================
  let currentEditingPost = null;

  function openNewPostModal() {
    pauseAutoScroll('modal');
    currentEditingPost = null;
    elements.modalPostoTitle.textContent = 'Novo Posto de Trabalho';
    elements.postoId.value = '';
    elements.postoCodigo.value = '';
    elements.postoNome.value = '';
    elements.postoCategoria.value = 'Segurança / Vigilância';
    elements.postoEndereco.value = '';
    elements.btnDeletePosto.style.display = 'none';
    elements.modalPostoOverlay.classList.add('active');
  }

  function openEditPostModal(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    pauseAutoScroll('modal');
    currentEditingPost = post;
    elements.modalPostoTitle.textContent = 'Editar Posto de Trabalho';
    elements.postoId.value = post.id;
    elements.postoCodigo.value = post.code || '';
    elements.postoNome.value = post.name || '';
    elements.postoCategoria.value = post.category || 'Segurança / Vigilância';
    elements.postoEndereco.value = post.address || '';
    elements.btnDeletePosto.style.display = 'inline-flex';
    elements.modalPostoOverlay.classList.add('active');
  }

  function closePostModal() {
    elements.modalPostoOverlay.classList.remove('active');
    currentEditingPost = null;
  }

  elements.formPosto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = elements.postoId.value || 'posto-' + Date.now();
    const code = elements.postoCodigo.value.trim();
    const name = elements.postoNome.value.trim();
    const category = elements.postoCategoria.value;
    const address = elements.postoEndereco.value.trim();
    const shortName = name.replace(/^\d+\s*-\s*PR\s*-\s*(SEG|POR)\s*-\s*/i, '').trim();

    if (currentEditingPost) {
      currentEditingPost.code = code;
      currentEditingPost.name = name;
      currentEditingPost.shortName = shortName;
      currentEditingPost.category = category;
      currentEditingPost.address = address;
      showToast(`Posto ${currentEditingPost.shortName} atualizado.`);
      try {
        await apiPut(`/postos/${id}`, { code, name, shortName, category, address });
      } catch (err) { console.error(err.message); }
    } else {
      const newPost = { id, code, name, shortName, category, address, employees: [] };
      state.posts.unshift(newPost);
      showToast(`Posto ${newPost.shortName} criado!`);
      try {
        await apiPost('/postos', { id, code, name, shortName, category, address });
      } catch (err) { console.error(err.message); }
    }

    saveState(true);
    closePostModal();
    renderAll();
  });

  elements.btnDeletePosto.addEventListener('click', async () => {
    if (!currentEditingPost) return;
    if (confirm(`Excluir o posto "${currentEditingPost.name}"? Os crachás associados serão transferidos para o banco de reserva.`)) {
      currentEditingPost.employees.forEach(colab => {
        colab.postoId = 'reserva'; colab.equipe = 'Reserva'; colab.status = 'Disponível';
        state.reserve.push(colab);
      });
      const postoId = currentEditingPost.id;
      state.posts = state.posts.filter(p => p.id !== postoId);
      saveState(true);
      closePostModal();
      renderAll();
      showToast('Posto excluído e colaboradores movidos para a reserva.');
      try { await apiDelete(`/postos/${postoId}`); } catch (err) { console.error(err.message); }
    }
  });

  function populatePostSelectOptions() {
    elements.colabPostoSelect.innerHTML = `
      <option value="reserva">Banco de Reserva / Sem Posto</option>
    `;
    elements.printSelectPost.innerHTML = '';

    state.posts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.shortName || p.name;
      elements.colabPostoSelect.appendChild(opt);

      const printOpt = document.createElement('option');
      printOpt.value = p.id;
      printOpt.textContent = p.shortName || p.name;
      elements.printSelectPost.appendChild(printOpt);
    });
  }

  // ========================================================
  // PRINT PREVIEW & SHEET GENERATOR
  // ========================================================
  function openPrintModal() {
    pauseAutoScroll('modal');
    renderPrintSheets();
    elements.modalPrintOverlay.classList.add('active');
  }

  function renderPrintSheets() {
    elements.printSheetArea.innerHTML = '';
    const scope = elements.printSelectScope.value;
    let colabsToPrint = [];

    if (scope === 'all') {
      state.posts.forEach(p => colabsToPrint.push(...p.employees));
      colabsToPrint.push(...state.reserve);
    } else if (scope === 'reserva') {
      colabsToPrint = [...state.reserve];
    } else if (scope === 'selected-post') {
      const postId = elements.printSelectPost.value;
      const p = state.posts.find(x => x.id === postId);
      if (p) colabsToPrint = [...p.employees];
    }

    if (colabsToPrint.length === 0) {
      elements.printSheetArea.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:20px;">Nenhum crachá para exibir.</p>';
      return;
    }

    colabsToPrint.forEach(colab => {
      const post = state.posts.find(p => p.id === colab.postoId);
      elements.printSheetArea.appendChild(createCrachaElement(colab, post));
    });
  }

  elements.printSelectScope.addEventListener('change', () => {
    elements.printSelectPost.style.display = elements.printSelectScope.value === 'selected-post' ? 'inline-block' : 'none';
    renderPrintSheets();
  });
  elements.printSelectPost.addEventListener('change', renderPrintSheets);
  elements.btnTriggerPrint.addEventListener('click', () => {
    window.print();
  });
  elements.btnClosePrintModal.addEventListener('click', () => {
    elements.modalPrintOverlay.classList.remove('active');
  });

  // ========================================================
  // EXPORT / IMPORT BACKUP
  // ========================================================
  function exportToCsv() {
    let rows = [
      ['POSTO_CODIGO', 'POSTO_NOME', 'POSTO_CATEGORIA', 'ENDERECO', 'MATRICULA', 'NOME_COLABORADOR', 'FUNCAO', 'ESCALA', 'EQUIPE', 'DATA_ADMISSAO', 'STATUS', 'OBS']
    ];

    state.posts.forEach(p => {
      p.employees.forEach(e => {
        rows.push([
          p.code || '',
          p.name || '',
          p.category || '',
          p.address || '',
          e.matricula || '',
          e.nome || '',
          e.funcao || '',
          e.escala || '',
          e.equipe || '',
          e.dataAdmissao || '',
          e.status || '',
          e.observacoes || ''
        ]);
      });
    });

    state.reserve.forEach(e => {
      rows.push([
        '',
        'BANCO DE RESERVA',
        'Reserva',
        '',
        e.matricula || '',
        e.nome || '',
        e.funcao || '',
        e.escala || '',
        e.equipe || '',
        e.dataAdmissao || '',
        e.status || '',
        e.observacoes || ''
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.map(field => `"${(field || '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Quadro_Operacional_${getTodayFormatted().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Exportação para Excel/CSV concluída!');
  }

  function exportBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `backup_quadro_operacional_${getTodayFormatted().replace(/\//g, '-')}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Backup JSON baixado com sucesso!');
  }

  function importBackupJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.posts)) {
          state = parsed;
          saveState(true);
          renderAll();
          showToast('Backup restaurado com sucesso!');
        } else {
          alert('Arquivo JSON inválido. Estrutura de dados não reconhecida.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function resetToOriginalData() {
    if (confirm('Atenção: Deseja recarregar o quadro com os dados do banco de dados?')) {
      loadFromAPI();
      showToast('Dados sincronizados com o banco de dados.');
    }
  }

  // ========================================================
  // AUTO-SCROLL ENGINE (PLAY & PAUSE / MODO APRESENTAÇÃO)
  // ========================================================
  const autoScroll = {
    isPlaying: false,
    speed: 1.0,
    basePxPerSec: 48,
    animId: null,
    lastTime: null,
    fractionalPx: 0,
    isWaitingAtBottom: false,
    isRewinding: false,
    waitTimeoutId: null,
    userClosedHud: false
  };

  let lastPlayStartTime = 0;

  function getPageScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function getPageScrollHeight() {
    return Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.offsetHeight : 0,
      document.documentElement ? document.documentElement.offsetHeight : 0
    );
  }

  function getPageMaxScroll() {
    const total = getPageScrollHeight();
    const view = window.innerHeight || document.documentElement.clientHeight || 0;
    return Math.max(0, total - view);
  }

  function performScrollBy(deltaY) {
    window.scrollBy(0, deltaY);
    if (document.documentElement.scrollTop === 0 && document.body && document.body.scrollTop !== undefined && deltaY > 0) {
      document.body.scrollTop += deltaY;
    }
  }

  function performScrollToTop(smooth = true) {
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    if (document.body && document.body.scrollTop > 0) {
      document.body.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function updateAutoScrollUI() {
    const isRunning = autoScroll.isPlaying || autoScroll.isWaitingAtBottom || autoScroll.isRewinding;

    // Header / Controls Bar Button
    if (elements.btnToggleAutoscroll) {
      if (isRunning) {
        elements.btnToggleAutoscroll.classList.add('is-playing');
        elements.btnToggleAutoscroll.classList.remove('is-paused');
        if (elements.iconPlayMain) elements.iconPlayMain.style.display = 'none';
        if (elements.iconPauseMain) elements.iconPauseMain.style.display = 'block';
        if (elements.labelAutoscrollMain) elements.labelAutoscrollMain.textContent = 'Pausar';
        elements.btnToggleAutoscroll.setAttribute('title', 'Pausar movimentação do quadro (Espaço)');
      } else {
        elements.btnToggleAutoscroll.classList.remove('is-playing');
        elements.btnToggleAutoscroll.classList.add('is-paused');
        if (elements.iconPlayMain) elements.iconPlayMain.style.display = 'block';
        if (elements.iconPauseMain) elements.iconPauseMain.style.display = 'none';
        if (elements.labelAutoscrollMain) elements.labelAutoscrollMain.textContent = 'Play';
        elements.btnToggleAutoscroll.setAttribute('title', 'Mover quadro automaticamente (Espaço)');
      }
    }

    // Floating HUD
    if (elements.floatingHud) {
      if (isRunning) {
        if (!autoScroll.userClosedHud) {
          elements.floatingHud.style.display = 'flex';
          elements.floatingHud.classList.remove('hud-hidden');
        }
        if (elements.hudBtnToggle) {
          elements.hudBtnToggle.classList.add('is-playing');
          if (elements.hudIconPause) elements.hudIconPause.style.display = 'block';
          if (elements.hudIconPlay) elements.hudIconPlay.style.display = 'none';
          if (elements.hudBtnLabel) elements.hudBtnLabel.textContent = 'Pausar';
        }
      } else {
        if (elements.hudBtnToggle) {
          elements.hudBtnToggle.classList.remove('is-playing');
          if (elements.hudIconPause) elements.hudIconPause.style.display = 'none';
          if (elements.hudIconPlay) elements.hudIconPlay.style.display = 'block';
          if (elements.hudBtnLabel) elements.hudBtnLabel.textContent = 'Play';
        }
      }
    }
  }

  function showHudStatus(text, dotClass = 'active-green') {
    if (elements.hudStatusText) elements.hudStatusText.textContent = text;
    if (elements.hudStatusDot) {
      elements.hudStatusDot.className = 'hud-status-dot ' + dotClass;
    }
  }

  function startAutoScroll() {
    if (autoScroll.isPlaying) return;
    autoScroll.isPlaying = true;
    autoScroll.lastTime = null;
    autoScroll.fractionalPx = 0;
    autoScroll.isWaitingAtBottom = false;
    autoScroll.isRewinding = false;
    autoScroll.userClosedHud = false;
    lastPlayStartTime = Date.now();

    updateAutoScrollUI();

    const maxScroll = getPageMaxScroll();
    const currentY = getPageScrollTop();
    if (maxScroll > 50 && currentY >= maxScroll - 15) {
      showHudStatus('Retornando ao topo para iniciar...', 'rewind-blue');
      performScrollToTop(true);
      setTimeout(() => {
        if (autoScroll.isPlaying) {
          showHudStatus('Quadro em movimento • [Espaço] para pausar', 'active-green');
          autoScroll.animId = requestAnimationFrame(autoScrollLoop);
        }
      }, 1200);
      return;
    }

    showHudStatus('Quadro em movimento • [Espaço] para pausar', 'active-green');
    autoScroll.animId = requestAnimationFrame(autoScrollLoop);
  }

  function pauseAutoScroll(reason = '') {
    if (!autoScroll.isPlaying && !autoScroll.isWaitingAtBottom && !autoScroll.isRewinding) return;

    autoScroll.isPlaying = false;
    autoScroll.isWaitingAtBottom = false;
    autoScroll.isRewinding = false;

    if (autoScroll.waitTimeoutId) {
      clearTimeout(autoScroll.waitTimeoutId);
      autoScroll.waitTimeoutId = null;
    }
    if (autoScroll.animId) {
      cancelAnimationFrame(autoScroll.animId);
      autoScroll.animId = null;
    }

    updateAutoScrollUI();

    let msg = 'Quadro pausado • [Espaço] para continuar';
    if (reason === 'wheel') {
      msg = 'Pausado por rolagem manual • [Espaço] para continuar';
    } else if (reason === 'touch') {
      msg = 'Pausado por toque na tela • [Espaço] para continuar';
    } else if (reason === 'drag') {
      msg = 'Pausado para movimentar crachá';
    } else if (reason === 'modal') {
      msg = 'Pausado para edição';
    }
    showHudStatus(msg, 'paused-yellow');
  }

  function toggleAutoScroll() {
    if (autoScroll.isPlaying || autoScroll.isWaitingAtBottom || autoScroll.isRewinding) {
      pauseAutoScroll('user');
    } else {
      startAutoScroll();
    }
  }

  function autoScrollLoop(timestamp) {
    if (!autoScroll.isPlaying) return;

    if (autoScroll.lastTime === null) {
      autoScroll.lastTime = timestamp;
    }

    let dt = (timestamp - autoScroll.lastTime) / 1000;
    autoScroll.lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    const maxScroll = getPageMaxScroll();

    if (maxScroll <= 20) {
      showHudStatus('Todo o quadro está visível na tela', 'paused-yellow');
      pauseAutoScroll();
      return;
    }

    const currentY = getPageScrollTop();
    if (currentY >= maxScroll - 6) {
      handleBottomReached();
      return;
    }

    const pxToMove = autoScroll.basePxPerSec * autoScroll.speed * dt;
    autoScroll.fractionalPx += pxToMove;

    if (autoScroll.fractionalPx >= 1) {
      const moveInt = Math.floor(autoScroll.fractionalPx);
      autoScroll.fractionalPx -= moveInt;
      performScrollBy(moveInt);
    }

    autoScroll.animId = requestAnimationFrame(autoScrollLoop);
  }

  function handleBottomReached() {
    autoScroll.isWaitingAtBottom = true;
    if (autoScroll.animId) {
      cancelAnimationFrame(autoScroll.animId);
      autoScroll.animId = null;
    }

    showHudStatus('Fim do quadro alcançado. Reiniciando em 4s...', 'paused-yellow');

    autoScroll.waitTimeoutId = setTimeout(() => {
      if (!autoScroll.isPlaying) return;

      autoScroll.isRewinding = true;
      showHudStatus('Retornando ao início do quadro...', 'rewind-blue');

      performScrollToTop(true);

      autoScroll.waitTimeoutId = setTimeout(() => {
        if (!autoScroll.isPlaying) return;
        autoScroll.isRewinding = false;
        autoScroll.isWaitingAtBottom = false;
        autoScroll.lastTime = null;
        autoScroll.fractionalPx = 0;
        showHudStatus('Quadro em movimento • [Espaço] para pausar', 'active-green');
        autoScroll.animId = requestAnimationFrame(autoScrollLoop);
      }, 1800);

    }, 4000);
  }

  // ========================================================
  // EVENT LISTENERS & SHORTCUTS
  // ========================================================
  function setupEventListeners() {
    // Search
    let searchDebounce = null;
    elements.inputSearch.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentFilter.search = e.target.value.trim();
        elements.btnSearchClear.style.display = currentFilter.search ? 'block' : 'none';
        renderBoard();
        renderReserve();
      }, 150);
    });

    elements.btnSearchClear.addEventListener('click', () => {
      elements.inputSearch.value = '';
      currentFilter.search = '';
      elements.btnSearchClear.style.display = 'none';
      renderBoard();
      renderReserve();
    });

    // Filters
    elements.filterEquipe.addEventListener('change', (e) => {
      currentFilter.equipe = e.target.value;
      renderBoard();
      renderReserve();
    });
    elements.filterFuncao.addEventListener('change', (e) => {
      currentFilter.funcao = e.target.value;
      renderBoard();
      renderReserve();
    });
    elements.filterStatus.addEventListener('change', (e) => {
      currentFilter.status = e.target.value;
      renderBoard();
      renderReserve();
    });

    // View toggles
    elements.viewModeDual.addEventListener('click', () => {
      currentViewMode = 'dual';
      elements.viewModeDual.classList.add('active');
      elements.viewModeCompact.classList.remove('active');
      renderBoard();
    });
    elements.viewModeCompact.addEventListener('click', () => {
      currentViewMode = 'compact';
      elements.viewModeCompact.classList.add('active');
      elements.viewModeDual.classList.remove('active');
      renderBoard();
    });

    // Card Zoom Slider & Buttons
    const applyZoom = (val) => {
      const baseWidth = 250;
      const newWidth = Math.round(baseWidth * (val / 100));
      document.documentElement.style.setProperty('--badge-width', `${newWidth}px`);
      document.documentElement.style.setProperty('--card-scale', val / 100);
    };

    if (elements.zoomRange) {
      elements.zoomRange.addEventListener('input', (e) => {
        applyZoom(e.target.value);
      });
    }

    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomIn = document.getElementById('btn-zoom-in');

    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        if (!elements.zoomRange) return;
        let cur = parseInt(elements.zoomRange.value, 10);
        cur = Math.max(70, cur - 10);
        elements.zoomRange.value = cur;
        applyZoom(cur);
      });
    }

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        if (!elements.zoomRange) return;
        let cur = parseInt(elements.zoomRange.value, 10);
        cur = Math.min(130, cur + 10);
        elements.zoomRange.value = cur;
        applyZoom(cur);
      });
    }

    // Top action buttons
    elements.btnAddColab.addEventListener('click', () => openNewColabModal());
    elements.btnAddPosto.addEventListener('click', openNewPostModal);
    elements.btnUndo.addEventListener('click', undoLastAction);
    elements.btnToggleTheme.addEventListener('click', toggleTheme);

    // Auto-Scroll Play / Pause controls
    if (elements.btnToggleAutoscroll) {
      elements.btnToggleAutoscroll.addEventListener('click', toggleAutoScroll);
    }
    if (elements.hudBtnToggle) {
      elements.hudBtnToggle.addEventListener('click', toggleAutoScroll);
    }
    if (elements.selectAutoscrollSpeed) {
      elements.selectAutoscrollSpeed.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        autoScroll.speed = val;
        if (elements.hudSpeedSelect) elements.hudSpeedSelect.value = e.target.value;
      });
    }
    if (elements.hudSpeedSelect) {
      elements.hudSpeedSelect.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        autoScroll.speed = val;
        if (elements.selectAutoscrollSpeed) elements.selectAutoscrollSpeed.value = e.target.value;
      });
    }
    if (elements.hudBtnTop) {
      elements.hudBtnTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showHudStatus('Retornando ao topo...', 'rewind-blue');
        if (autoScroll.isPlaying) {
          setTimeout(() => {
            showHudStatus('Quadro em movimento • [Espaço] para pausar', 'active-green');
          }, 1200);
        }
      });
    }
    if (elements.hudBtnClose) {
      elements.hudBtnClose.addEventListener('click', () => {
        autoScroll.userClosedHud = true;
        elements.floatingHud.classList.add('hud-hidden');
        setTimeout(() => {
          elements.floatingHud.style.display = 'none';
        }, 300);
      });
    }

    // Pause on manual wheel interaction
    window.addEventListener('wheel', (e) => {
      if (Date.now() - lastPlayStartTime < 600) return;
      if (Math.abs(e.deltaY) < 4) return;
      if (autoScroll.isPlaying && !autoScroll.isRewinding) {
        pauseAutoScroll('wheel');
      }
    }, { passive: true });

    // Pause on touch gesture on mobile/tablet
    window.addEventListener('touchstart', (e) => {
      if (Date.now() - lastPlayStartTime < 600) return;
      if (autoScroll.isPlaying && !e.target.closest('#floating-hud') && !e.target.closest('#btn-toggle-autoscroll')) {
        pauseAutoScroll('touch');
      }
    }, { passive: true });

    // Reserve drawer collapse toggle
    const toggleReserve = () => elements.reserveDrawer.classList.toggle('collapsed');
    elements.reserveHeader.addEventListener('click', toggleReserve);
    elements.btnToggleReserve.addEventListener('click', toggleReserve);
    elements.btnCollapseReserve.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleReserve();
    });
    elements.btnAddReserveColab.addEventListener('click', (e) => {
      e.stopPropagation();
      openNewColabModal('reserva');
    });

    // Dropdown options
    elements.btnMoreOptions.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.dropdownMenuActions.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      elements.dropdownMenuActions.classList.remove('show');
    });

    // Dropdown Actions
    elements.btnPrintCrachas.addEventListener('click', openPrintModal);
    elements.btnExportExcel.addEventListener('click', exportToCsv);
    elements.btnExportBackup.addEventListener('click', exportBackupJson);
    elements.fileImportBackup.addEventListener('change', (e) => importBackupJson(e.target.files[0]));
    elements.btnResetData.addEventListener('click', resetToOriginalData);

    // Modal Close buttons
    elements.btnCloseColabModal.addEventListener('click', closeColabModal);
    elements.btnCancelColab.addEventListener('click', closeColabModal);
    elements.btnClosePostoModal.addEventListener('click', closePostModal);
    elements.btnCancelPosto.addEventListener('click', closePostModal);
    elements.btnCloseAllocateModal.addEventListener('click', closeAllocateModal);
    elements.btnCancelAllocate.addEventListener('click', closeAllocateModal);

    elements.formAllocate.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentAllocatingColab) return;
      const targetPostId = elements.allocatePostoSelect.value;
      const targetEquipe = elements.allocateEquipeSelect.value;
      const colabId = currentAllocatingColab.id;

      closeAllocateModal();
      handleCardDrop(colabId, 'reserva', targetPostId, targetEquipe);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl + Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (!elements.modalColabOverlay.classList.contains('active') && !elements.modalPostoOverlay.classList.contains('active') && !elements.modalAllocateOverlay.classList.contains('active')) {
          e.preventDefault();
          undoLastAction();
        }
      }
      // Esc to close modals
      if (e.key === 'Escape') {
        closeColabModal();
        closePostModal();
        closeAllocateModal();
        elements.modalPrintOverlay.classList.remove('active');
        elements.dropdownMenuActions.classList.remove('show');
      }
      // Slash or Ctrl+F to focus search
      if (e.key === '/' && document.activeElement !== elements.inputSearch) {
        e.preventDefault();
        elements.inputSearch.focus();
      }

      // Space or 'P' to toggle Auto-Scroll (Play / Pause)
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      const isModalOpen = (elements.modalColabOverlay?.classList.contains('active')) ||
        (elements.modalPostoOverlay?.classList.contains('active')) ||
        (elements.modalAllocateOverlay?.classList.contains('active')) ||
        (elements.modalPrintOverlay?.classList.contains('active'));

      if ((e.code === 'Space' || e.key === ' ' || e.key === 'p' || e.key === 'P') && !isTyping && !isModalOpen) {
        e.preventDefault();
        toggleAutoScroll();
      }
    });
  }

  // ========================================================
  // GLOBAL API EXPOSURE FOR INLINE EVENTS
  // ========================================================
  window.QuadroApp = {
    toggleAutoScroll,
    startAutoScroll,
    pauseAutoScroll,
    openEditColabModal,
    openAllocateModal,
    openAddColabToPost: (postId) => openNewColabModal(postId),
    openEditPostModal,
    triggerPhotoUpload: triggerDirectPhotoUpload,
    toggleColabFerias: async (colabId) => {
      for (const p of state.posts) {
        const colab = p.employees.find(e => e.id === colabId);
        if (colab) {
          const isFerias = colab.status === 'Férias' || (colab.equipe && colab.equipe.toLowerCase().includes('férias'));
          let targetEquipe = '';
          let targetStatus = '';
          let targetEquipeOrigem = null;

          const isPostGestao = (p.id === 'posto-gestao-operacional') || (p.code === '00001') || (p.category && p.category.toLowerCase().includes('gestão'));

          if (isFerias) {
            targetStatus = 'Ativo';
            targetEquipe = colab.equipeOrigem || (isPostGestao ? 'Gestão' : 'Equipe 1 (Ímpares)');
            delete colab.equipeOrigem;
            colab.status = targetStatus;
            colab.equipe = targetEquipe;
            showToast(`${colab.nome} retornou de férias para ${colab.equipe}.`);
          } else {
            targetEquipeOrigem = colab.equipe || (isPostGestao ? 'Gestão' : 'Equipe 1 (Ímpares)');
            targetStatus = 'Férias';
            targetEquipe = 'Férias';
            colab.equipeOrigem = targetEquipeOrigem;
            colab.status = targetStatus;
            colab.equipe = targetEquipe;
            showToast(`🌴 ${colab.nome} foi colocado em FÉRIAS no posto.`);
          }
          saveState(true);
          renderAll();

          if (!isOfflineMode) {
            try {
              await apiPost(`/colaboradores/${colabId}/mover`, {
                postoId: p.id,
                equipe: targetEquipe,
                status: targetStatus,
                equipeOrigem: targetEquipeOrigem
              });
            } catch (err) {
              console.warn('API local indisponível, salvo no navegador.');
            }
          }
          return;
        }
      }
    },
    moveToReserve: async (colabId) => {
      // Find and move directly
      for (const p of state.posts) {
        const idx = p.employees.findIndex(e => e.id === colabId);
        if (idx !== -1) {
          const colab = p.employees.splice(idx, 1)[0];
          colab.postoId = 'reserva';
          colab.equipe = 'Reserva';
          colab.status = colab.status === 'Férias' ? 'Férias' : 'Disponível';
          state.reserve.push(colab);
          saveState(true);
          renderAll();
          showToast(`${colab.nome} movido para o banco de reserva.`);

          if (!isOfflineMode) {
            try {
              await apiPost(`/colaboradores/${colabId}/mover`, {
                postoId: 'reserva',
                equipe: 'Reserva',
                status: colab.status
              });
            } catch (err) {
              console.warn('API local indisponível, salvo no navegador.');
            }
          }
          return;
        }
      }
    },
    deleteColab: async (colabId) => {
      let colab = null;
      for (const p of state.posts) {
        colab = p.employees.find(e => e.id === colabId);
        if (colab) break;
      }
      if (!colab) {
        colab = state.reserve.find(e => e.id === colabId);
      }
      const nome = colab ? colab.nome : 'este colaborador';
      if (!confirm(`Tem certeza que deseja excluir o crachá de ${nome}?`)) {
        return;
      }

      // Salva no histórico para permitir desfazer (Ctrl+Z)
      historyStack.push(JSON.stringify(state));
      if (historyStack.length > MAX_HISTORY) historyStack.shift();
      updateUndoButtonState();

      // Remove de todos os postos e do banco de reserva
      state.posts.forEach(p => {
        p.employees = p.employees.filter(e => e.id !== colabId);
      });
      state.reserve = state.reserve.filter(e => e.id !== colabId);

      // Fecha modal de edição se estivesse aberto
      if (currentEditingColab && currentEditingColab.id === colabId) {
        closeColabModal();
      }

      saveState(false);
      renderAll();
      showToast(`Crachá de ${nome} excluído com sucesso.`);

      if (!isOfflineMode) {
        try {
          await apiDelete(`/colaboradores/${colabId}`);
        } catch (err) {
          console.error('Erro ao excluir no banco:', err.message);
        }
      }
    }
  };

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

