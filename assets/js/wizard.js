// ===========================
// INDIVIDUELLE LÖSUNG — STEPPER
// ===========================

/**
 * @typedef {Object} StepperData
 * @property {string}   betreut     - 'Ja' | 'Nein'
 * @property {string[]} automaten   - Selected automat types (e.g. ['Heißgetränkeautomat'])
 * @property {string}   mitarbeiter - Employee count range (e.g. 'Unter 100')
 * @property {string}   bundesland  - Federal state (e.g. 'Wien')
 * @property {string}   vorname     - First name
 * @property {string}   nachname    - Last name
 * @property {string}   telefon     - Phone number
 * @property {string}   email       - E-mail address
 */

const TOTAL_STEPS = 5;
let currentStep = 1;
document.getElementById('form_timestamp').value = Date.now();

// ── CSRF TOKEN (double-submit cookie pattern) ──
function generateCSRF() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
const csrfToken = generateCSRF();
document.getElementById('csrf_token').value = csrfToken;
document.cookie = `csrf_token=${csrfToken}; SameSite=Strict; Secure; Path=/`;

// ── INPUT SANITIZATION ──
function sanitize(str) {
  return str.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── EMAIL OVERVIEW BUILDER ──
/**
 * Build a plain-text overview of all stepper answers for use in an email body.
 * Called inside submitForm() once validation passes.
 *
 * @param {StepperData} data
 * @returns {string}
 */
function buildStepperEmailOverview(data) {
  const automatenList = Array.isArray(data.automaten) && data.automaten.length
    ? data.automaten.join(', ')
    : '–';
  return [
    '=== Anfrage: Individuelle Automatenlösung ===',
    '',
    'Kontakt',
    '  Name:        ' + data.vorname + ' ' + data.nachname,
    '  E-Mail:      ' + data.email,
    '  Telefon:     ' + data.telefon,
    '',
    'Angaben',
    '  Betreut:     ' + (data.betreut     ?? '–'),
    '  Automaten:   ' + automatenList,
    '  Mitarbeiter: ' + (data.mitarbeiter ?? '–'),
    '  Bundesland:  ' + (data.bundesland  ?? '–'),
    '',
    '===========================================',
  ].join('\n');
}

// ─── SLOT DEFINITIONS ───
// Each key maps to a bg colour, label, and an SVG inner drawing function.
const SLOT_DEFS = {
  heiss: {
    label: 'Heißgetränke',
    bg: '#1a0800',
    accent: '#c0692a',
    draw: (cx, cy, h) => {
      const cw = 28, ch = Math.min(h * 0.55, 36);
      const cx1 = cx - 18, cx2 = cx + 18;
      const top = cy - ch / 2, bot = cy + ch / 2;
      const c1 = `
        <path d="M${cx1-cw/2+4} ${top} L${cx1-cw/2} ${bot} L${cx1+cw/2} ${bot} L${cx1+cw/2-4} ${top} Z" fill="#8B5E3C"/>
        <rect x="${cx1-cw/2+1}" y="${top-4}" width="${cw-2}" height="5" rx="2" fill="#6B3F1F"/>
        <path d="M${cx1+cw/2} ${top+4} Q${cx1+cw/2+10} ${top+4} ${cx1+cw/2+10} ${cy} Q${cx1+cw/2+10} ${bot-4} ${cx1+cw/2} ${bot-4}" stroke="#8B5E3C" stroke-width="2.5" fill="none"/>
      `;
      const c2 = `
        <path d="M${cx2-cw/2+4} ${top} L${cx2-cw/2} ${bot} L${cx2+cw/2} ${bot} L${cx2+cw/2-4} ${top} Z" fill="#8B5E3C"/>
        <rect x="${cx2-cw/2+1}" y="${top-4}" width="${cw-2}" height="5" rx="2" fill="#6B3F1F"/>
        <path d="M${cx2+cw/2} ${top+4} Q${cx2+cw/2+10} ${top+4} ${cx2+cw/2+10} ${cy} Q${cx2+cw/2+10} ${bot-4} ${cx2+cw/2} ${bot-4}" stroke="#8B5E3C" stroke-width="2.5" fill="none"/>
      `;
      const steam = `
        <path d="M${cx1-6} ${top-5} Q${cx1-4} ${top-14} ${cx1-6} ${top-22}" stroke="rgba(255,255,255,0.28)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx1+4} ${top-5} Q${cx1+6} ${top-16} ${cx1+4} ${top-24}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx2-6} ${top-5} Q${cx2-4} ${top-14} ${cx2-6} ${top-22}" stroke="rgba(255,255,255,0.28)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx2+4} ${top-5} Q${cx2+6} ${top-16} ${cx2+4} ${top-24}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" stroke-linecap="round"/>
      `;
      return c1 + c2 + steam;
    }
  },
  getraenke: {
    label: 'Getränke',
    bg: '#001510',
    accent: '#1e88e5',
    draw: (cx, cy, h) => {
      const colors = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#ab47bc'];
      const n = 5, gap = 22;
      const startX = cx - (n - 1) * gap / 2;
      const bh = Math.min(h * 0.6, 38), bw = 12;
      let out = '';
      for (let i = 0; i < n; i++) {
        const bx = startX + i * gap;
        const col = colors[i];
        out += `
          <rect x="${bx-bw/2+2}" y="${cy-bh/2}" width="${bw-4}" height="${bh*0.25}" rx="2" fill="${col}" opacity="0.9"/>
          <rect x="${bx-bw/2}" y="${cy-bh/2+bh*0.25}" width="${bw}" height="${bh*0.75}" rx="3" fill="${col}"/>
          <rect x="${bx-bw/2+2}" y="${cy-bh/2+bh*0.25}" width="4" height="${bh*0.4}" rx="1" fill="rgba(255,255,255,0.12)"/>
        `;
      }
      return out;
    }
  },
  snack: {
    label: 'Snacks',
    bg: '#0d0d00',
    accent: '#f9a825',
    draw: (cx, cy, h) => {
      const colors = ['#f9a825', '#ef5350', '#66bb6a', '#ab47bc', '#26c6da'];
      const n = 5, gap = 22;
      const startX = cx - (n - 1) * gap / 2;
      const pw = 16, ph = Math.min(h * 0.55, 32);
      let out = '';
      for (let i = 0; i < n; i++) {
        const px = startX + i * gap;
        const col = colors[i];
        out += `
          <rect x="${px-pw/2}" y="${cy-ph/2}" width="${pw}" height="${ph}" rx="3" fill="${col}" opacity="0.85"/>
          <rect x="${px-pw/2+2}" y="${cy-ph/2+3}" width="${pw-4}" height="2" rx="1" fill="rgba(0,0,0,0.18)"/>
          <rect x="${px-pw/2+2}" y="${cy-ph/2+7}" width="${pw-6}" height="2" rx="1" fill="rgba(0,0,0,0.12)"/>
        `;
      }
      return out;
    }
  },
  warm: {
    label: 'Warme Speisen',
    bg: '#0f0800',
    accent: '#e07010',
    draw: (cx, cy, h) => {
      const r = Math.min(h * 0.38, 28);
      const plate = `
        <ellipse cx="${cx}" cy="${cy+r*0.3}" rx="${r+6}" ry="${r*0.25}" fill="#3a3a3a"/>
        <ellipse cx="${cx}" cy="${cy+r*0.1}" rx="${r+4}" ry="${r*0.22}" fill="#4a4a4a"/>
        <ellipse cx="${cx}" cy="${cy-r*0.1}" rx="${r}" ry="${r*0.65}" fill="#c8860a"/>
        <ellipse cx="${cx-r*0.3}" cy="${cy-r*0.35}" rx="${r*0.45}" ry="${r*0.3}" fill="#e0a020"/>
        <ellipse cx="${cx+r*0.25}" cy="${cy-r*0.2}" rx="${r*0.35}" ry="${r*0.22}" fill="#b07010"/>
      `;
      const steam = `
        <path d="M${cx-16} ${cy-r*0.7} Q${cx-18} ${cy-r-10} ${cx-16} ${cy-r-22}" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M${cx-4} ${cy-r*0.8} Q${cx-6} ${cy-r-14} ${cx-4} ${cy-r-28}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx+8} ${cy-r*0.8} Q${cx+6} ${cy-r-14} ${cx+8} ${cy-r-28}" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx+20} ${cy-r*0.7} Q${cx+18} ${cy-r-10} ${cx+20} ${cy-r-22}" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none" stroke-linecap="round"/>
      `;
      return plate + steam;
    }
  },
  custom: {
    label: 'Individuell',
    bg: '#06060f',
    accent: '#F07D00',
    draw: (cx, cy, h) => {
      const r1 = Math.min(h * 0.32, 22), r2 = r1 * 0.55;
      const gear = (gx, gy, gr, teeth, col) => `
        <circle cx="${gx}" cy="${gy}" r="${gr}" stroke="${col}" stroke-width="3" fill="none" stroke-dasharray="${teeth} ${teeth*0.5}" opacity="0.8"/>
        <circle cx="${gx}" cy="${gy}" r="${gr*0.45}" fill="${col}" opacity="0.35"/>
        <circle cx="${gx}" cy="${gy}" r="${gr*0.22}" fill="${col}" opacity="0.8"/>
      `;
      const g1 = gear(cx, cy + r1 * 0.1, r1, 7, '#F07D00');
      const g2 = gear(cx - r1 - r2 + 4, cy - r1 * 0.5, r2, 5, '#FF9A2E');
      const g3 = gear(cx + r1 + r2 - 4, cy - r1 * 0.5, r2, 5, '#FF9A2E');
      const lines = `
        <line x1="${cx - r1}" y1="${cy}" x2="${cx - r1 - r2 + 4 + r2}" y2="${cy - r1*0.5}" stroke="rgba(240,125,0,0.2)" stroke-width="1.5"/>
        <line x1="${cx + r1}" y1="${cy}" x2="${cx + r1 + r2 - 4 - r2}" y2="${cy - r1*0.5}" stroke="rgba(240,125,0,0.2)" stroke-width="1.5"/>
      `;
      return lines + g1 + g2 + g3;
    }
  }
};

const DISPLAY_Y = 26, DISPLAY_H = 212, DISPLAY_X = 32, DISPLAY_W = 136;

function renderVMSlots(selectedKeys) {
  const slotsEl  = document.getElementById('vm-slots');
  const idleEl   = document.getElementById('vm-idle');
  const statusEl = document.getElementById('vm-status');

  if (selectedKeys.length === 0) {
    slotsEl.innerHTML = '';
    idleEl.style.display = '';
    statusEl.textContent = 'Wählen Sie eine Option ↗';
    return;
  }

  idleEl.style.display = 'none';

  const n = selectedKeys.length;
  const slotH = DISPLAY_H / n;
  let html = '';

  selectedKeys.forEach((key, i) => {
    const def = SLOT_DEFS[key];
    if (!def) return;

    const slotY = DISPLAY_Y + i * slotH;
    const cx = DISPLAY_X + DISPLAY_W / 2;
    const cy = slotY + slotH / 2;

    const sep = i > 0
      ? `<line x1="${DISPLAY_X + 6}" y1="${slotY}" x2="${DISPLAY_X + DISPLAY_W - 6}" y2="${slotY}" stroke="rgba(240,125,0,0.2)" stroke-width="1"/>`
      : '';

    const bg = `<rect x="${DISPLAY_X}" y="${slotY}" width="${DISPLAY_W}" height="${slotH}" fill="${def.bg}"/>`;

    const labelFontSize = Math.max(6, Math.min(8, slotH * 0.14));
    const label = `
      <rect x="${DISPLAY_X + DISPLAY_W - 60}" y="${slotY + slotH - 14}" width="56" height="11" rx="3" fill="${def.accent}" opacity="0.25"/>
      <text x="${DISPLAY_X + DISPLAY_W - 32}" y="${slotY + slotH - 6}" text-anchor="middle" font-size="${labelFontSize}" fill="${def.accent}" font-family="monospace" opacity="0.9">${def.label.toUpperCase()}</text>
    `;

    const content = def.draw(cx, cy, slotH);
    html += `<g style="animation: slot-in 0.35s ease both; animation-delay: ${i * 0.07}s;">${sep}${bg}${content}${label}</g>`;
  });

  slotsEl.innerHTML = html;

  const names = selectedKeys.map(k => SLOT_DEFS[k]?.label || k);
  statusEl.textContent = names.join(' · ');
}

// ── OPTION CLICK LOGIC ──
document.querySelectorAll('.option-label').forEach(label => {
  const input = label.querySelector('input');
  const group = label.dataset.group;

  input.addEventListener('change', () => {
    if (input.type === 'radio') {
      document.querySelectorAll(`[data-group="${group}"]`).forEach(l => l.classList.remove('checked'));
      label.classList.add('checked');
    } else {
      label.classList.toggle('checked', input.checked);
    }
    if (group === 's2') {
      const checked = [...document.querySelectorAll('[data-group="s2"].checked')];
      renderVMSlots(checked.map(l => l.dataset.vm).filter(Boolean));
    }
  });

  label.setAttribute('tabindex', '0');
  label.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); input.click(); }
  });
});

