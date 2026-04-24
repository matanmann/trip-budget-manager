import { useState, useEffect, useMemo } from 'react'
import './BudgetTable.css'

/**
 * BudgetTable
 * -----------
 * props:
 *   tripId        – string
 *   budgetItems   – initial estimate items from wizard (categoryBudgets.items)
 *   expenses      – live expenses array from /api/expenses?tripId=...
 *   onAddExpense  – (expense) => void  – opens add-expense modal
 */
export default function BudgetTable({ tripId, budgetItems = [], expenses = [], onAddExpense }) {
  const ILS = 3.65

  // Merge estimates with actual expenses per destination
  const rows = useMemo(() => {
    return budgetItems.map(item => {
      // Sum all expenses tagged to this destination
      const actual = expenses
        .filter(e => e.location === item.destination || e.destination === item.destination)
        .reduce((sum, e) => {
          const amt = Number(e.amount)
          return sum + (e.currency === 'ILS' ? amt : amt * ILS)
        }, 0)

      const hasActual = actual > 0
      const remaining = item.estimatedTotal - actual
      const pct = item.estimatedTotal > 0 ? Math.round((actual / item.estimatedTotal) * 100) : 0
      const isOver = actual > item.estimatedTotal

      return {
        ...item,
        actualTotal: Math.round(actual),
        remaining: Math.round(remaining),
        pct,
        isFixed: hasActual,
        isOver,
      }
    })
  }, [budgetItems, expenses])

  const totals = useMemo(() => {
    const estimated = rows.reduce((s, r) => s + r.estimatedTotal, 0)
    const actual    = rows.reduce((s, r) => s + r.actualTotal, 0)
    const fixedEst  = rows.filter(r => r.isFixed).reduce((s, r) => s + r.estimatedTotal, 0)
    const remaining = estimated - actual
    const pct = estimated > 0 ? Math.round((actual / estimated) * 100) : 0
    return { estimated, actual, fixedEst, remaining, pct }
  }, [rows])

  return (
    <div className="budget-wrap" dir="rtl">

      {/* Summary cards */}
      <div className="budget-summary">
        <div className="sum-card">
          <div className="sum-label">Total estimate</div>
          <div className="sum-value">₪{totals.estimated.toLocaleString('he-IL')}</div>
          <div className="sum-sub">incl. 15% buffer</div>
        </div>
        <div className="sum-card actual">
          <div className="sum-label">Actual spend</div>
          <div className="sum-value">₪{totals.actual.toLocaleString('he-IL')}</div>
          <div className="sum-sub">{totals.pct}% of budget</div>
        </div>
        <div className={`sum-card ${totals.remaining < 0 ? 'danger' : 'safe'}`}>
          <div className="sum-label">{totals.remaining >= 0 ? 'Remaining' : 'Over budget'}</div>
          <div className="sum-value">₪{Math.abs(totals.remaining).toLocaleString('he-IL')}</div>
          <div className="sum-sub">{totals.remaining >= 0 ? 'left to spend' : 'over budget'}</div>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="global-bar-wrap">
        <div className="global-bar-track">
          <div
            className={`global-bar-fill ${totals.pct > 100 ? 'over' : ''}`}
            style={{ width: `${Math.min(totals.pct, 100)}%` }}
          />
        </div>
        <span className="global-bar-label">{totals.pct}% used</span>
      </div>

      {/* Table */}
      <div className="budget-table-wrap">
        <table className="budget-table">
          <thead>
            <tr>
              <th>Destination</th>
              <th>Days</th>
              <th>Estimate</th>
              <th>Actual</th>
              <th>Remaining</th>
              <th>Progress</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`budget-row ${row.isFixed ? 'fixed' : 'estimated'} ${row.isOver ? 'over' : ''}`}>
                <td className="cell-dest">
                  <span className="dest-flag-sm">{row.flag}</span>
                  <span>{row.destination}</span>
                </td>
                <td className="cell-num">{row.days}</td>
                <td className="cell-num est">₪{row.estimatedTotal.toLocaleString('he-IL')}</td>
                <td className="cell-num act">
                  {row.isFixed
                    ? <strong>₪{row.actualTotal.toLocaleString('he-IL')}</strong>
                    : <span className="no-data">—</span>
                  }
                </td>
                <td className={`cell-num rem ${row.isOver ? 'text-danger' : ''}`}>
                  {row.isFixed
                    ? (row.remaining >= 0
                        ? `₪${row.remaining.toLocaleString('he-IL')}`
                        : <span className="text-danger">−₪{Math.abs(row.remaining).toLocaleString('he-IL')}</span>)
                    : <span className="no-data">—</span>
                  }
                </td>
                <td className="cell-bar">
                  {row.isFixed ? (
                    <div className="mini-bar-track">
                      <div
                        className={`mini-bar-fill ${row.isOver ? 'over' : ''}`}
                        style={{ width: `${Math.min(row.pct, 100)}%` }}
                      />
                    </div>
                  ) : (
                    <div className="mini-bar-track estimate-track" />
                  )}
                </td>
                <td>
                  {row.isFixed
                    ? <span className="badge fixed-badge">Actual</span>
                    : <span className="badge est-badge">Estimate</span>
                  }
                </td>
                <td>
                  <button
                    className="add-expense-btn"
                    onClick={() => onAddExpense?.({ destination: row.destination, flag: row.flag })}
                    title="Add expense"
                  >
                    +
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={2}>Total</td>
              <td className="cell-num">₪{totals.estimated.toLocaleString('he-IL')}</td>
              <td className="cell-num">
                {totals.actual > 0
                  ? <strong>₪{totals.actual.toLocaleString('he-IL')}</strong>
                  : <span className="no-data">—</span>
                }
              </td>
              <td className={`cell-num ${totals.remaining < 0 ? 'text-danger' : ''}`}>
                ₪{Math.abs(totals.remaining).toLocaleString('he-IL')}
                {totals.remaining < 0 && ' Over budget'}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="budget-legend">
        <span className="legend-item">
          <span className="legend-dot est-dot" /> Estimate — no expenses recorded yet
        </span>
        <span className="legend-item">
          <span className="legend-dot fixed-dot" /> Actual — at least one expense entered
        </span>
        <span className="legend-item">
          <span className="legend-dot over-dot" /> Over budget of budget
        </span>
      </div>
    </div>
  )
}
