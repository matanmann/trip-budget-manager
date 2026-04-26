import api from './api.js';

// ==================== CONSTANTS ====================

const CATEGORIES = [
  'Flights','Lodging','Food','Transport','Activities','Shopping',
  'Insurance','Communication','Health','Entertainment','Fees','Other'
];

const PAYMENT_METHODS = ['Cash','Credit Card','Debit Card','Bank Transfer','Mobile Payment','Other'];

const CURRENCIES = [
  'USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','HKD','SGD',
  'NZD','SEK','NOK','DKK','MXN','BRL','INR','KRW','THB','ZAR',
  'AED','ILS','PLN','CZK','HUF','TRY','PHP','IDR','MYR'
];

const CURRENCY_SYMBOLS = {
  USD:'$',EUR:'€',GBP:'£',JPY:'¥',CAD:'C$',AUD:'A$',CHF:'Fr',CNY:'¥',
  HKD:'HK$',SGD:'S$',NZD:'NZ$',SEK:'kr',NOK:'kr',DKK:'kr',MXN:'$',
  BRL:'R$',INR:'₹',KRW:'₩',THB:'฿',ZAR:'R',AED:'د.إ',ILS:'₪',
  PLN:'zł',CZK:'Kč',HUF:'Ft',TRY:'₺',PHP:'₱',IDR:'Rp',MYR:'RM'
};

const CONVERSION_TO_USD = {
  USD:1,EUR:1.09,GBP:1.27,JPY:0.0067,CAD:0.74,AUD:0.65,CHF:1.13,
  CNY:0.14,HKD:0.13,SGD:0.74,NZD:0.60,SEK:0.095,NOK:0.093,DKK:0.15,
  MXN:0.058,BRL:0.20,INR:0.012,KRW:0.00075,THB:0.028,ZAR:0.053,
  AED:0.27,ILS:0.27,PLN:0.25,CZK:0.044,HUF:0.0028,TRY:0.031,
  PHP:0.018,IDR:0.000063,MYR:0.21
};

const CATEGORY_COLORS = {
  Flights:'#3b82f6',Lodging:'#ec4899',Food:'#f59e0b',Transport:'#10b981',
  Activities:'#8b5cf6',Shopping:'#f97316',Insurance:'#06b6d4',
  Communication:'#a855f7',Health:'#ef4444',Entertainment:'#f472b6',
  Fees:'#6b7280',Other:'#9ca3af'
};

const CATEGORY_KEYWORDS = {
  Flights:['flight','airline','airport','plane','boarding'],
  Lodging:['hotel','hostel','airbnb','motel','inn','resort','room','apartment','villa'],
  Food:['restaurant','cafe','coffee','breakfast','lunch','dinner','food','meal','snack','grocery','bar','pub'],
  Transport:['uber','lyft','taxi','bus','train','metro','subway','rental','car','gas','fuel','parking','ferry'],
  Activities:['museum','tour','ticket','show','concert','park','attraction','excursion','safari','diving'],
  Shopping:['shop','store','mall','clothes','market','boutique'],
  Insurance:['insurance','coverage','policy'],
  Communication:['sim','phone','data','wifi','internet','roaming','esim'],
  Health:['pharmacy','medicine','doctor','hospital','clinic','medical','vaccine'],
  Entertainment:['cinema','movie','theater','nightclub','spa','massage','casino'],
  Fees:['fee','atm','exchange','commission','bank fee'],
  Other:[]
};

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Belgium','Bolivia','Brazil','Bulgaria','Cambodia',
  'Canada','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Dominican Republic','Ecuador','Egypt','Estonia','Finland','France','Georgia',
  'Germany','Ghana','Greece','Guatemala','Honduras','Hong Kong','Hungary','Iceland',
  'India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Lithuania','Luxembourg','Malaysia',
  'Maldives','Malta','Mauritius','Mexico','Monaco','Mongolia','Morocco','Myanmar','Nepal',
  'Netherlands','New Zealand','Nigeria','Norway','Oman','Pakistan','Panama','Peru',
  'Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Serbia',
  'Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka',
  'Sweden','Switzerland','Taiwan','Thailand','Turkey','UAE','Ukraine','United Kingdom',
  'United States','Uruguay','Vietnam','Zimbabwe'
];

// ==================== STATE ====================

const state = {
  user: null,
  trips: [],
  activeTrip: null,
  expenses: [],
  currentTab: 'dashboard',
  sortCol: 'date',
  sortDir: 'desc',
  filters: { dateStart:'', dateEnd:'', categories:[], paymentMethods:[], refundableOnly:false },
  selectedCountries: [],
};

// ==================== UTILS ====================

const $ = id => document.getElementById(id);

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function fmt(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 ? `-${sym}${abs}` : `${sym}${abs}`;
}

function parseDate(d) {
  if (!d) return null;
  // Handle full ISO strings like 2024-03-15T00:00:00.000Z
  const dateOnly = d.includes('T') ? d.split('T')[0] : d;
  return new Date(dateOnly + 'T00:00:00');
}

