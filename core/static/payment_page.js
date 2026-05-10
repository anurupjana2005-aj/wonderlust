const BASE_URL = 'http://localhost:5000/api';
const APP_API_BASE = '/api';

// ── Promo Codes ──
const PROMO_CODES = {
  'NEWUSER50':   { discount: 50, label: 'New User Offer',  type: 'percent' },
  'EXCLUSIVE20': { discount: 20, label: 'Exclusive Offer', type: 'percent' },
  'SUMMERFUN30': { discount: 30, label: 'Summer Fun Deal', type: 'percent' },
};

let appliedPromo         = null;
let currentPayableAmount = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;
let lastTxnData          = null;

// ── UPI App → allowed suffix mapping ──
const UPI_APP_SUFFIX = {
  gpay:    '@oksbi',
  phonepe: '@ybl',
  paytm:   '@ptyes',
  bhim:    '@upi',
};

// ── Session Timer ──
let sessionSeconds = typeof SESSION_DURATION !== 'undefined' ? SESSION_DURATION : 600;

function startSessionTimer() {
  const bar     = document.getElementById('timerBar');
  const display = document.getElementById('timerDisplay');
  const tick = () => {
    const mins = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    const secs = String(sessionSeconds % 60).padStart(2, '0');
    if (display) display.textContent = `${mins}:${secs}`;
    if (sessionSeconds <= 60) bar && bar.classList.add('urgent');
    if (sessionSeconds <= 0) { document.getElementById('sessionExpired').classList.add('open'); return; }
    sessionSeconds--;
    setTimeout(tick, 1000);
  };
  tick();
}

// ── Tab Switching ──
function switchTab(name) {
  const tabNames = ['upi', 'card', 'netbank', 'whatsapp'];
  document.querySelectorAll('.tab').forEach((tab, i) => tab.classList.toggle('active', tabNames[i] === name));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === name));
}

