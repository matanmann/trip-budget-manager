// frontend/src/App.jsx
// Install first: npm install react-router-dom

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import TripWizard from './components/wizard/TripWizard'
import BudgetTable from './components/budget/BudgetTable'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = loading
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(u => setUser(u))
      .catch(() => setUser(null))
  }, [])
  return user
}

function useActiveTrip(user) {
  const [trip, setTrip] = useState(null)
  useEffect(() => {
    if (!user) return
    fetch(`${API}/api/trips?active=true`, { credentials: 'include' })
      .then(r => r.json())
      .then(trips => setTrip(trips?.[0] || null))
      .catch(console.error)
  }, [user])
  return [trip, setTrip]
}

function useExpenses(tripId) {
  const [expenses, setExpenses] = useState([])
  useEffect(() => {
    if (!tripId) return
    fetch(`${API}/api/expenses?tripId=${tripId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setExpenses)
      .catch(console.error)
  }, [tripId])
  return expenses
}

// ── Pages ──────────────────────────────────────────────────────

function LoginPage() {
  return (
    <div className="login-page" dir="rtl">
      <div className="login-card">
        <h1>Trip Budget Manager</h1>
        <p>Plan, track and manage your trip expenses in real time</p>
        <a href={`${API}/auth/google`} className="google-btn">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </a>
      </div>
    </div>
  )
}

function WizardPage({ onComplete }) {
  return (
    <div className="page-wrap">
      <TripWizard onComplete={onComplete} />
    </div>
  )
}

function BudgetPage({ trip, expenses, onAddExpense }) {
  if (!trip) return <Navigate to="/new" />
  const budgetItems = trip.categoryBudgets?.items || []
  return (
    <div className="page-wrap" dir="rtl">
      <div className="page-header">
        <h1>{trip.name}</h1>
        <span className="trip-dates">
          {trip.startDate ? new Date(trip.startDate).toLocaleDateString('he-IL') : ''} –
          {trip.endDate   ? new Date(trip.endDate).toLocaleDateString('he-IL')   : ''}
        </span>
      </div>
      <BudgetTable
        tripId={trip.id}
        budgetItems={budgetItems}
        expenses={expenses}
        onAddExpense={onAddExpense}
      />
    </div>
  )
}

// ── Root app ───────────────────────────────────────────────────

function AppInner() {
  const user = useAuth()
  const [trip, setTrip] = useActiveTrip(user)
  const expenses = useExpenses(trip?.id)
  const navigate = useNavigate()

  const handleWizardComplete = (newTrip) => {
    setTrip(newTrip)
    navigate('/budget')
  }

  const handleAddExpense = ({ destination }) => {
    // Navigate to expenses page with pre-filled destination
    navigate(`/expenses?destination=${encodeURIComponent(destination)}`)
  }

  if (user === undefined) return <div className="loading">Loading...</div>
  if (!user) return <LoginPage />

  return (
    <Routes>
      <Route path="/" element={trip ? <Navigate to="/budget" /> : <Navigate to="/new" />} />
      <Route path="/new" element={<WizardPage onComplete={handleWizardComplete} />} />
      <Route path="/budget" element={
        <BudgetPage trip={trip} expenses={expenses} onAddExpense={handleAddExpense} />
      } />
      {/* /expenses and /checklist — your existing routes keep working */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
