import { useState } from 'react'
import './TripWizard.css'

const STYLES = [
  { id: 'budget', label: 'Budget', sub: 'Hostels, street food', multiplier: 0.65 },
  { id: 'mid', label: 'Mid-range', sub: 'Decent hotel, basic comfort', multiplier: 1.0 },
  { id: 'comfort', label: 'Comfort', sub: '4-star, quality experiences', multiplier: 1.5 },
  { id: 'luxury', label: 'Premium', sub: '5-star, business class', multiplier: 2.4 },
]

const DEST_PRESETS = {
  thailand:  { name: 'Thailand',  baseDaily: 55,  flag: '🇹🇭' },
  vietnam:   { name: 'Vietnam', baseDaily: 45,  flag: '🇻🇳' },
  india:     { name: 'India',    baseDaily: 38,  flag: '🇮🇳' },
  japan:     { name: 'Japan',     baseDaily: 110, flag: '🇯🇵' },
  indonesia: { name: 'Indonesia', baseDaily: 50, flag: '🇮🇩' },
  cambodia:  { name: 'Cambodia', baseDaily: 40,  flag: '🇰🇭' },
  other:     { name: 'Other',     baseDaily: 70,  flag: '🌍' },
}

const CHECKLIST_RULES = {
  budget: ['Backpack instead of suitcase', 'No-fee credit card', 'Wise / Revolut'],
  mid:    ['No-fee credit card', 'Power bank 20,000mAh', 'eSIM in advance'],
  comfort:['Amex card with travel insurance', 'Hard-shell suitcase', 'Power bank'],
  luxury: ['Amex Platinum card', 'Lounge access', 'Premium insurance'],
  withKids: ['Children\'s first aid kit', 'DEET cream for children', 'Antibacterial wipes',
             'Vaccinations — see a travel doctor', 'ORS rehydration salts', 'Digital thermometer'],
  always: ['Passports — check expiry', 'Travel insurance', 'Scan documents to cloud',
           'Notify bank of travel', 'Local SIM / eSIM'],
}

function kidAgeFactor(ages) {
  if (!ages.length) return 1
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length
  if (avg <= 4) return 0.25
  if (avg <= 7) return 0.4
  if (avg <= 10) return 0.55
  if (avg <= 13) return 0.7
  return 0.85
}

function generateBudget({ destinations, adults, kidAges, style, startDate, durationDays }) {
  const mult = STYLES.find(s => s.id === style)?.multiplier ?? 1
  const kf = kidAgeFactor(kidAges)
  const ILS = 3.65
  let items = []
  let totalEst = 0

  destinations.forEach(({ key, days }) => {
    const preset = DEST_PRESETS[key]
    const base = preset.baseDaily * mult
    const lodging = base * 0.45
    const foodPerAdult = base * 0.3
    const transportPerAdult = base * 0.15
    const activitiesPerAdult = base * 0.1

    const dailyUSD =
      lodging +
      adults * (foodPerAdult + transportPerAdult + activitiesPerAdult) +
      kidAges.length * (foodPerAdult + transportPerAdult + activitiesPerAdult) * kf

    const total = Math.round(dailyUSD * days * ILS)
    totalEst += total

    items.push({
      id: `dest-${key}`,
      category: 'Living',
      destination: preset.name,
      flag: preset.flag,
      days,
      estimatedTotal: total,
      actualTotal: 0,
      dailyRate: Math.round(dailyUSD * ILS),
      isFixed: false,
    })
  })

  const styleKey = style
  const checklist = [
    ...CHECKLIST_RULES.always,
    ...CHECKLIST_RULES[styleKey],
    ...(kidAges.length > 0 ? CHECKLIST_RULES.withKids : []),
  ].map((text, i) => ({ id: `chk-${i}`, text, done: false, urgent: i < 3 }))

  return { budgetItems: items, checklist, totalEstimated: totalEst }
}

// ── Step components ────────────────────────────────────────────