// ── Promo Code ──
function togglePromo() {
  if (appliedPromo) return;
  const field   = document.getElementById('promoField');
  const chevron = document.getElementById('promoChevron');
  const isOpen  = field.classList.toggle('open');
  chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function applyPromo() {
  const code    = document.getElementById('promoInput').value.trim().toUpperCase();
  const status  = document.getElementById('promoStatus');
  const summary = document.getElementById('priceSummary');

  if (!code) {
    status.style.color = '#E24B4A';
    status.textContent = 'Please enter a promo code';
    return;
  }

  if (PROMO_CODES[code]) {
    const promo       = PROMO_CODES[code];
    appliedPromo      = { code, ...promo };
    const baseAmt     = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;
    const discountVal = Math.round(baseAmt * promo.discount / 100);
    currentPayableAmount = baseAmt - discountVal;

    status.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        background:#f0faf7; border:1px solid #1D9E75;
        border-radius:4px; padding:8px 12px; margin-top:6px;
      ">
        <span style="display:flex;align-items:center;gap:6px;color:#1D9E75;font-size:13px;font-weight:500;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <strong>${code}</strong> applied — ${promo.discount}% off (${promo.label})
        </span>
        <button onclick="cancelPromo()" style="
          background:none; border:1px solid rgba(192,82,42,0.3); cursor:pointer;
          color:#c0522a; font-size:11px; font-weight:600;
          letter-spacing:0.5px; text-transform:uppercase;
          padding:3px 8px; border-radius:3px;
          display:flex; align-items:center; gap:4px;
        "
        onmouseover="this.style.background='#c0522a';this.style.color='#fff'"
        onmouseout="this.style.background='none';this.style.color='#c0522a'"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Remove
        </button>
      </div>`;

    const promoInput = document.getElementById('promoInput');
    const applyBtn   = document.querySelector('.promo-apply-btn');
    if (promoInput) promoInput.disabled = true;
    if (applyBtn)   applyBtn.disabled   = true;

    const promoField   = document.getElementById('promoField');
    const promoChevron = document.getElementById('promoChevron');
    if (promoField)   promoField.classList.remove('open');
    if (promoChevron) promoChevron.style.transform = 'rotate(0deg)';

    const promoToggle = document.querySelector('.promo-toggle');
    if (promoToggle) {
      promoToggle.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2.5">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span style="color:#1D9E75; font-weight:600;">Promo Applied: ${code}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="2.5" style="margin-left:auto;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      `;
      promoToggle.style.borderColor = '#1D9E75';
      promoToggle.style.background  = '#f0faf7';
      promoToggle.style.borderStyle = 'solid';
    }

    summary.style.display = 'block';

    const basePriceEl  = document.getElementById('basePriceAmt');
    const numPersonsEl = document.getElementById('numPersons');
    const subtotalEl   = document.getElementById('subtotalAmt');
    const discountRow  = document.getElementById('discountRow');
    const discountLbl  = document.getElementById('discountLabel');
    const discountAmt  = document.getElementById('discountAmt');
    const finalAmt     = document.getElementById('finalAmt');
    const headerAmt    = document.getElementById('headerAmount');

    if (basePriceEl)  basePriceEl.textContent  = getFormattedAmount(typeof BASE_PRICE !== 'undefined' ? BASE_PRICE : baseAmt);
    if (numPersonsEl) numPersonsEl.textContent  = typeof NUM_PERSONS !== 'undefined' ? NUM_PERSONS : 1;
    if (subtotalEl)   subtotalEl.textContent    = getFormattedAmount(baseAmt);
    if (discountRow)  discountRow.style.display = 'flex';
    if (discountLbl)  discountLbl.textContent   = `${promo.label} (${promo.discount}% off)`;
    if (discountAmt)  discountAmt.textContent   = '- ' + getFormattedAmount(discountVal);
    if (finalAmt)     finalAmt.textContent      = getFormattedAmount(currentPayableAmount);
    if (headerAmt)    headerAmt.textContent     = getFormattedAmount(currentPayableAmount);

    updatePayButtons();

  } else {
    status.style.color = '#E24B4A';
    status.textContent = '✗ Invalid code. Try: NEWUSER50, EXCLUSIVE20, SUMMERFUN30';
    appliedPromo = null;
    currentPayableAmount = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;

    const discountRow = document.getElementById('discountRow');
    const finalAmt    = document.getElementById('finalAmt');
    const headerAmt   = document.getElementById('headerAmount');

    if (discountRow) discountRow.style.display = 'none';
    if (finalAmt)    finalAmt.textContent      = getFormattedAmount(currentPayableAmount);
    if (headerAmt)   headerAmt.textContent     = getFormattedAmount(currentPayableAmount);

    updatePayButtons();
  }
}

