// Kept in the private scope of the classic script served by the Host.
function createWhaleBubble({ gifUrl, renderBalance, requestDialogue, setTimeout, clearTimeout }) {
  var textBox = document.createElement('div')
  textBox.className = 'dshwv-text'
  var labelEl = document.createElement('div')
  labelEl.className = 'dshwv-label'
  labelEl.textContent = 'DeepSeek 余额'
  var amountEl = document.createElement('div')
  amountEl.className = 'dshwv-amount'
  var hintEl = document.createElement('div')
  hintEl.className = 'dshwv-hint'
  textBox.appendChild(labelEl)
  textBox.appendChild(amountEl)
  textBox.appendChild(hintEl)

  var bubbleBox = document.createElement('div')
  bubbleBox.className = 'dshwv-bubble'
  bubbleBox.innerHTML = '<svg viewBox="0 0 1026 700" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
    '<path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" stroke-width="18" stroke-linejoin="round" stroke-linecap="round" d="M 827 248 A 373 232 0 1 0 81 246 A 373 232 0 0 0 301 465 A 57 32 10 0 0 413 484 A 373 232 0 0 0 827 248 Z"/>' +
    '<ellipse class="dshwv-b1" cx="352" cy="561" rx="37.5" ry="26" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
    '<ellipse class="dshwv-b2" cx="442" cy="646" rx="24.5" ry="18" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
    '</svg>'
  var gifEl = document.createElement('img')
  gifEl.className = 'dshwv-gif'
  gifEl.src = gifUrl
  gifEl.alt = ''
  gifEl.draggable = false
  bubbleBox.appendChild(gifEl)
  var gifFailed = false
  gifEl.onerror = function () { gifFailed = true }
  bubbleBox.appendChild(textBox)

  let mode = 'closed'
  let lastHint = null
  let closeTimer, textTimer, hintTimer, gifTimer
  const styles = { A: 'dshwv-label', B: 'dshwv-amount', P: 'dshwv-period', C: 'dshwv-hint' }

  function resetFade(el) {
    el.style.transition = ''
    el.style.opacity = ''
  }

  function transition(next, duration) {
    // Each transition invalidates every callback that could still paint old content.
    clearTimeout(closeTimer)
    clearTimeout(textTimer)
    clearTimeout(hintTimer)
    clearTimeout(gifTimer)
    resetFade(textBox)
    resetFade(hintEl)
    lastHint = null
    mode = next
    if (duration > 0) closeTimer = setTimeout(close, duration)
  }

  function close() {
    transition('closed', 0)
    bubbleBox.classList.remove('dshwv-bubble-open')
    gifTimer = setTimeout(() => { gifEl.style.display = 'none' }, 240)
  }

  function paint(lines) {
    if (lines.gif && gifFailed) lines = [null, { t: '动图加载失败了…', s: 'A', w: true }, null]
    gifEl.style.display = lines.gif ? 'block' : 'none'
    const elements = [labelEl, amountEl, hintEl]
    elements.forEach((el, i) => {
      const line = lines[i]
      el.style.display = line ? '' : 'none'
      el.textContent = line ? line.t : ''
      el.style.color = line?.c || ''
      el.className = (styles[line?.s] || styles.A) + (line?.w ? ' dshwv-wrap' : '')
    })
  }

  function balance() {
    return mode === 'balance' || mode === 'closed'
  }

  function updateBalance(amount, hint) {
    if (!balance()) return
    amountEl.textContent = amount
    if (hint === lastHint) return
    clearTimeout(hintTimer)
    if (lastHint === null || mode === 'closed') {
      hintEl.textContent = hint
    } else {
      hintEl.style.transition = 'opacity .18s ease'
      hintEl.style.opacity = '0'
      hintTimer = setTimeout(() => {
        hintEl.textContent = hint
        hintEl.style.opacity = '1'
        hintTimer = setTimeout(() => resetFade(hintEl), 220)
      }, 190)
    }
    lastHint = hint
  }

  function showBalance(duration) {
    if (mode === 'cost') return
    transition('balance', duration)
    paint([{ s: 'A', t: 'DeepSeek 余额' }, { s: 'B', t: '' }, { s: 'C', t: '' }])
    renderBalance()
    bubbleBox.classList.add('dshwv-bubble-open')
  }

  function showDialogue(lines, duration) {
    const swap = mode === 'balance' || mode === 'dialogue'
    transition('dialogue', duration)
    if (swap) {
      textBox.style.transition = 'opacity .18s ease'
      textBox.style.opacity = '0'
      textTimer = setTimeout(() => {
        paint(lines)
        textBox.style.opacity = '1'
        textTimer = setTimeout(() => resetFade(textBox), 220)
      }, 190)
    } else {
      paint(lines)
      bubbleBox.classList.add('dshwv-bubble-open')
    }
  }

  function showCost(lines, duration) {
    transition('cost', duration)
    paint(lines)
    bubbleBox.classList.add('dshwv-bubble-open')
  }

  bubbleBox.addEventListener('click', event => {
    event.stopPropagation()
    if (mode === 'balance') requestDialogue()
    else if (mode !== 'closed') close()
  })

  return {
    element: bubbleBox,
    acceptsBalance: balance,
    updateBalance,
    showBalance,
    showCost,
    showDialogue,
    close,
    animateBalance(text) { if (balance()) amountEl.textContent = text },
  }
}
