(function () {
if (window.__dshWhaleWidget) return
window.__dshWhaleWidget = true

var MIN_SCALE = 0.6
var MAX_SCALE = 2.5
var STEP = 0.1
var CLICK_SQ = 9
var REFRESH_MS = 60000
var CHANGE_MS = 900
var ANIM_MS = 700
var FETCH_TIMEOUT_MS = 25000
var BALANCE_URL = '/dsh-whale/balance.json'
var SIZE_URL = '/dsh-whale/size.json'
var USAGE_URL = '/dsh-whale/usage.json'
var EVENTS_URL = '/dsh-whale/events'
var PRICING_URL = '/dsh-whale/pricing.json'
var DIALOGUES_URL = '/dsh-whale/dialogues.json'
var IMG_URL = '/dsh-whale/image.png?v=2'
var GIF_URL = '/dsh-whale/rua.gif'

var css = [
  '.dshwv-root{position:fixed;right:0;bottom:0;--dshw-scale:1;--dshw-base:clamp(122px,calc(min(250px,min(100vw,100vh) * 0.28) * var(--dshw-scale)),625px);width:var(--dshw-base);height:var(--dshw-base);pointer-events:none;user-select:none;-webkit-user-select:none;z-index:9999;font-family:inherit;transition:left .16s ease,top .16s ease,transform .3s ease}',
  '.dshwv-root.dshwv-left{transform:scaleX(-1)}',
  '.dshwv-root.dshwv-dragging{cursor:grabbing;transition:none}',
  '.dshwv-body{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:50% 100%;transition:transform .22s cubic-bezier(.34,1.56,.64,1)}',
  '.dshwv-img{position:absolute;right:0;bottom:0;width:59.45%;height:59.45%;display:block;pointer-events:none;-webkit-user-drag:none;user-select:none}',
  '.dshwv-bubble{position:absolute;left:0;top:0;width:100%;aspect-ratio:1026/700;pointer-events:none;z-index:1;--dshw-u:calc(var(--dshw-base) / 1026)}',
  '.dshwv-bubble svg{display:block;width:100%;height:100%;pointer-events:none}',
  '.dshwv-bubble svg path,.dshwv-bubble svg ellipse{pointer-events:none;cursor:pointer}',
  '.dshwv-bubble.dshwv-bubble-open svg path,.dshwv-bubble.dshwv-bubble-open svg ellipse{pointer-events:visiblePainted}',
  '.dshwv-bubble .dshwv-bshape,.dshwv-bubble .dshwv-b1,.dshwv-bubble .dshwv-b2{opacity:0;transform:scale(.7);transform-box:fill-box;transform-origin:50% 50%;transition:opacity .2s ease,transform .2s ease}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-bshape,.dshwv-bubble.dshwv-bubble-open .dshwv-b1,.dshwv-bubble.dshwv-bubble-open .dshwv-b2{opacity:1;transform:none}',
  '.dshwv-gif{position:absolute;left:44.25%;top:38%;transform:translate(-50%,-50%);max-width:calc(var(--dshw-u) * 560);max-height:calc(var(--dshw-u) * 400);display:none;opacity:0;transition:opacity .2s ease;pointer-events:none;-webkit-user-drag:none;user-select:none;object-fit:contain}',
  '.dshwv-root.dshwv-left .dshwv-gif{transform:translate(-50%,-50%) scaleX(-1)}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-gif{opacity:1}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-b2{transition-delay:0s}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-b1{transition-delay:.13s}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-bshape{transition-delay:.26s}',
  '.dshwv-bubble .dshwv-bshape{transition-delay:.1s}',
  '.dshwv-bubble .dshwv-b1{transition-delay:.2s}',
  '.dshwv-bubble .dshwv-b2{transition-delay:.3s}',
  '.dshwv-text{position:absolute;left:44.25%;top:38%;transform:translate(-50%,-50%);text-align:center;color:#536ba9;line-height:1.15;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .16s ease,transform .3s ease}',
  '.dshwv-bubble.dshwv-bubble-open .dshwv-text{opacity:1;transition:opacity .16s ease .36s,transform .3s ease}',
  '.dshwv-root.dshwv-left .dshwv-text{transform:translate(-50%,-50%) scaleX(-1)}',
  '.dshwv-label{font-size:calc(var(--dshw-u) * 66);font-weight:600;letter-spacing:.06em}',
  '.dshwv-amount{font-size:calc(var(--dshw-u) * 128);font-weight:800;line-height:1.05}',
  '.dshwv-period{font-size:calc(var(--dshw-u) * 104);font-weight:800;line-height:1.05}',
  '.dshwv-wrap{white-space:normal;max-width:calc(var(--dshw-u) * 560);line-height:1.2}',
  '.dshwv-hint{font-size:calc(var(--dshw-u) * 56);color:#9fb0d9;letter-spacing:.02em;margin-top:calc(var(--dshw-u) * 9);min-height:calc(var(--dshw-u) * 64);line-height:1.15}',
  '.dshwv-menu-btn{position:absolute;top:calc(40.55% + 4px);right:4px;width:26px;height:26px;border:none;border-radius:6px;background:rgba(32,49,112,.85);cursor:pointer;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0;z-index:2;opacity:0;transition:opacity .15s ease}',
  '.dshwv-menu-btn.dshwv-menu-btn-visible{opacity:1}',
  '.dshwv-menu-btn span{display:block;width:14px;height:2px;background:#fff;border-radius:1px}',
  '.dshwv-menu-btn:hover{background:#203170}',
  '.dshwv-chat-btn{position:absolute;top:calc(40.55% + 4px);right:34px;width:28px;height:26px;border:1px solid rgba(255,255,255,.65);border-radius:7px;background:rgba(83,107,169,.92);color:#fff;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;opacity:0;transition:opacity .15s ease,transform .15s ease;font-size:15px;line-height:1}',
  '.dshwv-chat-btn.dshwv-chat-btn-visible{opacity:1}',
  '.dshwv-chat-btn:hover{background:#203170;transform:translateY(-1px)}',
  '.dshwv-root.dshwv-left .dshwv-chat-btn{transform:scaleX(-1)}',
  '.dshwv-root.dshwv-left .dshwv-chat-btn:hover{transform:scaleX(-1) translateY(-1px)}',
  '.dshwv-menu{position:fixed;min-width:250px;max-width:min(340px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;background:rgba(255,255,255,.94);border:1px solid rgba(32,49,112,.35);border-radius:10px;padding:10px 12px;opacity:0;transform:scale(.92) translateY(-4px);transform-origin:top right;transition:opacity .18s ease,transform .2s cubic-bezier(.34,1.56,.64,1);pointer-events:none;z-index:10000;box-shadow:0 6px 18px rgba(0,0,0,.18);color-scheme:light}',
  '.dshwv-menu.dshwv-menu-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}',
  '.dshwv-menu-row{display:flex;align-items:center;gap:8px;margin:5px 0;color:#203170;font-size:12px;white-space:nowrap}',
  '.dshwv-range{flex:1;min-width:0;accent-color:#203170}',
  '.dshwv-number{width:44px;border:1px solid rgba(32,49,112,.4);border-radius:6px;padding:2px 4px;font-size:12px;color:#203170;background:#fff;box-sizing:border-box}',
  '.dshwv-number:disabled{opacity:.4;background:rgba(32,49,112,.06);cursor:not-allowed}',
  '.dshwv-sound{flex:1;border:1px solid rgba(32,49,112,.4);border-radius:6px;background:rgba(32,49,112,.08);color:#203170;font-size:12px;padding:3px 0;cursor:pointer}',
  '.dshwv-sound:hover{background:rgba(32,49,112,.16)}',
  '.dshwv-check{width:16px;height:16px;accent-color:#203170;cursor:pointer;flex:0 0 auto}',
  '.dshwv-menu-sep{height:1px;background:rgba(32,49,112,.25);margin:6px 0}',
  '.dshwv-volpct{width:44px;text-align:right;color:#203170;font-size:12px}',
  '.dshwv-price-info{color:#536ba9;font-size:11px;white-space:normal;line-height:1.25}',
  '.dshwv-usage-panel{margin:7px 0 4px;padding:7px 8px;border-radius:7px;background:rgba(32,49,112,.07);color:#203170;font-size:11px;line-height:1.5;white-space:normal}',
  '.dshwv-usage-line{display:flex;justify-content:space-between;gap:10px}',
  '.dshwv-usage-line span:last-child{text-align:right;overflow-wrap:anywhere}',
  '.dshwv-usage-sub{color:#7184b8;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:290px}',
  '.dshwv-action{border:1px solid rgba(32,49,112,.35);border-radius:6px;padding:4px 8px;background:#eef2ff;color:#203170;font-size:12px;cursor:pointer}',
  '.dshwv-action:hover{background:#dfe7ff}',
  '.dshwv-peak-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:700}',
  '.dshwv-peak-badge[data-band="peak"]{color:#a72b24;background:#ffe3df}',
  '.dshwv-peak-badge[data-band="offPeak"]{color:#187437;background:#dff5e5}',
  '.dshwv-modal{position:fixed;inset:0;z-index:10020;background:rgba(17,24,54,.38);display:none;align-items:center;justify-content:center;padding:18px;pointer-events:auto;color-scheme:light}',
  '.dshwv-modal.dshwv-modal-open{display:flex}',
  '.dshwv-dialog{width:min(900px,calc(100vw - 28px));max-height:calc(100vh - 36px);overflow:auto;background:#fff;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.3);padding:18px;color:#203170;font:13px/1.45 system-ui,sans-serif}',
  '.dshwv-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}',
  '.dshwv-dialog-title{font-size:18px;font-weight:750}',
  '.dshwv-editor-meta{padding:8px 10px;border-radius:8px;background:#f3f6ff;margin-bottom:10px}',
  '.dshwv-price-table{width:100%;border-collapse:collapse;min-width:720px}',
  '.dshwv-price-table th,.dshwv-price-table td{border-bottom:1px solid #e3e8f5;padding:6px;text-align:left}',
  '.dshwv-price-table th{position:sticky;top:0;background:#fff;z-index:1;font-size:11px}',
  '.dshwv-price-table input{box-sizing:border-box;width:82px;border:1px solid #bbc6e4;border-radius:5px;padding:4px;color:#203170;background:#fff}',
  '.dshwv-price-table input.dshwv-model{width:180px}',
  '.dshwv-price-table input.dshwv-alias{width:180px}',
  '.dshwv-active-band{background:#eef9f1}',
  '.dshwv-preview{white-space:pre-wrap;margin:10px 0;padding:8px 10px;border-radius:8px;background:#fff7dc;color:#755500;display:none}',
  '.dshwv-dialog-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:12px}',
  '.dshwv-danger{color:#a72b24;background:#fff0ee}',
  '.dshwv-editor-error{color:#b3261e;min-height:20px;margin-top:7px}',
  '.dshwv-advanced{margin-top:10px;padding-top:8px;border-top:1px solid #e3e8f5}',
  '.dshwv-tabs{display:flex;gap:6px;margin:-2px 0 12px;border-bottom:1px solid #dce3f4;padding-bottom:8px}',
  '.dshwv-tab{border:0;border-radius:7px;padding:6px 12px;background:#edf1fb;color:#536ba9;cursor:pointer;font-weight:650}',
  '.dshwv-tab.dshwv-tab-active{background:#203170;color:#fff}',
  '.dshwv-pane{display:none}',
  '.dshwv-pane.dshwv-pane-active{display:block}',
  '.dshwv-dialogue-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:8px 0}',
  '.dshwv-dialogue-search{min-width:180px;flex:1;border:1px solid #bbc6e4;border-radius:6px;padding:5px 7px;color:#203170;background:#fff}',
  '.dshwv-dialogue-list{display:grid;gap:8px;margin-top:8px}',
  '.dshwv-dialogue-card{display:grid;grid-template-columns:auto minmax(220px,1fr) 110px 90px 68px auto auto;gap:7px;align-items:center;padding:8px;border:1px solid #dce3f4;border-radius:9px;background:#fbfcff}',
  '.dshwv-dialogue-card textarea{width:100%;min-height:50px;resize:vertical;box-sizing:border-box;border:1px solid #bbc6e4;border-radius:6px;padding:6px;color:#203170;background:#fff}',
  '.dshwv-dialogue-card select,.dshwv-dialogue-card input[type="number"]{width:100%;box-sizing:border-box;border:1px solid #bbc6e4;border-radius:6px;padding:5px;color:#203170;background:#fff}',
  '.dshwv-dialogue-id{grid-column:2/-1;color:#7a89b3;font-size:10px}',
  '.dshwv-dialogue-help{font-size:11px;color:#6578ae;white-space:normal}',
  '@media(max-width:760px){.dshwv-dialogue-card{grid-template-columns:auto 1fr 1fr}.dshwv-dialogue-card textarea{grid-column:2/4}.dshwv-dialogue-id{grid-column:2/4}}'
].join('\n')

var styleEl = document.createElement('style')
styleEl.textContent = css
document.head.appendChild(styleEl)

var root = document.createElement('div')
root.className = 'dshwv-root'

var img = document.createElement('img')
img.className = 'dshwv-img'
img.src = IMG_URL
img.alt = 'DeepSeek 余额'
img.draggable = false

var menuBtn = document.createElement('button')
menuBtn.type = 'button'
menuBtn.className = 'dshwv-menu-btn'
menuBtn.title = '菜单'
menuBtn.innerHTML = '<span></span><span></span><span></span>'
menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu() })
var quickChatBtn = document.createElement('button')
quickChatBtn.type = 'button'
quickChatBtn.className = 'dshwv-chat-btn'
quickChatBtn.title = '和鲸鱼娘聊天'
quickChatBtn.setAttribute('aria-label', '和鲸鱼娘聊天')
quickChatBtn.textContent = '💬'
quickChatBtn.addEventListener('click', function (e) { e.stopPropagation(); showDialogue(true) })