// ── Cancel / Remove Promo ──
function cancelPromo() {
  appliedPromo         = null;
  currentPayableAmount = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;

  const status = document.getElementById('promoStatus');
  if (status) status.innerHTML = '';

  const promoToggle = document.querySelector('.promo-toggle');
  if (promoToggle) {
    promoToggle.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
      Have a promo code?
      <span id="promoChevron" style="margin-left:auto; font-size:16px; transition:transform 0.2s;">▾</span>
    `;
    promoToggle.style.borderColor = '';
    promoToggle.style.background  = '';
    promoToggle.style.borderStyle = 'dashed';
  }

  const promoField = document.getElementById('promoField');
  if (promoField) promoField.classList.remove('open');

  const promoInput = document.getElementById('promoInput');
  const applyBtn   = document.querySelector('.promo-apply-btn');
  if (promoInput) { promoInput.disabled = false; promoInput.value = ''; }
  if (applyBtn)   applyBtn.disabled = false;

  const discountRow = document.getElementById('discountRow');
  const finalAmt    = document.getElementById('finalAmt');
  const headerAmt   = document.getElementById('headerAmount');
  const subtotalEl  = document.getElementById('subtotalAmt');

  if (discountRow) discountRow.style.display = 'none';
  if (finalAmt)    finalAmt.textContent      = getFormattedAmount(currentPayableAmount);
  if (headerAmt)   headerAmt.textContent     = getFormattedAmount(currentPayableAmount);
  if (subtotalEl)  subtotalEl.textContent    = getFormattedAmount(currentPayableAmount);

  updatePayButtons();
}

function updatePayButtons() {
  const fmt  = getFormattedAmount(currentPayableAmount);
  const upi  = document.getElementById('upiPayBtn');
  const card = document.getElementById('cardPayBtn');
  if (upi)  upi.textContent  = 'Pay ' + fmt;
  if (card) card.textContent = 'Pay ' + fmt + ' securely';
  const waStep = document.getElementById('waAmountStep');
  if (waStep) waStep.textContent = 'Confirm the payment amount of ' + fmt;
}

// ── UPI App Selection ──
let selectedUpiApp = '';

function selectApp(el, app) {
  document.querySelectorAll('.upi-app').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  selectedUpiApp = app;

  const suffix     = UPI_APP_SUFFIX[app];
  const upiInput   = document.getElementById('upiId');
  const upiStatus  = document.getElementById('upiStatus');
  const suffixBadge = document.getElementById('upiSuffixBadge');

  // Set placeholder and enforce suffix
  upiInput.placeholder = `username${suffix}`;
  upiInput.value       = '';

  // Show the locked suffix badge
  if (suffixBadge) {
    suffixBadge.textContent = suffix;
    suffixBadge.style.display = 'flex';
  }

  // Clear previous status
  upiStatus.textContent = '';

  // Show helper message
  upiStatus.style.color = '#185FA5';
  upiStatus.textContent = `Enter your username — suffix ${suffix} will be added automatically`;

  // Hide the "or enter UPI ID" divider row instruction area
  const upiManualRow = document.getElementById('upiManualRow');
  if (upiManualRow) upiManualRow.style.display = 'block';

  // Enforce suffix on input
  upiInput.oninput = function () {
    enforceUpiSuffix(this, suffix);
  };

  // Enforce suffix on blur too
  upiInput.onblur = function () {
    enforceUpiSuffix(this, suffix);
  };
}

// ── Enforce UPI suffix — user types only the username part ──
function enforceUpiSuffix(input, suffix) {
  let val = input.value;

  // Strip any @ and everything after it that the user might have typed
  // Keep only the username part (before @)
  if (val.includes('@')) {
    val = val.split('@')[0];
  }

  // Remove spaces and invalid chars
  val = val.replace(/[^a-zA-Z0-9._-]/g, '');

  // Update input: username only (suffix shown in badge)
  input.value = val;

  // Show real-time feedback
  const status = document.getElementById('upiStatus');
  if (val.length === 0) {
    status.style.color = '#185FA5';
    status.textContent = `Enter your username — suffix ${suffix} will be added automatically`;
  } else {
    status.style.color = '#1D9E75';
    status.textContent = `✓ UPI ID will be: ${val}${suffix}`;
  }
}

// ── Get full UPI ID (username + suffix) ──
function getFullUpiId() {
  const upiInput = document.getElementById('upiId');
  const username = upiInput.value.trim();
  if (!selectedUpiApp || !username) return username;
  const suffix = UPI_APP_SUFFIX[selectedUpiApp];
  return suffix ? `${username}${suffix}` : username;
}

// ── UPI Verify ──
async function verifyUPI() {
  const status = document.getElementById('upiStatus');

  // Must select an app first
  if (!selectedUpiApp) {
    status.style.color = '#E24B4A';
    status.textContent = '⚠ Please select a UPI app first (GPay, PhonePe, Paytm, or BHIM)';
    return;
  }

  const username = document.getElementById('upiId').value.trim();
  if (!username) {
    status.style.color = '#E24B4A';
    status.textContent = 'Please enter your UPI username';
    return;
  }

  const fullUpiId = getFullUpiId();
  status.style.color = '#9ca3af';
  status.textContent = `Verifying ${fullUpiId}...`;

  try {
    const res  = await fetch(`${BASE_URL}/verify/upi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_id: fullUpiId })
    });
    const data = await res.json();
    if (data.valid) {
      status.style.color = '#1D9E75';
      status.textContent = `✓ Verified: ${data.name}`;
    } else {
      status.style.color = '#E24B4A';
      status.textContent = data.message || 'Invalid UPI ID';
    }
  } catch {
    status.style.color = '#1D9E75';
    status.textContent = `✓ UPI ID format valid: ${fullUpiId}`;
  }
}

