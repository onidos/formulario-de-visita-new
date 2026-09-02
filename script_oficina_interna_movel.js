/**
 * script_oficina_interna_movel.js
 * Depende de: form-utils.js, form-engine.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('agendamento-form');
  const engine = new FormEngine(form, {
    onBeforeNext:   validacaoEspecifica,
    onBeforeSimNao: validacaoSimNaoEspecifica,
  });
  engine.init();

  preencherDataHora(
    document.getElementById('data-visita'),
    document.getElementById('horario-visita')
  );

  aplicarMascaraCNPJ(document.getElementById('CNPJ_Oficina'));

  const enderecoInput  = document.getElementById('endereco');
  const latitudeInput  = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');

  document.getElementById('get-location')?.addEventListener('click', () =>
    obterLocalizacao({ enderecoInput, latitudeInput, longitudeInput })
  );
  if (enderecoInput) inicializarAutocomplete({ enderecoInput, latitudeInput, longitudeInput });

  document.getElementById('home-btn')?.addEventListener('click', () => {
    window.location.href = 'index_visita_oficina.html';
  });

  // ── Card 0b ───────────────────────────────────────────────
  document.getElementById('btn-presencial')?.addEventListener('click', () => {
    document.getElementById('presencial-telefone').value = 'Presencial';
    engine.showCard('2');
  });
  document.getElementById('btn-telefone')?.addEventListener('click', () => {
    document.getElementById('presencial-telefone').value = 'Telefone';
    engine.showCard('2');
  });

  // ── Card 4b: visita completa ──────────────────────────────
  form.querySelectorAll('.visita-completa-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      const resposta = btn.dataset.value;
      const destino = isProspeccao() ? '5' : (resposta === 'Sim' ? '5' : '9b-alt');
      document.getElementById('visita-completa-hidden').value = (destino === '5') ? 'Sim' : 'Nao';
      engine.showCard(destino);
    }, true);
  });

  // ── Card 9b-alt: escolha de modo (importar ou manual) ────
  document.getElementById('btn-modo-importar')?.addEventListener('click', () => {
    document.getElementById('input-import-sac-vol')?.click();
  });

  document.getElementById('btn-modo-manual')?.addEventListener('click', () => {
    AppStorage.remove('sac_dados');
    atualizarPrevFornecedores();
    engine.showCard('9-alt');
  });

  inicializarImportSACVolume({
    btnId:    'btn-import-sac-vol',
    inputId:  'input-import-sac-vol',
    statusId: 'import-sac-vol-status',
    idMap: {
      total:     'veiculos-manutencao',
      fs:        'veiculos-fs',
      aprovacao: 'veiculos-aprovacao',
      servico:   'veiculos-servico',
      pecas:     'veiculos-pecas',
      orcamento: 'veiculos-orcamento',
    },
    onImportado: (dados) => {
      atualizarPrevFornecedores();
      const statusEl = document.getElementById('import-sac-vol-status');
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#f0faf4';
        statusEl.style.border = '1px solid #a3d9b1';
        statusEl.style.color = '#1a5c30';
        statusEl.textContent = `✅ ${dados.total} veículos importados. Avançando...`;
      }
      setTimeout(() => engine.showCard('16-alt'), 1200);
    },
  });

  // Atualiza o Anterior do card de fornecedores dinamicamente
  function atualizarPrevFornecedores() {
    const btn = document.getElementById('prev-btn-16-alt');
    if (!btn) return;
    const sacImportado = AppStorage.get('sac_dados');
    btn.dataset.card = sacImportado ? '9b-alt' : '15-alt';
  }

  atualizarPrevFornecedores();

  // ── Submit ────────────────────────────────────────────────
  function setupSubmit(btn) {
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = engine.currentCard();

      const tabelaContainer = document.getElementById('tabela-improdutivos');
      const modoSAC = document.getElementById('modo-sac');
      if (modoSAC && modoSAC.style.display !== 'none' && tabelaContainer?._validarTodos) {
        if (!tabelaContainer._validarTodos()) return;
      } else {
        if (!validarCard(card)) { engine._shakeCard(card); alert('Por favor, preencha todos os campos obrigatórios.'); return; }
      }

      enviarFormulario(form, btn);
    });
  }
  setupSubmit(document.getElementById('submit-btn'));
  setupSubmit(document.getElementById('submit-btn-prospeccao'));

  // ── Validações ────────────────────────────────────────────
  function validacaoEspecifica(card) {
    const cardId = card.id.replace('card-', '');

    // Card 9-alt: se total = 0 pula direto para fornecedores
    if (cardId === '9-alt') {
      const total = parseInt(document.getElementById('veiculos-manutencao')?.value) || 0;
      if (total === 0) {
        ['veiculos-fs','veiculos-aprovacao','veiculos-servico',
         'veiculos-pecas','veiculos-orcamento','veiculos-entregues'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '0';
        });
        AppStorage.remove('sac_dados');
        engine.showCard('16-alt');
        return false;
      }
    }

    if (cardId === '15-alt') {
      const total     = parseInt(document.getElementById('veiculos-manutencao')?.value) || 0;
      const entregues = parseInt(document.getElementById('veiculos-entregues')?.value) || 0;
      if (entregues > total) {
        document.getElementById('veiculos-entregues')?.classList.add('error');
        alert(`Veículos a entregar (${entregues}) não pode ser maior que o total (${total}).`);
        return false;
      }
      document.getElementById('veiculos-entregues')?.classList.remove('error');
    }
  }

  function validacaoSimNaoEspecifica(card, cardId, resposta) {
    if (cardId === '4b') return false;

    if (cardId === '16-alt' && resposta === 'Sim') {
      const qtd = card.querySelector('#necessidade-aumento-fornecedores');
      if (qtd && !qtd.value.trim()) {
        qtd.classList.add('error');
        alert('Por favor, informe o número de fornecedores necessários.');
        return false;
      }
      qtd?.classList.remove('error');
    }

    const comComentNao = ['5','6','7','8-alt'];
    if (comComentNao.includes(cardId) && resposta === 'Nao') {
      const ta = card.querySelector('textarea');
      if (ta && !ta.value.trim()) {
        ta.classList.add('error');
        alert('Por favor, descreva o que precisa ser melhorado.');
        return false;
      }
      if (ta) ta.classList.remove('error');
    }

    if (cardId === '8-alt' && isProspeccao()) { engine.showCard('8-fim'); return false; }

    // Ao sair do card de fornecedores (16-alt), renderiza a tabela antes de mostrar card 17-alt
    if (cardId === '16-alt') {
      setTimeout(() => renderizarImprodutivos(), 50);
    }
  }

  // ── Toggles veículos manuais (modo sem SAC) ──────────────
  document.querySelectorAll('.veiculo-skip-cb').forEach(cb => {
    cb.addEventListener('change', () => toggleVeiculo(cb.dataset.target, cb.checked));
  });

  // ── Fotos dos veículos manuais (múltiplas por veículo) ────
  const fotosManuais = { 1: [], 2: [], 3: [] };

  function renderizarFotosManuais(n) {
    const container = document.getElementById(`fotos-preview-${n}`);
    if (!container) return;
    container.innerHTML = fotosManuais[n].map((f, i) => `
      <div style="position:relative;display:inline-block;">
        <img src="data:${f.mime};base64,${f.base64}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #dde3ee;">
        <button type="button" class="foto-manual-remover-btn" data-target="${n}" data-fotoidx="${i}" title="Remover"
          style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;line-height:18px;border-radius:50%;border:none;background:#c0392b;color:#fff;font-size:.7rem;cursor:pointer;padding:0;">✕</button>
      </div>
    `).join('');
    container.querySelectorAll('.foto-manual-remover-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        fotosManuais[n].splice(parseInt(btn.dataset.fotoidx), 1);
        atualizarHiddenFotos(n);
        renderizarFotosManuais(n);
      });
    });
  }

  function atualizarHiddenFotos(n) {
    const hidden = form.querySelector(`[name="fotos${n}"]`);
    if (hidden) hidden.value = JSON.stringify(fotosManuais[n]);
  }

  function salvarFotoManual(n, dados) {
    fotosManuais[n].push(dados);
    atualizarHiddenFotos(n);
    renderizarFotosManuais(n);
  }
  const erroFotoManual = (msg) => alert('Erro ao processar a foto: ' + msg);

  document.querySelectorAll('.foto-manual-camera-btn').forEach(btn => {
    ativarCapturaFoto(btn, (dados) => salvarFotoManual(btn.dataset.target, dados), erroFotoManual, { capture: 'environment' });
  });
  document.querySelectorAll('.foto-manual-galeria-btn').forEach(btn => {
    ativarCapturaFoto(btn, (dados) => salvarFotoManual(btn.dataset.target, dados), erroFotoManual);
  });

  // ── Scanner de placa (câmera dedicada, ao lado do campo) ──
  // A foto tirada aqui é usada só para o OCR — não é salva como foto do veículo.
  async function lerPlacaEPreencher(n, dados) {
    const statusEl = document.getElementById(`ocr-status-${n}`);
    if (statusEl) statusEl.textContent = '🔎 Lendo a placa na foto…';
    const placa = await tentarLerPlaca(dados.base64, dados.mime);
    if (!statusEl) return;
    if (placa) {
      const placaInput = form.querySelector(`[name="placa${n}"]`);
      if (placaInput) {
        placaInput.value = placa;
        placaInput.style.background = '#fff9e0';
        setTimeout(() => { placaInput.style.background = ''; }, 4000);
      }
      statusEl.textContent = `🔎 Placa lida: ${placa} — confira antes de enviar.`;
    } else {
      statusEl.textContent = '⚠️ Não foi possível ler a placa. Digite manualmente.';
    }
  }

  document.querySelectorAll('.scan-placa-btn').forEach(btn => {
    ativarCapturaFoto(btn,
      (dados) => lerPlacaEPreencher(btn.dataset.target, dados),
      (msg) => alert('Erro ao processar a foto: ' + msg),
      { capture: 'environment' }
    );
  });

  function limparFotoManual(n) {
    fotosManuais[n] = [];
    atualizarHiddenFotos(n);
    renderizarFotosManuais(n);
  }

  // ── Tabela de improdutivos (card 17-alt) ──────────────────
  function renderizarImprodutivos() {
    const dados      = AppStorage.get('sac_dados');
    const modoSAC    = document.getElementById('modo-sac');
    const modoManual = document.getElementById('modo-manual');
    const aviso      = document.getElementById('aviso-servico-obrig');

    if (dados && dados.veiculos && dados.veiculos.length > 0) {
      if (modoSAC)    modoSAC.style.display    = 'block';
      if (modoManual) modoManual.style.display  = 'none';

      if (aviso) {
        aviso.textContent = '⚠️ Tipo de Serviço e Ação são obrigatórios para todos os veículos.';
        aviso.style.display = 'block';
      }

      inicializarTabelaVeiculos({
        containerId:   'tabela-improdutivos',
        hiddenInputId: 'veiculos-json',
        veiculos:      dados.veiculos,
      });
    } else {
      if (modoSAC)    modoSAC.style.display    = 'none';
      if (modoManual) modoManual.style.display  = 'block';
      if (aviso)      aviso.style.display       = 'none';
    }
  }

  function toggleVeiculo(n, desabilitar) {
    const body  = document.getElementById(`veiculo-body-${n}`);
    const placa = document.querySelector(`[name="placa${n}"]`);
    const scanBtn = document.querySelector(`.scan-placa-btn[data-target="${n}"]`);
    const card  = document.getElementById(`veiculo-card-${n}`);
    if (!body || !placa) return;
    placa.disabled = desabilitar;
    if (scanBtn) scanBtn.disabled = desabilitar;
    if (desabilitar) placa.value = '';
    body.style.display = desabilitar ? 'none' : 'block';
    body.querySelectorAll('input, select').forEach(el => {
      el.disabled = desabilitar;
      if (desabilitar) el.value = '';
    });
    if (desabilitar) limparFotoManual(n);
    card?.classList.toggle('vehicle-card--disabled', desabilitar);
  }

  function isProspeccao() {
    const sel = document.getElementById('motivo');
    if (!sel) return false;
    return Array.from(sel.selectedOptions).some(o => o.value === 'Prospecção');
  }
});
