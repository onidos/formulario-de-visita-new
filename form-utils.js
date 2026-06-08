/**
 * form-utils.js — Utilitários compartilhados entre todos os formulários
 */

// ── Storage com namespace (evita vazamento entre sessões/abas) ───────────────
// Usa sessionStorage em vez de localStorage: dados são descartados ao fechar
// a aba, eliminando o risco de um estado antigo "contaminar" uma nova sessão.

const AppStorage = {
  _key: (k) => `visita_oficina__${k}`,
  set(k, v)  { try { sessionStorage.setItem(this._key(k), JSON.stringify(v)); } catch(_){} },
  get(k)     { try { const r = sessionStorage.getItem(this._key(k)); return r ? JSON.parse(r) : null; } catch(_){ return null; } },
  remove(k)  { try { sessionStorage.removeItem(this._key(k)); } catch(_){} },
};

// ── Validação e máscara de CNPJ ──────────────────────────────────────────────

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (str, n) => {
    let s = 0, p = n;
    for (let i = 0; i < n - 1; i++) { s += parseInt(str[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(cnpj, 13) === parseInt(cnpj[12]) && calc(cnpj, 14) === parseInt(cnpj[13]);
}

function aplicarMascaraCNPJ(input) {
  if (!input) return;
  input.setAttribute('maxlength', '18');
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('placeholder', '00.000.000/0000-00');

  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12)     v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
    else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
    else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
    input.value = v;
  });

  input.addEventListener('blur', () => {
    const digits = input.value.replace(/\D/g, '');
    if (digits.length > 0 && !validarCNPJ(digits)) {
      input.classList.add('error');
      input.setCustomValidity('CNPJ inválido');
    } else {
      input.classList.remove('error');
      input.setCustomValidity('');
    }
  });
}

// ── Geolocalização + Geocoding reverso ──────────────────────────────────────

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

  document.addEventListener('click', (e) => {
    if (!enderecoInput.contains(e.target)) list.innerHTML = '';
  });
}

// ── Data / Hora ─────────────────────────────────────────────────────────────

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

function validarCard(card) {
  let valido = true;
  card.querySelectorAll('[required]').forEach(input => {
    if (input.disabled) return;
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
 * Envia via form.submit() nativo usando iframe oculto como target.
 * Lê a resposta JSON do GAS e passa o resultado para sucesso.html via sessionStorage.
 */
function enviarFormulario(form, btn) {
  btn.classList.add('loading');
  btn.disabled = true;

  const iframeName = 'submit-target-' + Date.now();
  const iframe = document.createElement('iframe');
  iframe.name = iframeName;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  // Timeout de segurança: se o GAS não responder em 20s
  const fallbackTimer = setTimeout(() => {
    AppStorage.set('submit_result', { planilha: 'desconhecido', email: 'desconhecido' });
    window.location.href = 'sucesso.html';
  }, 20000);

  iframe.addEventListener('load', () => {
    clearTimeout(fallbackTimer);
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const texto = iframeDoc.body ? iframeDoc.body.innerText.trim() : '';
      const json  = JSON.parse(texto);
      AppStorage.set('submit_result', {
        planilha: json.planilha || (json.status === 'ok' ? 'ok' : 'erro'),
        email:    json.email    || (json.status === 'ok' ? 'ok' : 'desconhecido'),
        erro:     json.erro     || json.message || '',
      });
    } catch (_) {
      AppStorage.set('submit_result', { planilha: 'ok', email: 'desconhecido' });
    }
    window.location.href = 'sucesso.html';
  });

  form.target = iframeName;
  form.submit();
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