var menuBox = document.createElement('div')
menuBox.className = 'dshwv-menu'
function menuLabel(text) {
  var s = document.createElement('span')
  s.textContent = text
  return s
}
function menuRow() {
  var r = document.createElement('div')
  r.className = 'dshwv-menu-row'
  return r
}
var scaleInput = document.createElement('input')
scaleInput.type = 'range'
scaleInput.min = String(MIN_SCALE)
scaleInput.max = String(MAX_SCALE)
scaleInput.step = '0.1'
scaleInput.className = 'dshwv-range'
scaleInput.value = '1.5'
var scaleNumber = document.createElement('input')
scaleNumber.type = 'number'
scaleNumber.min = '1'
scaleNumber.max = '20'
scaleNumber.step = '1'
scaleNumber.className = 'dshwv-number'
scaleNumber.value = '10'
scaleInput.addEventListener('pointerdown', function () { root.style.transition = 'none' })
scaleInput.addEventListener('input', function () { setScale(scaleInput.value) })
scaleInput.addEventListener('change', function () { root.style.transition = '' })
scaleNumber.addEventListener('focus', function () { root.style.transition = 'none' })
scaleNumber.addEventListener('blur', function () { root.style.transition = '' })
scaleNumber.addEventListener('input', function () {
  var v = Math.round(Number(scaleNumber.value))
  var s = MIN_SCALE + Math.max(0, Math.min(20, v) - 1) * (MAX_SCALE - MIN_SCALE) / 19
  setScale(s)
})
scaleNumber.addEventListener('change', function () {
  var v = Math.round(Number(scaleNumber.value))
  var s = MIN_SCALE + Math.max(0, Math.min(20, v) - 1) * (MAX_SCALE - MIN_SCALE) / 19
  setScale(s)
  root.style.transition = ''
})
var soundSelect = document.createElement('select')
soundSelect.className = 'dshwv-sound'
function soundOpt(value, label) {
  var o = document.createElement('option')
  o.value = value
  o.textContent = label
  return o
}
soundSelect.appendChild(soundOpt('duck', '小黄鸭'))
soundSelect.appendChild(soundOpt('fx1', '音效1'))
soundSelect.addEventListener('change', function () { setSoundSet(soundSelect.value) })
var usageSelect = document.createElement('select')
usageSelect.className = 'dshwv-sound'
usageSelect.appendChild(soundOpt('ledger', '账户·余额估算 (推荐)'))
usageSelect.appendChild(soundOpt('token', '账户·平台令牌'))
usageSelect.addEventListener('change', function () { setUsageMode(usageSelect.value) })
var dialogueFrequencySelect = document.createElement('select')
dialogueFrequencySelect.className = 'dshwv-sound'
dialogueFrequencySelect.appendChild(soundOpt('low', '较少'))
dialogueFrequencySelect.appendChild(soundOpt('normal', '正常'))
dialogueFrequencySelect.appendChild(soundOpt('high', '较多'))
dialogueFrequencySelect.value = 'normal'
dialogueFrequencySelect.addEventListener('change', function () { setDialogueFrequency(dialogueFrequencySelect.value) })
var bubbleToggle = document.createElement('input')
bubbleToggle.type = 'checkbox'
bubbleToggle.className = 'dshwv-check'
bubbleToggle.checked = true
bubbleToggle.title = '开启/关闭思考气泡'
bubbleToggle.addEventListener('change', function () { setBubbleOn(bubbleToggle.checked) })
var turnCostToggle = document.createElement('input')
turnCostToggle.type = 'checkbox'
turnCostToggle.className = 'dshwv-check'
turnCostToggle.checked = true
turnCostToggle.title = '每轮对话结束后自动显示本轮消耗金额'
turnCostToggle.addEventListener('change', function () { setTurnCostOn(turnCostToggle.checked) })
function closeDurationInput(onChange) {
  var input = document.createElement('input')
  input.type = 'number'
  input.min = '0'
  input.max = '3600'
  input.step = '1'
  input.className = 'dshwv-number'
  input.value = '5'
  input.title = '填 0 表示不自动关闭，需手动点击关闭'
  input.addEventListener('input', function () { onChange(input.value) })
  input.addEventListener('change', function () { onChange(input.value) })
  return input
}
var balanceBubbleCloseInput = closeDurationInput(setBalanceBubbleClose)
var costBubbleCloseInput = closeDurationInput(setCostBubbleClose)
var dialogueBubbleCloseInput = closeDurationInput(setDialogueBubbleClose)
var scrollGapToggle = document.createElement('input')
scrollGapToggle.type = 'checkbox'
scrollGapToggle.className = 'dshwv-check'
scrollGapToggle.checked = false
scrollGapToggle.title = '开启后挂件右侧按设定像素避开滚动条；关闭则贴边（盖住滚动条）'
scrollGapToggle.addEventListener('change', function () { setScrollGapOn(scrollGapToggle.checked) })
var scrollGapInput = document.createElement('input')
scrollGapInput.type = 'number'
scrollGapInput.min = '0'
scrollGapInput.step = '1'
scrollGapInput.className = 'dshwv-number'
scrollGapInput.value = '17'
scrollGapInput.disabled = true // 默认避让关 → 宽度不可修改，勾选后启用
scrollGapInput.title = '避让滚动条的像素宽度，填 0 表示贴边'
scrollGapInput.addEventListener('input', function () { setScrollGapPx(scrollGapInput.value) })
scrollGapInput.addEventListener('change', function () { setScrollGapPx(scrollGapInput.value) })
var row1 = menuRow()
row1.appendChild(menuLabel('大小'))
row1.appendChild(scaleInput)
row1.appendChild(scaleNumber)
var row2 = menuRow()
row2.appendChild(menuLabel('音效'))
row2.appendChild(soundSelect)
var volInput = document.createElement('input')
volInput.type = 'range'
volInput.min = '0'
volInput.max = '1'
volInput.step = '0.05'
volInput.className = 'dshwv-range'
volInput.value = '0.9'
var volPct = document.createElement('span')
volPct.className = 'dshwv-volpct'
volPct.textContent = '90%'
volInput.addEventListener('input', function () { setVol(volInput.value) })
var row3 = menuRow()
row3.appendChild(menuLabel('音量'))
row3.appendChild(volInput)
row3.appendChild(volPct)
var row4 = menuRow()
row4.appendChild(menuLabel('账户用量'))
row4.appendChild(usageSelect)
var peakStatusBadge = document.createElement('span')
peakStatusBadge.className = 'dshwv-peak-badge'
peakStatusBadge.dataset.band = 'offPeak'
peakStatusBadge.textContent = '峰谷状态加载中'
var rowPeakStatus = menuRow()
rowPeakStatus.appendChild(peakStatusBadge)
var rowPrice = menuRow()
rowPrice.appendChild(menuLabel('价格'))
var priceInfo = document.createElement('span')
priceInfo.className = 'dshwv-price-info'
priceInfo.textContent = '等待余额数据…'
rowPrice.appendChild(priceInfo)
var editPriceButton = document.createElement('button')
editPriceButton.type = 'button'
editPriceButton.className = 'dshwv-action'
editPriceButton.textContent = '编辑价格'
editPriceButton.addEventListener('click', function () { openPricingEditor() })
rowPrice.appendChild(editPriceButton)
var rowChat = menuRow()
var chatButton = document.createElement('button')
chatButton.type = 'button'
chatButton.className = 'dshwv-action'
chatButton.textContent = '和鲸鱼娘聊天'
chatButton.addEventListener('click', function () { closeMenu(); showDialogue(true) })
rowChat.appendChild(chatButton)
var manageDialogueButton = document.createElement('button')
manageDialogueButton.type = 'button'
manageDialogueButton.className = 'dshwv-action'
manageDialogueButton.textContent = '管理台词'
manageDialogueButton.addEventListener('click', function () { openDialogueEditor() })
rowChat.appendChild(manageDialogueButton)
var rowChatFrequency = menuRow()
rowChatFrequency.appendChild(menuLabel('台词频率'))
rowChatFrequency.appendChild(dialogueFrequencySelect)
var row6 = menuRow()
row6.appendChild(menuLabel('气泡'))
row6.appendChild(bubbleToggle)
var menuSep1 = document.createElement('div')
menuSep1.className = 'dshwv-menu-sep'
var usagePanel = document.createElement('div')
usagePanel.className = 'dshwv-usage-panel'
usagePanel.textContent = '等待对话用量数据…'
var row7 = menuRow()
row7.appendChild(menuLabel('每轮消耗提示'))
row7.appendChild(turnCostToggle)
var rowBalanceDuration = menuRow()
rowBalanceDuration.appendChild(menuLabel('余额气泡时长'))
rowBalanceDuration.appendChild(balanceBubbleCloseInput)
rowBalanceDuration.appendChild(menuLabel('秒'))
var rowCostDuration = menuRow()
rowCostDuration.appendChild(menuLabel('费用气泡时长'))
rowCostDuration.appendChild(costBubbleCloseInput)
rowCostDuration.appendChild(menuLabel('秒'))
var rowDialogueDuration = menuRow()
rowDialogueDuration.appendChild(menuLabel('聊天台词时长'))
rowDialogueDuration.appendChild(dialogueBubbleCloseInput)
rowDialogueDuration.appendChild(menuLabel('秒'))
var row9 = menuRow()
row9.appendChild(menuLabel('避让滚动条'))
row9.appendChild(scrollGapToggle)
row9.appendChild(menuLabel('宽度'))
row9.appendChild(scrollGapInput)
row9.appendChild(menuLabel('px'))
menuBox.appendChild(row1)
menuBox.appendChild(row2)
menuBox.appendChild(row3)
menuBox.appendChild(row4)
menuBox.appendChild(rowPeakStatus)
menuBox.appendChild(rowPrice)
menuBox.appendChild(usagePanel)
menuBox.appendChild(rowChat)
menuBox.appendChild(rowChatFrequency)
menuBox.appendChild(row6)
menuBox.appendChild(row7)
menuBox.appendChild(rowBalanceDuration)
menuBox.appendChild(rowCostDuration)
menuBox.appendChild(rowDialogueDuration)
menuBox.appendChild(menuSep1)
menuBox.appendChild(row9)

var pricingModal = document.createElement('div')
pricingModal.className = 'dshwv-modal'
var pricingDialog = document.createElement('div')
pricingDialog.className = 'dshwv-dialog'
pricingModal.appendChild(pricingDialog)
var pricingHead = document.createElement('div')
pricingHead.className = 'dshwv-dialog-head'
var pricingTitle = document.createElement('div')
pricingTitle.className = 'dshwv-dialog-title'
pricingTitle.textContent = '小鲸鱼设置'
var pricingClose = document.createElement('button')
pricingClose.type = 'button'
pricingClose.className = 'dshwv-action'
pricingClose.textContent = '关闭'
pricingClose.addEventListener('click', closePricingEditor)
pricingHead.appendChild(pricingTitle)
pricingHead.appendChild(pricingClose)
var pricingMeta = document.createElement('div')
pricingMeta.className = 'dshwv-editor-meta'
var pricingTableWrap = document.createElement('div')
pricingTableWrap.style.overflowX = 'auto'
var pricingTable = document.createElement('table')
pricingTable.className = 'dshwv-price-table'
pricingTableWrap.appendChild(pricingTable)
var pricingAdvanced = document.createElement('div')
pricingAdvanced.className = 'dshwv-advanced'
var advancedToggle = document.createElement('label')
var advancedCheck = document.createElement('input')
advancedCheck.type = 'checkbox'
advancedToggle.appendChild(advancedCheck)
advancedToggle.appendChild(document.createTextNode(' 高级：编辑模型名称、别名和新增模型'))
var addModelButton = document.createElement('button')
addModelButton.type = 'button'
addModelButton.className = 'dshwv-action'
addModelButton.textContent = '新增模型'
addModelButton.style.display = 'none'
addModelButton.addEventListener('click', function () { addPricingRow('', null, true) })
advancedCheck.addEventListener('change', function () { setPricingAdvanced(advancedCheck.checked) })
pricingAdvanced.appendChild(advancedToggle)
pricingAdvanced.appendChild(document.createTextNode(' '))
pricingAdvanced.appendChild(addModelButton)
var pricingPreview = document.createElement('div')
pricingPreview.className = 'dshwv-preview'
var pricingError = document.createElement('div')
pricingError.className = 'dshwv-editor-error'
var pricingActions = document.createElement('div')
pricingActions.className = 'dshwv-dialog-actions'
function pricingAction(text, handler, danger) {
  var button = document.createElement('button')
  button.type = 'button'
  button.className = 'dshwv-action' + (danger ? ' dshwv-danger' : '')
  button.textContent = text
  button.addEventListener('click', handler)
  return button
}
var restorePriceButton = pricingAction('恢复上次备份', function () { preparePricingAction('restore-backup') })
var resetPriceButton = pricingAction('恢复内置价格', function () { preparePricingAction('reset-defaults') }, true)
var savePriceButton = pricingAction('检查并预览', preparePricingSave)
pricingActions.appendChild(restorePriceButton)
pricingActions.appendChild(resetPriceButton)
pricingActions.appendChild(savePriceButton)
var editorTabs = document.createElement('div')
editorTabs.className = 'dshwv-tabs'
var pricingTab = pricingAction('价格设置', function () { switchEditorTab('pricing') })
pricingTab.className = 'dshwv-tab dshwv-tab-active'
var dialogueTab = pricingAction('台词管理', function () { switchEditorTab('dialogues') })
dialogueTab.className = 'dshwv-tab'
editorTabs.appendChild(pricingTab)
editorTabs.appendChild(dialogueTab)
var pricingPane = document.createElement('div')
pricingPane.className = 'dshwv-pane dshwv-pane-active'
pricingPane.appendChild(pricingMeta)
pricingPane.appendChild(pricingTableWrap)
pricingPane.appendChild(pricingAdvanced)
pricingPane.appendChild(pricingPreview)
pricingPane.appendChild(pricingError)
pricingPane.appendChild(pricingActions)