function StepDestinations({ value, onChange }) {
  const [selected, setSelected] = useState(value || [])

  const toggle = (key) => {
    const exists = selected.find(d => d.key === key)
    const next = exists
      ? selected.filter(d => d.key !== key)
      : [...selected, { key, days: 30 }]
    setSelected(next)
    onChange(next)
  }

  const setDays = (key, days) => {
    const next = selected.map(d => d.key === key ? { ...d, days: Number(days) } : d)
    setSelected(next)
    onChange(next)
  }

  return (
    <div className="step-content">
      <p className="step-hint">Select destinations and duration for each</p>
      <div className="dest-grid">
        {Object.entries(DEST_PRESETS).map(([key, preset]) => {
          const sel = selected.find(d => d.key === key)
          return (
            <div key={key} className={`dest-card ${sel ? 'selected' : ''}`} onClick={() => toggle(key)}>
              <span className="dest-flag">{preset.flag}</span>
              <span className="dest-name">{preset.name}</span>
              {sel && (
                <div className="days-input" onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    min={1} max={365}
                    value={sel.days}
                    onChange={e => setDays(key, e.target.value)}
                  />
                  <span>days</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepTravelers({ value, onChange }) {
  const [data, setData] = useState(value || { adults: 2, kidAges: [] })

  const update = (patch) => {
    const next = { ...data, ...patch }
    setData(next)
    onChange(next)
  }

  const addKid = () => update({ kidAges: [...data.kidAges, 8] })
  const removeKid = (i) => update({ kidAges: data.kidAges.filter((_, idx) => idx !== i) })
  const setKidAge = (i, age) => {
    const ages = [...data.kidAges]
    ages[i] = Number(age)
    update({ kidAges: ages })
  }

  return (
    <div className="step-content">
      <div className="traveler-row">
        <span className="traveler-label">Adults</span>
        <div className="counter">
          <button onClick={() => update({ adults: Math.max(1, data.adults - 1) })}>−</button>
          <span>{data.adults}</span>
          <button onClick={() => update({ adults: data.adults + 1 })}>+</button>
        </div>
      </div>

      <div className="traveler-row">
        <span className="traveler-label">Children</span>
        <button className="add-kid-btn" onClick={addKid}>+ Add child</button>
      </div>

      {data.kidAges.map((age, i) => (
        <div key={i} className="kid-row">
          <span className="kid-label">Child {i + 1}</span>
          <div className="age-picker">
            <input
              type="range" min={0} max={17} value={age}
              onChange={e => setKidAge(i, e.target.value)}
            />
            <span className="age-val">Age {age}</span>
          </div>
          <button className="remove-kid" onClick={() => removeKid(i)}>×</button>
        </div>
      ))}

      {data.kidAges.length > 0 && (
        <div className="kids-note">
          Under 5 cost ~25% of adult · Age 6–10 ~45% · Age 11–17 ~70%
        </div>
      )}
    </div>
  )
}

function StepStyle({ value, onChange }) {
  const [selected, setSelected] = useState(value || 'mid')

  const pick = (id) => { setSelected(id); onChange(id) }

  return (
    <div className="step-content">
      <p className="step-hint">Travel style determines the estimate per destination</p>
      <div className="style-grid">
        {STYLES.map(s => (
          <div key={s.id} className={`style-card ${selected === s.id ? 'selected' : ''}`} onClick={() => pick(s.id)}>
            <div className="style-label">{s.label}</div>
            <div className="style-sub">{s.sub}</div>
            <div className="style-mult">×{s.multiplier}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepDates({ value, onChange }) {
  const [data, setData] = useState(value || { startDate: '', durationDays: 180 })

  const update = (patch) => {
    const next = { ...data, ...patch }
    setData(next)
    onChange(next)
  }

  return (
    <div className="step-content">
      <div className="date-row">
        <label>Departure date</label>
        <input type="date" value={data.startDate} onChange={e => update({ startDate: e.target.value })} />
      </div>
      <div className="date-row">
        <label>Total duration (days)</label>
        <div className="dur-control">
          <input
            type="range" min={7} max={365} value={data.durationDays}
            onChange={e => update({ durationDays: Number(e.target.value) })}
          />
          <span className="dur-label">{data.durationDays} days (~{Math.round(data.durationDays / 30 * 10) / 10} month)</span>
        </div>
      </div>
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────

const STEPS = [
  { key: 'destinations', title: 'Destinations', hint: 'Where are you going?' },
  { key: 'travelers',    title: 'Travelers', hint: 'Who\'s coming?' },
  { key: 'style',        title: 'Style',  hint: 'How do you travel?' },
  { key: 'dates',        title: 'Dates', hint: 'When?' },
]

export default function TripWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    destinations: [],
    travelers: { adults: 2, kidAges: [] },
    style: 'mid',
    dates: { startDate: '', durationDays: 180 },
  })
  const [tripName, setTripName] = useState('')
  const [loading, setLoading] = useState(false)

  const patch = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const canNext = () => {
    if (step === 0) return form.destinations.length > 0
    if (step === 1) return form.travelers.adults >= 1
    return true
  }

  const handleFinish = async () => {
    setLoading(true)
    const { destinations, travelers, style, dates } = form
    const { budgetItems, checklist, totalEstimated } = generateBudget({
      destinations,
      adults: travelers.adults,
      kidAges: travelers.kidAges,
      style,
      startDate: dates.startDate,
      durationDays: dates.durationDays,
    })

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    try {
      const res = await fetch(`${apiUrl}/api/trips`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tripName || `Trip ${new Date().getFullYear()}`,
          destinations: destinations.map(d => DEST_PRESETS[d.key].name),
          startDate: dates.startDate || new Date().toISOString(),
          endDate: new Date(Date.now() + dates.durationDays * 86400000).toISOString(),
          totalBudget: totalEstimated,
          currency: 'ILS',
          travelers: travelers.adults + travelers.kidAges.length,
          categoryBudgets: {
            items: budgetItems,
            checklist,
            meta: { style, kidAges: travelers.kidAges, adults: travelers.adults },
          },
        }),
      })
      const trip = await res.json()
      onComplete(trip, budgetItems, checklist)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wizard-wrap" dir="rtl">
      <div className="wizard-header">
        <h1 className="wizard-title">New Trip</h1>
        <input
          className="trip-name-input"
          placeholder="Trip name (optional)"
          value={tripName}
          onChange={e => setTripName(e.target.value)}
        />
      </div>

      <div className="steps-bar">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`step-pip ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
            <div className="pip-dot">{i < step ? '✓' : i + 1}</div>
            <div className="pip-label">{s.title}</div>
          </div>
        ))}
      </div>

      <div className="step-body">
        <h2 className="step-title">{STEPS[step].hint}</h2>

        {step === 0 && <StepDestinations value={form.destinations} onChange={v => patch('destinations', v)} />}
        {step === 1 && <StepTravelers value={form.travelers} onChange={v => patch('travelers', v)} />}
        {step === 2 && <StepStyle value={form.style} onChange={v => patch('style', v)} />}
        {step === 3 && <StepDates value={form.dates} onChange={v => patch('dates', v)} />}
      </div>

      <div className="wizard-footer">
        {step > 0 && (
          <button className="btn-back" onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn-next" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
            Next →
          </button>
        ) : (
          <button className="btn-finish" disabled={loading} onClick={handleFinish}>
            {loading ? 'Creating trip...' : 'Create trip ←'}
          </button>
        )}
      </div>
    </div>
  )
}
