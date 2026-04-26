// ==================== WIZARD CONSTANTS ====================

const WIZARD_DESTINATIONS = [
  { key: 'Thailand',    flag: '🇹🇭', baseDaily: 55  },
  { key: 'Vietnam',     flag: '🇻🇳', baseDaily: 45  },
  { key: 'India',       flag: '🇮🇳', baseDaily: 38  },
  { key: 'Japan',       flag: '🇯🇵', baseDaily: 110 },
  { key: 'Indonesia',   flag: '🇮🇩', baseDaily: 50  },
  { key: 'Cambodia',    flag: '🇰🇭', baseDaily: 40  },
  { key: 'Portugal',    flag: '🇵🇹', baseDaily: 90  },
  { key: 'Spain',       flag: '🇪🇸', baseDaily: 95  },
  { key: 'Italy',       flag: '🇮🇹', baseDaily: 105 },
  { key: 'Greece',      flag: '🇬🇷', baseDaily: 85  },
  { key: 'Mexico',      flag: '🇲🇽', baseDaily: 60  },
  { key: 'Colombia',    flag: '🇨🇴', baseDaily: 50  },
  { key: 'Morocco',     flag: '🇲🇦', baseDaily: 45  },
  { key: 'Other',       flag: '🌍', baseDaily: 70  },
];

const WIZARD_STYLES = [
  { id: 'budget',  label: 'Budget',  sub: 'Hostels, street food',          multiplier: 0.65 },
  { id: 'mid',     label: 'Mid-range', sub: 'Decent hotel, basic comfort', multiplier: 1.0  },
  { id: 'comfort', label: 'Comfort', sub: '4-star, quality experiences',   multiplier: 1.5  },
  { id: 'luxury',  label: 'Premium', sub: '5-star, business class',        multiplier: 2.4  },
];

const WIZARD_CHECKLIST = {
  always: [
    { text: 'Check passport expiry (6+ months required)',   category: 'Documents', urgent: true  },
    { text: 'Purchase travel insurance',                     category: 'Documents', urgent: true  },
    { text: 'Scan all documents to cloud',                   category: 'Documents', urgent: false },
    { text: 'Notify bank of travel dates',                   category: 'Finance',   urgent: false },
    { text: 'Get local SIM / eSIM',                          category: 'Gear',      urgent: false },
  ],
  budget: [
    { text: 'Get a no-foreign-fee debit card (Wise/Revolut)', category: 'Finance', urgent: true  },
    { text: 'Pack a backpack instead of suitcase',            category: 'Gear',    urgent: false },
  ],
  mid: [
    { text: 'Get a no-foreign-fee credit card',              category: 'Finance',   urgent: true  },
    { text: 'Power bank 20,000mAh',                          category: 'Gear',      urgent: false },
    { text: 'Buy eSIM before departure',                     category: 'Gear',      urgent: false },
  ],
  comfort: [
    { text: 'Amex card with travel insurance included',      category: 'Finance',   urgent: true  },
    { text: 'Hard-shell suitcase with TSA lock',             category: 'Gear',      urgent: false },
    { text: 'Power bank 20,000mAh',                          category: 'Gear',      urgent: false },
  ],
  luxury: [
    { text: 'Amex Platinum — lounge access + insurance',     category: 'Finance',   urgent: true  },
    { text: 'Premium travel insurance with medical evac',    category: 'Documents', urgent: true  },
  ],
  withKids: [
    { text: "Children's first aid kit",                      category: 'Health',    urgent: true  },
    { text: 'DEET / Picaridin insect repellent for kids',    category: 'Health',    urgent: true  },
    { text: 'ORS rehydration salts',                         category: 'Health',    urgent: true  },
    { text: 'Digital thermometer',                           category: 'Health',    urgent: false },
    { text: 'Antibacterial wipes (bulk)',                    category: 'Health',    urgent: false },
    { text: 'See travel doctor — vaccinations for children', category: 'Health',    urgent: true  },
    { text: 'Child sun cream SPF 50+',                       category: 'Health',    urgent: false },
  ],
  india: [
    { text: 'Apply for India e-Tourist Visa (indianvisaonline.gov.in)', category: 'Documents', urgent: true },
    { text: 'Consult doctor about malaria prevention',       category: 'Health',    urgent: true  },
    { text: 'Pack long sleeves for evenings (mosquitoes)',   category: 'Gear',      urgent: false },
  ],
  vietnam: [
    { text: 'Apply for Vietnam e-Visa (90 days)',            category: 'Documents', urgent: true  },
  ],
  japan: [
    { text: 'Check JR Pass options if doing multiple cities', category: 'Finance', urgent: false },
    { text: 'Download offline maps (Japan trains complex)',   category: 'Gear',     urgent: false },
  ],
};