var dialoguePane = document.createElement('div')
dialoguePane.className = 'dshwv-pane'
var dialogueMeta = document.createElement('div')
dialogueMeta.className = 'dshwv-editor-meta'
var dialogueHelp = document.createElement('div')
dialogueHelp.className = 'dshwv-dialogue-help'
dialogueHelp.textContent = '台词以纯文本显示。错误台词只在真实错误时出现；尖锐台词默认关闭。变量：{balance}、{todayUsage}、{sessionUsage}、{timeBand}、{nextChange}、{model}'
var dialogueToolbar = document.createElement('div')
dialogueToolbar.className = 'dshwv-dialogue-toolbar'
var dialogueFilter = document.createElement('select')
dialogueFilter.className = 'dshwv-sound'
dialogueFilter.appendChild(soundOpt('all', '全部情境'))
var DIALOGUE_CATEGORY_LABELS = {
  daily: '日常', peak: '高峰', offPeak: '谷价', friday: '周五', lowBalance: '低余额',
  highUsage: '高消耗', error: '真实错误', rare: '罕见彩蛋', savage: '尖锐吐槽'
}
Object.keys(DIALOGUE_CATEGORY_LABELS).forEach(function (key) { dialogueFilter.appendChild(soundOpt(key, DIALOGUE_CATEGORY_LABELS[key])) })
dialogueFilter.addEventListener('change', renderDialogueVisibility)
var dialogueSearch = document.createElement('input')
dialogueSearch.type = 'search'
dialogueSearch.placeholder = '搜索台词'
dialogueSearch.className = 'dshwv-dialogue-search'
dialogueSearch.addEventListener('input', renderDialogueVisibility)
var addDialogueButton = pricingAction('新增台词', function () { addDialogueRow(null, true); renderDialogueVisibility() })
var importDialogueButton = pricingAction('导入 JSON', importDialogues)
var exportDialogueButton = pricingAction('导出 JSON', exportDialogues)
var dialogueFileInput = document.createElement('input')
dialogueFileInput.type = 'file'
dialogueFileInput.accept = 'application/json,.json'
dialogueFileInput.style.display = 'none'
dialogueFileInput.addEventListener('change', readDialogueImport)
dialogueToolbar.appendChild(dialogueFilter)
dialogueToolbar.appendChild(dialogueSearch)
dialogueToolbar.appendChild(addDialogueButton)
dialogueToolbar.appendChild(importDialogueButton)
dialogueToolbar.appendChild(exportDialogueButton)
dialogueToolbar.appendChild(dialogueFileInput)
var dialogueList = document.createElement('div')
dialogueList.className = 'dshwv-dialogue-list'
var dialoguePreview = document.createElement('div')
dialoguePreview.className = 'dshwv-preview'
var dialogueError = document.createElement('div')
dialogueError.className = 'dshwv-editor-error'
var dialogueActions = document.createElement('div')
dialogueActions.className = 'dshwv-dialog-actions'
var restoreDialogueButton = pricingAction('恢复上次备份', function () { prepareDialogueAction('restore-backup') })
var resetDialogueButton = pricingAction('恢复内置台词', function () { prepareDialogueAction('reset-defaults') }, true)
var saveDialogueButton = pricingAction('检查并预览', prepareDialogueSave)
dialogueActions.appendChild(restoreDialogueButton)
dialogueActions.appendChild(resetDialogueButton)
dialogueActions.appendChild(saveDialogueButton)
dialoguePane.appendChild(dialogueMeta)
dialoguePane.appendChild(dialogueHelp)
dialoguePane.appendChild(dialogueToolbar)
dialoguePane.appendChild(dialogueList)
dialoguePane.appendChild(dialoguePreview)
dialoguePane.appendChild(dialogueError)
dialoguePane.appendChild(dialogueActions)

pricingDialog.appendChild(pricingHead)
pricingDialog.appendChild(editorTabs)
pricingDialog.appendChild(pricingPane)
pricingDialog.appendChild(dialoguePane)
pricingModal.addEventListener('click', function (e) { if (e.target === pricingModal) closePricingEditor() })
document.body.appendChild(pricingModal)

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
gifEl.src = GIF_URL
gifEl.alt = ''
gifEl.draggable = false
bubbleBox.appendChild(gifEl)
var gifFailed = false
gifEl.onerror = function () { gifFailed = true }
bubbleBox.appendChild(textBox)
bubbleBox.addEventListener('click', function (e) {
  e.stopPropagation()
  if (!bubbleShown) return
  if (costBubbleActive) {
    // 消耗金额泡泡：点击关闭（确认）
    hideCostBubble()
    return
  }
  if (bubbleRandomActive) {
    // 再次点击：关闭
    hideBubble()
  } else {
    // 首次点击：切到随机台词段，并重置自动关闭计时——
    // 保证第二段台词有完整停留时间（否则第 4 秒点击只看到 0.5 秒）
    bubbleRandomActive = true
    bubbleRandomLines = pickDialogueLines()
    swapBubbleContent(function () { applyBubbleLines(bubbleRandomLines) })
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    if (dialogueBubbleCloseMs > 0) bubbleTimer = setTimeout(hideBubble, dialogueBubbleCloseMs)
  }
})

var body = document.createElement('div')
body.className = 'dshwv-body'
body.appendChild(img)
body.appendChild(bubbleBox)
root.appendChild(body)
root.appendChild(quickChatBtn)
root.appendChild(menuBtn)
document.body.appendChild(root)
document.body.appendChild(menuBox)

// Position model: the widget is ALWAYS expressed in left/top px (so edge snaps
// animate smoothly via the CSS transition on both sides — switching to
// right/auto cannot transition and flashes). The anchor info (h/v + offsets)
// lives in state and is used by settle() to recompute coordinates on window
// resize and size changes, keeping the widget glued to its anchored edge.
var state = {
  scale: 1.5,
  h: 'right',
  hOff: 0,
  v: 'bottom',
  vOff: 0,
  left: 0,
  top: 0,
  balance: null,
  currency: null,
  todayUsage: null,
  todayUsageSource: 'balance-estimate',
  todayTokens: null,
  usageWarning: '',
  pricingSource: '',
  pricingVerifiedAt: '',
  sessionUsage: null,
  isPeak: false,
  peakStatus: null,
  status: 'loading',
  message: ''
}
var busy = false
var settleTimer = null
var animDelayTimer = null
var drag = null
var shown = null
var animId = null
var bubbleShown = false
var bubbleTimer = null
var bubbleRandomActive = false
var bubbleRandomLines = null
var BUBBLE_STYLE_CLASS = { A: 'dshwv-label', B: 'dshwv-amount', P: 'dshwv-period', C: 'dshwv-hint' }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function singleCenter(style, text, color, wrap) { return [null, { t: text, s: style, c: color || '', w: !!wrap }, null] }
var dialogueConfig = {
  version: 1,
  dialogues: [
    { id: 'fallback-1', text: '啊，有点饿了，中午该吃点什么呢...', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'fallback-2', text: '现在是 {timeBand}，今天也要勤俭持鲸。', category: 'daily', rarity: 'normal', weight: 10, enabled: true }
  ]
}
function dialogueChance() {
  if (dialogueFrequency === 'low') return { special: 0.07, rare: 0.01 }
  if (dialogueFrequency === 'high') return { special: 0.25, rare: 0.03 }
  return { special: 0.13, rare: 0.02 }
}
function beijingWeekDay() {
  return new Date(Date.now() + 8 * 3600 * 1000).getUTCDay()
}
function dialogueCategoryEligible(category) {
  if (category === 'daily' || category === 'rare' || category === 'savage') return true
  if (category === 'error') return state.status === 'error'
  if (category === 'peak') return !!state.isPeak
  if (category === 'offPeak') return !state.isPeak
  if (category === 'friday') return beijingWeekDay() === 5
  var balanceNumber = Number(state.balance)
  if (category === 'lowBalance') return isFinite(balanceNumber) && balanceNumber < 20
  if (category === 'highUsage') return (Number(state.todayUsage) || 0) >= 10
  return false
}
function weightedDialogue(entries) {
  if (!entries.length) return null
  var total = entries.reduce(function (sum, entry) { return sum + Math.max(1, Number(entry.weight) || 1) }, 0)
  var target = Math.random() * total
  for (var i = 0; i < entries.length; i++) {
    target -= Math.max(1, Number(entries[i].weight) || 1)
    if (target < 0) return entries[i]
  }
  return entries[entries.length - 1]
}
function dialogueTemplateValues() {
  var conversation = state.sessionUsage && state.sessionUsage.conversation
  var lastTurn = state.sessionUsage && state.sessionUsage.lastTurn
  var model = lastTurn && Array.isArray(lastTurn.models) && lastTurn.models.length
    ? lastTurn.models.join(', ')
    : (lastTurn && Array.isArray(lastTurn.unknownModels) && lastTurn.unknownModels.length ? lastTurn.unknownModels[0] : '当前模型')
  return {
    balance: state.balance === null || state.balance === undefined ? '--' : fmt(state.balance, state.currency || 'CNY'),
    todayUsage: state.todayUsage === null || state.todayUsage === undefined ? '--' : fmt(state.todayUsage, state.currency || 'CNY'),
    sessionUsage: conversation ? usageAmount(conversation) : '--',
    timeBand: state.isPeak ? '高峰价' : '谷价',
    nextChange: state.peakStatus && state.peakStatus.nextChangeAt ? formatPeakTime(state.peakStatus.nextChangeAt) : '暂无',
    model: model
  }
}
function interpolateDialogue(text) {
  var values = dialogueTemplateValues()
  return String(text || '').replace(/\{(balance|todayUsage|sessionUsage|timeBand|nextChange|model)\}/g, function (_, key) { return values[key] })
}
function pickDialogueLines() {
  var chances = dialogueChance()
  var roll = Math.random()
  var bucket = roll < chances.rare ? 'rare' : (roll < chances.rare + chances.special ? 'special' : 'normal')
  var all = dialogueConfig && Array.isArray(dialogueConfig.dialogues) ? dialogueConfig.dialogues : []
  var eligible = all.filter(function (entry) { return entry.enabled && entry.rarity === bucket && dialogueCategoryEligible(entry.category) })
  if (!eligible.length) eligible = all.filter(function (entry) { return entry.enabled && entry.rarity === 'normal' && dialogueCategoryEligible(entry.category) })
  if (!eligible.length) eligible = all.filter(function (entry) { return entry.enabled && dialogueCategoryEligible(entry.category) })
  var selected = weightedDialogue(eligible)
  return singleCenter('A', selected ? interpolateDialogue(selected.text) : '今天暂时没有可以说的台词。', '', true)
}
function showDialogue(explicit) {
  showDialogueLines(pickDialogueLines(), dialogueBubbleCloseMs)
}
function showDialogueText(text) {
  showDialogueLines(singleCenter('A', text, '', true), dialogueBubbleCloseMs)
}
function showDialogueLines(lines, duration) {
  if (!bubbleOn) return
  if (costBubbleActive) hideCostBubble()
  var wasOpen = bubbleShown && bubbleBox.classList.contains('dshwv-bubble-open')
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
  if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
  if (hintFadeTimer) { clearTimeout(hintFadeTimer); hintFadeTimer = null }
  if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
  bubbleShown = true
  bubbleRandomActive = true
  bubbleRandomLines = lines
  lastHintText = null
  if (wasOpen) {
    swapBubbleContent(function () { applyBubbleLines(bubbleRandomLines) })
  } else {
    // 快捷聊天首次打开时先准备台词，再播放气泡开启动画，避免余额内容闪现。
    textBox.style.transition = ''
    textBox.style.opacity = ''
    applyBubbleLines(bubbleRandomLines)
    bubbleBox.classList.add('dshwv-bubble-open')
  }
  if (duration > 0) bubbleTimer = setTimeout(hideBubble, duration)
}
function applyBubbleLines(lines) {
  if (lines && lines.gif) {
    // gif 台词组：只显示 gif，隐藏三行文字（display 必须显式覆盖 CSS 的 none）
    if (gifFailed) {
      // gif 加载失败/路由缺失：降级为文字台词，避免空白白色气泡
      lines = singleCenter('A', pickOne(['gif 加载失败了...', '今天没有动图给你看~', '呜呜 动图不见了...']), '', true)
    } else {
      if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
      gifEl.style.display = 'block'
      gifEl.style.opacity = ''
      labelEl.style.display = 'none'
      amountEl.style.display = 'none'
      hintEl.style.display = 'none'
      return
    }
  }
  if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
  gifEl.style.display = 'none'
  gifEl.style.opacity = ''
  var els = [labelEl, amountEl, hintEl]
  for (var i = 0; i < 3; i++) {
    var el = els[i]
    var ln = lines && lines[i]
    if (ln) {
      el.style.display = ''
      el.className = (BUBBLE_STYLE_CLASS[ln.s] || 'dshwv-label') + (ln.w ? ' dshwv-wrap' : '')
      el.textContent = ln.t
      el.style.color = ln.c || ''
    } else {
      el.style.display = 'none'
      el.textContent = ''
      el.style.color = ''
    }
  }
}
var bubbleSwapTimer = null
var hintFadeTimer = null
var gifFadeTimer = null
var lastHintText = null
function setHint(text) {
  // 首次/恢复（lastHintText===null）时直接写文本，不做淡出淡入——否则
  // 气泡打开或按压重开时会先淡出再淡入，造成「消失一下又出现」。
  // 只有气泡打开期间的内容变化（加载中→今日已用）才走动画。
  if (text === lastHintText) return
  var first = lastHintText === null
  lastHintText = text
  if (first || !bubbleShown) {
    hintEl.textContent = text
    return
  }
  hintEl.style.transition = 'opacity .18s ease'
  hintEl.style.opacity = '0'
  hintFadeTimer = setTimeout(function () {
    hintFadeTimer = null
    hintEl.textContent = text
    hintEl.style.opacity = '1'
    setTimeout(function () {
      hintEl.style.transition = ''
      hintEl.style.opacity = ''
    }, 220)
  }, 190)
}
function swapBubbleContent(applyFn) {
  if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
  textBox.style.transition = 'opacity .18s ease'
  textBox.style.opacity = '0'
  bubbleSwapTimer = setTimeout(function () {
    bubbleSwapTimer = null
    applyFn()
    textBox.style.opacity = '1'
    setTimeout(function () {
      textBox.style.transition = ''
      textBox.style.opacity = ''
    }, 220)
  }, 190)
}
function restoreBubbleLines() {
  if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
  if (hintFadeTimer) { clearTimeout(hintFadeTimer); hintFadeTimer = null }
  if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
  lastHintText = null
  textBox.style.transition = ''
  textBox.style.opacity = ''
  gifEl.style.display = 'none'
  gifEl.style.opacity = ''
  labelEl.style.display = ''
  labelEl.className = 'dshwv-label'
  labelEl.textContent = 'DeepSeek 余额'
  labelEl.style.color = ''
  amountEl.style.display = ''
  amountEl.className = 'dshwv-amount'
  amountEl.style.color = ''
  hintEl.style.display = ''
  hintEl.className = 'dshwv-hint'
  hintEl.style.color = ''
  render()
}
function showBubble() {
  if (!bubbleOn) return
  // 消耗金额泡泡显示期间，余额变动不再弹出普通泡泡
  if (costBubbleActive) return
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
  if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
  bubbleShown = true
  bubbleRandomActive = false
  restoreBubbleLines()
  bubbleBox.classList.add('dshwv-bubble-open')
  if (balanceBubbleCloseMs > 0) bubbleTimer = setTimeout(hideBubble, balanceBubbleCloseMs)
}
function hideBubble() {
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
  if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
  if (hintFadeTimer) { clearTimeout(hintFadeTimer); hintFadeTimer = null }
  textBox.style.transition = ''
  textBox.style.opacity = ''
  hintEl.style.transition = ''
  hintEl.style.opacity = ''
  bubbleRandomActive = false
  bubbleRandomLines = null
  bubbleShown = false
  // 只销毁 gif 显示；三行文字保持现状让气泡自然淡出——不能在关闭瞬间
  // 恢复成余额内容（否则随机台词界面会闪现余额）。文字恢复交给下次
  // showBubble() 的 restoreBubbleLines()（那时气泡隐藏，恢复过程不可见）。
  bubbleBox.classList.remove('dshwv-bubble-open')
  // gif 靠 CSS opacity 过渡淡出；display:none 会跳过过渡，须等淡出完成再隐藏
  gifFadeTimer = setTimeout(function () {
    gifFadeTimer = null
    gifEl.style.display = 'none'
  }, 240)
}

