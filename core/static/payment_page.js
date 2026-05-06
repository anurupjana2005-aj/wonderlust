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
  const field   = document.getElementById('promoField');
  const chevron = document.getElementById('promoChevron');
  const isOpen  = field.classList.toggle('open');
  chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function applyPromo() {
  const code    = document.getElementById('promoInput').value.trim().toUpperCase();
  const status  = document.getElementById('promoStatus');
  const summary = document.getElementById('priceSummary');
  if (!code) { status.style.color = '#E24B4A'; status.textContent = 'Please enter a promo code'; return; }

  if (PROMO_CODES[code]) {
    const promo       = PROMO_CODES[code];
    appliedPromo      = { code, ...promo };
    const baseAmt     = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;
    const discountVal = Math.round(baseAmt * promo.discount / 100);
    currentPayableAmount = baseAmt - discountVal;

    status.style.color = '#1D9E75';
    status.textContent = `✓ "${code}" applied — ${promo.discount}% off (${promo.label})`;

    summary.style.display = 'block';
    document.getElementById('origAmt').textContent       = getFormattedAmount(baseAmt);
    document.getElementById('discountLabel').textContent = `${promo.label} (${promo.discount}% off)`;
    document.getElementById('discountAmt').textContent   = '- ' + getFormattedAmount(discountVal);
    document.getElementById('finalAmt').textContent      = getFormattedAmount(currentPayableAmount);
    document.getElementById('headerAmount').textContent  = getFormattedAmount(currentPayableAmount);
    updatePayButtons();
  } else {
    status.style.color = '#E24B4A';
    status.textContent = '✗ Invalid code. Try: NEWUSER50, EXCLUSIVE20, SUMMERFUN30';
    appliedPromo = null;
    currentPayableAmount = typeof PAYMENT_AMOUNT !== 'undefined' ? PAYMENT_AMOUNT : 2499;
    summary.style.display = 'none';
    updatePayButtons();
  }
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

// ── UPI Verify ──
async function verifyUPI() {
  const val    = document.getElementById('upiId').value.trim();
  const status = document.getElementById('upiStatus');
  if (!val) { status.style.color = '#E24B4A'; status.textContent = 'Please enter a UPI ID'; return; }
  status.style.color = '#9ca3af'; status.textContent = 'Verifying...';
  try {
    const res  = await fetch(`${BASE_URL}/verify/upi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upi_id: val }) });
    const data = await res.json();
    if (data.valid) { status.style.color = '#1D9E75'; status.textContent = `✓ Verified: ${data.name}`; }
    else            { status.style.color = '#E24B4A'; status.textContent = data.message || 'Invalid UPI ID'; }
  } catch {
    if (val.includes('@')) { status.style.color = '#1D9E75'; status.textContent = '✓ UPI ID format valid'; }
    else                    { status.style.color = '#E24B4A'; status.textContent = 'Invalid format (e.g. name@upi)'; }
  }
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

  // Re-clone check element to restart SVG stroke animations
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

// ── Confetti (60 pieces, varied shapes) ──
function spawnConfetti() {
  const wrap = document.getElementById('confettiWrap');
  if (!wrap) return;
  const colors = ['#1D9E75','#c0522a','#185FA5','#f59e0b','#ec4899','#8b5cf6','#10b981','#f97316'];
  wrap.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const el   = document.createElement('div');
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

// ── Star bursts around popup ──
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
    star.className  = 'star-burst';
    star.textContent = c.icon;
    Object.assign(star.style, {
      position:   'absolute',
      fontSize:   (13 + Math.random() * 7) + 'px',
      color:       c.color,
      animation:  `starPop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s both, starFloat 2.4s ease-in-out ${i * 0.07 + 0.45}s infinite alternate`,
      pointerEvents: 'none',
      ...Object.fromEntries(Object.entries(c).filter(([k]) => !['icon','color'].includes(k))),
    });
    popup.appendChild(star);
  });
}

// ── Receipt Download ──
function downloadReceipt() {
  const txnId    = lastTxnData?.txn_id || mkTxn();
  const amount   = getFormattedAmount(currentPayableAmount);
  const pkgName  = typeof PACKAGE_NAME !== 'undefined' ? PACKAGE_NAME : 'Wanderlust Package';
  const promoTxt = appliedPromo ? `Promo Code    : ${appliedPromo.code} (${appliedPromo.discount}% off)\n` : '';
  const receipt  = `
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
   All paths (success or network error) →
   showBookingSuccess()
   Backend errors are bypassed in frontend/
   demo mode with a generated TXN ID.
══════════════════════════════════════════ */
async function payUPI(btn) {
  const upiId  = document.getElementById('upiId').value.trim();
  const status = document.getElementById('upiStatus');
  if (!upiId || !upiId.includes('@')) {
    status.style.color = '#E24B4A';
    status.textContent = 'Please enter a valid UPI ID';
    setLoading(btn, false); return;
  }
  try {
    const res  = await fetch(`${BASE_URL}/pay/upi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upi_id: upiId, amount: currentPayableAmount, app: selectedUpiApp || 'UPI' }) });
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
    const res  = await fetch(`${BASE_URL}/pay/card`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_number: cardNum, cardholder, expiry, cvv, amount: currentPayableAmount }) });
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
    const res  = await fetch(`${BASE_URL}/pay/netbanking`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bank_code: selectedBank, amount: currentPayableAmount }) });
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
    const res  = await fetch(`${BASE_URL}/pay/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim(), amount: currentPayableAmount }) });
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
  // Small artificial delay so the loading spinner shows before popup
  setTimeout(() => {
    if      (method === 'UPI')          payUPI(btn);
    else if (method === 'Card')         payCard(btn);
    else if (method === 'Net Banking')  payNetbanking(btn);
    else if (method === 'WhatsApp Pay') payWhatsapp(btn);
  }, 1400);
}

// ── Dynamic CSS: spinner + star animations ──
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
`;
document.head.appendChild(dynStyle);

document.addEventListener('DOMContentLoaded', startSessionTimer);