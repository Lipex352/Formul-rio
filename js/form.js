/**
 * STANLEY FELLIPE - FORMULÁRIO DE BRIEFING
 * Lógica do formulário de captura e sincronização
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('briefingForm');
  const progressFill = document.getElementById('progressFill');
  const progressCount = document.getElementById('progressCount');
  const progressPercent = document.getElementById('progressPercent');
  const whatsappInput = document.getElementById('whatsapp');
  const emailInput = document.getElementById('email');
  const enderecoInput = document.getElementById('endereco');
  const semEnderecoCheckbox = document.getElementById('semEnderecoFisico');
  const enderecoGroup = document.getElementById('enderecoInputGroup');
  const successModal = document.getElementById('successModal');
  const btnModalWhatsapp = document.getElementById('btnModalWhatsapp');
  const btnModalDownload = document.getElementById('btnModalDownload');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Broadcast Channel for live multi-tab communication
  let broadcastChannel = null;
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('sf_briefings_channel');
    }
  } catch (e) {
    console.warn('BroadcastChannel not available', e);
  }

  // Pre-configured default Stanley phone (can be overridden via localStorage)
  let stanleyPhone = localStorage.getItem('sf_stanley_phone') || '5511999999999';

  // State
  let lastSubmittedData = null;

  // 1. Phone Mask for WhatsApp
  if (whatsappInput) {
    whatsappInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      
      if (v.length > 10) {
        // (XX) XXXXX-XXXX
        v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
      } else if (v.length > 6) {
        // (XX) XXXX-XXXX
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
      } else if (v.length > 2) {
        // (XX) XXX...
        v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
      } else if (v.length > 0) {
        v = '(' + v;
      }
      e.target.value = v;
      updateProgress();
      saveDraft();
    });
  }

  // 2. Address Checkbox Toggle
  if (semEnderecoCheckbox) {
    semEnderecoCheckbox.addEventListener('change', () => {
      const parentCard = semEnderecoCheckbox.closest('.checkbox-card');
      if (semEnderecoCheckbox.checked) {
        if (parentCard) parentCard.classList.add('checked');
        enderecoGroup.style.display = 'none';
        enderecoInput.value = '';
      } else {
        if (parentCard) parentCard.classList.remove('checked');
        enderecoGroup.style.display = 'flex';
      }
      updateProgress();
      saveDraft();
    });
  }

  // 3. Progress Tracker (8 fields)
  const trackedFieldIds = [
    'segmento',
    'servicos',
    'whatsapp',
    'email',
    'diferenciais',
    'quemSomos',
    'infoAdicionais'
  ];

  function updateProgress() {
    let filled = 0;
    const totalFields = 8; // 7 base fields + endereco (or digital check)

    trackedFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value.trim().length > 0) {
        filled++;
      }
    });

    // Endereco count
    if (semEnderecoCheckbox && semEnderecoCheckbox.checked) {
      filled++;
    } else if (enderecoInput && enderecoInput.value.trim().length > 0) {
      filled++;
    }

    const percent = Math.min(100, Math.round((filled / totalFields) * 100));

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressCount) progressCount.textContent = `${filled} de ${totalFields} campos preenchidos`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
  }

  // Listen to inputs
  form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => {
      updateProgress();
      saveDraft();
    });
  });

  // 4. Auto Save Draft
  function saveDraft() {
    try {
      const draft = {
        segmento: document.getElementById('segmento')?.value || '',
        servicos: document.getElementById('servicos')?.value || '',
        whatsapp: document.getElementById('whatsapp')?.value || '',
        email: document.getElementById('email')?.value || '',
        endereco: document.getElementById('endereco')?.value || '',
        semEnderecoFisico: semEnderecoCheckbox?.checked || false,
        diferenciais: document.getElementById('diferenciais')?.value || '',
        quemSomos: document.getElementById('quemSomos')?.value || '',
        infoAdicionais: document.getElementById('infoAdicionais')?.value || ''
      };
      localStorage.setItem('sf_briefing_draft', JSON.stringify(draft));
    } catch (e) {
      console.error('Error saving draft', e);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem('sf_briefing_draft');
      if (!raw) {
        updateProgress();
        return;
      }
      const data = JSON.parse(raw);
      if (data.segmento) document.getElementById('segmento').value = data.segmento;
      if (data.servicos) document.getElementById('servicos').value = data.servicos;
      if (data.whatsapp) document.getElementById('whatsapp').value = data.whatsapp;
      if (data.email) document.getElementById('email').value = data.email;
      if (data.endereco) document.getElementById('endereco').value = data.endereco;
      if (data.semEnderecoFisico) {
        semEnderecoCheckbox.checked = true;
        const parentCard = semEnderecoCheckbox.closest('.checkbox-card');
        if (parentCard) parentCard.classList.add('checked');
        enderecoGroup.style.display = 'none';
      }
      if (data.diferenciais) document.getElementById('diferenciais').value = data.diferenciais;
      if (data.quemSomos) document.getElementById('quemSomos').value = data.quemSomos;
      if (data.infoAdicionais) document.getElementById('infoAdicionais').value = data.infoAdicionais;

      updateProgress();
    } catch (e) {
      console.error('Error restoring draft', e);
      updateProgress();
    }
  }

  // 5. Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const segmento = document.getElementById('segmento').value.trim();
    const servicos = document.getElementById('servicos').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const email = document.getElementById('email').value.trim();
    const diferenciais = document.getElementById('diferenciais').value.trim();
    const quemSomos = document.getElementById('quemSomos').value.trim();
    const infoAdicionais = document.getElementById('infoAdicionais').value.trim();
    const semEndereco = semEnderecoCheckbox.checked;
    const endereco = semEndereco ? 'Negócio 100% Digital / Sem endereço físico' : document.getElementById('endereco').value.trim();

    // Required checks
    if (!segmento || !servicos || !whatsapp || !email) {
      showToast('Por favor, preencha os campos obrigatórios (Segmento, Serviços, WhatsApp e E-mail).', 'error');
      return;
    }

    const submission = {
      id: 'briefing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'novo',
      segmento,
      servicos,
      whatsapp,
      email,
      endereco: endereco || 'Não informado',
      semEnderecoFisico: semEndereco,
      diferenciais: diferenciais || 'Não informado',
      quemSomos: quemSomos || 'Não informado',
      infoAdicionais: infoAdicionais || 'Nenhuma informação adicional inserida.'
    };

    lastSubmittedData = submission;

    // 1) Save to LocalStorage
    saveToLocalStorage(submission);

    // 2) Try to save to Server REST API if available
    try {
      await fetch('/api/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });
    } catch (err) {
      // Offline / standalone file:// mode is totally fine!
      console.log('API offline or standalone static mode. Saved locally.');
    }

    // 3) Broadcast to other tabs (Admin Dashboard)
    notifyAdminUpdated(submission);

    // 4) Clear Draft
    localStorage.removeItem('sf_briefing_draft');

    // 5) Open Success Modal
    openSuccessModal(submission);
    showToast('Briefing salvo com sucesso!', 'success');
  });

  function saveToLocalStorage(submission) {
    try {
      const existing = JSON.parse(localStorage.getItem('sf_briefing_respostas') || '[]');
      existing.unshift(submission);
      localStorage.setItem('sf_briefing_respostas', JSON.stringify(existing));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  function notifyAdminUpdated(submission) {
    try {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'NEW_SUBMISSION', data: submission });
      }
      localStorage.setItem('sf_briefings_updated', Date.now().toString());
    } catch (e) {
      console.error('Error broadcasting update', e);
    }
  }

  // 6. Modal & Actions
  function openSuccessModal(data) {
    // Generate WhatsApp text
    const cleanNumber = stanleyPhone.replace(/\D/g, '');
    const waText = generateWhatsAppMessage(data);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(waText)}`;

    if (btnModalWhatsapp) {
      btnModalWhatsapp.onclick = () => {
        window.open(waUrl, '_blank');
      };
    }

    if (btnModalDownload) {
      btnModalDownload.onclick = () => {
        downloadSubmissionText(data);
      };
    }

    successModal.classList.add('active');
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      successModal.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function generateWhatsAppMessage(d) {
    let msg = `🚀 *NOVO BRIEFING DE LANDING PAGE*\n`;
    msg += `--------------------------------------\n`;
    msg += `👤 *Contato:* ${d.whatsapp} | ${d.email}\n`;
    msg += `🎯 *Segmento:* ${d.segmento}\n\n`;
    msg += `🛠️ *Serviços Oferecidos:*\n${d.servicos}\n\n`;
    msg += `📍 *Endereço:* ${d.endereco}\n\n`;
    msg += `⭐ *Diferenciais:*\n${d.diferenciais}\n\n`;
    msg += `🏢 *Quem Somos:*\n${d.quemSomos}\n\n`;
    msg += `📊 *Cases / Resultados / Info Adicional:*\n${d.infoAdicionais}\n`;
    msg += `--------------------------------------\n`;
    msg += `📅 Enviado em: ${d.displayDate}`;
    return msg;
  }

  function downloadSubmissionText(d) {
    const text = generateWhatsAppMessage(d);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `briefing-${d.segmento.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download do arquivo de texto iniciado!', 'info');
  }

  // 7. Toast Helper
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

  // Initialize
  loadDraft();
});