// —— 每轮对话消耗金额泡泡 ——
var costBubbleTimer = null
function showCostBubble(amount, tokens, reasoningTokens, unknownModels) {
  if (!bubbleOn || !turnCostOn) return
  if (costBubbleTimer) { clearTimeout(costBubbleTimer); costBubbleTimer = null }
  if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
  if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
  // 取消进行中的余额数字滚动与延迟计时器，避免竞态覆盖成本金额
  if (animId) { cancelAnimationFrame(animId); animId = null }
  if (animDelayTimer) { clearTimeout(animDelayTimer); animDelayTimer = null }
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null }
  costBubbleActive = true
  bubbleRandomActive = false
  bubbleShown = true
  lastHintText = null
  // 样式：第一行 A（标签），第二行 B（红色金额），居中两行
  gifEl.style.display = 'none'
  gifEl.style.opacity = ''
  labelEl.style.display = ''
  labelEl.className = 'dshwv-label'
  labelEl.textContent = 'DSH 最近一轮费用:'
  labelEl.style.color = ''
  amountEl.style.display = ''
  amountEl.className = 'dshwv-amount'
  var priced = typeof amount === 'number' && isFinite(amount)
  amountEl.textContent = priced ? '¥ ' + Number(amount).toFixed(2) : '无法估价'
  amountEl.style.color = priced ? '#e0433f' : '#d08020'
  hintEl.style.display = ''
  if (priced) {
    hintEl.textContent = fmtTokens(tokens) + (reasoningTokens > 0 ? ' · 含推理 ' + fmtTokens(reasoningTokens) : '')
  } else {
    var models = Array.isArray(unknownModels) ? unknownModels.join(', ') : ''
    hintEl.textContent = models ? '未配置价格: ' + models : '该模型尚未配置价格'
  }
  hintEl.style.color = ''
  textBox.style.transition = ''
  textBox.style.opacity = ''
  bubbleBox.classList.add('dshwv-bubble-open')
  if (costBubbleCloseMs > 0) {
    costBubbleTimer = setTimeout(hideCostBubble, costBubbleCloseMs)
  }
}
function hideCostBubble() {
  if (costBubbleTimer) { clearTimeout(costBubbleTimer); costBubbleTimer = null }
  costBubbleActive = false
  hideBubble()
}

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v) }
function viewport() {
  return {
    w: window.innerWidth || document.documentElement.clientWidth || 1280,
    h: window.innerHeight || document.documentElement.clientHeight || 800
  }
}
function rightGap() {
  // 开关关闭：贴边（不避让滚动条）
  if (!scrollGapOn) return 0
  // 开启：用用户填写的像素；填 0 也贴边
  return scrollGapPx > 0 ? scrollGapPx : 0
}
function fmt(balance, currency) {
  var num = Number(balance)
  var fixed = isFinite(num) ? num.toFixed(2) : '--'
  return currency === 'CNY' ? '¥ ' + fixed : fixed + ' ' + currency
}
function fmtTokens(value) {
  var n = Number(value)
  if (!isFinite(n)) return '-- tokens'
  return Math.round(n).toLocaleString() + ' tokens'
}
function usageLabel() {
  return '今日消耗约：'
}
function shortTokens(value) {
  var n = Number(value)
  if (!isFinite(n)) return '-- tokens'
  if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + 'M tokens'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K tokens'
  return Math.round(n) + ' tokens'
}
function usageAmount(summary) {
  if (!summary || summary.amount === null || summary.amount === undefined) return '暂无法估价'
  return fmt(summary.amount, 'CNY')
}
function usageLine(label, value) {
  var line = document.createElement('div')
  line.className = 'dshwv-usage-line'
  var left = document.createElement('span')
  var right = document.createElement('span')
  left.textContent = label
  right.textContent = value
  line.appendChild(left)
  line.appendChild(right)
  return line
}
function renderUsagePanel() {
  var data = state.sessionUsage
  usagePanel.textContent = ''
  if (!data || !data.ok) {
    usagePanel.textContent = '等待对话用量数据…'
    return
  }
  var conversation = data.conversation
  var workspace = data.workspace
  var today = data.today
  usagePanel.appendChild(usageLine('最近一轮', data.lastTurn ? usageAmount(data.lastTurn) + ' · ' + shortTokens(data.lastTurn.tokens && data.lastTurn.tokens.total) : '--'))
  usagePanel.appendChild(usageLine('当前对话', conversation ? usageAmount(conversation) + ' · ' + shortTokens(conversation.tokens.total) : '未选择'))
  usagePanel.appendChild(usageLine('当前工作区', workspace ? usageAmount(workspace) + ' · ' + shortTokens(workspace.tokens.total) : '未选择'))
  usagePanel.appendChild(usageLine('DSH 今日合计', usageAmount(today) + ' · ' + shortTokens(today && today.tokens.total)))
  if (conversation) {
    usagePanel.appendChild(usageLine('主 / 子智能体', fmt(conversation.mainAmount, 'CNY') + ' / ' + fmt(conversation.subagentAmount, 'CNY')))
  }
  var sub = document.createElement('div')
  sub.className = 'dshwv-usage-sub'
  if (workspace) sub.textContent = workspace.cwd || '未归属工作区'
  else sub.textContent = '未选择当前工作区'
  sub.title = sub.textContent
  usagePanel.appendChild(sub)
  var accountSub = document.createElement('div')
  accountSub.className = 'dshwv-usage-sub'
  accountSub.textContent = '账户数据：' + (state.todayUsageSource === 'platform' ? '平台统计' : '余额变化估算')
  usagePanel.appendChild(accountSub)
}
function updatePricingInfo() {
  var source = state.pricingSource === 'user' ? '用户配置' : '内置回退'
  priceInfo.textContent = source + (state.pricingVerifiedAt ? ' · 核对至 ' + state.pricingVerifiedAt : '')
}
function formatPeakTime(epoch) {
  if (!epoch) return '暂无切换时间'
  try {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(epoch * 1000))
  } catch (err) { return new Date(epoch * 1000).toLocaleString() }
}
function updatePeakBadge(status) {
  if (!status) return
  state.peakStatus = status
  state.isPeak = !!status.isPeak
  peakStatusBadge.dataset.band = status.band
  var current = status.weekendOffPeak ? '周末谷价' : ('当前' + (status.isPeak ? '高峰价' : '谷价'))
  var next = status.nextChangeAt ? ' · ' + formatPeakTime(status.nextChangeAt) + '切换为' + (status.nextBand === 'peak' ? '峰价' : '谷价') : ''
  peakStatusBadge.textContent = current + next
}

