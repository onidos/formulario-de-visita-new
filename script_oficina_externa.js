/**
 * script_oficina_externa.js
 * Lógica específica do formulário de Oficina Externa.
 * Depende de: form-utils.js, form-engine.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('agendamento-form');
  const engine  = new FormEngine(form, {
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
  const cidadeInput    = document.getElementById('cidade-input');
  const geoBtn         = document.getElementById('get-location');

  if (geoBtn) {
    geoBtn.addEventListener('click', () =>
      obterLocalizacao({ enderecoInput, latitudeInput, longitudeInput, cidadeInput })
    );
  }

  if (enderecoInput) {
    inicializarAutocomplete({ enderecoInput, latitudeInput, longitudeInput, cidadeInput });
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

    // Card 15: soma dos sub-totais deve bater com o total
    if (cardId === '15') {
      const ids = ['veiculos-total','veiculos-orcamento','veiculos-pendentes',
                   'veiculos-aprovados','veiculos-aguardando','veiculos-FS'];
      const [total, orcamento, pendentes, aprovados, aguardando, fs] =
        ids.map(id => parseInt(document.getElementById(id)?.value) || 0);
      const soma = orcamento + pendentes + aprovados + aguardando + fs;
      if (soma !== total) {
        ids.forEach(id => document.getElementById(id)?.classList.add('error'));
        alert(`A soma dos veículos (${soma}) não corresponde ao total (${total}). Por favor, corrija.`);
        return false;
      }
      ids.forEach(id => document.getElementById(id)?.classList.remove('error'));
    }

    // Card 16: entregues não pode ser > total
    if (cardId === '16') {
      const total    = parseInt(document.getElementById('veiculos-total')?.value) || 0;
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
    // Card 17 (fornecedores): Se Sim, número de fornecedores é obrigatório
    if (cardId === '17' && resposta === 'Sim') {
      const qtd = card.querySelector('#necessidade-aumento-fornecedores');
      if (qtd && !qtd.value.trim()) {
        qtd.classList.add('error');
        alert('Por favor, informe o número de fornecedores necessários.');
        return false;
      }
      qtd?.classList.remove('error');
    }

    // Cards 5,6,7,8: comentário obrigatório se Não
    const cardsComComentarioNao = ['5','6','7','8'];
    if (cardsComComentarioNao.includes(cardId) && resposta === 'Nao') {
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
