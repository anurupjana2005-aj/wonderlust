const BASE_URL = 'http://localhost:5000/api';

// ── Tab Switching ──
function switchTab(name) {
  const tabNames = ['upi', 'card', 'netbank', 'whatsapp'];
  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.classList.toggle('active', tabNames[i] === name);
  });
  document.querySelectorAll('.section').forEach(section => {
    section.classList.toggle('active', section.id === name);
  });
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
  const nameEl = el.querySelector('.bank-name');
  const codeMap = {
    'State Bank': 'SBI', 'HDFC Bank': 'HDFC', 'ICICI Bank': 'ICICI',
    'Axis Bank': 'AXIS', 'Kotak': 'KOTAK', 'Bank of Baroda': 'BOB'
  };
  selectedBank = codeMap[nameEl.textContent.trim()] || nameEl.textContent.trim();
}

// ── UPI ID Verify (calls backend) ──
async function verifyUPI() {
  const val = document.getElementById('upiId').value.trim();
  const status = document.getElementById('upiStatus');
  if (!val) { status.style.color = '#E24B4A'; status.textContent = 'Please enter a UPI ID'; return; }
  status.style.color = '#9ca3af'; status.textContent = 'Verifying...';
  try {
    const res = await fetch(`${BASE_URL}/verify/upi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_id: val })
    });
    const data = await res.json();
    if (data.valid) { status.style.color = '#1D9E75'; status.textContent = `✓ Verified: ${data.name}`; }
    else { status.style.color = '#E24B4A'; status.textContent = data.message || 'Invalid UPI ID'; }
  } catch {
    if (val.includes('@')) { status.style.color = '#1D9E75'; status.textContent = '✓ UPI ID format valid'; }
    else { status.style.color = '#E24B4A'; status.textContent = 'Invalid UPI ID format (e.g. name@upi)'; }
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
function setLoading(btn, loading, text, orig) {
  btn.innerHTML = loading ? 'Processing...' : (text || orig);
  btn.style.opacity = loading ? '0.7' : '1';
  btn.disabled = loading;
}

// ── UPI Pay ──
async function payUPI(btn, orig) {
  const upiId = document.getElementById('upiId').value.trim();
  const status = document.getElementById('upiStatus');
  if (!upiId || !upiId.includes('@')) {
    status.style.color = '#E24B4A'; status.textContent = 'Please enter a valid UPI ID';
    setLoading(btn, false, null, orig); return;
  }
  try {
    const res = await fetch(`${BASE_URL}/pay/upi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upi_id: upiId, amount: 2499, app: selectedUpiApp || 'UPI' })
    });
    const data = await res.json();
    setLoading(btn, false, data.success ? `✓ Success · Txn: ${data.txn_id.slice(0,8)}` : `✗ ${data.message}`, orig);
  } catch { setLoading(btn, false, '✗ Server unavailable', orig); }
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 3000);
}

// ── Card Pay ──
async function payCard(btn, orig) {
  const cardNum    = document.getElementById('cardNum').value.replace(/\s/g, '');
  const cardholder = document.querySelector('#card input[placeholder="Name on card"]').value.trim();
  const expiry     = document.querySelector('#card input[placeholder="MM / YY"]').value.trim();
  const cvv        = document.querySelector('#card input[placeholder="•••"]').value.trim();
  if (!cardNum || cardNum.length < 15) { alert('Invalid card number'); setLoading(btn, false, null, orig); return; }
  if (!cardholder) { alert('Cardholder name required'); setLoading(btn, false, null, orig); return; }
  if (!expiry || !expiry.includes('/')) { alert('Invalid expiry'); setLoading(btn, false, null, orig); return; }
  if (!cvv || cvv.length < 3) { alert('Invalid CVV'); setLoading(btn, false, null, orig); return; }
  try {
    const res = await fetch(`${BASE_URL}/pay/card`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_number: cardNum, cardholder, expiry, cvv, amount: 2499, card_type: 'credit' })
    });
    const data = await res.json();
    setLoading(btn, false, data.success ? `✓ Success · ${data.card_masked}` : `✗ ${data.message}`, orig);
  } catch { setLoading(btn, false, '✗ Server unavailable', orig); }
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 3000);
}

// ── Net Banking Pay ──
async function payNetbanking(btn, orig) {
  if (!selectedBank) { alert('Please select a bank'); setLoading(btn, false, null, orig); return; }
  try {
    const res = await fetch(`${BASE_URL}/pay/netbanking`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_code: selectedBank, amount: 2499 })
    });
    const data = await res.json();
    if (data.success) {
      setLoading(btn, false, `✓ Redirecting to ${data.bank}...`, orig);
      setTimeout(() => window.open(data.redirect_url, '_blank'), 1000);
    } else { setLoading(btn, false, `✗ ${data.message}`, orig); }
  } catch { setLoading(btn, false, '✗ Server unavailable', orig); }
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 3500);
}

// ── WhatsApp Pay ──
async function payWhatsapp(btn, orig) {
  const phone = prompt('Enter your WhatsApp-registered mobile number:');
  if (!phone || phone.trim().length < 10) { alert('Enter a valid 10-digit number'); setLoading(btn, false, null, orig); return; }
  try {
    const res = await fetch(`${BASE_URL}/pay/whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), amount: 2499 })
    });
    const data = await res.json();
    setLoading(btn, false, data.success ? `✓ Success · Txn: ${data.txn_id.slice(0,8)}` : `✗ ${data.message}`, orig);
  } catch { setLoading(btn, false, '✗ Server unavailable', orig); }
  setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 3000);
}

// ── Main Pay Dispatcher ──
function pay(method, btn) {
  const orig = btn.innerHTML;
  setLoading(btn, true);
  if (method === 'UPI')               payUPI(btn, orig);
  else if (method === 'Card')         payCard(btn, orig);
  else if (method === 'Net Banking')  payNetbanking(btn, orig);
  else if (method === 'WhatsApp Pay') payWhatsapp(btn, orig);
}