var pricingOriginal = null
var pricingRows = []
var pendingPricingConfig = null
var pendingPricingAction = ''
var verifiedAtInput = null
function clearPricingConfirmation() {
  pendingPricingConfig = null
  pendingPricingAction = ''
  pricingPreview.style.display = 'none'
  pricingPreview.textContent = ''
  savePriceButton.textContent = '检查并预览'
  restorePriceButton.textContent = '恢复上次备份'
  resetPriceButton.textContent = '恢复内置价格'
}
function inputCell(value, className) {
  var input = document.createElement('input')
  input.type = className === 'dshwv-number-price' ? 'number' : 'text'
  if (input.type === 'number') { input.min = '0'; input.step = '0.01' }
  input.className = className || ''
  input.value = value === undefined ? '' : String(value)
  input.addEventListener('input', clearPricingConfirmation)
  return input
}
function addPricingRow(model, prices, custom) {
  prices = prices || { aliases: [], cacheHit: { offPeak: 0, peak: 0 }, cacheMiss: { offPeak: 0, peak: 0 }, output: { offPeak: 0, peak: 0 } }
  var tr = document.createElement('tr')
  var modelInput = inputCell(model, 'dshwv-model')
  var aliasInput = inputCell((prices.aliases || []).join(', '), 'dshwv-alias')
  var inputs = [
    inputCell(prices.cacheHit.offPeak, 'dshwv-number-price'), inputCell(prices.cacheHit.peak, 'dshwv-number-price'),
    inputCell(prices.cacheMiss.offPeak, 'dshwv-number-price'), inputCell(prices.cacheMiss.peak, 'dshwv-number-price'),
    inputCell(prices.output.offPeak, 'dshwv-number-price'), inputCell(prices.output.peak, 'dshwv-number-price')
  ]
  var modelCell = document.createElement('td'); modelCell.appendChild(modelInput); tr.appendChild(modelCell)
  var aliasCell = document.createElement('td'); aliasCell.appendChild(aliasInput); tr.appendChild(aliasCell)
  for (var i = 0; i < inputs.length; i++) {
    var td = document.createElement('td')
    td.dataset.band = i % 2 === 0 ? 'offPeak' : 'peak'
    td.appendChild(inputs[i])
    tr.appendChild(td)
  }
  var actionCell = document.createElement('td')
  var remove = pricingAction('删除', function () {
    tr.remove()
    pricingRows = pricingRows.filter(function (row) { return row.tr !== tr })
    clearPricingConfirmation()
  }, true)
  actionCell.appendChild(remove)
  tr.appendChild(actionCell)
  pricingTable.appendChild(tr)
  pricingRows.push({ tr: tr, model: modelInput, aliases: aliasInput, inputs: inputs, remove: remove, custom: !!custom })
  setPricingAdvanced(advancedCheck.checked)
}
function setPricingAdvanced(enabled) {
  addModelButton.style.display = enabled ? '' : 'none'
  for (var i = 0; i < pricingRows.length; i++) {
    pricingRows[i].model.disabled = !enabled || !pricingRows[i].custom
    pricingRows[i].aliases.closest('td').style.display = enabled ? '' : 'none'
    pricingRows[i].remove.style.display = enabled && pricingRows[i].custom ? '' : 'none'
  }
  var aliasHead = pricingTable.querySelector('[data-alias-head]')
  if (aliasHead) aliasHead.style.display = enabled ? '' : 'none'
}
function renderPricingEditor(payload) {
  pricingOriginal = JSON.parse(JSON.stringify(payload.config))
  pricingRows = []
  pricingTable.textContent = ''
  var head = document.createElement('tr')
  ;['模型', '别名', '命中·谷', '命中·峰', '未命中·谷', '未命中·峰', '输出·谷', '输出·峰', '操作'].forEach(function (label, index) {
    var th = document.createElement('th'); th.textContent = label
    if (index === 1) th.setAttribute('data-alias-head', '')
    if ((payload.peakStatus && payload.peakStatus.band === 'offPeak' && [2, 4, 6].indexOf(index) >= 0) ||
        (payload.peakStatus && payload.peakStatus.band === 'peak' && [3, 5, 7].indexOf(index) >= 0)) th.className = 'dshwv-active-band'
    head.appendChild(th)
  })
  pricingTable.appendChild(head)
  Object.keys(payload.config.models).forEach(function (model) { addPricingRow(model, payload.config.models[model], false) })
  for (var r = 0; r < pricingRows.length; r++) {
    for (var c = 0; c < pricingRows[r].inputs.length; c++) {
      if ((payload.peakStatus.band === 'offPeak' && c % 2 === 0) || (payload.peakStatus.band === 'peak' && c % 2 === 1)) pricingRows[r].inputs[c].closest('td').className = 'dshwv-active-band'
    }
  }
  pricingMeta.textContent = ''
  var sourceText = document.createElement('span')
  sourceText.textContent = '来源：' + (payload.source === 'user' ? '用户配置' : '内置回退') + '　核对日期：'
  verifiedAtInput = inputCell(payload.config.verifiedAt)
  verifiedAtInput.type = 'date'
  pricingMeta.appendChild(sourceText)
  pricingMeta.appendChild(verifiedAtInput)
  pricingMeta.appendChild(document.createTextNode('　单位：人民币 / 百万 Token；绿色列为当前生效价格。'))
  restorePriceButton.disabled = !payload.hasBackup
  advancedCheck.checked = false
  setPricingAdvanced(false)
  clearPricingConfirmation()
  updatePeakBadge(payload.peakStatus)
}
function openPricingEditor() {
  closeMenu()
  switchEditorTab('pricing')
  pricingError.textContent = ''
  pricingMeta.textContent = '正在读取价格配置…'
  pricingTable.textContent = ''
  pricingModal.classList.add('dshwv-modal-open')
  fetch(PRICING_URL, { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (data) {
    if (!data || !data.ok) throw new Error(data && data.error ? data.error : '读取失败')
    renderPricingEditor(data)
  }).catch(function (err) { pricingError.textContent = '读取价格失败：' + String(err.message || err) })
}
function closePricingEditor() {
  pricingModal.classList.remove('dshwv-modal-open')
  clearPricingConfirmation()
  clearDialogueConfirmation()
}
function collectPricingConfig() {
  if (!pricingOriginal) throw new Error('价格配置尚未加载')
  var config = JSON.parse(JSON.stringify(pricingOriginal))
  config.verifiedAt = verifiedAtInput && verifiedAtInput.value
  config.models = {}
  var usedAliases = {}
  for (var i = 0; i < pricingRows.length; i++) {
    var row = pricingRows[i]
    var model = row.model.value.trim()
    if (!/^[a-z0-9._-]+$/i.test(model)) throw new Error('模型名称只能包含字母、数字、点、下划线和连字符')
    if (config.models[model]) throw new Error('模型名称重复：' + model)
    var aliases = row.aliases.value.split(',').map(function (v) { return v.trim() }).filter(Boolean)
    var values = row.inputs.map(function (input) { return Number(input.value) })
    if (values.some(function (value) { return !isFinite(value) || value < 0 })) throw new Error(model + ' 的价格必须是非负数字')
    aliases.forEach(function (alias) {
      var key = alias.toLowerCase()
      if (usedAliases[key]) throw new Error('别名重复：' + alias)
      usedAliases[key] = true
    })
    config.models[model] = {
      aliases: aliases,
      cacheHit: { offPeak: values[0], peak: values[1] },
      cacheMiss: { offPeak: values[2], peak: values[3] },
      output: { offPeak: values[4], peak: values[5] }
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.verifiedAt || '')) throw new Error('请选择有效的核对日期')
  if (!Object.keys(config.models).length) throw new Error('至少保留一个模型')
  return config
}
function pricingChanges(before, after) {
  var changes = []
  if (before.verifiedAt !== after.verifiedAt) changes.push('核对日期：' + before.verifiedAt + ' → ' + after.verifiedAt)
  var names = {}
  Object.keys(before.models).concat(Object.keys(after.models)).forEach(function (name) { names[name] = true })
  Object.keys(names).forEach(function (name) {
    if (!before.models[name]) changes.push('新增模型：' + name)
    else if (!after.models[name]) changes.push('删除模型：' + name)
    else if (JSON.stringify(before.models[name]) !== JSON.stringify(after.models[name])) changes.push('修改模型：' + name)
  })
  return changes
}
function preparePricingSave() {
  pricingError.textContent = ''
  if (pendingPricingConfig) { commitPricing('PUT', { config: pendingPricingConfig }); return }
  clearPricingConfirmation()
  try {
    var next = collectPricingConfig()
    var changes = pricingChanges(pricingOriginal, next)
    if (!changes.length) { pricingError.textContent = '没有检测到价格变更。'; return }
    pendingPricingConfig = next
    pricingPreview.textContent = '保存前预览：\n• ' + changes.join('\n• ') + '\n\n保存时会自动备份当前价格。'
    pricingPreview.style.display = 'block'
    savePriceButton.textContent = '确认保存'
  } catch (err) { pricingError.textContent = String(err.message || err) }
}
function preparePricingAction(action) {
  pricingError.textContent = ''
  if (pendingPricingAction === action) { commitPricing('POST', { action: action }); return }
  clearPricingConfirmation()
  pendingPricingAction = action
  pricingPreview.textContent = action === 'restore-backup' ? '将恢复上一次保存前的价格。再次点击按钮确认。' : '将恢复插件内置价格，并自动备份当前价格。再次点击按钮确认。'
  pricingPreview.style.display = 'block'
  if (action === 'restore-backup') restorePriceButton.textContent = '确认恢复备份'
  else resetPriceButton.textContent = '确认恢复内置'
}
function commitPricing(method, body) {
  pricingError.textContent = '正在保存…'
  fetch(PRICING_URL, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json().then(function (data) { if (!r.ok || !data.ok) throw new Error(data.error || '保存失败'); return data }) })
    .then(function (data) {
      renderPricingEditor(data)
      state.pricingSource = data.source
      state.pricingVerifiedAt = data.verifiedAt
      updatePricingInfo()
      pricingError.textContent = '已保存。费用估算将立即使用新价格。'
      refresh(false)
    })
    .catch(function (err) { pricingError.textContent = '操作失败：' + String(err.message || err); clearPricingConfirmation() })
}

var dialogueOriginal = null
var dialogueRows = []
var pendingDialogueConfig = null
var pendingDialogueAction = ''
var dialogueLoaded = false
function switchEditorTab(tab) {
  var pricing = tab !== 'dialogues'
  pricingTab.classList.toggle('dshwv-tab-active', pricing)
  dialogueTab.classList.toggle('dshwv-tab-active', !pricing)
  pricingPane.classList.toggle('dshwv-pane-active', pricing)
  dialoguePane.classList.toggle('dshwv-pane-active', !pricing)
  if (!pricing && !dialogueLoaded) loadDialogueEditor()
}
function openDialogueEditor() {
  closeMenu()
  switchEditorTab('dialogues')
  pricingModal.classList.add('dshwv-modal-open')
}
function clearDialogueConfirmation() {
  pendingDialogueConfig = null
  pendingDialogueAction = ''
  dialoguePreview.style.display = 'none'
  dialoguePreview.textContent = ''
  saveDialogueButton.textContent = '检查并预览'
  restoreDialogueButton.textContent = '恢复上次备份'
  resetDialogueButton.textContent = '恢复内置台词'
}
function dialogueSelect(values, current, labels) {
  var select = document.createElement('select')
  values.forEach(function (value) { select.appendChild(soundOpt(value, labels && labels[value] ? labels[value] : value)) })
  select.value = current
  select.addEventListener('change', function () { clearDialogueConfirmation(); renderDialogueVisibility() })
  return select
}
function nextDialogueId() {
  return 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}
