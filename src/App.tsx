import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface DayRecord {
  date: string
  adSpend: number
  metaCalls: number
  socialCalls: number
  dials: number
  pickups: number
  coldCallsBooked: number
  showed: number
  noShowed: number
  closedDeals: number
}

interface Calculated {
  totalAdSpend: number
  metaCalls: number
  socialCalls: number
  coldCallsBooked: number
  totalCallsBooked: number
  dials: number
  pickups: number
  showed: number
  noShowed: number
  closedDeals: number
  costPerMetaCall: number
  blendedCostPerCall: number
  pickupRate: number
  showRate: number
  closeRate: number
}

const STORAGE_KEY = 'aa_tracker_v1'
const today = () => new Date().toISOString().split('T')[0]
const weekStart = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().split('T')[0]
}
const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const emptyRecord = (date: string): DayRecord => ({
  date, adSpend: 0, metaCalls: 0, socialCalls: 0,
  dials: 0, pickups: 0, coldCallsBooked: 0,
  showed: 0, noShowed: 0, closedDeals: 0
})

function loadAll(): Record<string, DayRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function saveAll(data: Record<string, DayRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function calcFromRecords(records: DayRecord[]): Calculated {
  const s = records.reduce((acc, r) => ({
    totalAdSpend: acc.totalAdSpend + r.adSpend,
    metaCalls: acc.metaCalls + r.metaCalls,
    socialCalls: acc.socialCalls + r.socialCalls,
    coldCallsBooked: acc.coldCallsBooked + r.coldCallsBooked,
    dials: acc.dials + r.dials,
    pickups: acc.pickups + r.pickups,
    showed: acc.showed + r.showed,
    noShowed: acc.noShowed + r.noShowed,
    closedDeals: acc.closedDeals + r.closedDeals,
  }), { totalAdSpend: 0, metaCalls: 0, socialCalls: 0, coldCallsBooked: 0, dials: 0, pickups: 0, showed: 0, noShowed: 0, closedDeals: 0 })

  const totalCallsBooked = s.metaCalls + s.socialCalls + s.coldCallsBooked
  const costPerMetaCall = s.metaCalls > 0 ? s.totalAdSpend / s.metaCalls : 0
  const blendedCostPerCall = (s.metaCalls + s.socialCalls) > 0 ? s.totalAdSpend / (s.metaCalls + s.socialCalls) : 0
  const pickupRate = s.dials > 0 ? (s.pickups / s.dials) * 100 : 0
  const showRate = (s.showed + s.noShowed) > 0 ? (s.showed / (s.showed + s.noShowed)) * 100 : 0
  const closeRate = s.showed > 0 ? (s.closedDeals / s.showed) * 100 : 0

  return { ...s, totalCallsBooked, costPerMetaCall, blendedCostPerCall, pickupRate, showRate, closeRate }
}

function fmt(n: number, decimals = 0) {
  if (!isFinite(n) || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtMoney(n: number) {
  if (!isFinite(n) || isNaN(n) || n === 0) return '$0'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPct(n: number) {
  if (!isFinite(n) || isNaN(n)) return '—'
  return n.toFixed(1) + '%'
}

export default function App() {
  const [allData, setAllData] = useState<Record<string, DayRecord>>(loadAll)
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [inputs, setInputs] = useState<DayRecord>(emptyRecord(today()))
  const [saved, setSaved] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)

  const isRange = startDate !== endDate

  const getRecordsInRange = useCallback((data: Record<string, DayRecord>) => {
    if (!isRange) {
      return data[startDate] ? [data[startDate]] : []
    }
    return Object.keys(data)
      .filter(d => d >= startDate && d <= endDate)
      .map(d => data[d])
  }, [startDate, endDate, isRange])

  useEffect(() => {
    if (!isRange) {
      const rec = allData[startDate] || emptyRecord(startDate)
      setInputs({ ...rec })
      setSaved(!!allData[startDate])
    }
  }, [startDate, endDate, isRange, allData])

  const calc = isRange
    ? calcFromRecords(getRecordsInRange(allData))
    : calcFromRecords(inputs.adSpend || inputs.metaCalls || inputs.dials || inputs.showed ? [inputs] : [])

  const handleInput = (field: keyof DayRecord, val: string) => {
    const num = parseFloat(val) || 0
    setInputs(prev => ({ ...prev, [field]: num }))
    setSaved(false)
  }

  const handleSave = () => {
    const updated = { ...allData, [startDate]: { ...inputs, date: startDate } }
    setAllData(updated)
    saveAll(updated)
    setSaved(true)
  }

  const handleClear = () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    const updated = { ...allData }
    delete updated[startDate]
    setAllData(updated)
    saveAll(updated)
    setInputs(emptyRecord(startDate))
    setSaved(false)
    setClearConfirm(false)
  }

  const handleQuick = (s: string, e: string) => {
    setStartDate(s)
    setEndDate(e)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aa-tracker-${today()}.json`
    a.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        setAllData(data)
        saveAll(data)
      } catch { alert('Invalid file') }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    setAllData({})
    saveAll({})
    setInputs(emptyRecord(startDate))
    setSaved(false)
    setResetConfirm(false)
    setShowSettings(false)
  }

  const recordCount = Object.keys(allData).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-mark">AA</span>
          <span className="header-title">Call Tracker</span>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(s => !s)} aria-label="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-row">
            <span className="settings-label">{recordCount} day{recordCount !== 1 ? 's' : ''} saved</span>
            <div className="settings-actions">
              <button className="btn-ghost" onClick={handleExport}>Export JSON</button>
              <label className="btn-ghost" style={{ cursor: 'pointer' }}>
                Import JSON
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
              <button
                className={resetConfirm ? 'btn-danger' : 'btn-ghost btn-warn'}
                onClick={handleReset}
              >
                {resetConfirm ? 'Confirm — delete all data' : 'Reset all data'}
              </button>
              {resetConfirm && <button className="btn-ghost" onClick={() => setResetConfirm(false)}>Cancel</button>}
            </div>
          </div>
        </div>
      )}

      <div className="date-bar">
        <div className="date-inputs">
          <div className="date-field">
            <label className="date-label">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-field">
            <label className="date-label">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
        <div className="quick-btns">
          <button className="quick-btn" onClick={() => handleQuick(today(), today())}>Today</button>
          <button className="quick-btn" onClick={() => handleQuick(weekStart(), today())}>This week</button>
          <button className="quick-btn" onClick={() => handleQuick(monthStart(), today())}>This month</button>
        </div>
      </div>

      {isRange && (
        <div className="range-notice">
          Showing aggregated results — {startDate} to {endDate}
        </div>
      )}

      <div className="tracker-card">
        <div className="card-grid">
          {/* LEFT — INPUTS */}
          {!isRange && (
            <div className="inputs-col">
              <div className="col-header">
                <span className="col-title">Daily inputs</span>
                <span className={`save-status ${saved ? 'saved' : 'unsaved'}`}>
                  {saved ? '● Saved' : '○ Unsaved'}
                </span>
              </div>

              <div className="input-section">
                <div className="section-label">Meta + Social</div>
                <InputRow label="Ad spend" field="adSpend" value={inputs.adSpend} prefix="$" onChange={handleInput} />
                <InputRow label="Calls from Meta" field="metaCalls" value={inputs.metaCalls} onChange={handleInput} />
                <InputRow label="Calls from Instagram / social" field="socialCalls" value={inputs.socialCalls} onChange={handleInput} />
              </div>

              <div className="section-divider" />

              <div className="input-section">
                <div className="section-label">Cold calling</div>
                <InputRow label="Dials" field="dials" value={inputs.dials} onChange={handleInput} />
                <InputRow label="Pickups" field="pickups" value={inputs.pickups} onChange={handleInput} />
                <InputRow label="Calls booked" field="coldCallsBooked" value={inputs.coldCallsBooked} onChange={handleInput} />
              </div>

              <div className="section-divider" />

              <div className="input-section">
                <div className="section-label">Call outcomes</div>
                <InputRow label="Showed" field="showed" value={inputs.showed} onChange={handleInput} />
                <InputRow label="No-showed" field="noShowed" value={inputs.noShowed} onChange={handleInput} />
                <InputRow label="Closed" field="closedDeals" value={inputs.closedDeals} onChange={handleInput} />
              </div>

              <div className="input-actions">
                <button className="btn-primary" onClick={handleSave}>Save day</button>
                <button
                  className={clearConfirm ? 'btn-danger' : 'btn-ghost'}
                  onClick={handleClear}
                >
                  {clearConfirm ? 'Confirm clear' : 'Clear day'}
                </button>
                {clearConfirm && (
                  <button className="btn-ghost" onClick={() => setClearConfirm(false)}>Cancel</button>
                )}
              </div>
            </div>
          )}

          {/* RIGHT — RESULTS */}
          <div className={`results-col ${isRange ? 'results-full' : ''}`}>
            <div className="col-header">
              <span className="col-title">Results</span>
            </div>

            <div className="results-group">
              <div className="results-group-label">Paid acquisition</div>
              <KpiRow label="Ad spend" value={fmtMoney(calc.totalAdSpend)} accent />
              <KpiRow label="Meta calls booked" value={fmt(calc.metaCalls)} />
              <KpiRow label="Social calls booked" value={fmt(calc.socialCalls)} />
              <KpiRow label="Cost per Meta call" value={fmtMoney(calc.costPerMetaCall)} />
              <KpiRow label="Blended cost per call" value={fmtMoney(calc.blendedCostPerCall)} highlight />
            </div>

            <div className="section-divider" />

            <div className="results-group">
              <div className="results-group-label">Cold outreach</div>
              <KpiRow label="Dials" value={fmt(calc.dials)} />
              <KpiRow label="Pickups" value={fmt(calc.pickups)} />
              <KpiRow label="Pickup rate" value={fmtPct(calc.pickupRate)} />
              <KpiRow label="Calls booked" value={fmt(calc.coldCallsBooked)} />
            </div>

            <div className="section-divider" />

            <div className="results-group">
              <div className="results-group-label">Pipeline</div>
              <KpiRow label="Total calls booked" value={fmt(calc.totalCallsBooked)} accent />
              <KpiRow label="Show rate" value={fmtPct(calc.showRate)} highlight />
              <KpiRow label="Close rate" value={fmtPct(calc.closeRate)} highlight />
              <KpiRow label="Closed deals" value={fmt(calc.closedDeals)} accent />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InputRow({
  label, field, value, prefix, onChange
}: {
  label: string
  field: keyof DayRecord
  value: number
  prefix?: string
  onChange: (f: keyof DayRecord, v: string) => void
}) {
  return (
    <div className="input-row">
      <label className="input-label">{label}</label>
      <div className="input-wrap">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          min="0"
          step={prefix ? '0.01' : '1'}
          value={value || ''}
          placeholder="0"
          onChange={e => onChange(field, e.target.value)}
          className={`number-input ${prefix ? 'has-prefix' : ''}`}
        />
      </div>
    </div>
  )
}

function KpiRow({ label, value, accent, highlight }: {
  label: string
  value: string
  accent?: boolean
  highlight?: boolean
}) {
  return (
    <div className="kpi-row">
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value ${accent ? 'kpi-accent' : ''} ${highlight ? 'kpi-highlight' : ''}`}>
        {value}
      </span>
    </div>
  )
}
