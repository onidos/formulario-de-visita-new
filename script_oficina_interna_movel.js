/**
 * script_oficina_interna_movel.js
 * Lógica específica do formulário de Oficina Interna / Móvel.
 * Depende de: form-utils.js, form-engine.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.getElementById('agendamento-form');
  const engine = new FormEngine(form, {
    onBeforeNext: validacaoEspecifica,
    onBeforeSimNao: validacaoSimNaoEspecifica,
  });
  engine.init();

  // ── Data / Hora ─────────────────────────────────────────
  preencherDataHora(
    document.getElementById('data-visita'),
    document.getElementById('horario-visita')
  );

  // ── Geolocalização ───────────────────────────────────────
  const enderecoInput  = document.getElementById('endereco');
  const latitudeInput  = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');
  const geoBtn         = document.getElementById('get-location');

  if (geoBtn) {
    geoBtn.addEventListener('click', () =>
      obterLocalizacao({ enderecoInput, latitudeInput, longitudeInput })
    );
  }

  if (enderecoInput) {
    inicializarAutocomplete({ enderecoInput, latitudeInput, longitudeInput });
  }

  // ── Botão Home ───────────────────────────────────────────
  document.getElementById('home-btn')?.addEventListener('click', () => {
    window.location.href = 'index_visita_oficina.html';
  });

  // ── Envio ────────────────────────────────────────────────
  const submitBtn = document.querySelector('.submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = engine.currentCard();
      if (!validarCard(card)) {
        engine._shakeCard(card);
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      enviarFormulario(form, submitBtn);
    });
  }

  // ── Validações específicas ────────────────────────────────

  function validacaoEspecifica(card, nextId) {
    const cardId = card.id.replace('card-', '');

    // Card 15-alt: entregues não pode ser > total em manutenção
    if (cardId === '15-alt') {
      const total    = parseInt(document.getElementById('veiculos-manutencao')?.value) || 0;
      const entregues = parseInt(document.getElementById('veiculos-entregues')?.value) || 0;
      if (entregues > total) {
        document.getElementById('veiculos-entregues')?.classList.add('error');
        alert(`Veículos a entregar (${entregues}) não pode ser maior que o total em manutenção (${total}).`);
        return false;
      }
      document.getElementById('veiculos-entregues')?.classList.remove('error');
    }
  }

  function validacaoSimNaoEspecifica(card, cardId, resposta) {
    // Card 16-alt (fornecedores): número obrigatório se Sim
    if (cardId === '16-alt' && resposta === 'Sim') {
      const qtd = card.querySelector('#necessidade-aumento-fornecedores');
      if (qtd && !qtd.value.trim()) {
        qtd.classList.add('error');
        alert('Por favor, informe o número de fornecedores necessários.');
        return false;
      }
      qtd?.classList.remove('error');
    }

    // Cards com comentário obrigatório quando "Não"
    const cardsComentarioNao = ['5','6','7','8-alt'];
    if (cardsComentarioNao.includes(cardId) && resposta === 'Nao') {
      const textarea = card.querySelector('textarea');
      if (textarea && !textarea.value.trim()) {
        textarea.classList.add('error');
        alert('Por favor, descreva o que precisa ser melhorado.');
        return false;
      }
      if (textarea) textarea.classList.remove('error');
    }
  }
});