function addDialogueRow(entry, custom) {
  entry = entry || { id: nextDialogueId(), text: '', category: 'daily', rarity: 'normal', weight: 10, enabled: true }
  var card = document.createElement('div')
  card.className = 'dshwv-dialogue-card'
  var enabled = document.createElement('input')
  enabled.type = 'checkbox'
  enabled.className = 'dshwv-check'
  enabled.checked = !!entry.enabled
  enabled.title = '启用这条台词'
  var text = document.createElement('textarea')
  text.maxLength = 160
  text.value = String(entry.text || '')
  text.placeholder = '输入台词（最多 160 字）'
  var categories = Object.keys(DIALOGUE_CATEGORY_LABELS)
  var category = dialogueSelect(categories, entry.category, DIALOGUE_CATEGORY_LABELS)
  var rarityLabels = { normal: '普通', special: '特殊', rare: '罕见' }
  var rarity = dialogueSelect(['normal', 'special', 'rare'], entry.rarity, rarityLabels)
  var weight = document.createElement('input')
  weight.type = 'number'; weight.min = '1'; weight.max = '100'; weight.step = '1'; weight.value = String(entry.weight || 10)
  var audition = pricingAction('预览', function () { previewDialogueEntry(row) })
  var remove = pricingAction('删除', function () {
    card.remove()
    dialogueRows = dialogueRows.filter(function (item) { return item !== row })
    clearDialogueConfirmation()
  }, true)
  var id = document.createElement('div')
  id.className = 'dshwv-dialogue-id'
  id.textContent = 'ID: ' + entry.id
  ;[enabled, text, weight].forEach(function (control) { control.addEventListener('input', clearDialogueConfirmation) })
  card.appendChild(enabled)
  card.appendChild(text)
  card.appendChild(category)
  card.appendChild(rarity)
  card.appendChild(weight)
  card.appendChild(audition)
  card.appendChild(remove)
  card.appendChild(id)
  dialogueList.appendChild(card)
  var row = { card: card, id: String(entry.id || nextDialogueId()), enabled: enabled, text: text, category: category, rarity: rarity, weight: weight, custom: !!custom }
  dialogueRows.push(row)
  return row
}
function renderDialogueRows(config) {
  dialogueRows = []
  dialogueList.textContent = ''
  config.dialogues.forEach(function (entry) { addDialogueRow(entry, /^custom-/.test(entry.id)) })
  renderDialogueVisibility()
}
function renderDialogueEditor(payload) {
  dialogueOriginal = JSON.parse(JSON.stringify(payload.config))
  dialogueConfig = JSON.parse(JSON.stringify(payload.config))
  renderDialogueRows(payload.config)
  dialogueMeta.textContent = '来源：' + (payload.source === 'user' ? '用户配置' : '内置回退') + ' · 共 ' + payload.config.dialogues.length + ' 条台词'
  restoreDialogueButton.disabled = !payload.hasBackup
  dialogueLoaded = true
  clearDialogueConfirmation()
}
function loadDialogueEditor() {
  dialogueError.textContent = ''
  dialogueMeta.textContent = '正在读取台词配置…'
  fetch(DIALOGUES_URL, { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (data) {
    if (!data || !data.ok) throw new Error(data && data.error ? data.error : '读取失败')
    renderDialogueEditor(data)
  }).catch(function (err) { dialogueError.textContent = '读取台词失败：' + String(err.message || err) })
}
function renderDialogueVisibility() {
  var category = dialogueFilter.value
  var query = dialogueSearch.value.trim().toLowerCase()
  dialogueRows.forEach(function (row) {
    var visible = (category === 'all' || row.category.value === category) && (!query || row.text.value.toLowerCase().indexOf(query) >= 0 || row.id.toLowerCase().indexOf(query) >= 0)
    row.card.style.display = visible ? '' : 'none'
  })
}
function validateDialogueObject(config) {
  if (!config || config.version !== 1 || !Array.isArray(config.dialogues)) throw new Error('文件不是有效的 v1 台词配置')
  if (config.dialogues.length > 500) throw new Error('台词不能超过 500 条')
  var ids = {}
  var categories = Object.keys(DIALOGUE_CATEGORY_LABELS)
  var allowedFields = { balance: true, todayUsage: true, sessionUsage: true, timeBand: true, nextChange: true, model: true }
  config.dialogues.forEach(function (entry) {
    if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9._-]{1,80}$/i.test(entry.id)) throw new Error('存在无效的台词 ID')
    var idKey = entry.id.toLowerCase()
    if (ids[idKey]) throw new Error('台词 ID 重复：' + entry.id)
    ids[idKey] = true
    if (typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > 160) throw new Error(entry.id + ' 的内容为空或超过 160 字')
    if (categories.indexOf(entry.category) < 0) throw new Error(entry.id + ' 的情境无效')
    if (['normal', 'special', 'rare'].indexOf(entry.rarity) < 0) throw new Error(entry.id + ' 的稀有度无效')
    if (!Number.isInteger(entry.weight) || entry.weight < 1 || entry.weight > 100) throw new Error(entry.id + ' 的权重必须是 1–100 的整数')
    if (typeof entry.enabled !== 'boolean') throw new Error(entry.id + ' 的启用状态无效')
    var matches = entry.text.matchAll(/\{([^{}]+)\}/g)
    for (var match of matches) if (!allowedFields[match[1]]) throw new Error(entry.id + ' 使用了未知变量 {' + match[1] + '}')
  })
  return config
}
function collectDialogueConfig() {
  var config = { version: 1, dialogues: dialogueRows.map(function (row) {
    return {
      id: row.id,
      text: row.text.value.trim(),
      category: row.category.value,
      rarity: row.rarity.value,
      weight: Number(row.weight.value),
      enabled: !!row.enabled.checked
    }
  }) }
  return validateDialogueObject(config)
}
function dialogueChanges(before, after) {
  var oldById = {}; var newById = {}; var changed = 0
  before.dialogues.forEach(function (entry) { oldById[entry.id] = entry })
  after.dialogues.forEach(function (entry) { newById[entry.id] = entry })
  var added = after.dialogues.filter(function (entry) { return !oldById[entry.id] }).length
  var removed = before.dialogues.filter(function (entry) { return !newById[entry.id] }).length
  after.dialogues.forEach(function (entry) { if (oldById[entry.id] && JSON.stringify(oldById[entry.id]) !== JSON.stringify(entry)) changed++ })
  return { added: added, removed: removed, changed: changed }
}
function prepareDialogueSave() {
  dialogueError.textContent = ''
  if (pendingDialogueConfig) { commitDialogues('PUT', { config: pendingDialogueConfig }); return }
  clearDialogueConfirmation()
  try {
    var next = collectDialogueConfig()
    var diff = dialogueChanges(dialogueOriginal || { dialogues: [] }, next)
    if (!diff.added && !diff.removed && !diff.changed) { dialogueError.textContent = '没有检测到台词变更。'; return }
    pendingDialogueConfig = next
    dialoguePreview.textContent = '保存前预览：新增 ' + diff.added + ' 条，修改 ' + diff.changed + ' 条，删除 ' + diff.removed + ' 条。\n保存时会自动备份当前台词。'
    dialoguePreview.style.display = 'block'
    saveDialogueButton.textContent = '确认保存'
  } catch (err) { dialogueError.textContent = String(err.message || err) }
}
function prepareDialogueAction(action) {
  dialogueError.textContent = ''
  if (pendingDialogueAction === action) { commitDialogues('POST', { action: action }); return }
  clearDialogueConfirmation()
  pendingDialogueAction = action
  dialoguePreview.textContent = action === 'restore-backup' ? '将恢复上一次保存前的台词。再次点击按钮确认。' : '将恢复插件内置台词。当前台词会先自动备份。再次点击按钮确认。'
  dialoguePreview.style.display = 'block'
  if (action === 'restore-backup') restoreDialogueButton.textContent = '确认恢复备份'
  else resetDialogueButton.textContent = '确认恢复内置'
}
function commitDialogues(method, body) {
  dialogueError.textContent = '正在保存…'
  fetch(DIALOGUES_URL, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json().then(function (data) { if (!r.ok || !data.ok) throw new Error(data.error || '保存失败'); return data }) })
    .then(function (data) { renderDialogueEditor(data); dialogueError.textContent = '已保存，新的台词池已经生效。' })
    .catch(function (err) { dialogueError.textContent = '操作失败：' + String(err.message || err); clearDialogueConfirmation() })
}
function previewDialogueEntry(row) {
  var text = row.text.value.trim()
  if (!text) { dialogueError.textContent = '请先输入台词内容。'; return }
  if (!bubbleOn) { dialogueError.textContent = '请先在菜单中开启气泡，再预览台词。'; return }
  pricingModal.classList.remove('dshwv-modal-open')
  showDialogueText(interpolateDialogue(text))
    setTimeout(function () { pricingModal.classList.add('dshwv-modal-open') }, Math.min(3500, dialogueBubbleCloseMs || 3500))
}
function importDialogues() {
  dialogueFileInput.value = ''
  dialogueFileInput.click()
}
function readDialogueImport() {
  var file = dialogueFileInput.files && dialogueFileInput.files[0]
  if (!file) return
  if (file.size > 262144) { dialogueError.textContent = '导入文件不能超过 256 KB。'; return }
  file.text().then(function (raw) {
    var imported = validateDialogueObject(JSON.parse(raw))
    renderDialogueRows(imported)
    clearDialogueConfirmation()
    dialoguePreview.textContent = '已载入 ' + imported.dialogues.length + ' 条台词，尚未保存。请检查并预览后确认保存。'
    dialoguePreview.style.display = 'block'
  }).catch(function (err) { dialogueError.textContent = '导入失败：' + String(err.message || err) })
}
function exportDialogues() {
  try {
    var config = collectDialogueConfig()
    var blob = new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' })
    var url = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = url
    link.download = 'dsh-whale-dialogues.json'
    link.click()
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
  } catch (err) { dialogueError.textContent = '导出失败：' + String(err.message || err) }
}
function animateAmount(from, to, currency, duration) {
  // 消耗金额泡泡显示期间，余额数字滚动不触碰金额行
  if (costBubbleActive) return
  if (animId) cancelAnimationFrame(animId)
  if (from === null || !isFinite(from)) from = to
  if (from === to) {
    shown = to
    amountEl.textContent = fmt(to, currency)
    return
  }
  var startTime = null
  function step(ts) {
    // 帧级保护：成本泡泡出现后立即停止滚动，避免后续帧把余额写进金额行
    if (costBubbleActive) {
      animId = null
      return
    }
    if (startTime === null) startTime = ts
    var t = Math.min(1, (ts - startTime) / duration)
    var eased = 1 - Math.pow(1 - t, 3)
    var val = from + (to - from) * eased
    amountEl.textContent = fmt(val, currency)
    if (t < 1) {
      animId = requestAnimationFrame(step)
    } else {
      animId = null
      shown = to
      amountEl.textContent = fmt(to, currency)
    }
  }
  animId = requestAnimationFrame(step)
}
function render() {
  // 消耗金额泡泡显示期间，余额渲染不覆盖其内容（金额行/标题行/提示行）
  if (costBubbleActive) return
  var amount, hint
  if (state.status === 'error') {
    amount = shown !== null ? fmt(shown, state.currency) : '--'
    hint = state.message ? state.message.slice(0, 14) : '获取失败 · 点击重试'
  } else if (state.balance === null) {
    amount = shown !== null ? fmt(shown, state.currency) : '…'
    hint = '加载中…'
  } else {
    amount = shown !== null ? fmt(shown, state.currency) : fmt(state.balance, state.currency)
    hint = usageLabel() + (state.todayUsage !== null && state.todayUsage !== undefined ? fmt(state.todayUsage, state.currency) : '--')
  }
  amountEl.textContent = amount
  if (bubbleRandomActive && bubbleRandomLines) {
    applyBubbleLines(bubbleRandomLines)
  } else {
    setHint(hint)
  }
}
function express() {
  root.style.right = 'auto'
  root.style.bottom = 'auto'
  root.style.left = state.left + 'px'
  root.style.top = state.top + 'px'
  root.classList.toggle('dshwv-left', state.h === 'left')
}
function settle() {
  var vp = viewport()
  var w = root.offsetWidth || root.getBoundingClientRect().width || 0
  var h = root.offsetHeight || root.getBoundingClientRect().height || 0
  if (drag && drag.active) {
    // mid-drag resize: keep the pointer-follow position, just clamp into view
    state.left = clamp(state.left, 0, Math.max(0, vp.w - w - rightGap()))
    state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
    express()
    return
  }
  if (state.h === 'right') {
    state.left = Math.max(0, vp.w - w - state.hOff - rightGap())
  } else if (state.h === 'left') {
    state.left = state.hOff
  } else {
    state.left = clamp(state.left, 0, Math.max(0, vp.w - w - rightGap()))
  }  if (state.v === 'bottom') {
    state.top = Math.max(0, vp.h - h - state.vOff)
  } else if (state.v === 'top') {
    state.top = state.vOff
  } else {
    state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
  }
  express()
}
function refresh(manual) {
  if (busy) return
  busy = true
  if (animDelayTimer) { clearTimeout(animDelayTimer); animDelayTimer = null }
  if (manual || state.balance === null) { state.status = 'loading'; render() }
  var ctrl = null
  var timer = null
  try {
    ctrl = new AbortController()
    timer = setTimeout(function () { try { ctrl.abort() } catch (err) {} }, FETCH_TIMEOUT_MS)
  } catch (err) {}
  fetch(BALANCE_URL, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
    .then(function (r) { return r.json() })
    .then(function (data) {
      if (data && data.ok) {
        var nb = Number(data.totalBalance)
        var nc = String(data.currency || 'CNY')
        var changed = state.balance !== null && (nb !== state.balance || nc !== state.currency)
        var currencyChanged = state.currency !== null && nc !== state.currency
        state.balance = nb
        state.currency = nc
        state.message = ''
        state.todayUsage = data.todayUsage !== undefined ? data.todayUsage : null
        state.todayUsageSource = data.todayUsageSource || 'balance-estimate'
        state.todayTokens = data.todayTokens !== undefined ? data.todayTokens : null
        state.usageWarning = data.usageWarning || ''
        state.pricingSource = data.pricingSource || ''
        state.pricingVerifiedAt = data.pricingVerifiedAt || ''
        updatePricingInfo()
        renderUsagePanel()
        updatePeakBadge(data.peakStatus || { isPeak: !!data.isPeak, band: data.isPeak ? 'peak' : 'offPeak', weekendOffPeak: false, nextChangeAt: null, nextBand: null })
        if (changed && !currencyChanged) {
          if (!manual) {
            showBubble()
            state.status = 'changing'
            // balance-change bubble: wait 0.3s after it floats out, then roll the number
            if (animDelayTimer) clearTimeout(animDelayTimer)
            animDelayTimer = setTimeout(function () {
              animDelayTimer = null
              animateAmount(shown, nb, nc, ANIM_MS)
            }, 300)
            if (settleTimer) clearTimeout(settleTimer)
            settleTimer = setTimeout(function () {
              settleTimer = null
              if (state.status === 'changing') { state.status = 'ok'; render() }
            }, CHANGE_MS + 300)
          } else {
            animateAmount(shown, nb, nc, ANIM_MS)
            state.status = 'ok'
            render()
          }
        } else {
          if (animId === null) shown = nb
          state.status = 'ok'
          render()
        }
      } else {
        state.status = 'error'
        state.message = (data && data.error) ? String(data.error) : '获取失败'
        render()
      }
    })
    .catch(function () {
      state.status = 'error'
      state.message = '获取失败'
      render()
    })
    .finally(function () {
      busy = false
      if (timer) clearTimeout(timer)
    })
}
var soundOn = true
var soundVol = 0.9
var soundSet = 'duck'
var usageMode = 'ledger'
var dialogueFrequency = 'normal'
var bubbleOn = true
var turnCostOn = true
var balanceBubbleCloseMs = 5000
var costBubbleCloseMs = 5000
var dialogueBubbleCloseMs = 5000
var costBubbleActive = false
var scrollGapOn = false
var scrollGapPx = 17
function saveConfig() {
  try {
    fetch(SIZE_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scale: state.scale, sound: soundOn, vol: soundVol, soundSet: soundSet, usageMode: usageMode, dialogueFrequency: dialogueFrequency, bubbleOn: bubbleOn, turnCostOn: turnCostOn, balanceBubbleCloseMs: balanceBubbleCloseMs, costBubbleCloseMs: costBubbleCloseMs, dialogueBubbleCloseMs: dialogueBubbleCloseMs, scrollGapOn: scrollGapOn, scrollGapPx: scrollGapPx }) })
    // 锚点位置记忆：记录相对边框的离边距离，窗口 resize 后保持（localStorage）。
    // v:2 = 净距离格式（剥离避让距离），v:1 旧格式含避让距离，恢复时废弃旧格式。
    var vp = viewport()
    var w = root.offsetWidth || root.getBoundingClientRect().width || 0
    var h = root.offsetHeight || root.getBoundingClientRect().height || 0
    var leftDist = state.left
    var rightDist = vp.w - state.left - w
    var topDist = state.top
    var bottomDist = vp.h - state.top - h
    var hAnchor = leftDist <= rightDist ? 'left' : 'right'
    var hDistRaw = Math.round(Math.min(leftDist, rightDist))
    var hDist = hAnchor === 'right' && scrollGapOn ? Math.max(0, hDistRaw - rightGap()) : hDistRaw
    localStorage.setItem('dshw-pos', JSON.stringify({
      v: 2,
      hAnchor: hAnchor,
      hDist: hDist,
      vAnchor: topDist <= bottomDist ? 'top' : 'bottom',
      vDist: Math.round(Math.min(topDist, bottomDist))
    }))
  } catch (err) {}
}
function setUsageMode(v) {
  usageMode = v === 'token' ? 'token' : 'ledger'
  usageSelect.value = usageMode
  saveConfig()
  refresh(false)
}
function setDialogueFrequency(v) {
  dialogueFrequency = v === 'low' || v === 'high' ? v : 'normal'
  dialogueFrequencySelect.value = dialogueFrequency
  saveConfig()
}
function setBubbleOn(v) {
  bubbleOn = !!v
  bubbleToggle.checked = bubbleOn
  saveConfig()
  // 必须走 hideCostBubble：残留的 costBubbleActive 会让 render()/showBubble() 永久早退
  if (!bubbleOn) hideCostBubble()
}
function setTurnCostOn(v) {
  turnCostOn = !!v
  turnCostToggle.checked = turnCostOn
  costBubbleCloseInput.disabled = !turnCostOn
  saveConfig()
  if (!turnCostOn) hideCostBubble()
}
function durationSeconds(v) {
  var n = Math.max(0, Math.round(Number(v) || 0))
  return Math.min(3600, n)
}
function setBalanceBubbleClose(v) {
  var n = durationSeconds(v)
  balanceBubbleCloseMs = n * 1000
  balanceBubbleCloseInput.value = String(n)
  saveConfig()
}
function setCostBubbleClose(v) {
  var n = durationSeconds(v)
  costBubbleCloseMs = n * 1000
  costBubbleCloseInput.value = String(n)
  saveConfig()
}
function setDialogueBubbleClose(v) {
  var n = durationSeconds(v)
  dialogueBubbleCloseMs = n * 1000
  dialogueBubbleCloseInput.value = String(n)
  saveConfig()
}
function setScrollGapOn(v) {
  scrollGapOn = !!v
  scrollGapToggle.checked = scrollGapOn
  scrollGapInput.disabled = !scrollGapOn
  saveConfig()
  settle()
}
function setScrollGapPx(v) {
  if (!scrollGapOn) return
  var n = Math.max(0, Math.round(Number(v) || 0))
  scrollGapPx = n
  scrollGapInput.value = String(n)
  saveConfig()
  settle()
}
function scaleToDisplay(s) {
  return Math.round((s - MIN_SCALE) / ((MAX_SCALE - MIN_SCALE) / 19)) + 1
}
function setScale(v) {
  var next = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(v))) * 10) / 10
  // 缩放测量需要 left/top 立即到位：临时禁用过渡（滚轮/数字框路径没有
  // 滑块 pointerdown 的 transition:none，否则 r2 测的是过渡起点导致错锚点）
  var prevTrans = root.style.transition
  root.style.transition = 'none'
  var rect = root.getBoundingClientRect()
  // fixed point: the whale's corner — bottom-right when unflipped, bottom-left
  // when flipped. Growing extends the widget up-left / up-right from that
  // corner; shrinking pulls it back toward the corner. The whale always hugs
  // its corner while scaling.
  var fx = state.h === 'left' ? rect.left : rect.right
  var fy = rect.bottom
  state.scale = next
  root.style.setProperty('--dshw-scale', String(next))
  scaleInput.value = String(next)
  scaleNumber.value = String(scaleToDisplay(next))
  saveConfig()
  // keep the corner fixed while resizing; the position correction applies
  // instantly because the caller disables the transition for the whole drag
  var r2 = root.getBoundingClientRect()
  var vp = viewport()
  if (state.h === 'left') {
    state.left = Math.min(Math.max(fx, 0), Math.max(0, vp.w - r2.width))
  } else {
    state.left = Math.min(Math.max(fx - r2.width, 0), Math.max(0, vp.w - r2.width))
  }
  state.top = Math.min(Math.max(fy - r2.height, 0), Math.max(0, vp.h - r2.height))
  express()
  // 恢复过渡必须延迟到下一帧：本帧 left/top 已在 none 下设置并提交，
  // 立即恢复会让浏览器对「刚改过的 left/top」重新评估并播放过渡动画
  // （翻转时叠加 transform .3s 更明显，表现为抽搐）。
  requestAnimationFrame(function () {
    root.style.transition = prevTrans
  })
}
function setVol(v) {
  var next = Math.round(Math.min(1, Math.max(0, Number(v))) * 100) / 100
  soundVol = next
  soundOn = next > 0
  volInput.value = String(next)
  volPct.textContent = Math.round(next * 100) + '%'
  try {
    if (pressAudio) pressAudio.volume = next
    if (releaseAudio) releaseAudio.volume = next
  } catch (err) {}
  saveConfig()
}
function setSoundSet(v) {
  soundSet = v === 'fx1' ? 'fx1' : 'duck'
  soundSelect.value = soundSet
  applySoundSet()
  saveConfig()
}
var SQUISH = 'scaleY(0.88) scaleX(1.05)'
var pressAudio = null
var releaseAudio = null
var pressing = false
var pressEnded = false
var releasePlayed = false
var releaseTimer = null
function applySoundSet() {
  try {
    pressAudio = new Audio('/dsh-whale/sound/press.mp3?set=' + soundSet)
    pressAudio.preload = 'auto'
    pressAudio.volume = soundVol
    releaseAudio = new Audio('/dsh-whale/sound/release.mp3?set=' + soundSet)
    releaseAudio.preload = 'auto'
    releaseAudio.volume = soundVol
  } catch (err) {}
}
function playPress() {
  if (!pressAudio || !soundOn) return
  try {
    if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null }
    if (releaseAudio) {
      releaseAudio.pause()
      releaseAudio.currentTime = 0
    }
    pressEnded = false
    releasePlayed = false
    pressAudio.onended = function () {
      pressEnded = true
      // fallback (duration unknown): click → Ya2 right after Ya1 ends
      if (!pressing && !releasePlayed) playRelease()
      // hold: still pressed → wait for pressUp()
    }
    pressAudio.currentTime = 0
    var p = pressAudio.play()
    if (p && typeof p.catch === 'function') p.catch(function () {})
  } catch (err) {}
}
function playRelease() {
  if (releasePlayed || !releaseAudio || !soundOn) return
  releasePlayed = true
  try {
    releaseAudio.currentTime = 0
    var p = releaseAudio.play()
    if (p && typeof p.catch === 'function') p.catch(function () {})
  } catch (err) {}
}
function pressDown() {
  body.style.transform = SQUISH
  pressing = true
  playPress()
}
function pressUp() {
  body.style.transform = 'scaleY(1) scaleX(1)'
  pressing = false
  if (pressEnded) {
    // hold (or released after Ya1 finished) → Ya2 now
    playRelease()
    return
  }
  // click: start Ya2 in the last 100ms of Ya1's playback
  var durKnown = false
  var remainMs = 0
  try {
    var dur = pressAudio ? pressAudio.duration : 0
    if (isFinite(dur) && dur > 0) {
      durKnown = true
      remainMs = (dur - pressAudio.currentTime) * 1000
    }
  } catch (err) {}
  if (durKnown) {
    releaseTimer = setTimeout(function () {
      releaseTimer = null
      playRelease()
    }, Math.max(0, remainMs - 100))
  }
  // duration unknown → pressAudio.onended fallback plays Ya2 after Ya1 ends
}
var menuOpen = false
function toggleMenu() {
  menuOpen = !menuOpen
  if (menuOpen) positionMenu()
  menuBox.classList.toggle('dshwv-menu-open', menuOpen)
  if (menuOpen) {
    menuBtn.classList.add('dshwv-menu-btn-visible')
    quickChatBtn.classList.add('dshwv-chat-btn-visible')
  }
}
function closeMenu() {
  menuOpen = false
  menuBox.classList.remove('dshwv-menu-open')
  root.style.transition = ''
  snapCheck()
}
function snapCheck() {
  var rect = root.getBoundingClientRect()
  var vp = viewport()
  var w = rect.width, h = rect.height
  var left = rect.left, top = rect.top
  var centerX = left + w / 2
  var centerY = top + h / 2
  var moved = false
  if (centerX < vp.w / 4) {
    state.h = 'left'
    state.hOff = 0
    left = 0
    moved = true
  } else if (centerX > vp.w * 3 / 4) {
    state.h = 'right'
    state.hOff = 0
    left = vp.w - w - rightGap()
    moved = true
  } else {
    state.h = null
    state.hOff = left
  }
  if (centerY < vp.h / 4) {
    state.v = 'top'
    state.vOff = 0
    top = 0
    moved = true
  } else {
    state.v = 'bottom'
    state.vOff = Math.max(0, vp.h - top - h)
  }
  if (moved) {
    state.left = left
    state.top = top
    settle()
  }
}
function positionMenu() {
  try {
    var r = root.getBoundingClientRect()
    var b = menuBtn.getBoundingClientRect()
    var vp = viewport()
    var onLeft = r.left + r.width / 2 < vp.w / 2
    // the menu appears ABOVE the button, anchored to its side:
    // right side → menu bottom-right aligns with the button's top-right;
    // left side → menu bottom-left aligns with the button's top-left
    if (onLeft) {
      menuBox.style.left = b.left + 'px'
      menuBox.style.right = 'auto'
      menuBox.style.transformOrigin = 'bottom left'
    } else {
      menuBox.style.right = (vp.w - b.right) + 'px'
      menuBox.style.left = 'auto'
      menuBox.style.transformOrigin = 'bottom right'
    }
    menuBox.style.bottom = (vp.h - b.top) + 'px'
    menuBox.style.top = 'auto'
  } catch (err) {}
}