// ── PROGRESS ──
function updateProgress(step) {
  document.getElementById('progress-fill').style.width = (step / TOTAL_STEPS * 100) + '%';
  document.getElementById('step-label').textContent = `Schritt ${step} von ${TOTAL_STEPS}`;
}

// ── STEP VALIDATION ──
function validateStep(step) {
  const groups = { 1: 's1', 2: 's2', 3: 's3', 4: 's4' };
  const group = groups[step];
  if (!group) return true;

  const isMulti = step === 2;
  const found = isMulti
    ? document.querySelectorAll(`[data-group="${group}"].checked`).length > 0
    : !!document.querySelector(`[data-group="${group}"].checked`);

  const errEl = document.getElementById(`err-${step}`);
  if (!found) { errEl.style.display = 'block'; return false; }
  errEl.style.display = 'none';
  return true;
}

function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${n}`).classList.add('active');
  currentStep = n;
  updateProgress(n);
  if (n === 2) {
    const checked = [...document.querySelectorAll('[data-group="s2"].checked')];
    renderVMSlots(checked.map(l => l.dataset.vm).filter(Boolean));
  }
  if (n === 1) renderVMSlots([]);
}

function nextStep(from) {
  if (!validateStep(from)) return;
  if (from < TOTAL_STEPS) showStep(from + 1);
}

function prevStep(from) {
  if (from > 1) showStep(from - 1);
}

// ── CONTACT FORM FIELD VALIDATION ──
function validateField(id, testFn) {
  const el = document.getElementById(id);
  const ok = testFn(el.value.trim());
  el.classList.toggle('invalid', !ok);
  return ok;
}

// ── SUBMIT ──
function submitForm() {
  // Honeypot check
  if (document.getElementById('hp_name').value !== '') { showThankyou(); return; }

  // Minimum time between page load and submission (bot protection)
  const elapsed = Date.now() - parseInt(document.getElementById('form_timestamp').value, 10);
  if (elapsed < 3000) { showThankyou(); return; }

  const err5 = document.getElementById('err-5');
  let valid = true;
  valid &= validateField('f_vorname',  v => v.length >= 2);
  valid &= validateField('f_nachname', v => v.length >= 2);
  valid &= validateField('f_tel',      v => /^[\d\s+\-()À-ɏ]{7,20}$/.test(v));
  valid &= validateField('f_email',    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

  if (!valid) {
    err5.style.display = 'block';
    err5.textContent = 'Bitte überprüfen Sie die markierten Felder.';
    return;
  }
  err5.style.display = 'none';

  /** @type {StepperData} */
  const data = {
    betreut:     document.querySelector('[data-group="s1"].checked')?.dataset.val,
    automaten:   [...document.querySelectorAll('[data-group="s2"].checked')].map(l => l.dataset.val),
    mitarbeiter: document.querySelector('[data-group="s3"].checked')?.dataset.val,
    bundesland:  document.querySelector('[data-group="s4"].checked')?.dataset.val,
    vorname:     sanitize(document.getElementById('f_vorname').value),
    nachname:    sanitize(document.getElementById('f_nachname').value),
    telefon:     sanitize(document.getElementById('f_tel').value),
    email:       sanitize(document.getElementById('f_email').value),
  };

  const _overview = buildStepperEmailOverview(data);

  const fd = new FormData();
  fd.append('unternehmensname', data.vorname + ' ' + data.nachname);
  fd.append('email',            data.email);
  fd.append('telefon',          data.telefon);
  fd.append('mitarbeiter',      data.mitarbeiter ?? '');
  fd.append('nachricht',        _overview);
  fd.append('form_ts', Math.floor(parseInt(document.getElementById('form_timestamp').value, 10) / 1000).toString());

  const sendBtn = document.querySelector('.btn-send');
  if (sendBtn) sendBtn.disabled = true;

  fetch('contact.php', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(json => {
      if (json.success) {
        showThankyou();
      } else {
        err5.style.display = 'block';
        err5.textContent = json.message || 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
        if (sendBtn) sendBtn.disabled = false;
      }
    })
    .catch(() => {
      err5.style.display = 'block';
      err5.textContent = 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
      if (sendBtn) sendBtn.disabled = false;
    });
}

function showThankyou() {
  document.getElementById('progress-wrap').style.display = 'none';
  document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
  document.getElementById('thankyou').style.display = 'block';
  renderVMSlots([]);
  document.getElementById('vm-status').textContent = '✓ Anfrage gesendet!';
}

// ── BLUR VALIDATION ──
['f_vorname', 'f_nachname'].forEach(id => {
  document.getElementById(id).addEventListener('blur', function () {
    this.classList.toggle('invalid', this.value.trim().length < 2);
  });
});
document.getElementById('f_tel').addEventListener('blur', function () {
  this.classList.toggle('invalid', !/^[\d\s+\-()À-ɏ]{7,20}$/.test(this.value.trim()));
});
document.getElementById('f_email').addEventListener('blur', function () {
  this.classList.toggle('invalid', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim()));
});

// ── BUTTON EVENT LISTENERS (replaces inline onclick handlers) ──
document.querySelectorAll('[data-wiz-next]').forEach(btn => {
  btn.addEventListener('click', () => nextStep(parseInt(btn.dataset.wizNext, 10)));
});
document.querySelectorAll('[data-wiz-prev]').forEach(btn => {
  btn.addEventListener('click', () => prevStep(parseInt(btn.dataset.wizPrev, 10)));
});
const wizSubmitBtn = document.querySelector('[data-wiz-submit]');
if (wizSubmitBtn) wizSubmitBtn.addEventListener('click', submitForm);