// ==================== WIZARD STATE ====================

const wizardState = {
  step: 0,
  destinations: [],   // [{ key, flag, days }]
  adults: 2,
  kidAges: [],
  style: 'mid',
  startDate: '',
  durationDays: 180,
  applyToTripId: null, // null = new trip, string = existing trip id
};

// ==================== WIZARD CALCULATIONS ====================

function wizardKidFactor(ages) {
  if (!ages.length) return 1;
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
  if (avg <= 4)  return 0.25;
  if (avg <= 7)  return 0.4;
  if (avg <= 10) return 0.55;
  if (avg <= 13) return 0.7;
  return 0.85;
}

function wizardGenerateEstimate() {
  const mult   = WIZARD_STYLES.find(s => s.id === wizardState.style)?.multiplier ?? 1;
  const kf     = wizardKidFactor(wizardState.kidAges);
  const adults = wizardState.adults;
  const kids   = wizardState.kidAges.length;
  const ILS    = 3.65;

  return wizardState.destinations.map(d => {
    const preset   = WIZARD_DESTINATIONS.find(p => p.key === d.key);
    const base     = (preset?.baseDaily ?? 70) * mult;
    const lodging  = base * 0.42;
    const food     = base * 0.28;
    const transport= base * 0.18;
    const activities=base * 0.12;

    const daily = lodging
      + (adults + kids * kf) * (food + transport + activities);

    return {
      destination: d.key,
      flag:        d.flag,
      days:        d.days,
      dailyRate:   Math.round(daily * ILS),
      estimatedTotal: Math.round(daily * d.days * ILS),
      actualTotal: 0,
      isFixed:     false,
    };
  });
}

function wizardGenerateChecklist() {
  const items = [
    ...WIZARD_CHECKLIST.always,
    ...WIZARD_CHECKLIST[wizardState.style],
  ];
  if (wizardState.kidAges.length > 0)
    items.push(...WIZARD_CHECKLIST.withKids);

  wizardState.destinations.forEach(d => {
    const key = d.key.toLowerCase();
    if (WIZARD_CHECKLIST[key]) items.push(...WIZARD_CHECKLIST[key]);
  });

  // deduplicate
  const seen = new Set();
  return items.filter(i => { if (seen.has(i.text)) return false; seen.add(i.text); return true; });
}

function wizardTotalEstimate() {
  return wizardGenerateEstimate().reduce((s, r) => s + r.estimatedTotal, 0);
}

// ==================== TRIP CHOICE MODAL ====================
// Replaces the old showCreateTripModal — shows Quick Create vs Wizard

window.showCreateTripModal = () => {
  closeModal('trip-choice-modal');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'trip-choice-modal';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:460px">
      <div class="modal-header">
        <h3>✈️ Create New Trip</h3>
        <button class="modal-close" onclick="closeModal('trip-choice-modal')">×</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--gray-500);margin-bottom:20px;font-size:0.9rem">
          How would you like to set up your trip?
        </p>
        <div style="display:grid;gap:12px">
          <button class="choice-card" onclick="closeModal('trip-choice-modal');startWizard(null)">
            <div class="choice-icon">🧙</div>
            <div class="choice-body">
              <div class="choice-title">Guided Wizard</div>
              <div class="choice-sub">Answer a few questions — get automatic budget estimates, a checklist, and daily spending targets per destination.</div>
            </div>
          </button>
          <button class="choice-card" onclick="closeModal('trip-choice-modal');quickCreateTrip()">
            <div class="choice-icon">⚡</div>
            <div class="choice-body">
              <div class="choice-title">Quick Create</div>
              <div class="choice-sub">Fill in the trip form manually. Best if you already know your exact budget.</div>
            </div>
          </button>
        </div>
      </div>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) closeModal('trip-choice-modal'); };
  document.body.appendChild(overlay);
};