var hitCanvas = null
var hitReady = false
function setupHitTest() {
  try {
    hitCanvas = document.createElement('canvas')
    hitCanvas.width = 610
    hitCanvas.height = 610
    var probe = new Image()
    probe.onload = function () {
      try {
        // 拉伸到 610×610 与 isWhaleHit 的坐标映射对齐；不指定尺寸会按原图大小绘制，
        // 回退到非 610×610 素材（如 DSniang02.png）时命中区域会错位
        hitCanvas.getContext('2d').drawImage(probe, 0, 0, 610, 610)
        hitReady = true
      } catch (err) {}
    }
    probe.onerror = function () {}
    probe.src = IMG_URL
  } catch (err) {}
}
function isWhaleHit(e) {
  if (!hitCanvas || !hitReady) return true
  try {
    var r = img.getBoundingClientRect()
    if (!r || r.width <= 0 || r.height <= 0) return false
    var lx = (e.clientX - r.left) / r.width * 610
    var ly = (e.clientY - r.top) / r.height * 610
    if (lx < 0 || ly < 0 || lx >= 610 || ly >= 610) return false
    if (state.h === 'left') lx = 610 - lx
    var data = hitCanvas.getContext('2d').getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data
    return data[3] > 10
  } catch (err) {
    return true
  }
}
function onDocPointerDown(e) {
  if (e.target && e.target.closest) {
    if (e.target.closest('.dshwv-bubble') || e.target.closest('.dshwv-menu') || e.target.closest('.dshwv-menu-btn') || e.target.closest('.dshwv-chat-btn') || e.target.closest('.dshwv-modal')) return
  }
  if (menuOpen) {
    closeMenu()
    return
  }
  if (e.button !== 0 && e.pointerType === 'mouse') return
  if (!isWhaleHit(e)) return
  try { e.preventDefault(); e.stopPropagation() } catch (err) {}
  var vp = viewport()
  var rect = root.getBoundingClientRect()
  drag = { active: true, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top, w: rect.width, h: rect.height, moved: false, vp: vp }
  root.classList.add('dshwv-dragging')
  pressDown()
  setWidgetCursor('grabbing')
  document.addEventListener('pointermove', onDocPointerMove, true)
  document.addEventListener('pointerup', onDocPointerUp, true)
  document.addEventListener('pointercancel', onDocPointerCancel, true)
}
function onDocPointerMove(e) {
  if (!drag || !drag.active) return
  var dx = e.clientX - drag.startX
  var dy = e.clientY - drag.startY
  if (dx * dx + dy * dy >= CLICK_SQ) drag.moved = true
  // Keep the pre-drag flip orientation while dragging (state.h/v stay as they
  // were); on release endDrag() recomputes the anchors and settle() flips the
  // class with a smooth transition instead of reverting instantly.
  state.left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
  state.top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
  express()
}
function onDocPointerUp(e) {
  // 拦截鲸鱼区域内的 pointerup：防止下方元素（如文件行）监听 pointerup 穿透误触发
  try { if (isWhaleHit(e)) { e.preventDefault(); e.stopPropagation() } } catch (err) {}
  endDrag(e, true)
}
function onDocPointerCancel(e) { endDrag(e, false) }
function onDocClickStopper(e) {
  // 只在鲸鱼命中区域拦截 click（保持透明区 pass-through）。
  // 持久注册（不随 endDrag 移除）——click 在 pointerup 之后派发，
  // 若在 endDrag 移除会导致 click 穿透到下方元素（如误打开文件）。
  if (e.target && e.target.closest && (e.target.closest('.dshwv-bubble') || e.target.closest('.dshwv-menu') || e.target.closest('.dshwv-menu-btn') || e.target.closest('.dshwv-chat-btn') || e.target.closest('.dshwv-modal'))) return
  if (!isWhaleHit(e)) return
  try { e.preventDefault(); e.stopPropagation() } catch (err) {}
}
document.addEventListener('pointerdown', onDocPointerDown, true)
document.addEventListener('click', onDocClickStopper, true)

