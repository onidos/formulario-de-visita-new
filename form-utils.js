/**
 * form-utils.js — Utilitários compartilhados entre todos os formulários
 * Importar ANTES do script específico de cada página.
 */

// ── Geolocalização + Geocoding reverso ──────────────────────────────────────

/**
 * Obtém a localização atual do usuário e preenche os campos de endereço.
 * @param {object} opts - { enderecoInput, latitudeInput, longitudeInput, cidadeInput? }
 */
async function obterLocalizacao({ enderecoInput, latitudeInput, longitudeInput, cidadeInput }) {
  if (!navigator.geolocation) {
    alert('A geolocalização não é suportada neste navegador.');
    return;
  }
  enderecoInput.value = 'Obtendo localização…';
  enderecoInput.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      latitudeInput.value = coords.latitude;
      longitudeInput.value = coords.longitude;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1&zoom=18`;
        const data = await fetchJSON(url);
        enderecoInput.value = data.display_name ?? 'Endereço não encontrado';
        if (cidadeInput) cidadeInput.value = extrairCidade(data.address);
        alert('Localização obtida com sucesso!');
      } catch {
        enderecoInput.value = 'Erro ao buscar endereço';
      } finally {
        enderecoInput.disabled = false;
      }
    },
    (err) => {
      enderecoInput.value = '';
      enderecoInput.disabled = false;
      console.error(err);
      alert('Não foi possível obter sua localização. Por favor, digite o endereço manualmente.');
    }
  );
}

/**
 * Inicializa autocomplete de endereço usando Nominatim.
 * @param {object} opts - { enderecoInput, latitudeInput, longitudeInput, cidadeInput? }
 */
function inicializarAutocomplete({ enderecoInput, latitudeInput, longitudeInput, cidadeInput }) {
  const list = document.createElement('ul');
  list.id = 'autocomplete-list';
  enderecoInput.parentNode.appendChild(list);

  let timer = null;
  enderecoInput.addEventListener('input', () => {
    clearTimeout(timer);
    const q = enderecoInput.value.trim();
    if (q.length < 3) { list.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=br`;
        const results = await fetchJSON(url);
        list.innerHTML = '';
        results.forEach(p => {
          const li = document.createElement('li');
          li.textContent = p.display_name;
          li.addEventListener('click', () => {
            enderecoInput.value = p.display_name;
            latitudeInput.value = p.lat;
            longitudeInput.value = p.lon;
            if (cidadeInput) cidadeInput.value = extrairCidade(p.address);
            list.innerHTML = '';
          });
          list.appendChild(li);
        });
      } catch (e) { console.error('Autocomplete error:', e); }
    }, 500);
  });

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!enderecoInput.contains(e.target)) list.innerHTML = '';
  });
}

// ── Data / Hora ─────────────────────────────────────────────────────────────

/**
 * Preenche inputs de data e hora com o momento atual.
 */
function preencherDataHora(dataInput, horarioInput) {
  const now = new Date();
  if (dataInput) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dataInput.value = `${y}-${m}-${d}`;
  }
  if (horarioInput) {
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    horarioInput.value = `${h}:${min}`;
  }
}

// ── Validação ────────────────────────────────────────────────────────────────

/**
 * Valida todos os campos [required] de um card.
 * Marca com classe .error os inválidos.
 * @returns {boolean}
 */
function validarCard(card) {
  let valido = true;
  card.querySelectorAll('[required]').forEach(input => {
    const ok = input.tagName === 'SELECT'
      ? Array.from(input.options).some(o => o.selected && o.value !== '')
      : input.value.trim() !== '';
    input.classList.toggle('error', !ok);
    if (!ok) valido = false;
  });
  return valido;
}

// ── Envio de formulário ──────────────────────────────────────────────────────

/**
 * Envia o formulário via fetch (no-cors) e redireciona para sucesso.html.
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} btn - Botão de envio (para mostrar loading)
 */
async function enviarFormulario(form, btn) {
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    await fetch(form.action, {
      method: 'POST',
      mode: 'no-cors',
      body: new FormData(form),
    });
    window.location.href = 'sucesso.html';
  } catch (err) {
    console.error('Erro ao enviar:', err);
    alert('Ocorreu um erro ao enviar. Por favor, tente novamente.');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function extrairCidade(address = {}) {
  return address.city || address.town || address.village || '';
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