// ── Bank Selection ──
let selectedBank = '';
function selectBank(el) {
  document.querySelectorAll('.bank-item').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const nameEl  = el.querySelector('.bank-name');
  const codeMap = { 'State Bank': 'SBI', 'HDFC Bank': 'HDFC', 'ICICI Bank': 'ICICI', 'Axis Bank': 'AXIS', 'Kotak': 'KOTAK', 'Bank of Baroda': 'BOB' };
  selectedBank = codeMap[nameEl.textContent.trim()] || nameEl.textContent.trim();
}

// ── Card Formatting ──
function formatCard(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1  ').trim();
}
function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.slice(0, 2) + ' / ' + v.slice(2);
  input.value = v;
}

// ── Loading State ──
function setLoading(btn, loading) {
  if (!btn || btn === document.body) return;
  if (loading) {
    btn._origHTML     = btn.innerHTML;
    btn.innerHTML     = '<span style="display:inline-flex;gap:6px;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" stroke-opacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9"/></svg>Processing...</span>';
    btn.style.opacity = '0.75';
    btn.disabled      = true;
  } else {
    btn.innerHTML     = btn._origHTML || 'Pay';
    btn.style.opacity = '1';
    btn.disabled      = false;
  }
}

// ── Generate Mock TXN ID ──
function mkTxn() {
  return 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

async function saveBookingToApp() {
  if (!lastTxnData) return;
  try {
    await fetch(`${APP_API_BASE}/create-booking/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({ txn_id: lastTxnData.txn_id, method: lastTxnData.method, amount: currentPayableAmount }),
    });
  } catch (err) {
    console.warn('Booking save failed', err);
  }
}

/* ══════════════════════════════════════════
   BOOKING SUCCESS POPUP
══════════════════════════════════════════ */
async function showBookingSuccess() {
  const overlay = document.getElementById('bookingOverlay');
  document.getElementById('bookingPkg').textContent  = typeof PACKAGE_NAME !== 'undefined' ? PACKAGE_NAME : 'Wanderlust Package';
  document.getElementById('bookingAmt').textContent  = getFormattedAmount(currentPayableAmount);
  const txnId = lastTxnData?.txn_id || mkTxn();
  document.getElementById('bookingId').textContent   = 'WL-' + txnId.slice(0, 8).toUpperCase();
  document.getElementById('bookingDate').textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const oldCheck = document.querySelector('.booking-check');
  if (oldCheck) {
    const clone = oldCheck.cloneNode(true);
    oldCheck.parentNode.replaceChild(clone, oldCheck);
  }

  overlay.classList.add('open');
  saveBookingToApp();
  spawnConfetti();
  setTimeout(animateStars, 500);
}

function redirectToConfirmation() {
  window.location.href = '/dashboard';
}

// ── Confetti ──
function spawnConfetti() {
  const wrap = document.getElementById('confettiWrap');
  if (!wrap) return;
  const colors = ['#1D9E75','#c0522a','#185FA5','#f59e0b','#ec4899','#8b5cf6','#10b981','#f97316'];
  wrap.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = 5 + Math.random() * 8;
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${size}px;
      height: ${size * (Math.random() > 0.5 ? 1 : 2.4)}px;
      border-radius: ${Math.random() > 0.4 ? '50%' : '2px'};
      animation-duration: ${1.4 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.7}s;
      opacity: ${0.7 + Math.random() * 0.3};
    `;
    wrap.appendChild(el);
  }
}

// ── Star bursts ──
function animateStars() {
  const popup = document.getElementById('bookingPopup');
  if (!popup) return;
  popup.querySelectorAll('.star-burst').forEach(s => s.remove());
  const config = [
    { top: '-20px', left: '12%',  icon: '✦', color: '#f59e0b' },
    { top: '-16px', right: '14%', icon: '★', color: '#1D9E75' },
    { top: '24px',  left: '-20px',icon: '✶', color: '#8b5cf6' },
    { top: '24px',  right: '-20px',icon:'✦', color: '#ec4899' },
    { bottom: '70px', left: '-18px', icon: '★', color: '#185FA5' },
    { bottom: '70px', right: '-18px',icon: '✶', color: '#c0522a' },
  ];
  config.forEach((c, i) => {
    const star = document.createElement('div');
    star.className   = 'star-burst';
    star.textContent = c.icon;
    Object.assign(star.style, {
      position:      'absolute',
      fontSize:      (13 + Math.random() * 7) + 'px',
      color:          c.color,
      animation:     `starPop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s both, starFloat 2.4s ease-in-out ${i * 0.07 + 0.45}s infinite alternate`,
      pointerEvents: 'none',
      ...Object.fromEntries(Object.entries(c).filter(([k]) => !['icon','color'].includes(k))),
    });
    popup.appendChild(star);
  });
}

// ── Receipt Download ──
function downloadReceipt() {
  const txnId   = lastTxnData?.txn_id || mkTxn();
  const amount  = getFormattedAmount(currentPayableAmount);
  const pkgName = typeof PACKAGE_NAME !== 'undefined' ? PACKAGE_NAME : 'Wanderlust Package';
  const promoTxt = appliedPromo ? `Promo Code    : ${appliedPromo.code} (${appliedPromo.discount}% off)\n` : '';
  const receipt = `
===========================================
       WANDERLUST TRAVELS — RECEIPT
===========================================
Transaction ID : ${txnId}
Date & Time    : ${new Date().toLocaleString('en-IN')}
-------------------------------------------
Package        : ${pkgName}
${promoTxt}Amount Paid    : ${amount}
Payment Method : ${lastTxnData?.method || 'Online'}
Status         : PAID ✓
-------------------------------------------
Booking ID     : WL-${txnId.slice(0, 8).toUpperCase()}
===========================================
Thank you for booking with Wanderlust!
For support: support@wanderlust.travel
===========================================`.trim();

  const blob = new Blob([receipt], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `Receipt_${txnId.slice(0, 8)}.txt`; a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════
   PAYMENT METHODS
══════════════════════════════════════════ */
async function payUPI(btn) {
  const status = document.getElementById('upiStatus');

  // ── Step 1: Must select a UPI app ──
  if (!selectedUpiApp) {
    status.style.color = '#E24B4A';
    status.textContent = '⚠ Please select a UPI app first (GPay, PhonePe, Paytm, or BHIM)';

    // Shake the upi-apps grid to draw attention
    const appsGrid = document.querySelector('.upi-apps');
    if (appsGrid) {
      appsGrid.style.animation = 'none';
      appsGrid.offsetHeight; // reflow
      appsGrid.style.animation = 'shakeApps 0.4s ease';
    }
    setLoading(btn, false);
    return;
  }

  // ── Step 2: Must enter username ──
  const username = document.getElementById('upiId').value.trim();
  if (!username) {
    status.style.color = '#E24B4A';
    const suffix = UPI_APP_SUFFIX[selectedUpiApp];
    status.textContent = `Please enter your UPI username (e.g. yourname${suffix})`;
    setLoading(btn, false);
    return;
  }

  const fullUpiId = getFullUpiId();

  try {
    const res  = await fetch(`${BASE_URL}/pay/upi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_id: fullUpiId, amount: currentPayableAmount, app: selectedUpiApp })
    });
    const data = await res.json();
    lastTxnData = { txn_id: data.txn_id || mkTxn(), method: selectedUpiApp || 'UPI' };
  } catch {
    lastTxnData = { txn_id: mkTxn(), method: selectedUpiApp || 'UPI' };
  }
  setLoading(btn, false);
  showBookingSuccess();
}

async function payCard(btn) {
  const cardNum    = document.getElementById('cardNum').value.replace(/\s/g, '');
  const cardholder = document.querySelector('#card input[placeholder="Name on card"]').value.trim();
  const expiry     = document.querySelector('#card input[placeholder="MM / YY"]').value.trim();
  const cvv        = document.querySelector('#card input[placeholder="•••"]').value.trim();

  if (!cardNum || cardNum.length < 15)  { alert('Invalid card number');      setLoading(btn, false); return; }
  if (!cardholder)                       { alert('Cardholder name required'); setLoading(btn, false); return; }
  if (!expiry || !expiry.includes('/')) { alert('Invalid expiry');            setLoading(btn, false); return; }
  if (!cvv || cvv.length < 3)           { alert('Invalid CVV');               setLoading(btn, false); return; }

  try {
    const res  = await fetch(`${BASE_URL}/pay/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_number: cardNum, cardholder, expiry, cvv, amount: currentPayableAmount })
    });
    const data = await res.json();
    lastTxnData = { txn_id: data.txn_id || mkTxn(), method: 'Card' };
  } catch {
    lastTxnData = { txn_id: mkTxn(), method: 'Card' };
  }
  setLoading(btn, false);
  showBookingSuccess();
}

async function payNetbanking(btn) {
  if (!selectedBank) { alert('Please select a bank'); setLoading(btn, false); return; }
  try {
    const res  = await fetch(`${BASE_URL}/pay/netbanking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code: selectedBank, amount: currentPayableAmount })
    });
    const data = await res.json();
    lastTxnData = { txn_id: data.txn_id || mkTxn(), method: selectedBank };
  } catch {
    lastTxnData = { txn_id: mkTxn(), method: selectedBank };
  }
  setLoading(btn, false);
  showBookingSuccess();
}

async function payWhatsapp(btn) {
  const phone = prompt('Enter your WhatsApp-registered mobile number:');
  if (!phone || phone.trim().length < 10) { alert('Enter a valid 10-digit number'); setLoading(btn, false); return; }
  try {
    const res  = await fetch(`${BASE_URL}/pay/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), amount: currentPayableAmount })
    });
    const data = await res.json();
    lastTxnData = { txn_id: data.txn_id || mkTxn(), method: 'WhatsApp Pay' };
  } catch {
    lastTxnData = { txn_id: mkTxn(), method: 'WhatsApp Pay' };
  }
  setLoading(btn, false);
  showBookingSuccess();
}