var widgetCursor = ''
function setWidgetCursor(v) {
  if (v !== widgetCursor) {
    widgetCursor = v
    try { document.body.style.cursor = v } catch (err) {}
  }
}
function onDocPointerMoveCursor(e) {
  if (drag && drag.active) { setWidgetCursor('grabbing'); return }
  var el = null
  try { el = document.elementFromPoint(e.clientX, e.clientY) } catch (err) {}
  if (el && el.closest && (el.closest('.dshwv-bubble') || el.closest('.dshwv-menu') || el.closest('.dshwv-menu-btn') || el.closest('.dshwv-chat-btn') || el.closest('.dshwv-modal'))) {
    setWidgetCursor('')
    menuBtn.classList.add('dshwv-menu-btn-visible')
    quickChatBtn.classList.add('dshwv-chat-btn-visible')
    return
  }
  var over = isWhaleHit(e)
  setWidgetCursor(over ? 'grab' : '')
  menuBtn.classList.toggle('dshwv-menu-btn-visible', over || menuOpen)
  quickChatBtn.classList.toggle('dshwv-chat-btn-visible', over || menuOpen)
}
document.addEventListener('pointermove', onDocPointerMoveCursor, true)

function endDrag(e, clickAllowed) {
  if (!drag || !drag.active) return
  drag.active = false
  document.removeEventListener('pointermove', onDocPointerMove, true)
  document.removeEventListener('pointerup', onDocPointerUp, true)
  document.removeEventListener('pointercancel', onDocPointerCancel, true)
  pressUp()
  root.classList.remove('dshwv-dragging')
  setWidgetCursor(isWhaleHit(e) ? 'grab' : '')
  if (clickAllowed && !drag.moved) { showBubble(); refresh(true); return }
  var dx = e.clientX - drag.startX
  var dy = e.clientY - drag.startY
  var left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
  var top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
  var centerX = left + drag.w / 2
  var centerY = top + drag.h / 2
  if (centerX < drag.vp.w / 4) {
    state.h = 'left'
    state.hOff = 0
  } else if (centerX > drag.vp.w * 3 / 4) {
    state.h = 'right'
    state.hOff = 0
  } else {
    state.h = null
    state.hOff = left
  }
  if (centerY < drag.vp.h / 4) {
    state.v = 'top'
    state.vOff = 0
  } else if (centerY > drag.vp.h * 3 / 4) {
    state.v = 'bottom'
    state.vOff = 0
  } else {
    state.v = null
    state.vOff = top
  }
  state.left = left
  state.top = top
  settle()
  // 拖拽结束立即保存锚点位置（否则刷新/关闭后位置回退到上次改菜单时）
  saveConfig()
}
// 窗口尺寸变化时：自由位置的鲸鱼按相对边框锚点重算（保持离边距离，窗口恢复原状即回原位）；
// 贴边吸附的鲸鱼走 settle()（保持贴边）
function applyAnchorPos() {
  try {
    var a = JSON.parse(localStorage.getItem('dshw-pos') || 'null')
    if (!a || a.v !== 2 || (a.hAnchor !== 'left' && a.hAnchor !== 'right') || typeof a.hDist !== 'number' ||
        (a.vAnchor !== 'top' && a.vAnchor !== 'bottom') || typeof a.vDist !== 'number') return false
    var vp = viewport()
    var w = root.offsetWidth || root.getBoundingClientRect().width || 0
    var h = root.offsetHeight || root.getBoundingClientRect().height || 0
    // 与加载恢复一致：锚点存净距离，右锚点按当前避让开关叠加
    var effectiveRightDist = a.hAnchor === 'right' ? a.hDist + (scrollGapOn ? rightGap() : 0) : a.hDist
    var l = a.hAnchor === 'left' ? a.hDist : vp.w - effectiveRightDist - w
    var t = a.vAnchor === 'top' ? a.vDist : vp.h - a.vDist - h
    state.left = clamp(l, 0, Math.max(0, vp.w - w))
    state.top = clamp(t, 0, Math.max(0, vp.h - h))
    state.h = a.hAnchor
    state.hOff = 0
    state.v = a.vAnchor
    state.vOff = 0
    express()
    return true
  } catch (err) { return false }
}
window.addEventListener('resize', function () {
  if (state.h === null && state.v === null && applyAnchorPos()) return
  settle()
})

var rect0 = root.getBoundingClientRect()
state.left = rect0.left
state.top = rect0.top
express()
render()
applySoundSet()
setupHitTest()
function refreshPeakStatus() {
  fetch(PRICING_URL, { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (data) {
    if (!data || !data.ok) return
    state.pricingSource = data.source || ''
    state.pricingVerifiedAt = data.verifiedAt || ''
    updatePricingInfo()
    updatePeakBadge(data.peakStatus)
  }).catch(function () {})
}
function refreshDialogueConfig() {
  fetch(DIALOGUES_URL, { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (data) {
    if (data && data.ok && data.config && Array.isArray(data.config.dialogues)) dialogueConfig = data.config
  }).catch(function () {})
}
refreshPeakStatus()
refreshDialogueConfig()
fetch(SIZE_URL, { cache: 'no-store' })
  .then(function (r) { return r.json() })
  .then(function (d) {
    if (d && typeof d.scale === 'number' && d.scale >= MIN_SCALE - 0.1 && d.scale <= MAX_SCALE + 0.1) {
      state.scale = d.scale
      root.style.setProperty('--dshw-scale', String(d.scale))
      scaleInput.value = String(d.scale)
      scaleNumber.value = String(scaleToDisplay(d.scale))
      settle()
    }
    if (d && typeof d.vol === 'number') {
      soundVol = d.vol
      soundOn = soundVol > 0
      volInput.value = String(soundVol)
      volPct.textContent = Math.round(soundVol * 100) + '%'
      try {
        if (pressAudio) pressAudio.volume = soundVol
        if (releaseAudio) releaseAudio.volume = soundVol
      } catch (err) {}
    }
    if (d && typeof d.soundSet === 'string') {
      soundSet = d.soundSet === 'fx1' ? 'fx1' : 'duck'
      soundSelect.value = soundSet
      applySoundSet()
    }
    if (d && typeof d.usageMode === 'string') {
      usageMode = d.usageMode === 'token' ? 'token' : 'ledger'
      usageSelect.value = usageMode
    }
    if (d && typeof d.dialogueFrequency === 'string') {
      dialogueFrequency = d.dialogueFrequency === 'low' || d.dialogueFrequency === 'high' ? d.dialogueFrequency : 'normal'
      dialogueFrequencySelect.value = dialogueFrequency
    }
    if (d && typeof d.bubbleOn === 'boolean') {
      bubbleOn = d.bubbleOn
      bubbleToggle.checked = bubbleOn
    }
    if (d && typeof d.turnCostOn === 'boolean') {
      turnCostOn = d.turnCostOn
      turnCostToggle.checked = turnCostOn
      costBubbleCloseInput.disabled = !turnCostOn
    }
    if (d && typeof d.balanceBubbleCloseMs === 'number') {
      balanceBubbleCloseMs = d.balanceBubbleCloseMs > 0 ? d.balanceBubbleCloseMs : 0
      balanceBubbleCloseInput.value = String(Math.round(balanceBubbleCloseMs / 1000))
    }
    if (d && typeof d.costBubbleCloseMs === 'number') {
      costBubbleCloseMs = d.costBubbleCloseMs > 0 ? d.costBubbleCloseMs : 0
      costBubbleCloseInput.value = String(Math.round(costBubbleCloseMs / 1000))
    }
    if (d && typeof d.dialogueBubbleCloseMs === 'number') {
      dialogueBubbleCloseMs = d.dialogueBubbleCloseMs > 0 ? d.dialogueBubbleCloseMs : 0
      dialogueBubbleCloseInput.value = String(Math.round(dialogueBubbleCloseMs / 1000))
    }
    if (d && typeof d.scrollGapOn === 'boolean') {
      scrollGapOn = d.scrollGapOn
      scrollGapToggle.checked = scrollGapOn
      scrollGapInput.disabled = !scrollGapOn
    }
    if (d && typeof d.scrollGapPx === 'number') {
      scrollGapPx = d.scrollGapPx > 0 ? Math.round(d.scrollGapPx) : 0
      scrollGapInput.value = String(scrollGapPx)
    }
    // 相对边框恢复（localStorage 锚点）：窗口变化后保持离边距离。
    // 仅认 v:2 净距离格式；旧格式（含避让距离）废弃，挂件保持默认右下角吸附。
    // 恢复时还原吸附状态（hAnchor/vAnchor → state.h/v），避免挂件变自由位置
    // 导致避让调节不实时（settle 自由分支只 clamp 不重算位置）。
    try {
      var a = JSON.parse(localStorage.getItem('dshw-pos') || 'null')
      if (a && a.v === 2 && (a.hAnchor === 'left' || a.hAnchor === 'right') && typeof a.hDist === 'number' &&
          (a.vAnchor === 'top' || a.vAnchor === 'bottom') && typeof a.vDist === 'number') {
        var vpA = viewport()
        var wA = root.offsetWidth || root.getBoundingClientRect().width || 0
        var hA = root.offsetHeight || root.getBoundingClientRect().height || 0
        // 锚点存的是净距离：右锚点按当前避让开关叠加避让距离
        var effectiveRightDist = a.hAnchor === 'right' ? a.hDist + (scrollGapOn ? rightGap() : 0) : a.hDist
        var lA = a.hAnchor === 'left' ? a.hDist : vpA.w - effectiveRightDist - wA
        var tA = a.vAnchor === 'top' ? a.vDist : vpA.h - a.vDist - hA
        state.left = clamp(lA, 0, Math.max(0, vpA.w - wA))
        state.top = clamp(tA, 0, Math.max(0, vpA.h - hA))
        // 按锚点还原吸附状态（贴边锚点 → 吸附；自由位锚点 → 自由）
        state.h = a.hAnchor
        state.hOff = 0
        state.v = a.vAnchor
        state.vOff = 0
        settle()
      }
    } catch (err) {}
    refresh(false)
  })
  .catch(function () { refresh(false) })
setInterval(function () { refresh(false); refreshPeakStatus(); refreshDialogueConfig() }, REFRESH_MS)

// —— 对话/工作区用量：优先使用 SSE 实时推送，断线时低频轮询兜底 ——
var initialSession = window.__DSH_WHALE_CURRENT_SESSION__
var currentSessionId = initialSession && typeof initialSession.sessionId === 'string' ? initialSession.sessionId : ''
var usageEventSource = null
var usageReconnectTimer = null
var lastTurnKey = ''
var usageAligned = false
function usageRequestUrl(base) {
  return base + (currentSessionId ? '?sessionId=' + encodeURIComponent(currentSessionId) : '')
}
function turnKey(turn) {
  if (!turn) return ''
  return String(turn.sessionId || '') + ':' + String(turn.turn === null ? '' : turn.turn) + ':' + String(turn.ts || '')
}
function acceptUsage(data) {
  if (!data || !data.ok) return
  state.sessionUsage = data
  renderUsagePanel()
  var key = turnKey(data.lastTurn)
  if (!usageAligned) {
    lastTurnKey = key
    usageAligned = true
    return
  }
  if (data.selectedSessionId && key && key !== lastTurnKey) {
    lastTurnKey = key
    showCostBubble(data.lastTurn.amount, data.lastTurn.tokens.total, data.lastTurn.tokens.reasoning, data.lastTurn.unknownModels)
  } else if (key) {
    lastTurnKey = key
  }
}
function pollUsage() {
  try {
    fetch(usageRequestUrl(USAGE_URL), { cache: 'no-store' })
      .then(function (r) { return r.json() })
      .then(acceptUsage)
      .catch(function () {})
  } catch (err) {}
}
function connectUsageStream() {
  if (usageReconnectTimer) { clearTimeout(usageReconnectTimer); usageReconnectTimer = null }
  if (usageEventSource) { usageEventSource.close(); usageEventSource = null }
  usageAligned = false
  pollUsage()
  if (typeof EventSource !== 'function') return
  try {
    var source = new EventSource(usageRequestUrl(EVENTS_URL))
    usageEventSource = source
    source.addEventListener('usage', function (event) {
      try { acceptUsage(JSON.parse(event.data)) } catch (err) {}
    })
    source.onerror = function () {
      if (usageEventSource === source) usageEventSource = null
      source.close()
      if (!usageReconnectTimer) {
        usageReconnectTimer = setTimeout(function () {
          usageReconnectTimer = null
          connectUsageStream()
        }, 5000)
      }
    }
  } catch (err) {}
}
window.addEventListener('dsh-whale-session-change', function (event) {
  var detail = event && event.detail
  var next = detail && typeof detail.sessionId === 'string' ? detail.sessionId : ''
  if (next === currentSessionId) return
  currentSessionId = next
  connectUsageStream()
})
setInterval(function () {
  if (!usageEventSource || usageEventSource.readyState !== 1) pollUsage()
}, 15000)
connectUsageStream()
})()