function fmtDate(d) {
  const date = parseDate(d);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function fmtDateShort(d) {
  const date = parseDate(d);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function toInputDate(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().split('T')[0];
  const s = String(d);
  return s.includes('T') ? s.split('T')[0] : s;
}

function today() { return new Date().toISOString().split('T')[0]; }

function daysBetween(a, b) {
  return Math.ceil((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86400000);
}

function toUSD(amount, currency) {
  return amount * (CONVERSION_TO_USD[currency] || 1);
}

function toTripCurrency(amount, fromCurrency) {
  if (!state.activeTrip || fromCurrency === state.activeTrip.currency) return amount;
  return toUSD(amount, fromCurrency) / (CONVERSION_TO_USD[state.activeTrip.currency] || 1);
}

function suggestCategory(desc) {
  if (!desc) return null;
  const lower = desc.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return cat;
  }
  return null;
}

function showToast(msg, type = 'info', duration = 3000) {
  const c = $('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

function showFieldError(fieldId, msg) {
  const el = $(fieldId);
  const errEl = $('err-' + fieldId);
  if (el) el.classList.add('error');
  if (errEl) errEl.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

// ==================== CALCULATIONS ====================

function calcSpent(exps = state.expenses) {
  return exps.reduce((sum, e) => sum + toTripCurrency(e.amount, e.currency), 0);
}

function calcByCategory(exps = state.expenses) {
  const map = {};
  CATEGORIES.forEach(c => map[c] = 0);
  exps.forEach(e => {
    const converted = toTripCurrency(e.amount, e.currency);
    map[e.category] = (map[e.category] || 0) + converted;
  });
  return map;
}

function calcDailySpending(exps = state.expenses) {
  const map = {};
  exps.forEach(e => {
    const dateKey = e.date?.includes('T') ? e.date.split('T')[0] : e.date;
    const converted = toTripCurrency(e.amount, e.currency);
    map[dateKey] = (map[dateKey] || 0) + converted;
  });
  return map;
}

function getBudgetStatus() {
  const trip = state.activeTrip;
  if (!trip) return null;
  const spent = calcSpent();
  const budget = trip.totalBudget;
  const remaining = budget - spent;
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const tod = today();
  let elapsed = Math.max(0, daysBetween(trip.startDate, tod));
  if (tod > trip.endDate) elapsed = daysBetween(trip.startDate, trip.endDate);
  let daysLeft = Math.max(0, daysBetween(tod, trip.endDate));
  if (tod < trip.startDate) daysLeft = daysBetween(trip.startDate, trip.endDate);
  const totalDays = daysBetween(trip.startDate, trip.endDate) + 1;
  const dailyAvg = elapsed > 0 ? spent / elapsed : 0;
  const projDaily = daysLeft > 0 ? remaining / daysLeft : 0;
  return { spent, budget, remaining, pct, elapsed, daysLeft, totalDays, dailyAvg, projDaily };
}

function getAlerts() {
  const s = getBudgetStatus();
  if (!s) return [];
  const alerts = [];
  const trip = state.activeTrip;
  if (s.pct >= 100) alerts.push({ type:'danger', msg:`⚠️ Budget exceeded! Spent ${fmt(s.spent, trip.currency)} of ${fmt(s.budget, trip.currency)}.` });
  else if (s.pct >= 90) alerts.push({ type:'danger', msg:`🔴 Critical: ${s.pct.toFixed(1)}% used. Only ${fmt(s.remaining, trip.currency)} left.` });
  else if (s.pct >= 75) alerts.push({ type:'warning', msg:`🟡 Warning: ${s.pct.toFixed(1)}% used. ${fmt(s.remaining, trip.currency)} remaining.` });
  if (trip.categoryBudgets) {
    const byCat = calcByCategory();
    for (const [cat, budget] of Object.entries(trip.categoryBudgets)) {
      if (budget > 0 && byCat[cat] > budget)
        alerts.push({ type:'warning', msg:`📁 ${cat} over budget: ${fmt(byCat[cat], trip.currency)} / ${fmt(budget, trip.currency)}` });
    }
  }
  return alerts;
}

function getFilteredExpenses() {
  const f = state.filters;
  return state.expenses.filter(e => {
    if (f.dateStart && e.date < f.dateStart) return false;
    if (f.dateEnd   && e.date > f.dateEnd)   return false;
    if (f.categories.length && !f.categories.includes(e.category)) return false;
    if (f.paymentMethods.length && !f.paymentMethods.includes(e.paymentMethod)) return false;
    if (f.refundableOnly && !e.refundable) return false;
    return true;
  });
}

function sortExpenses(list) {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (state.sortCol === 'date')     cmp = a.date.localeCompare(b.date);
    else if (state.sortCol === 'amount') cmp = toTripCurrency(a.amount, a.currency) - toTripCurrency(b.amount, b.currency);
    else if (state.sortCol === 'category') cmp = a.category.localeCompare(b.category);
    return state.sortDir === 'asc' ? cmp : -cmp;
  });
}

function getUpcomingDeadlines() {
  const tod = today();
  return state.expenses
    .filter(e => e.refundable && e.refundDeadline && e.refundDeadline >= tod)
    .sort((a, b) => a.refundDeadline.localeCompare(b.refundDeadline))
    .slice(0, 5);
}

function getTopExpenses(n = 5) {
  return [...state.expenses]
    .map(e => ({ ...e, converted: toTripCurrency(e.amount, e.currency) }))
    .sort((a, b) => b.converted - a.converted)
    .slice(0, n);
}

// ==================== INITIALIZATION ====================

async function init() {
  try {
    const { user } = await api.getCurrentUser();
    state.user = user;
    state.trips = await api.getTrips();
    state.activeTrip = state.trips.find(t => t.isActive) || state.trips[0] || null;
    if (state.activeTrip) state.expenses = await api.getExpenses(state.activeTrip.id);
    showApp();
    // Handle invite token after app is shown
    await handleInviteToken();
  } catch (err) {
    console.error('Init error:', err.message);
    if (err.message.includes('401') || err.message.includes('Not authenticated')) {
      showLogin();
      // If there's an invite token, preserve it so after login they land on the invite
      const params = new URLSearchParams(window.location.search);
      if (params.get('token')) {
        sessionStorage.setItem('pendingInviteToken', params.get('token'));
      }
    } else {
      showLogin();
      showToast('Error loading app: ' + err.message, 'error');
    }
  } finally {
    $('loading-screen').classList.add('hidden');
  }
}

function showLogin() {
  $('login-screen').classList.remove('hidden');
  $('app').style.display = 'none';
}

function showApp() {
  window._appState = state;
  $('login-screen').classList.add('hidden');
  $('app').style.display = 'block';
  if (state.user) {
    $('user-avatar').src = state.user.picture || 'https://via.placeholder.com/32';
    $('user-name').textContent = state.user.name || state.user.email;
  }
  // Restore pending invite token after Google login
  const pendingToken = sessionStorage.getItem('pendingInviteToken');
  if (pendingToken) {
    sessionStorage.removeItem('pendingInviteToken');
    window.history.replaceState({}, '', `/?token=${pendingToken}`);
  }
  renderAll();
}

$('logout-btn').addEventListener('click', async () => {
  try {
    await api.logout();
    Object.assign(state, { user:null, trips:[], activeTrip:null, expenses:[] });
    showLogin();
    showToast('Signed out successfully', 'success');
  } catch { showToast('Failed to sign out', 'error'); }
});

// ==================== RENDER ORCHESTRATION ====================

function renderAll() {
  renderTripSelector();
  renderTabs();
  renderTabContent();
}

function renderTripSelector() {
  const el = $('trip-selector');
  if (!el) return;

  if (state.trips.length === 0) {
    el.innerHTML = `
      <div class="card" style="text-align:center; padding:32px;">
        <p style="color:var(--gray-500); margin-bottom:16px;">Welcome! Create your first trip to get started.</p>
        <button class="btn btn-primary" onclick="showCreateTripModal()">➕ Create Trip</button>
      </div>`;
    return;
  }

  const trip = state.activeTrip;
  const members = trip?.members || [];
  el.innerHTML = `
    <div class="trip-bar">
      <label>Active Trip</label>
      <select class="trip-select" onchange="switchTrip(this.value)">
        ${state.trips.map(t => `
          <option value="${t.id}" ${t.id === trip?.id ? 'selected' : ''}>
            ${esc(t.name)} (${t.currency} ${(t.spent||0).toFixed(0)} / ${t.totalBudget.toFixed(0)})
          </option>`).join('')}
      </select>
      ${members.length > 1 ? `
        <div style="display:flex;align-items:center;gap:4px" title="${members.map(m=>m.name||m.email).join(', ')}">
          ${members.slice(0,4).map(m => `
            <img src="${m.picture||'https://via.placeholder.com/28'}"
                 style="width:28px;height:28px;border-radius:50%;border:2px solid white;margin-left:-6px;object-fit:cover"
                 title="${esc(m.name||m.email||'')}"
                 onerror="this.src='https://via.placeholder.com/28'">`).join('')}
          ${members.length > 4 ? `<span style="font-size:0.75rem;color:var(--gray-500);margin-left:4px">+${members.length-4}</span>` : ''}
        </div>` : ''}
      <button class="btn btn-primary btn-sm" onclick="showCreateTripModal()">➕ New Trip</button>
    </div>`;
}

function renderTabs() {
  const el = $('tab-nav');
  if (!el) return;
  const tabs = [
    { id:'dashboard',    label:'📊 Dashboard' },
    { id:'add-expense',  label:'➕ Add Expense' },
    { id:'expenses',     label:'📋 Expenses' },
    { id:'budget-plan',  label:'🗺️ Budget Plan' },
    { id:'checklist',    label:'✅ Checklist' },
    { id:'settings',     label:'⚙️ Trip Settings' },
  ];
  el.innerHTML = `
    <div class="nav-tabs">
      ${tabs.map(t => `
        <button class="nav-tab ${state.currentTab === t.id ? 'active' : ''}"
                onclick="switchTab('${t.id}')">${t.label}</button>`).join('')}
    </div>`;
}

function renderTabContent() {
  const el = $('tab-content');
  if (!el) return;
  if (!state.activeTrip && !['settings', 'budget-plan', 'checklist'].includes(state.currentTab)) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗺️</div><h3>No trip selected</h3><p>Create or select a trip to get started.</p></div>`;
    return;
  }
  switch (state.currentTab) {
    case 'dashboard':   el.innerHTML = renderDashboard(); drawCharts(); break;
    case 'add-expense': el.innerHTML = renderAddExpenseForm(); break;
    case 'expenses':    el.innerHTML = renderExpensesList(); break;
    case 'budget-plan': el.innerHTML = typeof window.renderBudgetPlanTab === 'function' ? window.renderBudgetPlanTab() : '<div class="card">Loading...</div>'; break;
    case 'checklist':   el.innerHTML = typeof window.renderChecklistTab === 'function' ? window.renderChecklistTab() : '<div class="card">Loading...</div>'; break;
    case 'settings':    el.innerHTML = renderTripSettings(); initCountrySelector(); break;
  }
}

window.switchTab = function(id) {
  state.currentTab = id;
  renderTabs();
  renderTabContent();
};

window.switchTrip = async function(tripId) {
  try {
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) return;
    state.activeTrip = trip;
    state.expenses = await api.getExpenses(tripId);
    await api.activateTrip(tripId);
    renderAll();
  } catch (err) { showToast('Failed to switch trip: ' + err.message, 'error'); }
};

// ==================== DASHBOARD ====================

function renderDashboard() {
  const s = getBudgetStatus();
  if (!s) return '<div class="card">No data</div>';
  const trip = state.activeTrip;
  const filtered = getFilteredExpenses();
  const byCat = calcByCategory(filtered);
  const top = getTopExpenses(5);
  const deadlines = getUpcomingDeadlines();
  const alerts = getAlerts();

  const remPct = s.budget > 0 ? (s.remaining / s.budget) * 100 : 100;
  const remClass = remPct < 10 ? 'danger' : remPct < 25 ? 'warning' : 'success';
  const progClass = s.pct >= 90 ? 'danger' : s.pct >= 75 ? 'warning' : 'success';

  return `
    ${alerts.map(a => `<div class="alert alert-${a.type}">${a.msg}</div>`).join('')}

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Total Spent</div>
        <div class="summary-value">${fmt(s.spent, trip.currency)}</div>
        <div class="summary-sub">of ${fmt(s.budget, trip.currency)} budget</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Remaining</div>
        <div class="summary-value ${remClass}">${fmt(s.remaining, trip.currency)}</div>
        <div class="summary-sub">${remPct.toFixed(1)}% left</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Budget Used</div>
        <div class="summary-value">${s.pct.toFixed(1)}%</div>
        <div class="progress-bar"><div class="progress-fill ${progClass}" style="width:${Math.min(s.pct,100)}%"></div></div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Expenses</div>
        <div class="summary-value">${state.expenses.length}</div>
        <div class="summary-sub">${filtered.length} shown with filters</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Daily Average</div>
        <div class="summary-value">${fmt(s.dailyAvg, trip.currency)}</div>
        <div class="summary-sub">${s.elapsed} day${s.elapsed !== 1 ? 's' : ''} elapsed</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Daily Budget Left</div>
        <div class="summary-value ${s.projDaily < 0 ? 'danger' : ''}">${fmt(Math.max(0, s.projDaily), trip.currency)}</div>
        <div class="summary-sub">${s.daysLeft} day${s.daysLeft !== 1 ? 's' : ''} remaining</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Trip Duration</div>
        <div class="summary-value">${s.totalDays}</div>
        <div class="summary-sub">days total</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Per Person</div>
        <div class="summary-value">${fmt(s.spent / (trip.travelers || 1), trip.currency)}</div>
        <div class="summary-sub">${trip.travelers || 1} traveler${(trip.travelers||1) > 1 ? 's' : ''}</div>
      </div>
    </div>

    ${renderFiltersPanel()}

    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-title">Spending by Category</div>
        <canvas id="pie-chart" width="280" height="280"></canvas>
        <div class="chart-legend" id="pie-legend"></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Daily Spending</div>
        <canvas id="bar-chart" width="400" height="280"></canvas>
      </div>
    </div>

    ${Object.keys(trip.categoryBudgets || {}).length > 0 ? `
      <div class="card">
        <div class="card-title">📊 Category Budget Progress</div>
        ${CATEGORIES.map(cat => {
          const budget = trip.categoryBudgets[cat];
          if (!budget) return '';
          const spent = byCat[cat] || 0;
          const pct = (spent / budget) * 100;
          const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warning' : 'success';
          return `
            <div class="cat-budget-item">
              <div class="cat-budget-header">
                <span class="cat-budget-name">${cat}</span>
                <span class="cat-budget-values">${fmt(spent, trip.currency)} / ${fmt(budget, trip.currency)} (${pct.toFixed(1)}%)</span>
              </div>
              <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${Math.min(pct,100)}%"></div></div>
            </div>`;
        }).join('')}
      </div>` : ''}

    ${typeof renderBudgetEstimateCard === 'function' ? renderBudgetEstimateCard() : ''}

    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-title">💰 Top 5 Largest Expenses</div>
        ${top.length === 0
          ? '<div class="empty-state" style="padding:20px"><p>No expenses yet.</p></div>'
          : top.map(e => `
            <div class="expense-list-item">
              <div>
                <div style="font-weight:500">${esc(e.description) || e.category}</div>
                <div style="font-size:0.8rem;color:var(--gray-500)">
                  <span class="badge badge-gray cat-${e.category}">${e.category}</span>
                  &nbsp;• ${fmtDateShort(e.date)}
                </div>
              </div>
              <strong>${fmt(e.converted, trip.currency)}</strong>
            </div>`).join('')}
      </div>
      <div class="chart-card">
        <div class="chart-title">📅 Upcoming Refund Deadlines</div>
        ${deadlines.length === 0
          ? '<div class="empty-state" style="padding:20px"><p>No upcoming deadlines.</p></div>'
          : deadlines.map(e => {
            const d = daysBetween(today(), e.refundDeadline);
            return `
              <div class="deadline-item">
                <div class="deadline-badge ${d <= 3 ? 'urgent' : ''}">
                  ${d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d + ' days'}
                </div>
                <div>
                  <div style="font-weight:500">${esc(e.description) || e.category}</div>
                  <div style="font-size:0.8rem;color:var(--gray-500)">${fmt(e.amount, e.currency)} • by ${fmtDate(e.refundDeadline)}</div>
                </div>
              </div>`;}).join('')}
      </div>
    </div>

    ${typeof renderChecklistCard === 'function' ? renderChecklistCard() : ''}`;
}

// ==================== CHARTS ====================

function drawCharts() {
  setTimeout(() => { drawPie(); drawBar(); }, 60);
}

function drawPie() {
  const canvas = $('pie-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const filtered = getFilteredExpenses();
  const byCat = calcByCategory(filtered);
  const data = CATEGORIES.map(c => ({ cat:c, amt:byCat[c]||0 })).filter(d => d.amt > 0);
  const total = data.reduce((s,d) => s + d.amt, 0);
  const trip = state.activeTrip;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (total === 0) {
    ctx.fillStyle = '#9ca3af'; ctx.font = '13px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('No data', canvas.width/2, canvas.height/2);
    return;
  }
  const cx = canvas.width/2, cy = canvas.height/2, r = Math.min(cx,cy) - 16;
  let angle = -Math.PI/2;
  data.forEach(d => {
    const slice = (d.amt/total) * 2 * Math.PI;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx, cy, r, angle, angle+slice); ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[d.cat] || '#9ca3af'; ctx.fill();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0, 2*Math.PI);
  ctx.fillStyle = 'white'; ctx.fill();
  ctx.fillStyle = '#1f2937'; ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total, trip.currency), cx, cy);
  const legend = $('pie-legend');
  if (legend) legend.innerHTML = data.map(d => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${CATEGORY_COLORS[d.cat]||'#9ca3af'}"></div>
      <span>${d.cat}: ${((d.amt/total)*100).toFixed(1)}%</span>
    </div>`).join('');
}

function drawBar() {
  const canvas = $('bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const filtered = getFilteredExpenses();
  const daily = calcDailySpending(filtered);
  const dates = Object.keys(daily).sort();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (dates.length === 0) {
    ctx.fillStyle = '#9ca3af'; ctx.font = '13px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('No data', canvas.width/2, canvas.height/2);
    return;
  }
  const trip = state.activeTrip;
  const vals = dates.map(d => daily[d]);
  const maxVal = Math.max(...vals);
  const pad = { top:16, right:16, bottom:56, left:56 };
  const cw = canvas.width - pad.left - pad.right;
  const ch = canvas.height - pad.top - pad.bottom;
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, canvas.height-pad.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, canvas.height-pad.bottom); ctx.lineTo(canvas.width-pad.right, canvas.height-pad.bottom); ctx.stroke();
  const steps = 4;
  ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= steps; i++) {
    const y = pad.top + ch*i/steps;
    const v = maxVal*(1 - i/steps);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(canvas.width-pad.right, y); ctx.strokeStyle = '#f3f4f6'; ctx.stroke();
    ctx.fillText(fmt(v, trip.currency), pad.left-4, y);
  }
  const bw = Math.min(28, (cw/dates.length)*0.7);
  const gap = (cw - bw*dates.length) / (dates.length+1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  dates.forEach((date, i) => {
    const v = daily[date];
    const bh = maxVal > 0 ? (v/maxVal)*ch : 0;
    const x = pad.left + gap + i*(bw+gap);
    const y = canvas.height - pad.bottom - bh;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#6b7280';
    ctx.save(); ctx.translate(x+bw/2, canvas.height-pad.bottom+4); ctx.rotate(-Math.PI/4);
    ctx.fillText(fmtDateShort(date), 0, 0); ctx.restore();
  });
}

// ==================== FILTERS PANEL ====================

function renderFiltersPanel() {
  const f = state.filters;
  return `
    <div class="filters-panel" style="margin-bottom:20px">
      <div class="filters-row">
        <div class="filter-group">
          <label>From</label>
          <input type="date" value="${f.dateStart}" onchange="updateFilter('dateStart',this.value)">
        </div>
        <div class="filter-group">
          <label>To</label>
          <input type="date" value="${f.dateEnd}" onchange="updateFilter('dateEnd',this.value)">
        </div>
        <div class="filter-group" style="flex:2">
          <label>Categories</label>
          <div class="checkbox-list">
            ${CATEGORIES.map(c => `
              <div class="checkbox-group">
                <input type="checkbox" id="fc-${c}" ${f.categories.includes(c)?'checked':''}
                       onchange="toggleFilterCat('${c}',this.checked)">
                <label for="fc-${c}">${c}</label>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="filters-row" style="margin-top:10px">
        <div class="filter-group" style="flex:2">
          <label>Payment Methods</label>
          <div class="checkbox-list">
            ${PAYMENT_METHODS.map(m => `
              <div class="checkbox-group">
                <input type="checkbox" id="fp-${m.replace(/\s/g,'-')}" ${f.paymentMethods.includes(m)?'checked':''}
                       onchange="toggleFilterPay('${m}',this.checked)">
                <label for="fp-${m.replace(/\s/g,'-')}">${m}</label>
              </div>`).join('')}
          </div>
        </div>
        <div class="filter-group" style="display:flex;align-items:flex-end;gap:10px">
          <div class="checkbox-group">
            <input type="checkbox" id="f-refund" ${f.refundableOnly?'checked':''}
                   onchange="updateFilter('refundableOnly',this.checked)">
            <label for="f-refund">Refundable only</label>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="clearFilters()">Clear</button>
        </div>
      </div>
    </div>`;
}

window.updateFilter = (key, val) => { state.filters[key] = val; renderTabContent(); };
window.toggleFilterCat = (cat, checked) => {
  if (checked) state.filters.categories.push(cat);
  else state.filters.categories = state.filters.categories.filter(c => c !== cat);
  renderTabContent();
};
window.toggleFilterPay = (method, checked) => {
  if (checked) state.filters.paymentMethods.push(method);
  else state.filters.paymentMethods = state.filters.paymentMethods.filter(m => m !== method);
  renderTabContent();
};
window.clearFilters = () => {
  state.filters = { dateStart:'', dateEnd:'', categories:[], paymentMethods:[], refundableOnly:false };
  renderTabContent();
};

// ==================== EXPENSES LIST ====================

function renderExpensesList() {
  const filtered = sortExpenses(getFilteredExpenses());
  const trip = state.activeTrip;
  const sc = state.sortCol, sd = state.sortDir;
  return `
    <div class="card">
      <div class="card-title">📋 All Expenses (${state.expenses.length} total)</div>
      ${renderFiltersPanel()}
      ${filtered.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h3>No expenses yet</h3>
            <p>Add your first expense to start tracking.</p>
            <button class="btn btn-primary" onclick="switchTab('add-expense')" style="margin-top:14px">Add Expense</button>
           </div>`
        : `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th onclick="sortBy('date')" class="${sc==='date'?sd:''}">Date</th>
                  <th>Description</th>
                  <th onclick="sortBy('category')" class="${sc==='category'?sd:''}">Category</th>
                  <th onclick="sortBy('amount')" class="${sc==='amount'?sd:''}">Amount</th>
                  <th>Payment</th>
                  <th>Refundable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(e => {
                  const converted = toTripCurrency(e.amount, e.currency);
                  const showConverted = e.currency !== trip.currency;
                  return `
                    <tr>
                      <td>${fmtDateShort(e.date)}</td>
                      <td>${esc(e.description) || '<em style="color:var(--gray-400)">No description</em>'}</td>
                      <td><span class="badge badge-gray cat-${e.category}">${e.category}</span></td>
                      <td>
                        <strong>${fmt(e.amount, e.currency)}</strong>
                        ${showConverted ? `<div style="font-size:0.75rem;color:var(--gray-400)">≈ ${fmt(converted, trip.currency)}</div>` : ''}
                      </td>
                      <td>${e.paymentMethod}</td>
                      <td>${e.refundable
                        ? `<span class="badge badge-blue">Yes</span>${e.refundDeadline ? `<div style="font-size:0.75rem">by ${fmtDateShort(e.refundDeadline)}</div>` : ''}`
                        : '—'}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="editExpense('${e.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Delete</button>
                      </td>
                    </tr>`;}).join('')}
              </tbody>
            </table>
           </div>
           <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;font-size:0.875rem">
             <span style="color:var(--gray-500)">Showing ${filtered.length} of ${state.expenses.length}</span>
             <strong>Total: ${fmt(calcSpent(filtered), trip.currency)}</strong>
           </div>`}
    </div>`;
}

window.sortBy = (col) => {
  state.sortDir = state.sortCol === col ? (state.sortDir === 'asc' ? 'desc' : 'asc') : (col === 'date' ? 'desc' : 'asc');
  state.sortCol = col;
  renderTabContent();
};

window.deleteExpense = async (id) => {
  if (!confirm('Delete this expense?')) return;
  try {
    await api.deleteExpense(id);
    state.expenses = state.expenses.filter(e => e.id !== id);
    showToast('Expense deleted', 'success');
    renderTabContent();
    renderTripSelector();
  } catch (err) { showToast('Failed to delete: ' + err.message, 'error'); }
};

window.editExpense = (id) => {
  const exp = state.expenses.find(e => e.id === id);
  if (!exp) return;
  state.currentTab = 'add-expense';
  renderTabs();
  $('tab-content').innerHTML = renderAddExpenseForm(exp);
};

// ==================== ADD / EDIT EXPENSE FORM ====================

function renderAddExpenseForm(exp = null) {
  const isEdit = exp !== null;
  const e = exp || {
    amount:'', currency: state.activeTrip?.currency || 'USD',
    category:'', date:today(), description:'',
    paymentMethod:'Credit Card', refundable:false, refundDeadline:'', notes:'',
  };
  return `
    <div class="card" style="max-width:680px;margin:0 auto">
      <div class="card-title">${isEdit ? '✏️ Edit Expense' : '➕ Add New Expense'}</div>
      <form id="expense-form" onsubmit="handleExpenseSubmit(event,'${e.id||''}')">
        <div class="form-row">
          <div class="form-group">
            <label>Amount <span class="required">*</span></label>
            <input type="number" id="e-amount" value="${e.amount||''}" min="0.01" step="0.01" placeholder="0.00">
            <div class="error-msg" id="err-e-amount"></div>
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="e-currency">
              ${CURRENCIES.map(c => `<option value="${c}" ${e.currency===c?'selected':''}>${c} (${CURRENCY_SYMBOLS[c]})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Category <span class="required">*</span></label>
            <select id="e-category">
              <option value="">Select category...</option>
              ${CATEGORIES.map(c => `<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <div class="error-msg" id="err-e-category"></div>
          </div>
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input type="date" id="e-date" value="${e.date}">
            <div class="error-msg" id="err-e-date"></div>
          </div>
        </div>

        <div class="form-group">
          <label>Description / Merchant</label>
          <input type="text" id="e-desc" value="${esc(e.description||'')}"
                 placeholder="e.g., Hilton Hotel, Uber ride"
                 oninput="onDescInput(this.value)">
          <div id="cat-suggestion" style="display:none;font-size:0.8rem;color:var(--primary);margin-top:4px;cursor:pointer"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Payment Method</label>
            <select id="e-payment">
              ${PAYMENT_METHODS.map(m => `<option value="${m}" ${e.paymentMethod===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:10px">
            <div class="checkbox-group">
              <input type="checkbox" id="e-refundable" ${e.refundable?'checked':''} onchange="toggleDeadline()">
              <label for="e-refundable">Refundable</label>
            </div>
          </div>
        </div>

        <div class="form-group ${e.refundable?'':'hidden'}" id="deadline-group">
          <label>Refund Deadline</label>
          <input type="date" id="e-deadline" value="${e.refundDeadline||''}">
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea id="e-notes" placeholder="Any additional notes...">${esc(e.notes||'')}</textarea>
        </div>

        <div class="btn-group" style="margin-top:20px">
          <button type="submit" class="btn btn-success">${isEdit ? '💾 Save Changes' : '➕ Add Expense'}</button>
          ${isEdit ? `<button type="button" class="btn btn-secondary" onclick="switchTab('expenses')">Cancel</button>` : ''}
        </div>
      </form>
    </div>`;
}

window.toggleDeadline = () => {
  const checked = $('e-refundable')?.checked;
  $('deadline-group')?.classList.toggle('hidden', !checked);
};

window.onDescInput = (val) => {
  const sug = suggestCategory(val);
  const el = $('cat-suggestion');
  if (!el) return;
  if (sug) {
    el.style.display = 'block';
    el.textContent = `💡 Suggested category: ${sug} — click to apply`;
    el.onclick = () => { const s = $('e-category'); if (s) s.value = sug; el.style.display = 'none'; };
  } else {
    el.style.display = 'none';
  }
};

window.handleExpenseSubmit = async (event, editId) => {
  event.preventDefault();
  clearErrors();

  const amount = parseFloat($('e-amount')?.value);
  const currency = $('e-currency')?.value;
  const category = $('e-category')?.value;
  const date = $('e-date')?.value;
  const description = $('e-desc')?.value?.trim();
  const paymentMethod = $('e-payment')?.value;
  const refundable = $('e-refundable')?.checked || false;
  const refundDeadline = $('e-deadline')?.value || '';
  const notes = $('e-notes')?.value?.trim();

  let hasErr = false;
  if (!amount || amount <= 0) { showFieldError('e-amount', '⚠️ Enter a valid amount'); hasErr = true; }
  if (!category) { showFieldError('e-category', '⚠️ Select a category'); hasErr = true; }
  if (!date) { showFieldError('e-date', '⚠️ Date is required'); hasErr = true; }
  if (hasErr) { showToast('Please fix the errors', 'error'); return; }

  const expenseData = {
    tripId: state.activeTrip.id,
    amount: Math.round(amount * 100) / 100,
    currency, category, date,
    description: description || null,
    paymentMethod, refundable,
    refundDeadline: refundable ? refundDeadline : null,
    notes: notes || null,
  };

  try {
    if (editId) {
      const updated = await api.updateExpense(editId, expenseData);
      const idx = state.expenses.findIndex(e => e.id === editId);
      if (idx !== -1) state.expenses[idx] = updated;
      showToast('✅ Expense updated!', 'success');
    } else {
      const created = await api.createExpense(expenseData);
      state.expenses.unshift(created);
      showToast('✅ Expense added!', 'success');
    }
    state.currentTab = 'expenses';
    renderAll();
  } catch (err) { showToast('Failed to save: ' + err.message, 'error'); }
};

// ==================== TRIP SETTINGS ====================

function renderTripSettings() {
  const trip = state.activeTrip || {};
  const cb = trip.categoryBudgets || {};
  return `
    <div class="card" style="max-width:780px;margin:0 auto">
      <div class="card-title">${trip.id ? '⚙️ Trip Settings' : '✈️ Create New Trip'}</div>
      <form id="trip-form" onsubmit="handleTripSubmit(event)">
        <div class="form-group">
          <label>Trip Name <span class="required">*</span></label>
          <input type="text" id="t-name" value="${esc(trip.name||'')}" placeholder="e.g., Summer Europe Adventure">
          <div class="error-msg" id="err-t-name"></div>
        </div>

        <div class="form-group">
          <label>Destination Countries <span class="required">*</span></label>
          <div class="country-selector" id="country-selector">
            <input type="text" id="country-search" placeholder="🔍 Search countries..." autocomplete="off"
                   style="width:100%;padding:9px 13px;border:1px solid var(--gray-300);border-radius:var(--radius)">
            <div class="country-dropdown" id="country-dropdown"></div>
          </div>
          <div class="country-tags" id="country-tags"></div>
          <input type="hidden" id="t-destinations" value="${(trip.destinations||[]).join(',')}">
          <div class="error-msg" id="err-t-destinations"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Start Date <span class="required">*</span></label>
            <input type="date" id="t-start" value="${toInputDate(trip.startDate)}">
            <div class="error-msg" id="err-t-start"></div>
          </div>
          <div class="form-group">
            <label>End Date <span class="required">*</span></label>
            <input type="date" id="t-end" value="${toInputDate(trip.endDate)}">
            <div class="error-msg" id="err-t-end"></div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Travelers</label>
            <input type="number" id="t-travelers" value="${trip.travelers||1}" min="1" step="1">
          </div>
          <div class="form-group">
            <label>Currency <span class="required">*</span></label>
            <select id="t-currency">
              ${CURRENCIES.map(c => `<option value="${c}" ${trip.currency===c?'selected':''}>${c} (${CURRENCY_SYMBOLS[c]})</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Total Budget <span class="required">*</span></label>
          <input type="number" id="t-budget" value="${trip.totalBudget||''}" min="0.01" step="0.01" placeholder="5000.00">
          <div class="error-msg" id="err-t-budget"></div>
        </div>

        <div class="form-group" style="margin-top:20px">
          <label style="font-size:1rem;margin-bottom:10px">Category Budgets (Optional)</label>
          <div class="form-row">
            ${CATEGORIES.map(cat => `
              <div class="form-group">
                <label>${cat}</label>
                <input type="number" id="cb-${cat.replace(/\s/g,'-')}" value="${cb[cat]||''}" min="0" step="0.01" placeholder="0.00">
              </div>`).join('')}
          </div>
        </div>

        <div class="btn-group" style="margin-top:24px">
          <button type="submit" class="btn btn-primary">${trip.id ? '💾 Save Changes' : '✈️ Create Trip'}</button>
          ${trip.id ? `
            <button type="button" class="btn btn-secondary" onclick="switchTab('dashboard')">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="startWizard('${trip.id}')">🧙 Run Wizard</button>
            ${trip.role === 'owner' ? `
              <button type="button" class="btn btn-success" onclick="showShareModal()">🔗 Share Trip</button>
              <button type="button" class="btn btn-danger" onclick="deleteTrip('${trip.id}')">🗑️ Delete Trip</button>
            ` : ''}` : ''}
        </div>
      </form>
    </div>`;
}

window.handleTripSubmit = async (event) => {
  event.preventDefault();
  clearErrors();

  const name = $('t-name')?.value.trim();
  const destinations = ($('t-destinations')?.value || '').split(',').filter(Boolean);
  const startDate = $('t-start')?.value;
  const endDate = $('t-end')?.value;
  const travelers = parseInt($('t-travelers')?.value) || 1;
  const currency = $('t-currency')?.value;
  const totalBudget = parseFloat($('t-budget')?.value);

  let hasErr = false;
  if (!name) { showFieldError('t-name', 'Trip name is required'); hasErr = true; }
  if (!destinations.length) { showFieldError('t-destinations', 'Select at least one country'); hasErr = true; }
  if (!startDate) { showFieldError('t-start', 'Start date required'); hasErr = true; }
  if (!endDate) { showFieldError('t-end', 'End date required'); hasErr = true; }
  if (startDate && endDate && endDate < startDate) { showFieldError('t-end', 'End must be after start'); hasErr = true; }
  if (!totalBudget || totalBudget <= 0) { showFieldError('t-budget', 'Enter a valid budget'); hasErr = true; }
  if (hasErr) return;

  const categoryBudgets = {};
  CATEGORIES.forEach(cat => {
    const el = $(`cb-${cat.replace(/\s/g,'-')}`);
    const val = parseFloat(el?.value);
    if (val > 0) categoryBudgets[cat] = val;
  });

  const tripData = { name, destinations, startDate, endDate, travelers, currency, totalBudget, categoryBudgets };

  try {
    if (state.activeTrip?.id) {
      const updated = await api.updateTrip(state.activeTrip.id, tripData);
      Object.assign(state.activeTrip, updated);
      const idx = state.trips.findIndex(t => t.id === state.activeTrip.id);
      if (idx !== -1) state.trips[idx] = { ...state.trips[idx], ...updated };
      showToast('✅ Trip updated!', 'success');
    } else {
      const created = await api.createTrip(tripData);
      state.trips.unshift(created);
      state.activeTrip = created;
      state.expenses = [];
      showToast('✅ Trip created!', 'success');
    }
    state.currentTab = 'dashboard';
    renderAll();
  } catch (err) { showToast('Failed to save trip: ' + err.message, 'error'); }
};

window.deleteTrip = async (tripId) => {
  if (!confirm('Delete this trip and all its expenses? This cannot be undone.')) return;
  try {
    await api.deleteTrip(tripId);
    state.trips = state.trips.filter(t => t.id !== tripId);
    state.activeTrip = state.trips[0] || null;
    state.expenses = state.activeTrip ? await api.getExpenses(state.activeTrip.id) : [];
    showToast('Trip deleted', 'success');
    state.currentTab = 'dashboard';
    renderAll();
  } catch (err) { showToast('Failed to delete: ' + err.message, 'error'); }
};

// ==================== CREATE TRIP MODAL ====================

// ==================== COUNTRY SELECTOR ====================

function initCountrySelector() {
  const search = $('country-search');
  const dropdown = $('country-dropdown');
  if (!search || !dropdown) return;

  const hiddenInput = $('t-destinations');
  state.selectedCountries = hiddenInput?.value ? hiddenInput.value.split(',').filter(Boolean) : [];

  renderDropdown('');
  renderTags();

  search.addEventListener('focus', () => { dropdown.classList.add('open'); renderDropdown(search.value); });
  search.addEventListener('input', () => renderDropdown(search.value));

  document.addEventListener('click', (e) => {
    if (!$('country-selector')?.contains(e.target)) dropdown.classList.remove('open');
  }, { once: false });
}

function renderDropdown(term) {
  const dropdown = $('country-dropdown');
  if (!dropdown) return;
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(term.toLowerCase().trim()));
  dropdown.innerHTML = filtered.length === 0
    ? '<div style="padding:12px;text-align:center;color:var(--gray-400)">No results</div>'
    : filtered.map(c => `
        <div class="country-option ${state.selectedCountries.includes(c)?'selected':''}"
             onclick="toggleCountry('${c}')">${c}</div>`).join('');
}

window.toggleCountry = (country) => {
  const idx = state.selectedCountries.indexOf(country);
  if (idx === -1) state.selectedCountries.push(country);
  else state.selectedCountries.splice(idx, 1);
  const h = $('t-destinations');
  if (h) h.value = state.selectedCountries.join(',');
  renderDropdown($('country-search')?.value || '');
  renderTags();
};

function renderTags() {
  const container = $('country-tags');
  if (!container) return;
  container.innerHTML = state.selectedCountries.length === 0
    ? '<span style="color:var(--gray-400);font-size:0.85rem">No countries selected</span>'
    : state.selectedCountries.map(c => `
        <span class="country-tag">${c}
          <button type="button" class="tag-remove" onclick="toggleCountry('${c}')">×</button>
        </span>`).join('');
}

// ==================== SHARING ====================

window.showShareModal = async () => {
  const trip = state.activeTrip;
  if (!trip) return;

  // Show loading modal first
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'share-modal';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:480px">
      <div class="modal-header">
        <h3>🔗 Share Trip</h3>
        <button class="modal-close" onclick="closeShareModal()">×</button>
      </div>
      <div class="modal-body" id="share-modal-body">
        <div style="text-align:center;padding:20px;color:var(--gray-400)">Generating invite link...</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) closeShareModal(); };

  try {
    const { inviteUrl, expiresAt } = await api.createInvitation(trip.id);
    const members = await api.getTripMembers(trip.id);
    const expiry = new Date(expiresAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

    document.getElementById('share-modal-body').innerHTML = `
      <div class="form-group">
        <label>Invite Link <span style="font-size:0.75rem;color:var(--gray-400)">(expires ${expiry})</span></label>
        <div style="display:flex;gap:8px">
          <input type="text" id="invite-url-input" value="${inviteUrl}" readonly
                 style="flex:1;background:var(--gray-50);font-size:0.82rem">
          <button class="btn btn-primary" onclick="copyInviteLink()">Copy</button>
        </div>
        <div id="copy-success" style="display:none;color:var(--success);font-size:0.8rem;margin-top:4px">✅ Copied to clipboard!</div>
        <p style="font-size:0.8rem;color:var(--gray-400);margin-top:8px">
          Anyone with this link can join as a collaborator after signing in with Google.
          The link can only be used once.
        </p>
      </div>

      <div style="margin-top:20px">
        <div class="card-title" style="font-size:0.95rem">👥 Trip Members</div>
        <div id="members-list">
          ${members.map(m => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
              <img src="${m.user?.picture || 'https://via.placeholder.com/32'}" 
                   style="width:36px;height:36px;border-radius:50%;object-fit:cover"
                   onerror="this.src='https://via.placeholder.com/32'">
              <div style="flex:1">
                <div style="font-weight:500;font-size:0.9rem">${esc(m.user?.name || m.user?.email || 'Unknown')}</div>
                <div style="font-size:0.78rem;color:var(--gray-400)">${m.user?.email || ''}</div>
              </div>
              <span style="font-size:0.75rem;padding:3px 10px;border-radius:20px;font-weight:500;
                           background:${m.role==='owner'?'#dbeafe':'#d1fae5'};
                           color:${m.role==='owner'?'#1e40af':'#065f46'}">
                ${m.role === 'owner' ? '👑 Owner' : '✏️ Collaborator'}
              </span>
              ${m.role !== 'owner' && trip.role === 'owner'
                ? `<button class="btn btn-danger btn-sm" onclick="removeMember('${trip.id}','${m.userId}')">Remove</button>`
                : ''}
            </div>`).join('')}
        </div>
      </div>`;
  } catch (err) {
    document.getElementById('share-modal-body').innerHTML = `
      <div class="alert alert-danger">${err.message}</div>`;
  }
};

window.copyInviteLink = () => {
  const input = document.getElementById('invite-url-input');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    const msg = document.getElementById('copy-success');
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 2000); }
  });
};

window.closeShareModal = () => {
  document.getElementById('share-modal')?.remove();
};

window.removeMember = async (tripId, userId) => {
  if (!confirm('Remove this member from the trip?')) return;
  try {
    await api.removeTripMember(tripId, userId);
    showToast('Member removed', 'success');
    // Refresh modal
    closeShareModal();
    showShareModal();
  } catch (err) {
    showToast('Failed to remove member: ' + err.message, 'error');
  }
};

// Shared app context for wizard-addon.js (separate ES module scope)
window.tripBudgetApp = {
  state,
  renderAll,
  renderTabs,
  renderTabContent,
  toTripCurrency,
  esc,
  today,
  showToast,
  CURRENCY_SYMBOLS,
};

// ==================== START ====================

// Handle invite token in URL on page load
async function handleInviteToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return false;

  try {
    const { trip, alreadyMember } = await api.previewInvitation(token);

    if (alreadyMember) {
      // Already a member — just load the trip
      showToast(`You already have access to "${trip.name}"`, 'info');
      window.history.replaceState({}, '', '/');
      return true;
    }

    // Show accept modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal fade-in" style="max-width:420px">
        <div class="modal-header">
          <h3>✈️ Trip Invitation</h3>
        </div>
        <div class="modal-body" style="text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px">🗺️</div>
          <h3 style="margin-bottom:6px">${esc(trip.name)}</h3>
          <p style="color:var(--gray-500);font-size:0.9rem;margin-bottom:20px">
            You've been invited to collaborate on this trip as a collaborator.<br>
            You'll be able to view and add expenses.
          </p>
          <div style="background:var(--gray-50);border-radius:var(--radius);padding:14px;margin-bottom:20px;text-align:left;font-size:0.875rem">
            <div>📍 ${(trip.destinations||[]).join(', ') || 'N/A'}</div>
            <div style="margin-top:6px">📅 ${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}</div>
            <div style="margin-top:6px">💰 ${trip.currency} ${parseFloat(trip.totalBudget).toLocaleString()} budget</div>
          </div>
          <div class="btn-group" style="justify-content:center">
            <button class="btn btn-primary" id="accept-invite-btn" onclick="acceptInvite('${token}')">
              ✅ Join Trip
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();window.history.replaceState({},'','/')">
              Decline
            </button>
          </div>
          <div id="accept-error" style="display:none;margin-top:12px" class="alert alert-danger"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    window.history.replaceState({}, '', '/');
    return true;
  } catch (err) {
    showToast('Invalid or expired invite link: ' + err.message, 'error');
    window.history.replaceState({}, '', '/');
    return false;
  }
}

window.acceptInvite = async (token) => {
  const btn = document.getElementById('accept-invite-btn');
  const errEl = document.getElementById('accept-error');
  if (btn) { btn.textContent = 'Joining...'; btn.disabled = true; }
  try {
    const { trip } = await api.acceptInvitation(token);
    document.querySelector('.modal-overlay')?.remove();
    showToast(`✅ You've joined "${trip.name}"!`, 'success');
    // Reload trips to include the new one
    state.trips = await api.getTrips();
    const joined = state.trips.find(t => t.id === trip.id);
    if (joined) { state.activeTrip = joined; state.expenses = await api.getExpenses(joined.id); }
    renderAll();
  } catch (err) {
    if (btn) { btn.textContent = '✅ Join Trip'; btn.disabled = false; }
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = err.message; }
  }
};

init();

