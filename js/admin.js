/**
 * STANLEY FELLIPE - PAINEL ADMINISTRATIVO & GESTÃO DE BRIEFINGS
 * Lógica do visualizador de respostas e ferramentas de exportação
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const responsesList = document.getElementById('responsesList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const sortOrder = document.getElementById('sortOrder');
  
  // Stat counters
  const statTotal = document.getElementById('statTotal');
  const statNew = document.getElementById('statNew');
  const statProgress = document.getElementById('statProgress');
  const statCompleted = document.getElementById('statCompleted');

  // Toolbar buttons
  const btnRefresh = document.getElementById('btnRefresh');
  const btnExportJson = document.getElementById('btnExportJson');
  const btnImportJson = document.getElementById('btnImportJson');
  const fileImportInput = document.getElementById('fileImportInput');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnAddDemo = document.getElementById('btnAddDemo');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnConfigPhone = document.getElementById('btnConfigPhone');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
  const detailModalBody = document.getElementById('detailModalBody');

  // State
  let responses = [];
  let broadcastChannel = null;

  // Broadcast Channel setup
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('sf_briefings_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_SUBMISSION') {
          showToast(`Novo briefing recebido: ${event.data.data.segmento}`, 'success');
          loadData();
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel error', e);
  }

  // Cross-tab storage listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'sf_briefings_updated' || e.key === 'sf_briefing_respostas') {
      loadData();
    }
  });

  // 1. Load Data
  async function loadData() {
    let loadedFromServer = false;

    // Try server API first
    try {
      const res = await fetch('/api/respostas');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          responses = data;
          loadedFromServer = true;
          // Sync to localStorage
          localStorage.setItem('sf_briefing_respostas', JSON.stringify(responses));
        }
      }
    } catch (e) {
      // Standalone mode or server offline
    }

    if (!loadedFromServer) {
      // Fallback to localStorage
      try {
        const local = localStorage.getItem('sf_briefing_respostas');
        responses = local ? JSON.parse(local) : [];
      } catch (err) {
        console.error('Failed to parse local briefings', err);
        responses = [];
      }
    }

    updateStats();
    renderResponses();
  }

  // 2. Save Data
  async function persistResponses() {
    localStorage.setItem('sf_briefing_respostas', JSON.stringify(responses));
    localStorage.setItem('sf_briefings_updated', Date.now().toString());

    // Send update to server if available
    try {
      await fetch('/api/respostas/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responses)
      });
    } catch (e) {
      // Offline mode is expected
    }

    updateStats();
  }

  // 3. Stats Calculation
  function updateStats() {
    const total = responses.length;
    const novos = responses.filter(r => r.status === 'novo').length;
    const progress = responses.filter(r => r.status === 'analise' || r.status === 'producao').length;
    const completed = responses.filter(r => r.status === 'concluido').length;

    if (statTotal) statTotal.textContent = total;
    if (statNew) statNew.textContent = novos;
    if (statProgress) statProgress.textContent = progress;
    if (statCompleted) statCompleted.textContent = completed;
  }

  // 4. Render Filtered & Sorted List
  function renderResponses() {
    const query = (searchInput.value || '').toLowerCase().trim();
    const statusFilter = filterStatus.value;
    const sortVal = sortOrder.value;

    let filtered = responses.filter(item => {
      // Status filter
      if (statusFilter !== 'todos' && item.status !== statusFilter) {
        return false;
      }

      // Query search
      if (query) {
        const searchable = [
          item.segmento,
          item.servicos,
          item.whatsapp,
          item.email,
          item.endereco,
          item.diferenciais,
          item.quemSomos,
          item.infoAdicionais,
          item.displayDate
        ].join(' ').toLowerCase();

        return searchable.includes(query);
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortVal === 'recentes' ? timeB - timeA : timeA - timeB;
    });

    // Clear
    responsesList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'flex';
      responsesList.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    responsesList.style.display = 'flex';

    filtered.forEach(item => {
      const card = createResponseCard(item);
      responsesList.appendChild(card);
    });
  }

  // 5. Create Card DOM
  function createResponseCard(item) {
    const card = document.createElement('div');
    card.className = 'response-card';
    card.id = `card_${item.id}`;

    // Clean phone for whatsapp link
    const cleanPhone = (item.whatsapp || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone}` : '#';

    // Status config
    const statusLabels = {
      novo: 'Novo Briefing',
      analise: 'Em Análise',
      producao: 'Em Produção',
      concluido: 'Concluído'
    };

    const currentStatus = item.status || 'novo';

    card.innerHTML = `
      <div class="response-card-header">
        <div class="card-title-group">
          <div class="badge-segment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            ${escapeHtml(item.segmento)}
          </div>
          <div class="card-meta-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Recebido em ${escapeHtml(item.displayDate || 'Data recente')}
          </div>
        </div>

        <div class="status-select-wrap">
          <select class="filter-select select-card-status" data-id="${item.id}" title="Alterar status deste projeto">
            <option value="novo" ${currentStatus === 'novo' ? 'selected' : ''}>🟠 Novo Briefing</option>
            <option value="analise" ${currentStatus === 'analise' ? 'selected' : ''}>🔵 Em Análise</option>
            <option value="producao" ${currentStatus === 'producao' ? 'selected' : ''}>🟣 Em Produção</option>
            <option value="concluido" ${currentStatus === 'concluido' ? 'selected' : ''}>🟢 Concluído</option>
          </select>
        </div>
      </div>

      <!-- Contacts -->
      <div class="contact-pills">
        <a href="${waUrl}" target="_blank" class="contact-pill pill-whatsapp" title="Abrir conversa no WhatsApp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/>
          </svg>
          ${escapeHtml(item.whatsapp || 'WhatsApp')}
        </a>

        <a href="mailto:${escapeHtml(item.email || '')}" class="contact-pill" title="Enviar e-mail">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          ${escapeHtml(item.email || 'E-mail')}
        </a>

        <span class="contact-pill" title="Localização">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${escapeHtml(item.endereco || 'Endereço não informado')}
        </span>
      </div>

      <!-- Quick Preview Snippets -->
      <div class="response-snippet-grid">
        <div class="snippet-item">
          <span class="snippet-label">Serviços Oferecidos</span>
          <span class="snippet-content">${escapeHtml(item.servicos || 'Não informado')}</span>
        </div>
        <div class="snippet-item">
          <span class="snippet-label">Diferenciais Competitivos</span>
          <span class="snippet-content">${escapeHtml(item.diferenciais || 'Não informado')}</span>
        </div>
        <div class="snippet-item">
          <span class="snippet-label">Quem Somos / Apresentação</span>
          <span class="snippet-content">${escapeHtml(item.quemSomos || 'Não informado')}</span>
        </div>
        <div class="snippet-item">
          <span class="snippet-label">Cases & Resultados</span>
          <span class="snippet-content">${escapeHtml(item.infoAdicionais || 'Não informado')}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="card-actions-bar">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" class="btn-card-action btn-view btn-action-view" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Ver Briefing Completo
          </button>

          <button type="button" class="btn-card-action btn-action-copy" data-id="${item.id}" title="Copiar resumo formatado para colar no Notion, Trello ou Chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar Formatado
          </button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-card-action btn-action-print" data-id="${item.id}" title="Imprimir briefing">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir
          </button>

          <button type="button" class="btn-card-action btn-delete btn-action-delete" data-id="${item.id}" title="Excluir este briefing">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Status change listener
    const statusSelect = card.querySelector('.select-card-status');
    statusSelect.addEventListener('change', (e) => {
      const newStat = e.target.value;
      const target = responses.find(r => r.id === item.id);
      if (target) {
        target.status = newStat;
        persistResponses();
        showToast(`Status atualizado para: ${statusLabels[newStat]}`, 'info');
      }
    });

    // View Detail
    card.querySelector('.btn-action-view').addEventListener('click', () => {
      openDetailModal(item);
    });

    // Copy formatted
    card.querySelector('.btn-action-copy').addEventListener('click', () => {
      copyFormattedBriefing(item);
    });

    // Print
    card.querySelector('.btn-action-print').addEventListener('click', () => {
      openDetailModal(item);
      setTimeout(() => window.print(), 300);
    });

    // Delete
    card.querySelector('.btn-action-delete').addEventListener('click', () => {
      if (confirm(`Tem certeza que deseja excluir o briefing de "${item.segmento}"?`)) {
        responses = responses.filter(r => r.id !== item.id);
        persistResponses();
        renderResponses();
        showToast('Briefing excluído com sucesso.', 'info');
      }
    });

    return card;
  }

  // 6. Detail Modal Rendering
  function openDetailModal(item) {
    const cleanPhone = (item.whatsapp || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone}` : '#';

    detailModalBody.innerHTML = `
      <div class="detail-header">
        <div>
          <span class="badge-segment" style="margin-bottom: 8px;">${escapeHtml(item.segmento)}</span>
          <h2 style="font-family: var(--font-heading); font-size: 1.5rem; color: #fff;">Briefing Completo do Cliente</h2>
          <span style="font-size: 0.85rem; color: var(--text-dim);">Recebido em ${escapeHtml(item.displayDate || 'Data recente')}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="${waUrl}" target="_blank" class="contact-pill pill-whatsapp" style="padding: 8px 16px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/>
            </svg>
            Conversar no WhatsApp
          </a>
        </div>
      </div>

      <div class="detail-section-group">
        <!-- 1. Dados de Contato -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>1. Informações de Contato & Localização</span>
            <button type="button" class="btn-copy-mini" onclick="navigator.clipboard.writeText('${escapeHtml(item.whatsapp)} | ${escapeHtml(item.email)}'); alert('Copiado!');">Copiar Contato</button>
          </div>
          <div class="detail-block-content">
            <strong>WhatsApp:</strong> ${escapeHtml(item.whatsapp)}<br>
            <strong>E-mail:</strong> ${escapeHtml(item.email)}<br>
            <strong>Endereço:</strong> ${escapeHtml(item.endereco)}
          </div>
        </div>

        <!-- 2. Segmento da LP -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>2. Segmento da Landing Page & Objetivo</span>
          </div>
          <div class="detail-block-content">${escapeHtml(item.segmento)}</div>
        </div>

        <!-- 3. Serviços Oferecidos -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>3. Serviços Oferecidos</span>
          </div>
          <div class="detail-block-content">${escapeHtml(item.servicos)}</div>
        </div>

        <!-- 4. Diferenciais -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>4. Diferenciais Competitivos</span>
          </div>
          <div class="detail-block-content">${escapeHtml(item.diferenciais)}</div>
        </div>

        <!-- 5. Quem Somos -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>5. Quem Somos (História & Autoridade)</span>
          </div>
          <div class="detail-block-content">${escapeHtml(item.quemSomos)}</div>
        </div>

        <!-- 6. Informações Adicionais / Cases -->
        <div class="detail-block">
          <div class="detail-block-title">
            <span>6. Informações Adicionais (Cases, Resultados, Depoimentos)</span>
          </div>
          <div class="detail-block-content">${escapeHtml(item.infoAdicionais)}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
        <button type="button" class="btn-tool btn-tool-orange" id="btnModalCopyAll">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copiar Tudo Formatado
        </button>
        <button type="button" class="btn-tool" onclick="window.print()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Imprimir / Salvar PDF
        </button>
      </div>
    `;

    document.getElementById('btnModalCopyAll').addEventListener('click', () => {
      copyFormattedBriefing(item);
    });

    detailModal.classList.add('active');
  }

  if (btnCloseDetailModal) {
    btnCloseDetailModal.addEventListener('click', () => {
      detailModal.classList.remove('active');
    });
  }

  // 7. Copy Formatted to Clipboard
  function copyFormattedBriefing(item) {
    let text = `========================================================\n`;
    text += `🔥 BRIEFING DE LANDING PAGE - STANLEY FELLIPE DESIGNER\n`;
    text += `========================================================\n\n`;
    text += `📅 DATA: ${item.displayDate || 'Recente'}\n`;
    text += `🎯 SEGMENTO: ${item.segmento}\n`;
    text += `📞 WHATSAPP: ${item.whatsapp}\n`;
    text += `✉️ E-MAIL: ${item.email}\n`;
    text += `📍 ENDEREÇO: ${item.endereco}\n\n`;
    text += `--- SERVIÇOS OFERECIDOS ---\n${item.servicos}\n\n`;
    text += `--- DIFERENCIAIS DO NEGÓCIO ---\n${item.diferenciais}\n\n`;
    text += `--- QUEM SOMOS ---\n${item.quemSomos}\n\n`;
    text += `--- INFORMAÇÕES ADICIONAIS / CASES / RESULTADOS ---\n${item.infoAdicionais}\n\n`;
    text += `========================================================\n`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Briefing formatado copiado para a área de transferência!', 'success');
    }).catch(err => {
      console.error('Clipboard error', err);
      showToast('Erro ao copiar automaticamente. Selecione e copie manualmente.', 'error');
    });
  }

  // 8. Demo Data Generator
  if (btnAddDemo) {
    btnAddDemo.addEventListener('click', () => {
      const demoItems = [
        {
          id: 'briefing_demo_' + Date.now(),
          createdAt: new Date().toISOString(),
          displayDate: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: 'novo',
          segmento: 'Clínica de Estética & Harmonização Facial de Alto Padrão',
          servicos: '1. Harmonização Orofacial e Preenchimento Labial\n2. Botox Preventivo e Reparador\n3. Bioestimuladores de Colágeno (Radiesse e Sculptra)\n4. Limpeza de Pele Profunda e Protocolo Glow',
          whatsapp: '(11) 98765-4321',
          email: 'contato@clinicaradiance.com.br',
          endereco: 'Av. Paulista, 1578 - Conjunto 1204 - Bela Vista, São Paulo - SP',
          semEnderecoFisico: false,
          diferenciais: 'Ambiente boutique com atendimento VIP individualizado; Mais de 12 anos de experiência; Produtos importados com selo FDA e ANVISA; Simulação digital 3D antes de qualquer procedimento.',
          quemSomos: 'Fundada pela Dra. Camila Rocha, a Radiance Estética nasceu com o propósito de realçar a beleza natural através de procedimentos minimamente invasivos e tecnologia de ponta.',
          infoAdicionais: 'Mais de 3.500 pacientes transformadas; Nota 4.9 com mais de 380 avaliações 5 estrelas no Google Meu Negócio; Certificada pelo Instituto Internacional de Medicina Estética de Harvard.'
        },
        {
          id: 'briefing_demo2_' + Date.now(),
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          displayDate: new Date(Date.now() - 3600000 * 4).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: 'analise',
          segmento: 'Escritório de Advocacia Especializado em Direito Imobiliário & Contratos',
          servicos: 'Auditoria de Documentação (Due Diligence Imobiliária); Regularização de Imóveis e Usucapião; Assessoria Jurídica em Compra e Venda de Imóveis de Luxo; Blindagem Patrimonial.',
          whatsapp: '(21) 97123-9988',
          email: 'juridico@almeidaeassociados.adv.br',
          endereco: 'Negócio 100% Digital / Sem endereço físico',
          semEnderecoFisico: true,
          diferenciais: 'Atendimento ágil 100% digital para clientes no Brasil e exterior; Segurança jurídica completa com contratos sob medida; Sem jargões complicados.',
          quemSomos: 'Almeida & Associados é um escritório boutique com foco exclusivo em operações imobiliárias seguras e rentáveis.',
          infoAdicionais: 'Mais de R$ 150 Milhões em transações imobiliárias protegidas sem litígios nos últimos 3 anos.'
        }
      ];

      responses.unshift(...demoItems);
      persistResponses();
      renderResponses();
      showToast('Exemplos de teste adicionados com sucesso!', 'success');
    });
  }

  // 9. Export JSON
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      if (responses.length === 0) {
        showToast('Nenhum briefing para exportar.', 'error');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(responses, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `briefings_sf_${Date.now()}.json`);
      dlAnchor.click();
      showToast('Exportação de JSON concluída!', 'success');
    });
  }

  // 10. Import JSON
  if (btnImportJson) {
    btnImportJson.addEventListener('click', () => {
      fileImportInput.click();
    });
  }

  if (fileImportInput) {
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            // Merge avoiding duplicates by id
            const existingIds = new Set(responses.map(r => r.id));
            let addedCount = 0;
            imported.forEach(item => {
              if (item.id && !existingIds.has(item.id)) {
                responses.unshift(item);
                existingIds.add(item.id);
                addedCount++;
              }
            });
            persistResponses();
            renderResponses();
            showToast(`${addedCount} novos briefings importados com sucesso!`, 'success');
          } else {
            showToast('Formato inválido. O arquivo deve conter uma lista JSON.', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Erro ao ler arquivo JSON. Verifique a formatação.', 'error');
        }
      };
      reader.readAsText(file);
      fileImportInput.value = '';
    });
  }

  // 11. Export CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      if (responses.length === 0) {
        showToast('Nenhum briefing para exportar.', 'error');
        return;
      }

      const headers = ['ID', 'Data', 'Status', 'Segmento', 'WhatsApp', 'Email', 'Endereço', 'Serviços', 'Diferenciais', 'Quem Somos', 'Cases/Resultados'];
      const rows = responses.map(r => [
        `"${(r.id || '').replace(/"/g, '""')}"`,
        `"${(r.displayDate || '').replace(/"/g, '""')}"`,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        `"${(r.segmento || '').replace(/"/g, '""')}"`,
        `"${(r.whatsapp || '').replace(/"/g, '""')}"`,
        `"${(r.email || '').replace(/"/g, '""')}"`,
        `"${(r.endereco || '').replace(/"/g, '""')}"`,
        `"${(r.servicos || '').replace(/"/g, '""')}"`,
        `"${(r.diferenciais || '').replace(/"/g, '""')}"`,
        `"${(r.quemSomos || '').replace(/"/g, '""')}"`,
        `"${(r.infoAdicionais || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `briefings_sf_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportação CSV para Excel realizada!', 'success');
    });
  }

  // 12. Clear All
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (responses.length === 0) return;
      if (confirm('Atenção: deseja realmente limpar todo o histórico de briefings salvos? Essa ação não pode ser desfeita.')) {
        responses = [];
        persistResponses();
        renderResponses();
        showToast('Histórico limpo com sucesso.', 'info');
      }
    });
  }

  // 13. Stanley Phone Config
  if (btnConfigPhone) {
    btnConfigPhone.addEventListener('click', () => {
      const current = localStorage.getItem('sf_stanley_phone') || '5511999999999';
      const novo = prompt('Digite o número de WhatsApp do Stanley (com DDD e DDI, ex: 5511999999999):', current);
      if (novo !== null && novo.trim() !== '') {
        const clean = novo.replace(/\D/g, '');
        localStorage.setItem('sf_stanley_phone', clean);
        showToast(`Número configurado para: +${clean}`, 'success');
      }
    });
  }

  // 14. Event Listeners for Filters
  searchInput.addEventListener('input', () => renderResponses());
  filterStatus.addEventListener('change', () => renderResponses());
  sortOrder.addEventListener('change', () => renderResponses());
  if (btnRefresh) btnRefresh.addEventListener('click', () => {
    loadData();
    showToast('Lista de respostas atualizada!', 'info');
  });

  // Toast Helper
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;

    if (type === 'success') {
      icon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else if (type === 'error') {
      icon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
    }

    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadData();
});