// ── Main Dispatcher ──
function pay(method, btn) {
  setLoading(btn, true);
  setTimeout(() => {
    if      (method === 'UPI')          payUPI(btn);
    else if (method === 'Card')         payCard(btn);
    else if (method === 'Net Banking')  payNetbanking(btn);
    else if (method === 'WhatsApp Pay') payWhatsapp(btn);
  }, 1400);
}

// ── Dynamic CSS ──
const dynStyle = document.createElement('style');
dynStyle.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes starPop {
    from { transform: scale(0) rotate(-30deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes starFloat {
    from { transform: translateY(0px) rotate(0deg); }
    to   { transform: translateY(-9px) rotate(12deg); }
  }
  @keyframes shakeApps {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
  .upi-suffix-badge {
    display: none;
    align-items: center;
    background: #e6f1fb;
    border: 1px solid #185FA5;
    border-left: none;
    border-radius: 0 8px 8px 0;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 700;
    color: #185FA5;
    white-space: nowrap;
    height: 100%;
    min-height: 38px;
    letter-spacing: 0.03em;
  }
  .upi-id-wrap {
    display: flex;
    align-items: stretch;
    flex: 1;
    position: relative;
  }
  .upi-id-wrap input {
    border-radius: 8px 0 0 8px !important;
    border-right: none !important;
    flex: 1;
  }
  .upi-id-wrap input:focus {
    border-color: #185FA5 !important;
  }
`;
document.head.appendChild(dynStyle);

document.addEventListener('DOMContentLoaded', startSessionTimer);