// Quick Create = old behavior (go to settings tab with empty form)
window.quickCreateTrip = () => {
  const prev = state.activeTrip;
  state.activeTrip = null;
  state.currentTab = 'settings';
  renderTabs();
  renderTabContent();
  const cancelBtn = document.querySelector('#trip-form .btn-secondary');
  if (cancelBtn) cancelBtn.onclick = () => {
    state.activeTrip = prev;
    state.currentTab = 'dashboard';
    renderAll();
  };
};

// ==================== WIZARD LAUNCH ====================

// applyToTripId: null = new trip, string = apply to existing trip
window.startWizard = (applyToTripId = null) => {
  Object.assign(wizardState, {
    step: 0,
    destinations: [],
    adults: 2,
    kidAges: [],
    style: 'mid',
    startDate: '',
    durationDays: 180,
    applyToTripId,
  });
  renderWizardModal();
};

// ==================== WIZARD MODAL RENDERER ====================

function renderWizardModal() {
  closeModal('wizard-modal');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'wizard-modal';

  const steps = ['Destinations', 'Travelers', 'Style', 'Dates'];
  const pips = steps.map((s, i) => `
    <div class="wpip ${i < wizardState.step ? 'done' : ''} ${i === wizardState.step ? 'active' : ''}">
      <div class="wpip-dot">${i < wizardState.step ? '✓' : i + 1}</div>
      <div class="wpip-label">${s}</div>
    </div>`).join('');

  const body = [
    renderWizardStep0,
    renderWizardStep1,
    renderWizardStep2,
    renderWizardStep3,
  ][wizardState.step]();

  const canNext = wizardState.step === 0
    ? wizardState.destinations.length > 0
    : true;

  const isLast = wizardState.step === 3;
  const title  = wizardState.applyToTripId
    ? `🧙 Add Wizard to: ${state.trips.find(t => t.id === wizardState.applyToTripId)?.name || 'Trip'}`
    : '🧙 New Trip Wizard';

  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:600px;width:100%">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal('wizard-modal')">×</button>
      </div>
      <div class="modal-body">
        <div class="wizard-steps">${pips}</div>
        <div id="wizard-step-body" style="margin-top:20px">${body}</div>
      </div>
      <div class="modal-footer">
        ${wizardState.step > 0
          ? `<button class="btn btn-secondary" onclick="wizardBack()">← Back</button>`
          : ''}
        <div style="flex:1"></div>
        ${isLast
          ? `<button class="btn btn-success" id="wizard-finish-btn" onclick="wizardFinish()">
               ${wizardState.applyToTripId ? '✅ Apply to Trip' : '✅ Create Trip'}
             </button>`
          : `<button class="btn btn-primary" ${canNext ? '' : 'disabled'} onclick="wizardNext()">
               Next →
             </button>`}
      </div>
    </div>`;
  overlay.onclick = e => { if (e.target === overlay) closeModal('wizard-modal'); };
  document.body.appendChild(overlay);
}

// ── Step 0: Destinations ──

function renderWizardStep0() {
  return `
    <p style="color:var(--gray-500);font-size:0.875rem;margin-bottom:14px">
      Select destinations and set how many days you'll spend in each.
    </p>
    <div class="wdest-grid">
      ${WIZARD_DESTINATIONS.map(p => {
        const sel = wizardState.destinations.find(d => d.key === p.key);
        return `
          <div class="wdest-card ${sel ? 'selected' : ''}" onclick="wizardToggleDest('${p.key}','${p.flag}')">
            <div class="wdest-flag">${p.flag}</div>
            <div class="wdest-name">${p.key}</div>
            ${sel ? `
              <div class="wdest-days" onclick="event.stopPropagation()">
                <input type="number" min="1" max="365" value="${sel.days}"
                       style="width:52px;padding:3px 6px;font-size:12px;text-align:center"
                       onchange="wizardSetDays('${p.key}',this.value)">
                <span style="font-size:11px;color:var(--gray-500)">days</span>
              </div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

// ── Step 1: Travelers ──

function renderWizardStep1() {
  const kids = wizardState.kidAges;
  return `
    <div style="max-width:400px;margin:0 auto">
      <div class="wrow">
        <span class="wrow-label">Adults</span>
        <div class="wcounter">
          <button type="button" onclick="wizardState.adults=Math.max(1,wizardState.adults-1);refreshWizardStep()">−</button>
          <span>${wizardState.adults}</span>
          <button type="button" onclick="wizardState.adults++;refreshWizardStep()">+</button>
        </div>
      </div>
      <div class="wrow" style="border-bottom:none">
        <span class="wrow-label">Children</span>
        <button class="btn btn-secondary btn-sm" type="button" onclick="wizardAddKid()">+ Add child</button>
      </div>
      ${kids.map((age, i) => `
        <div class="wkid-row">
          <span style="font-size:13px;color:var(--gray-600);min-width:56px">Child ${i+1}</span>
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <input type="range" min="0" max="17" value="${age}"
                   oninput="wizardSetKidAge(${i},this.value);this.nextElementSibling.textContent='Age '+this.value"
                   style="flex:1">
            <span style="font-size:13px;font-weight:500;min-width:44px">Age ${age}</span>
          </div>
          <button type="button" onclick="wizardRemoveKid(${i})"
                  style="background:none;border:none;color:var(--gray-400);font-size:18px;cursor:pointer;line-height:1">×</button>
        </div>`).join('')}
      ${kids.length > 0 ? `
        <div style="margin-top:12px;padding:10px 14px;background:var(--gray-50);border-radius:var(--radius);font-size:12px;color:var(--gray-500);line-height:1.6">
          Children under 5 cost ~25% of adult · Ages 6–10 ~45% · Ages 11–17 ~70%
        </div>` : ''}
    </div>`;
}

// ── Step 2: Style ──

function renderWizardStep2() {
  return `
    <p style="color:var(--gray-500);font-size:0.875rem;margin-bottom:14px">
      Your travel style sets a cost multiplier for every destination.
    </p>
    <div class="wstyle-grid">
      ${WIZARD_STYLES.map(s => `
        <div class="wstyle-card ${wizardState.style === s.id ? 'selected' : ''}"
             onclick="wizardState.style='${s.id}';refreshWizardStep()">
          <div style="font-size:15px;font-weight:600;color:var(--gray-800);margin-bottom:4px">${s.label}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-bottom:8px">${s.sub}</div>
          <div style="font-size:11px;color:var(--primary);font-weight:500">×${s.multiplier} base rate</div>
        </div>`).join('')}
    </div>`;
}

// ── Step 3: Dates + Preview ──

function renderWizardStep3() {
  const estimate = wizardGenerateEstimate();
  const total    = estimate.reduce((s, r) => s + r.estimatedTotal, 0);
  const checklist= wizardGenerateChecklist();
  const urgent   = checklist.filter(c => c.urgent).length;
  const ILS_sym  = '₪';

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="form-group" style="margin:0">
        <label>Departure Date</label>
        <input type="date" value="${wizardState.startDate}"
               onchange="wizardState.startDate=this.value;refreshWizardStep()">
      </div>
      <div class="form-group" style="margin:0">
        <label>Total Duration</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" min="7" max="365" value="${wizardState.durationDays}"
                 oninput="wizardState.durationDays=+this.value;refreshWizardStep()" style="flex:1">
          <span style="font-size:13px;font-weight:500;min-width:80px">
            ${wizardState.durationDays}d (~${(wizardState.durationDays/30).toFixed(1)}mo)
          </span>
        </div>
      </div>
    </div>

    <div style="background:var(--gray-50);border-radius:var(--radius);overflow:hidden;margin-bottom:14px">
      <div style="padding:10px 14px;background:var(--gray-200);font-size:12px;font-weight:600;color:var(--gray-700);text-transform:uppercase;letter-spacing:.04em">
        Budget Preview
      </div>
      ${estimate.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--gray-200)">
          <span style="font-size:13px">${r.flag} ${r.destination} <span style="color:var(--gray-400)">(${r.days}d)</span></span>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:500">${ILS_sym}${r.estimatedTotal.toLocaleString()}</div>
            <div style="font-size:11px;color:var(--gray-400)">${ILS_sym}${r.dailyRate}/day</div>
          </div>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:12px 14px;font-weight:600">
        <span>Total estimate</span>
        <span style="color:var(--primary)">${ILS_sym}${total.toLocaleString()}</span>
      </div>
    </div>

    <div style="font-size:12px;color:var(--gray-500);display:flex;gap:16px">
      <span>📋 ${checklist.length} checklist items</span>
      <span style="color:var(--danger)">🔴 ${urgent} urgent tasks</span>
    </div>`;
}

// ==================== WIZARD ACTIONS ====================

window.wizardToggleDest = (key, flag) => {
  const idx = wizardState.destinations.findIndex(d => d.key === key);
  if (idx === -1) wizardState.destinations.push({ key, flag, days: 30 });
  else wizardState.destinations.splice(idx, 1);
  refreshWizardStep();
};

window.wizardSetDays = (key, val) => {
  const d = wizardState.destinations.find(d => d.key === key);
  if (d) d.days = Math.max(1, parseInt(val) || 1);
};

window.wizardAddKid = () => {
  wizardState.kidAges.push(8);
  refreshWizardStep();
};

window.wizardRemoveKid = (i) => {
  wizardState.kidAges.splice(i, 1);
  refreshWizardStep();
};

window.wizardSetKidAge = (i, val) => {
  wizardState.kidAges[i] = parseInt(val);
};

function refreshWizardStep() {
  const body = document.getElementById('wizard-step-body');
  if (!body) return;
  body.innerHTML = [
    renderWizardStep0,
    renderWizardStep1,
    renderWizardStep2,
    renderWizardStep3,
  ][wizardState.step]();

  // update Next button disabled state
  const nextBtn = document.querySelector('#wizard-modal .btn-primary');
  if (nextBtn && wizardState.step === 0)
    nextBtn.disabled = wizardState.destinations.length === 0;
}

window.wizardNext = () => {
  if (wizardState.step < 3) { wizardState.step++; renderWizardModal(); }
};

window.wizardBack = () => {
  if (wizardState.step > 0) { wizardState.step--; renderWizardModal(); }
};

window.wizardFinish = async () => {
  const btn = document.getElementById('wizard-finish-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  const budgetItems  = wizardGenerateEstimate();
  const checklist    = wizardGenerateChecklist();
  const totalEstimate= budgetItems.reduce((s, r) => s + r.estimatedTotal, 0);
  const styleMeta    = WIZARD_STYLES.find(s => s.id === wizardState.style);

  try {
    if (wizardState.applyToTripId) {
      // ── Apply to existing trip ──
      const trip = state.trips.find(t => t.id === wizardState.applyToTripId);
      if (!trip) throw new Error('Trip not found');

      const updated = await api.updateTrip(wizardState.applyToTripId, {
        ...trip,
        categoryBudgets: {
          ...(trip.categoryBudgets || {}),
          items: budgetItems,
          checklist,
          meta: { style: wizardState.style, adults: wizardState.adults, kidAges: wizardState.kidAges },
        },
      });
      Object.assign(state.activeTrip, updated);
      const idx = state.trips.findIndex(t => t.id === wizardState.applyToTripId);
      if (idx !== -1) state.trips[idx] = { ...state.trips[idx], ...updated };

      closeModal('wizard-modal');
      showToast(`✅ Wizard applied to "${trip.name}"!`, 'success');
      state.currentTab = 'dashboard';
      renderAll();

    } else {
      // ── Create new trip ──
      const endDate = wizardState.startDate
        ? new Date(new Date(wizardState.startDate).getTime() + wizardState.durationDays * 86400000)
            .toISOString().split('T')[0]
        : '';

      const tripData = {
        name: `${wizardState.destinations.map(d => d.key).join(' + ')} ${new Date().getFullYear()}`,
        destinations: wizardState.destinations.map(d => d.key),
        startDate: wizardState.startDate || today(),
        endDate: endDate || today(),
        travelers: wizardState.adults + wizardState.kidAges.length,
        currency: 'ILS',
        totalBudget: totalEstimate,
        categoryBudgets: {
          items: budgetItems,
          checklist,
          meta: { style: wizardState.style, adults: wizardState.adults, kidAges: wizardState.kidAges },
        },
      };

      const created = await api.createTrip(tripData);
      state.trips.unshift(created);
      state.activeTrip = created;
      state.expenses = [];

      closeModal('wizard-modal');
      showToast('✅ Trip created!', 'success');
      state.currentTab = 'dashboard';
      renderAll();
    }
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = wizardState.applyToTripId ? '✅ Apply to Trip' : '✅ Create Trip'; }
  }
};

// ==================== CLOSE MODAL HELPER ====================

window.closeModal = (id) => { document.getElementById(id)?.remove(); };

// ==================== DYNAMIC BUDGET CARD ====================
// Drop this inside renderDashboard() — call renderBudgetEstimateCard() anywhere in the HTML string

function renderBudgetEstimateCard() {
  const trip = state.activeTrip;
  const items = trip?.categoryBudgets?.items;
  if (!items || !items.length) return '';

  const ILS_SYM = CURRENCY_SYMBOLS[trip.currency] || trip.currency;

  // Merge actual expenses into each destination row
  const rows = items.map(item => {
    const actual = state.expenses
      .filter(e => e.location === item.destination || e.description?.toLowerCase().includes(item.destination.toLowerCase()))
      .reduce((sum, e) => sum + toTripCurrency(e.amount, e.currency), 0);

    const isFixed   = actual > 0;
    const remaining = item.estimatedTotal - actual;
    const pct       = item.estimatedTotal > 0 ? Math.round((actual / item.estimatedTotal) * 100) : 0;
    const isOver    = actual > item.estimatedTotal;

    return { ...item, actual: Math.round(actual), remaining: Math.round(remaining), pct, isFixed, isOver };
  });

  const totEst    = rows.reduce((s, r) => s + r.estimatedTotal, 0);
  const totActual = rows.reduce((s, r) => s + r.actual, 0);
  const totRem    = totEst - totActual;
  const totalPct  = totEst > 0 ? Math.round((totActual / totEst) * 100) : 0;
  const progClass = totalPct >= 100 ? 'danger' : totalPct >= 75 ? 'warning' : 'success';

  const meta     = trip.categoryBudgets?.meta || {};
  const styleLabel = WIZARD_STYLES.find(s => s.id === meta.style)?.label || '';

  return `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>🗺️ Destination Budget Tracker</span>
        <div style="display:flex;gap:8px;align-items:center">
          ${styleLabel ? `<span class="badge badge-blue">${styleLabel}</span>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="startWizard('${trip.id}')">🧙 Re-run Wizard</button>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div class="progress-bar" style="flex:1;margin-top:0">
          <div class="progress-fill ${progClass}" style="width:${Math.min(totalPct,100)}%"></div>
        </div>
        <span style="font-size:12px;color:var(--gray-500);white-space:nowrap">${totalPct}% of estimates used</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Destination</th>
              <th>Days</th>
              <th>Estimate</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr style="${r.isOver ? 'background:#fff5f5' : ''}">
                <td><span style="margin-right:6px">${r.flag || ''}</span>${r.destination}</td>
                <td style="color:var(--gray-500)">${r.days}</td>
                <td style="color:var(--gray-500)">${ILS_SYM}${r.estimatedTotal.toLocaleString()}</td>
                <td>
                  ${r.isFixed
                    ? `<strong style="color:${r.isOver ? 'var(--danger)' : 'var(--gray-800)'}">${ILS_SYM}${r.actual.toLocaleString()}</strong>`
                    : `<span style="color:var(--gray-300)">—</span>`}
                </td>
                <td style="color:${r.isOver ? 'var(--danger)' : r.isFixed ? 'var(--success)' : 'var(--gray-400)'}">
                  ${r.isFixed
                    ? (r.isOver
                        ? `−${ILS_SYM}${Math.abs(r.remaining).toLocaleString()}`
                        : `${ILS_SYM}${r.remaining.toLocaleString()}`)
                    : '—'}
                </td>
                <td style="min-width:80px">
                  ${r.isFixed ? `
                    <div class="progress-bar" style="margin-top:0;height:6px">
                      <div class="progress-fill ${r.isOver ? 'danger' : 'success'}"
                           style="width:${Math.min(r.pct,100)}%"></div>
                    </div>` : `
                    <div style="height:6px;background:repeating-linear-gradient(90deg,var(--gray-200) 0,var(--gray-200) 4px,white 4px,white 8px);border-radius:3px"></div>`}
                </td>
                <td>
                  ${r.isFixed
                    ? `<span class="badge" style="background:#d1fae5;color:#065f46">Actual</span>`
                    : `<span class="badge badge-gray">Estimate</span>`}
                </td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:600;background:var(--gray-50)">
              <td colspan="2">Total</td>
              <td style="color:var(--gray-600)">${ILS_SYM}${totEst.toLocaleString()}</td>
              <td>${totActual > 0 ? `${ILS_SYM}${totActual.toLocaleString()}` : '—'}</td>
              <td style="color:${totRem < 0 ? 'var(--danger)' : 'var(--success)'}">${ILS_SYM}${Math.abs(totRem).toLocaleString()}${totRem < 0 ? ' over' : ''}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:var(--gray-400)">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--gray-200);border-radius:2px;margin-right:4px"></span>Estimate — no expenses yet</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--success);border-radius:2px;margin-right:4px"></span>Actual — expenses recorded</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--danger);border-radius:2px;margin-right:4px"></span>Over budget</span>
      </div>
    </div>`;
}

// ==================== CHECKLIST CARD ====================

function renderChecklistCard() {
  const trip = state.activeTrip;
  const checklist = trip?.categoryBudgets?.checklist;
  if (!checklist || !checklist.length) return '';

  // Use in-memory done state (persisted via trip.categoryBudgets on save)
  const grouped = {};
  checklist.forEach((item, i) => {
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ ...item, index: i });
  });

  const total = checklist.length;
  const done  = checklist.filter(i => i.done).length;
  const pct   = Math.round((done / total) * 100);

  return `
    <div class="card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>✅ Pre-Trip Checklist</span>
        <span style="font-size:13px;font-weight:400;color:var(--gray-500)">${done}/${total} done</span>
      </div>

      <div class="progress-bar" style="margin-bottom:16px;margin-top:0">
        <div class="progress-fill success" style="width:${pct}%"></div>
      </div>

      ${Object.entries(grouped).map(([cat, items]) => `
        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${cat}</div>
          ${items.map(item => `
            <div class="checklist-row ${item.done ? 'done' : ''}" onclick="toggleChecklistItem(${item.index})">
              <div class="check-box ${item.done ? 'checked' : ''}">
                ${item.done ? '✓' : ''}
              </div>
              <span style="font-size:13px;${item.done ? 'text-decoration:line-through;color:var(--gray-400)' : ''}">
                ${item.urgent && !item.done ? '<span style="color:var(--danger);font-weight:500;margin-right:4px">!</span>' : ''}
                ${esc(item.text)}
              </span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
}

window.toggleChecklistItem = async (index) => {
  const trip = state.activeTrip;
  if (!trip?.categoryBudgets?.checklist) return;
  trip.categoryBudgets.checklist[index].done = !trip.categoryBudgets.checklist[index].done;

  // Persist to backend
  try {
    await api.updateTrip(trip.id, { categoryBudgets: trip.categoryBudgets });
  } catch (e) { /* non-critical */ }

  renderTabContent(); // re-render to update progress
};

// ==================== WIZARD CSS (injected once) ====================

(function injectWizardStyles() {
  if (document.getElementById('wizard-styles')) return;
  const style = document.createElement('style');
  style.id = 'wizard-styles';
  style.textContent = `
    /* Choice modal */
    .choice-card {
      display:flex; gap:14px; align-items:flex-start;
      padding:16px; border:1.5px solid var(--gray-200);
      border-radius:var(--radius); background:white;
      cursor:pointer; text-align:left; width:100%;
      transition:border-color .15s, background .15s;
    }
    .choice-card:hover { border-color:var(--primary); background:var(--primary-light); }
    .choice-icon { font-size:1.8rem; flex-shrink:0; }
    .choice-title { font-size:15px; font-weight:600; color:var(--gray-800); margin-bottom:4px; }
    .choice-sub { font-size:13px; color:var(--gray-500); line-height:1.5; }

    /* Wizard steps bar */
    .wizard-steps {
      display:flex; justify-content:space-between;
      position:relative; padding:0 16px;
    }
    .wizard-steps::before {
      content:''; position:absolute; top:15px; left:32px; right:32px;
      height:1px; background:var(--gray-200); z-index:0;
    }
    .wpip { display:flex; flex-direction:column; align-items:center; gap:5px; z-index:1; }
    .wpip-dot {
      width:30px; height:30px; border-radius:50%;
      background:var(--gray-200); color:var(--gray-500);
      display:flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:600; transition:background .2s;
    }
    .wpip.active .wpip-dot { background:var(--primary); color:white; }
    .wpip.done .wpip-dot   { background:var(--success); color:white; }
    .wpip-label { font-size:11px; color:var(--gray-500); }
    .wpip.active .wpip-label { color:var(--primary); font-weight:500; }

    /* Destination grid */
    .wdest-grid {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px;
    }
    .wdest-card {
      border:1.5px solid var(--gray-200); border-radius:var(--radius);
      padding:10px 8px; cursor:pointer; text-align:center;
      transition:border-color .15s, background .15s;
    }
    .wdest-card:hover { border-color:var(--primary); background:var(--primary-light); }
    .wdest-card.selected { border-color:var(--primary); background:var(--primary-light); }
    .wdest-flag { font-size:1.6rem; }
    .wdest-name { font-size:12px; font-weight:500; color:var(--gray-700); margin-top:3px; }
    .wdest-days { display:flex; align-items:center; justify-content:center; gap:4px; margin-top:6px; }

    /* Travelers */
    .wrow {
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 0; border-bottom:1px solid var(--gray-100);
    }
    .wrow-label { font-size:15px; font-weight:500; color:var(--gray-700); }
    .wcounter { display:flex; align-items:center; gap:16px; }
    .wcounter button {
      width:32px; height:32px; border-radius:50%;
      border:1.5px solid var(--gray-300); background:white;
      font-size:18px; cursor:pointer; display:flex;
      align-items:center; justify-content:center;
      transition:border-color .15s;
    }
    .wcounter button:hover { border-color:var(--primary); color:var(--primary); }
    .wcounter span { font-size:18px; font-weight:600; min-width:24px; text-align:center; }
    .wkid-row {
      display:flex; align-items:center; gap:12px;
      padding:10px 0; border-bottom:1px solid var(--gray-100);
    }

    /* Style grid */
    .wstyle-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    .wstyle-card {
      border:1.5px solid var(--gray-200); border-radius:var(--radius);
      padding:14px; cursor:pointer;
      transition:border-color .15s, background .15s;
    }
    .wstyle-card:hover { border-color:var(--primary); background:var(--primary-light); }
    .wstyle-card.selected { border-color:var(--primary); background:var(--primary-light); }

    /* Checklist */
    .checklist-row {
      display:flex; align-items:center; gap:10px;
      padding:7px 4px; border-radius:var(--radius);
      cursor:pointer; transition:background .1s;
    }
    .checklist-row:hover { background:var(--gray-50); }
    .check-box {
      width:18px; height:18px; border-radius:4px;
      border:1.5px solid var(--gray-300); flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:11px; transition:all .15s;
    }
    .check-box.checked { background:var(--success); border-color:var(--success); color:white; }
  `;
  document.head.appendChild(style);
})();
