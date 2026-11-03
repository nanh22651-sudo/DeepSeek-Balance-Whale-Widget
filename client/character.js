// A stable outer box owns hit testing; the two inner layers separate the old
// press/release squash from the character's smaller expressive movements.
const WHALE_CHARACTER_CSS = `
.dshwv-img{position:absolute;right:0;bottom:0;width:59.45%;height:59.45%;display:block;pointer-events:none;user-select:none}
.dshwv-press,.dshwv-character,.dshwv-character img{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none}
.dshwv-press,.dshwv-character{transform-origin:50% 100%}
.dshwv-press{transition:transform .22s cubic-bezier(.34,1.56,.64,1)}
.dshwv-img[data-held="true"] .dshwv-press{transform:scaleY(.88) scaleX(1.05)}
.dshwv-character{transition:transform .2s ease-out}
.dshwv-character[data-motion="tilt"]{transform:rotate(var(--dshwv-inward-angle,-5deg))}
.dshwv-character[data-motion="nod"]{animation:dshwv-nod .46s ease-in-out}
.dshwv-character[data-motion="sleep"]{animation:dshwv-doze 1s ease-in-out}
@keyframes dshwv-nod{0%,100%{transform:none}40%{transform:translateY(2%) scaleY(.96)}75%{transform:translateY(-.5%) scaleY(1.01)}}
@keyframes dshwv-doze{0%,100%{transform:none}25%,75%{transform:translateY(3%) rotate(-3deg) scaleY(.96)}}
.dshwv-character img{visibility:hidden;-webkit-user-drag:none}
.dshwv-character[data-face="normal"] img[data-variant="normal"],
.dshwv-character[data-face="closed"] img[data-variant="closed"],
.dshwv-character[data-face="smile"] img[data-variant="smile"]{visibility:visible}
@media(prefers-reduced-motion:reduce){.dshwv-character,.dshwv-press{animation:none!important;transition:none!important;transform:none!important}}
`

function createWhaleCharacter({ imageUrl, setTimeout, clearTimeout }) {
  const element = document.createElement('span')
  element.className = 'dshwv-img'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', 'DeepSeek 余额')
  const pressLayer = document.createElement('span')
  pressLayer.className = 'dshwv-press'
  const sprite = document.createElement('span')
  sprite.className = 'dshwv-character'
  sprite.setAttribute('aria-hidden', 'true')
  element.append(pressLayer)
  pressLayer.append(sprite)

  function frame(name, url) {
    const img = document.createElement('img')
    img.alt = ''
    img.draggable = false
    img.dataset.variant = name
    img.src = url
    sprite.append(img)
    return img
  }
  const frames = {
    normal: frame('normal', imageUrl),
    closed: frame('closed', '/dsh-whale/face-closed.png'),
    smile: frame('smile', '/dsh-whale/face-smile.png'),
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let timer
  let held = false
  let hovered = false
  let disposed = false

  function paused() {
    return held || disposed || document.hidden || reducedMotion.matches
  }

  function pose(motion, face = 'normal') {
    sprite.dataset.face = frames[face].naturalWidth > 0 ? face : 'normal'
    sprite.dataset.motion = motion
  }

  function rest() {
    clearTimeout(timer)
    pose('idle')
    if (paused()) return
    if (hovered) {
      timer = setTimeout(() => {
        const rect = element.getBoundingClientRect()
        const onLeft = rect.left + rect.width / 2 < window.innerWidth / 2
        const mirrored = !!element.closest('.dshwv-left')
        sprite.style.setProperty('--dshwv-inward-angle', onLeft !== mirrored ? '5deg' : '-5deg')
        pose('tilt')
      }, 350)
    } else {
      timer = setTimeout(() => {
        pose('blink', 'closed')
        timer = setTimeout(rest, 170)
      }, 5500 + Math.random() * 4000)
    }
  }

  function setHover(over) {
    if (hovered === over) return
    hovered = over
    if (sprite.dataset.motion !== 'nod' && sprite.dataset.motion !== 'sleep') rest()
  }

  function setHeld(value) {
    held = value
    hovered = false
    element.dataset.held = String(value)
    rest()
  }

  function dialogue(id) {
    if (paused()) return
    clearTimeout(timer)
    const sleep = id === 'daily-004'
    const motion = sleep ? 'sleep' : 'nod'
    if (sprite.dataset.motion === motion) {
      // Two consecutive clicks can select the same action.
      for (const animation of sprite.getAnimations()) {
        if (animation.animationName) animation.currentTime = 0
      }
    }
    const happy = id === 'daily-006' || id === 'rare-004'
    pose(motion, sleep ? 'closed' : happy ? 'smile' : 'normal')
    timer = setTimeout(rest, sleep ? 1000 : 460)
  }

  function resumeOrPause() {
    hovered = false
    rest()
  }
  function leave() { setHover(false) }
  function pointerOut(event) { if (!event.relatedTarget) leave() }
  document.addEventListener('visibilitychange', resumeOrPause)
  reducedMotion.addEventListener('change', resumeOrPause)
  document.addEventListener('pointerout', pointerOut)
  window.addEventListener('blur', leave)
  rest()

  return {
    element, setHover, setHeld, dialogue,
    dispose() {
      disposed = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', resumeOrPause)
      reducedMotion.removeEventListener('change', resumeOrPause)
      document.removeEventListener('pointerout', pointerOut)
      window.removeEventListener('blur', leave)
    },
  }
}
