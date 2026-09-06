import fs from 'node:fs'

export function localDateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function updateUsageLedger(previous, currentBalance, currency, date = new Date()) {
  const today = localDateKey(date)
  const balance = Number(currentBalance)
  const currentCurrency = String(currency || '')
  const ledger = previous && typeof previous === 'object'
    ? { ...previous, history: { ...(previous.history || {}) } }
    : { date: today, lastBalance: null, todayUsage: 0, history: {} }

  if (!Number.isFinite(balance)) throw new TypeError('currentBalance must be a finite number')
  if (typeof ledger.todayUsage !== 'number' || !Number.isFinite(ledger.todayUsage)) ledger.todayUsage = 0

  const currencyChanged =
    typeof ledger.lastCurrency === 'string' && ledger.lastCurrency !== '' &&
    currentCurrency !== '' && ledger.lastCurrency !== currentCurrency

  if (ledger.date !== today) {
    if (ledger.date && Number.isFinite(ledger.todayUsage)) ledger.history[ledger.date] = ledger.todayUsage
    ledger.date = today
    ledger.todayUsage = 0
    ledger.lastBalance = balance
    ledger.lastCurrency = currentCurrency
  } else if (currencyChanged) {
    ledger.lastBalance = balance
    ledger.lastCurrency = currentCurrency
  } else {
    const oldBalance = Number.isFinite(ledger.lastBalance) ? ledger.lastBalance : balance
    if (balance < oldBalance) ledger.todayUsage += oldBalance - balance
    ledger.lastBalance = balance
    ledger.lastCurrency = currentCurrency
  }

  const historyDates = Object.keys(ledger.history).sort()
  while (historyDates.length > 30) delete ledger.history[historyDates.shift()]
  return ledger
}

export function createUsageLedgerStore(fileCandidates, now = () => new Date()) {
  function read() {
    for (const filename of fileCandidates) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'))
        if (parsed && typeof parsed === 'object' && typeof parsed.date === 'string') return parsed
      } catch {}
    }
    return { date: localDateKey(now()), lastBalance: null, todayUsage: 0, history: {} }
  }

  function write(ledger) {
    const body = JSON.stringify(ledger)
    for (const filename of fileCandidates) {
      try {
        fs.writeFileSync(filename, body, 'utf8')
        return true
      } catch {}
    }
    return false
  }

  function record(currentBalance, currency) {
    const ledger = updateUsageLedger(read(), currentBalance, currency, now())
    return { ledger, persisted: write(ledger) }
  }

  return { read, write, record }
}
