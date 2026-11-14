/**
 * GRUPO GPS - MAPEAMENTO OPERACIONAL DE CLIENTES & CONTROLE DE VISITAS
 * Script Principal: Leaflet Maps, Filtros por Cidades, Baixa de Visitas em Tempo Real
 */

(function () {
  'use strict';

  // ========================================================
  // ESTADO DA APLICAÇÃO
  // ========================================================
  const state = {
    postos: [],
    filteredPostos: [],
    selectedPostoId: null,
    stats: null,
    cidadeFilter: 'TODAS',
    statusFilter: 'TODOS',
    searchQuery: '',
    sortBy: 'CRITICO_FIRST', // 'CRITICO_FIRST' ou 'NOME_ASC'
    showLabels: true, // Nomes dos clientes e ruas visíveis permanentemente no mapa
    drawerOpen: false,
    map: null,
    markersLayer: null,
    markerMap: {}, // postoId -> L.marker
    currentTileLayer: 'streets', // 'streets' (OpenStreetMap - ruas e cidades claras), 'voyager', 'dark'
    tileLayers: {}
  };

  // ========================================================
  // CORES E ÍCONES SVG PERSONALIZADOS PARA MARCADORES
  // ========================================================
  const PIN_COLORS = {
    EM_DIA: {
      fill: '#10b981',
      stroke: '#059669',
      symbol: '✓',
      label: 'Em Dia (≤15d)'
    },
    ATENCAO: {
      fill: '#f59e0b',
      stroke: '#d97706',
      symbol: '⏱',
      label: 'Atenção (16-30d)'
    },
    CRITICO: {
      fill: '#ef4444',
      stroke: '#dc2626',
      symbol: '!',
      label: 'Crítico / Sem Visita'
    }
  };

  function createCustomPinIcon(status) {
    const cfg = PIN_COLORS[status] || PIN_COLORS.CRITICO;
    const svgHtml = `
      <div class="pin-icon-wrap" title="${cfg.label}">
        <svg class="pin-svg" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16344 0 0 7.16344 0 16C0 26.5 16 40 16 40C16 40 32 26.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="${cfg.fill}" stroke="${cfg.stroke}" stroke-width="1.5"/>
          <circle cx="16" cy="15" r="9" fill="#0f172a" fill-opacity="0.85"/>
        </svg>
        <span class="pin-symbol">${cfg.symbol}</span>
      </div>
    `;

    return L.divIcon({
      className: 'custom-map-pin',
      html: svgHtml,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -38]
    });
  }

  // ========================================================
  // INICIALIZAÇÃO DO MAPA LEAFLET
  // ========================================================
  function initMap() {
    // Ponto focal inicial: Curitiba / Região Metropolitana
    const initialLat = -25.4384;
    const initialLng = -49.2733;

    state.map = L.map('map-container', {
      center: [initialLat, initialLng],
      zoom: 11,
      zoomControl: true
    });

    // 1. Camada de Ruas & Cidades Detalhada (OpenStreetMap Standard) - Mostra todos os nomes de ruas, avenidas e cidades
    state.tileLayers.streets = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }
    );

    // 2. Camada Voyager Clara (CartoDB Voyager)
    state.tileLayers.voyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }
    );

    // 3. Camada Dark (CartoDB Dark Matter)
    state.tileLayers.dark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }
    );

    // Inicia com OpenStreetMap Standard com todas as ruas e nomes de cidades nítidos
    state.tileLayers.streets.addTo(state.map);
    state.currentTileLayer = 'streets';
    state.markersLayer = L.layerGroup().addTo(state.map);
  }

  // Alternar entre camadas do mapa (Ruas -> Voyager -> Dark)
  function toggleMapTiles() {
    const order = ['streets', 'voyager', 'dark'];
    const labels = {
      streets: 'Mapa de Ruas (OSM)',
      voyager: 'Voyager Claro',
      dark: 'Modo Escuro'
    };

    const currentIdx = order.indexOf(state.currentTileLayer);
    const nextIdx = (currentIdx + 1) % order.length;
    const nextKey = order[nextIdx];

    state.map.removeLayer(state.tileLayers[state.currentTileLayer]);
    state.tileLayers[nextKey].addTo(state.map);
    state.currentTileLayer = nextKey;

    const btnText = document.getElementById('tile-layer-name');
    if (btnText) btnText.textContent = labels[nextKey];
  }

  // ========================================================
  // CARREGAMENTO DE DADOS DA API
  // ========================================================
  async function loadData() {
    try {
      showLoading(true);
      const [statsRes, postosRes] = await Promise.all([
        fetch('/api/visitas/stats'),
        fetch('/api/visitas/postos')
      ]);

      if (!statsRes.ok || !postosRes.ok) {
        throw new Error('Falha ao carregar dados do servidor');
      }

      state.stats = await statsRes.json();
      state.postos = await postosRes.json();

      updateStatsUI();
      populateCidadesFilter();
      applyFilters();
      renderMapMarkers();
      fitMapToMarkers();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showToast('Erro ao carregar postos e visitas: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  function showLoading(isLoading) {
    const infoText = document.getElementById('results-count-text');
    if (isLoading && infoText) {
      infoText.textContent = 'Carregando postos e geolocalização...';
    }
  }

  // ========================================================
  // ATUALIZAÇÃO DOS INDICADORES E FILTROS
  // ========================================================
  function updateStatsUI() {
    if (!state.stats) return;

    document.getElementById('stat-total-postos').textContent = state.stats.total_postos || 0;
    document.getElementById('stat-total-cidades').textContent = state.stats.total_cidades || 0;
    document.getElementById('stat-em-dia').textContent = state.stats.postos_em_dia || 0;
    document.getElementById('stat-atencao').textContent = state.stats.postos_atencao || 0;
    document.getElementById('stat-criticos').textContent = state.stats.postos_criticos || 0;
    document.getElementById('stat-visitas-mes').textContent = state.stats.visitas_mes || 0;

    // Atualizar contadores nos botões de filtro de status
    document.getElementById('count-todos').textContent = state.stats.total_postos || 0;
    document.getElementById('count-em-dia').textContent = state.stats.postos_em_dia || 0;
    document.getElementById('count-atencao').textContent = state.stats.postos_atencao || 0;
    document.getElementById('count-critico').textContent = state.stats.postos_criticos || 0;
  }

  function populateCidadesFilter() {
    const select = document.getElementById('select-cidade');
    const currentVal = select.value || 'TODAS';

    // Agrupar contagem por cidade
    const cityCounts = {};
    state.postos.forEach(p => {
      const c = p.cidade || 'OUTRA';
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    });

    const sortedCities = Object.keys(cityCounts).sort();

    select.innerHTML = `<option value="TODAS">Todas as Cidades (${state.postos.length} postos)</option>`;
    sortedCities.forEach(cidade => {
      const opt = document.createElement('option');
      opt.value = cidade;
      opt.textContent = `${cidade} (${cityCounts[cidade]})`;
      select.appendChild(opt);
    });

    select.value = sortedCities.includes(currentVal) ? currentVal : 'TODAS';
  }

  // ========================================================
  // APLICAÇÃO DE FILTROS & BUSCA
  // ========================================================
  function applyFilters() {
    const query = state.searchQuery.trim().toUpperCase();

    state.filteredPostos = state.postos.filter(p => {
      // Filtro de Cidade
      if (state.cidadeFilter !== 'TODAS' && p.cidade !== state.cidadeFilter) {
        return false;
      }

      // Filtro de Status
      if (state.statusFilter !== 'TODOS' && p.status_visita !== state.statusFilter) {
        return false;
      }

      // Busca textual por código, nome, cidade ou endereço
      if (query) {
        const fullText = `${p.code || ''} ${p.name || ''} ${p.short_name || ''} ${p.cidade || ''} ${p.address || ''}`.toUpperCase();
        if (!fullText.includes(query)) return false;
      }

      return true;
    });

    // Ordenação
    if (state.sortBy === 'CRITICO_FIRST') {
      const statusWeight = { CRITICO: 0, ATENCAO: 1, EM_DIA: 2 };
      state.filteredPostos.sort((a, b) => {
        const wA = statusWeight[a.status_visita] ?? 3;
        const wB = statusWeight[b.status_visita] ?? 3;
        if (wA !== wB) return wA - wB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      state.filteredPostos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    renderPostosCards();
    updateMapVisibility();
    updateResultsCountText();
  }

  function updateResultsCountText() {
    const infoText = document.getElementById('results-count-text');
    const drawerCount = document.getElementById('drawer-count');
    const total = state.postos.length;
    const filtrados = state.filteredPostos.length;

    if (drawerCount) drawerCount.textContent = filtrados;

    if (filtrados === total) {
      if (infoText) infoText.textContent = `Exibindo todos os ${total} postos`;
    } else {
      if (infoText) infoText.textContent = `Exibindo ${filtrados} de ${total} postos filtrados`;
    }
  }

  // ========================================================
  // RENDERIZAÇÃO DOS CARDS NA BARRA LATERAL
  // ========================================================
  function renderPostosCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    if (state.filteredPostos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <p>Nenhum posto encontrado com os filtros selecionados.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    state.filteredPostos.forEach(posto => {
      const card = document.createElement('div');
      const statusClass = posto.status_visita.toLowerCase().replace('_', '-');
      card.className = `posto-card status-${statusClass} ${posto.id === state.selectedPostoId ? 'selected' : ''}`;
      card.dataset.id = posto.id;

      // Descrição de visita
      let bannerHtml = '';
      if (posto.status_visita === 'EM_DIA') {
        const dias = posto.dias_sem_visita === 0 ? 'hoje' : `há ${posto.dias_sem_visita} dia${posto.dias_sem_visita > 1 ? 's' : ''}`;
        bannerHtml = `
          <div class="card-status-banner">
            <span class="banner-text">🟢 Visitado ${dias} (${posto.ultima_visita_fiscal || 'Fiscal'})</span>
            <span class="days-text">EM DIA</span>
          </div>
        `;
      } else if (posto.status_visita === 'ATENCAO') {
        bannerHtml = `
          <div class="card-status-banner">
            <span class="banner-text">🟡 Sem visita há ${posto.dias_sem_visita} dias</span>
            <span class="days-text">ATENÇÃO</span>
          </div>
        `;
      } else {
        const diasTxt = posto.dias_sem_visita !== null ? `Sem visita há ${posto.dias_sem_visita} dias` : 'Nenhuma visita registrada';
        bannerHtml = `
          <div class="card-status-banner">
            <span class="banner-text">🔴 ${diasTxt}</span>
            <span class="days-text">CRÍTICO</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-group">
            <span class="card-code">#${posto.code || '00000'}</span>
            <h3 class="card-name">${escapeHtml(posto.short_name || posto.name)}</h3>
          </div>
          <span class="card-city-badge">${escapeHtml(posto.cidade || 'PR')}</span>
        </div>

        <div class="card-address">
          ${escapeHtml(posto.address || 'Endereço não cadastrado')}
        </div>

        ${bannerHtml}

        <div class="card-actions-row">
          <button class="btn-card-baixa btn-dar-baixa" data-id="${posto.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Dar Baixa</span>
          </button>

          <button class="btn-card-icon btn-ver-mapa" data-id="${posto.id}" title="Localizar no Mapa">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </button>

          <button class="btn-card-icon btn-ver-hist" data-id="${posto.id}" title="Ver Histórico de Visitas">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
        </div>
      `;

      // Eventos de clique no card
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return; // Clique no botão é tratado separadamente
        selectPosto(posto.id, true);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);

    // Eventos nos botões dos cards
    container.querySelectorAll('.btn-dar-baixa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openVisitaModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-ver-mapa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPosto(btn.dataset.id, true);
      });
    });

    container.querySelectorAll('.btn-ver-hist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openHistoricoModal(btn.dataset.id);
      });
    });
  }

  // ========================================================
  // MARCADORES NO MAPA LEAFLET
  // ========================================================
  function renderMapMarkers() {
    state.markersLayer.clearLayers();
    state.markerMap = {};

    state.postos.forEach(posto => {
      if (!posto.latitude || !posto.longitude) return;

      const icon = createCustomPinIcon(posto.status_visita);
      const marker = L.marker([posto.latitude, posto.longitude], {
        icon,
        title: posto.name
      });

      // Conteúdo do Popup
      const popupHtml = buildPopupContent(posto);
      marker.bindPopup(popupHtml, { maxWidth: 320 });

      // Rótulo permanente no mapa com Nome do Cliente, Cidade e Rua
      const streetName = (posto.address || '').split('-')[0].replace(/^Av\.?\s*/i, 'Av. ').trim();
      const statusClass = posto.status_visita.toLowerCase().replace('_', '-');
      const tooltipHtml = `
        <div class="pin-map-tooltip ${statusClass}">
          <span class="tooltip-title">${escapeHtml(posto.short_name || posto.name)}</span>
          <span class="tooltip-sub">📍 ${escapeHtml(posto.cidade || 'PR')}${streetName ? ' • ' + escapeHtml(streetName) : ''}</span>
        </div>
      `;

      if (state.showLabels) {
        marker.bindTooltip(tooltipHtml, {
          permanent: true,
          direction: 'bottom',
          className: `custom-map-tooltip ${statusClass}`,
          offset: [0, 4]
        });
      }

      marker.on('click', () => {
        selectPosto(posto.id, false);
      });

      marker.addTo(state.markersLayer);
      state.markerMap[posto.id] = marker;
    });
  }

  function toggleLabels() {
    state.showLabels = !state.showLabels;
    const btn = document.getElementById('btn-toggle-labels');
    const text = document.getElementById('labels-btn-text');

    if (state.showLabels) {
      if (btn) btn.classList.add('active-tool');
      if (text) text.textContent = 'Nomes no Mapa: ON';
    } else {
      if (btn) btn.classList.remove('active-tool');
      if (text) text.textContent = 'Nomes no Mapa: OFF';
    }

    renderMapMarkers();
  }

  function buildPopupContent(posto) {
    const statusConfig = PIN_COLORS[posto.status_visita] || PIN_COLORS.CRITICO;
    const statusClass = posto.status_visita.toLowerCase().replace('_', '-');

    let ultimaVisitaText = 'Nenhuma visita registrada';
    if (posto.ultima_visita_data) {
      const dataFmt = formatDateTime(posto.ultima_visita_data);
      ultimaVisitaText = `Última: ${dataFmt} por <strong>${escapeHtml(posto.ultima_visita_fiscal || 'Fiscal')}</strong>`;
    }

    return `
      <div class="popup-posto-header">
        <span class="popup-code">#${posto.code || '00000'}</span>
        <h4 class="popup-title">${escapeHtml(posto.short_name || posto.name)}</h4>
        <div class="popup-city-badge">📍 ${escapeHtml(posto.cidade || 'PR')}</div>
      </div>

      <div class="popup-body-row">
        <strong>Endereço:</strong> ${escapeHtml(posto.address || 'Não informado')}
      </div>

      <div class="popup-status-badge ${statusClass}">
        <span>${statusConfig.symbol}</span>
        <span>${statusConfig.label}</span>
      </div>

      <div class="popup-body-row" style="font-size:0.75rem;">
        ${ultimaVisitaText}
      </div>

      <div class="popup-actions">
        <button class="btn-popup-baixa" onclick="window.GPS_MAP.openBaixa('${posto.id}')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Dar Baixa</span>
        </button>
        <button class="btn-popup-hist" onclick="window.GPS_MAP.openHist('${posto.id}')">
          <span>Histórico</span>
        </button>
      </div>
    `;
  }

  function updateMapVisibility() {
    const visibleIds = new Set(state.filteredPostos.map(p => p.id));

    Object.entries(state.markerMap).forEach(([id, marker]) => {
      if (visibleIds.has(id)) {
        if (!state.markersLayer.hasLayer(marker)) {
          state.markersLayer.addLayer(marker);
        }
      } else {
        if (state.markersLayer.hasLayer(marker)) {
          state.markersLayer.removeLayer(marker);
        }
      }
    });
  }

  function fitMapToMarkers() {
    const visibleMarkers = [];
    state.filteredPostos.forEach(p => {
      const marker = state.markerMap[p.id];
      if (marker && state.markersLayer.hasLayer(marker)) {
        visibleMarkers.push(marker);
      }
    });

    if (visibleMarkers.length > 0) {
      const group = L.featureGroup(visibleMarkers);
      state.map.fitBounds(group.getBounds().pad(0.12), { maxZoom: 14, animate: true });
    }
  }

  // ========================================================
  // SELEÇÃO DE POSTO (CENTRALIZAR NO MAPA E NA LISTA)
  // ========================================================
  function selectPosto(postoId, panMap = true) {
    state.selectedPostoId = postoId;

    // Atualizar classe selected nos cards
    document.querySelectorAll('.posto-card').forEach(card => {
      if (card.dataset.id === postoId) {
        card.classList.add('selected');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('selected');
      }
    });

    // Centralizar e abrir popup no mapa
    const marker = state.markerMap[postoId];
    if (marker && panMap) {
      state.map.flyTo(marker.getLatLng(), 15, { duration: 0.8 });
      setTimeout(() => {
        marker.openPopup();
      }, 350);
    }
  }

  // ========================================================
  // MODAL DE REGISTRAR VISITA (DAR BAIXA)
  // ========================================================
  function openVisitaModal(postoId) {
    const posto = state.postos.find(p => p.id === postoId);
    if (!posto) return;

    document.getElementById('visita-posto-id').value = posto.id;
    document.getElementById('modal-posto-name').textContent = `#${posto.code || ''} - ${posto.short_name || posto.name}`;
    document.getElementById('modal-posto-details').textContent = `Cidade: ${posto.cidade || 'Curitiba'} | Endereço: ${posto.address || 'Não informado'}`;

    // Data e hora padrão: Agora (formato YYYY-MM-DDTHH:MM)
    setDateTimeNow();

    // Reset de campos
    document.getElementById('visita-fiscal').value = '';
    document.getElementById('visita-tipo').value = 'Rotina Operacional';
    document.getElementById('visita-status').value = 'Conforme';
    document.getElementById('chk-postura').checked = true;
    document.getElementById('chk-livro').checked = true;
    document.getElementById('chk-comunicacao').checked = true;
    document.getElementById('chk-instalacoes').checked = true;
    document.getElementById('chk-procedimentos').checked = true;
    document.getElementById('visita-obs').value = '';

    const modal = document.getElementById('modal-visita-backdrop');
    modal.classList.add('open');
    document.getElementById('visita-fiscal').focus();
  }

  function closeVisitaModal() {
    document.getElementById('modal-visita-backdrop').classList.remove('open');
  }

  function setDateTimeNow() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('visita-data').value = localIso;
  }

  async function handleVisitaSubmit(e) {
    e.preventDefault();

    const postoId = document.getElementById('visita-posto-id').value;
    const dataVisitaInput = document.getElementById('visita-data').value;
    const fiscalNome = document.getElementById('visita-fiscal').value.trim();
    const tipoVisita = document.getElementById('visita-tipo').value;
    const status = document.getElementById('visita-status').value;
    const obs = document.getElementById('visita-obs').value.trim();

    if (!fiscalNome) {
      showToast('Por favor, informe o nome do fiscal ou supervisor.', 'error');
      document.getElementById('visita-fiscal').focus();
      return;
    }

    // Montar objeto checklist
    const checklist = {
      postura_uniforme: document.getElementById('chk-postura').checked,
      livro_ocorrencias: document.getElementById('chk-livro').checked,
      comunicacao_equipamentos: document.getElementById('chk-comunicacao').checked,
      instalacoes_limpas: document.getElementById('chk-instalacoes').checked,
      procedimentos_normas: document.getElementById('chk-procedimentos').checked
    };

    // Formatar data para YYYY-MM-DD HH:MM:SS
    const dataFormatted = dataVisitaInput ? dataVisitaInput.replace('T', ' ') + ':00' : new Date().toISOString().replace('T', ' ').substring(0, 19);

    const payload = {
      posto_id: postoId,
      data_visita: dataFormatted,
      fiscal_nome: fiscalNome,
      tipo_visita: tipoVisita,
      status: status,
      checklist_json: checklist,
      observacoes: obs
    };

    const submitBtn = document.getElementById('btn-submit-visita');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao registrar visita');
      }

      showToast('✅ Baixa de visita realizada com sucesso!', 'success');
      closeVisitaModal();

      // Recarrega os dados e atualiza o mapa em tempo real
      await loadData();

      // Mantém o posto selecionado
      selectPosto(postoId, true);
    } catch (err) {
      console.error('Erro ao salvar visita:', err);
      showToast('Erro ao salvar visita: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Salvar e Dar Baixa na Visita</span>
      `;
    }
  }

  // ========================================================
  // MODAL DE HISTÓRICO DE VISITAS DO POSTO
  // ========================================================
  async function openHistoricoModal(postoId) {
    const posto = state.postos.find(p => p.id === postoId);
    if (!posto) return;

    document.getElementById('modal-hist-posto-name').textContent = `#${posto.code || ''} - ${posto.short_name || posto.name}`;
    document.getElementById('modal-hist-posto-details').textContent = `Cidade: ${posto.cidade || 'Curitiba'} | Endereço: ${posto.address || 'Não informado'}`;

    const container = document.getElementById('timeline-visitas-container');
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;">Carregando histórico...</div>';

    document.getElementById('btn-hist-nova-baixa').onclick = () => {
      closeHistoricoModal();
      openVisitaModal(postoId);
    };

    const modal = document.getElementById('modal-historico-backdrop');
    modal.classList.add('open');

    try {
      const res = await fetch(`/api/visitas?postoId=${encodeURIComponent(postoId)}`);
      const visitas = await res.json();

      if (!visitas || visitas.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Nenhuma visita registrada para este posto ainda.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      visitas.forEach(v => {
        let statusClass = 'conforme';
        if (v.status === 'Com Ressalvas') statusClass = 'ressalvas';
        if (v.status === 'Não Conforme') statusClass = 'nao-conforme';

        let checklistList = '';
        if (v.checklist_json) {
          try {
            const chk = typeof v.checklist_json === 'string' ? JSON.parse(v.checklist_json) : v.checklist_json;
            const items = [];
            if (chk.postura_uniforme) items.push('Uniforme OK');
            if (chk.livro_ocorrencias) items.push('Livro OK');
            if (chk.comunicacao_equipamentos) items.push('Rádio/Equipamentos OK');
            if (chk.instalacoes_limpas) items.push('Instalações OK');
            if (chk.procedimentos_normas) items.push('Procedimentos OK');
            if (items.length > 0) {
              checklistList = `<div style="font-size:0.72rem;color:#94a3b8;margin-top:4px;">Itens verificados: ${items.join(' • ')}</div>`;
            }
          } catch (e) {}
        }

        const item = document.createElement('div');
        item.className = `timeline-item ${statusClass}`;
        item.innerHTML = `
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <div class="timeline-header-row">
              <span class="timeline-fiscal">👤 ${escapeHtml(v.fiscal_nome)}</span>
              <span class="timeline-date">${formatDateTime(v.data_visita)}</span>
            </div>
            <div class="timeline-tipo">${escapeHtml(v.tipo_visita || 'Rotina')} &bull; <span style="font-weight:700;">${escapeHtml(v.status || 'Conforme')}</span></div>
            ${checklistList}
            ${v.observacoes ? `<div class="timeline-obs">${escapeHtml(v.observacoes)}</div>` : ''}
            <button class="btn-delete-visita" data-id="${v.id}">Excluir registro</button>
          </div>
        `;

        item.querySelector('.btn-delete-visita').addEventListener('click', async () => {
          if (confirm('Tem certeza de que deseja excluir este registro de visita?')) {
            try {
              await fetch(`/api/visitas/${v.id}`, { method: 'DELETE' });
              showToast('Visita excluída com sucesso.', 'success');
              openHistoricoModal(postoId);
              loadData();
            } catch (err) {
              showToast('Erro ao excluir visita', 'error');
            }
          }
        });

        container.appendChild(item);
      });
    } catch (err) {
      container.innerHTML = `<div style="padding:20px;text-align:center;color:#ef4444;">Erro ao carregar visitas: ${err.message}</div>`;
    }
  }

  function closeHistoricoModal() {
    document.getElementById('modal-historico-backdrop').classList.remove('open');
  }

  // ========================================================
  // EXPORTAÇÃO DE RELATÓRIO EXCEL / CSV
  // ========================================================
  function exportCsvReport() {
    if (!state.postos || state.postos.length === 0) {
      showToast('Nenhum dado disponível para exportação.', 'error');
      return;
    }

    const headers = [
      'Código',
      'Nome do Posto',
      'Cidade',
      'Categoria',
      'Endereço',
      'Status da Visita',
      'Dias Sem Visita',
      'Data Última Visita',
      'Fiscal Responsável',
      'Tipo Última Visita',
      'Avaliação Última Visita',
      'Total de Visitas Registradas'
    ];

    const rows = state.postos.map(p => {
      let statusDesc = 'Crítico / Sem Visita';
      if (p.status_visita === 'EM_DIA') statusDesc = 'Em Dia (≤15 dias)';
      if (p.status_visita === 'ATENCAO') statusDesc = 'Atenção (16-30 dias)';

      return [
        `"${(p.code || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.cidade || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${statusDesc}"`,
        p.dias_sem_visita !== null ? p.dias_sem_visita : 'Nunca',
        `"${(p.ultima_visita_data || '').replace(/"/g, '""')}"`,
        `"${(p.ultima_visita_fiscal || '').replace(/"/g, '""')}"`,
        `"${(p.ultima_visita_tipo || '').replace(/"/g, '""')}"`,
        `"${(p.ultima_visita_status || '').replace(/"/g, '""')}"`,
        p.total_visitas || 0
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_visitas_postos_gps_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('📊 Relatório exportado com sucesso!', 'success');
  }

  // ========================================================
  // TOAST NOTIFICATIONS & UTILITÁRIOS
  // ========================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(str) {
    if (!str) return '--';
    try {
      const d = new Date(str.replace(' ', 'T'));
      if (isNaN(d.getTime())) return str;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return str;
    }
  }

  // ========================================================
  // BINDING DE EVENTOS
  // ========================================================
  function setupEventListeners() {
    // Busca
    const inputSearch = document.getElementById('input-search-posto');
    const btnClearSearch = document.getElementById('btn-clear-search');

    inputSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
      applyFilters();
    });

    btnClearSearch.addEventListener('click', () => {
      inputSearch.value = '';
      state.searchQuery = '';
      btnClearSearch.style.display = 'none';
      applyFilters();
    });

    // Seletor de Cidades
    document.getElementById('select-cidade').addEventListener('change', (e) => {
      state.cidadeFilter = e.target.value;
      applyFilters();
      fitMapToMarkers();
    });

    // Chips de Status
    document.querySelectorAll('.status-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.status-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.statusFilter = btn.dataset.status;
        applyFilters();
        fitMapToMarkers();
      });
    });

    // Alternar ordenação
    const btnSort = document.getElementById('btn-sort-toggle');
    btnSort.addEventListener('click', () => {
      if (state.sortBy === 'CRITICO_FIRST') {
        state.sortBy = 'NOME_ASC';
        document.getElementById('sort-label').textContent = 'Ordenar: A-Z';
      } else {
        state.sortBy = 'CRITICO_FIRST';
        document.getElementById('sort-label').textContent = 'Ordenar: Críticos 1º';
      }
      applyFilters();
    });

    // Controle da Gaveta Flutuante (Lista de Postos)
    const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawer = document.getElementById('sidebar-panel');

    if (btnToggleDrawer && drawer) {
      btnToggleDrawer.addEventListener('click', () => {
        drawer.classList.toggle('open');
      });
    }

    if (btnCloseDrawer && drawer) {
      btnCloseDrawer.addEventListener('click', () => {
        drawer.classList.remove('open');
      });
    }

    // Toggle de Etiquetas com Nomes de Clientes e Ruas no Mapa
    const btnToggleLabels = document.getElementById('btn-toggle-labels');
    if (btnToggleLabels) {
      btnToggleLabels.addEventListener('click', () => {
        toggleLabels();
      });
    }

    // Tela Cheia (Fullscreen)
    const btnFs = document.getElementById('btn-toggle-fullscreen');
    const textFs = document.getElementById('fullscreen-text');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().then(() => {
            if (textFs) textFs.textContent = 'Sair da Tela Cheia';
          }).catch(err => {
            console.warn('Erro ao entrar em tela cheia:', err);
          });
        } else {
          document.exitFullscreen().then(() => {
            if (textFs) textFs.textContent = 'Tela Cheia';
          });
        }
      });

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && textFs) {
          textFs.textContent = 'Tela Cheia';
        }
      });
    }

    // Ferramentas do mapa
    document.getElementById('btn-recenter-map').addEventListener('click', () => {
      fitMapToMarkers();
    });

    document.getElementById('btn-toggle-tiles').addEventListener('click', () => {
      toggleMapTiles();
    });

    // Ações do Header
    document.getElementById('btn-refresh-data').addEventListener('click', () => {
      loadData();
      showToast('Dados atualizados com sucesso.', 'success');
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
      exportCsvReport();
    });

    // Modal de Visitas
    document.getElementById('btn-close-visita-modal').addEventListener('click', closeVisitaModal);
    document.getElementById('btn-cancel-visita').addEventListener('click', closeVisitaModal);
    document.getElementById('form-registro-visita').addEventListener('submit', handleVisitaSubmit);
    document.getElementById('btn-set-now').addEventListener('click', setDateTimeNow);

    // Modal de Histórico
    document.getElementById('btn-close-historico-modal').addEventListener('click', closeHistoricoModal);

    // Fechar modais ao clicar no backdrop
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) {
          closeVisitaModal();
          closeHistoricoModal();
        }
      });
    });

    // Tecla ESC para fechar modais
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeVisitaModal();
        closeHistoricoModal();
      }
    });
  }

  // ========================================================
  // EXPOR MÉTODOS PARA USO NOS POPUPS DO LEAFLET
  // ========================================================
  window.GPS_MAP = {
    openBaixa: (postoId) => openVisitaModal(postoId),
    openHist: (postoId) => openHistoricoModal(postoId)
  };

  // ========================================================
  // BOOTSTRAP DA APLICAÇÃO
  // ========================================================
  document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    loadData();
  });

})();

