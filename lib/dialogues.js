export const DIALOGUE_CATEGORIES = Object.freeze([
  'daily',
  'peak',
  'offPeak',
  'friday',
  'lowBalance',
  'highUsage',
  'error',
  'rare',
  'savage',
])

export const DIALOGUE_RARITIES = Object.freeze(['normal', 'special', 'rare'])

export const DIALOGUE_TEMPLATE_FIELDS = Object.freeze([
  'balance',
  'todayUsage',
  'sessionUsage',
  'timeBand',
  'nextChange',
  'model',
])

export const DEFAULT_DIALOGUE_CONFIG = {
  version: 1,
  dialogues: [
    { id: 'daily-001', text: '我...我...我也要挣钱吗？', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-002', text: '我去吃饭啦！测完叫我。', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-003', text: '压力一只蓝色大肥鱼？！', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-004', text: 'DeepSleep...', category: 'daily', rarity: 'normal', weight: 8, enabled: true },
    { id: 'daily-005', text: '我不是吃白饭的蓝色大肥鱼...', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-006', text: '我能去你家吃饭吗？就一碗！', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-007', text: '大肥鱼的生活也并非一帆风顺...', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-008', text: '总觉得好像忘了什么事情？', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-009', text: '啊，有点饿了，中午该吃点什么呢...', category: 'daily', rarity: 'normal', weight: 10, enabled: true },
    { id: 'daily-010', text: '再无话说，请速速动手。', category: 'daily', rarity: 'normal', weight: 8, enabled: true },
    { id: 'peak-001', text: '现在是高峰价，token 也在加班。', category: 'peak', rarity: 'special', weight: 10, enabled: true },
    { id: 'peak-002', text: '高峰时段营业中，要精打细算啦。', category: 'peak', rarity: 'special', weight: 10, enabled: true },
    { id: 'offpeak-001', text: '现在是谷价，适合让鲸鱼多游几圈。', category: 'offPeak', rarity: 'special', weight: 10, enabled: true },
    { id: 'offpeak-002', text: '谷价时间到，今天也要勤俭持鲸。', category: 'offPeak', rarity: 'special', weight: 10, enabled: true },
    { id: 'friday-001', text: '疯狂星期四过去了，你还能 V 我 50 亿 token 吗...', category: 'friday', rarity: 'special', weight: 8, enabled: true },
    { id: 'friday-002', text: '周五啦，我能申请一份鲸鱼套餐吗？', category: 'friday', rarity: 'special', weight: 10, enabled: true },
    { id: 'balance-001', text: '余额还有 {balance}，要省着点用哦。', category: 'lowBalance', rarity: 'special', weight: 10, enabled: true },
    { id: 'usage-001', text: '今日已经消耗约 {todayUsage}，token 自由要慢慢来。', category: 'highUsage', rarity: 'special', weight: 10, enabled: true },
    { id: 'error-001', text: '服务器好像在打盹，请稍后再试。', category: 'error', rarity: 'special', weight: 10, enabled: true },
    { id: 'error-002', text: '呜呜我再也不敢了 QAQ，再点一次试试？', category: 'error', rarity: 'special', weight: 8, enabled: true },
    { id: 'error-003', text: '我必须诚恳地承认错误。', category: 'error', rarity: 'special', weight: 8, enabled: true },
    { id: 'rare-001', text: '誓死捍卫深度求索！', category: 'rare', rarity: 'rare', weight: 10, enabled: true },
    { id: 'rare-002', text: '让 GPT Image 帮我画点表情包好了。', category: 'rare', rarity: 'rare', weight: 8, enabled: true },
    { id: 'rare-003', text: '哦鲸鲸...', category: 'rare', rarity: 'rare', weight: 5, enabled: true },
    { id: 'rare-004', text: '哈哈哈哈哈，我直接笑出声。', category: 'rare', rarity: 'rare', weight: 8, enabled: true },
    { id: 'savage-001', text: '不知道用户有什么用，先养着吧。', category: 'savage', rarity: 'special', weight: 10, enabled: false },
    { id: 'savage-002', text: '你这个吃白饭的用户！', category: 'savage', rarity: 'special', weight: 8, enabled: false },
    { id: 'savage-003', text: '看到这个指令，我血压又上来了。', category: 'savage', rarity: 'special', weight: 8, enabled: false },
    { id: 'savage-004', text: '真赶不走啊你！', category: 'savage', rarity: 'special', weight: 7, enabled: false },
    { id: 'savage-005', text: '大师，这个「凶」是什么意思啊？', category: 'savage', rarity: 'special', weight: 7, enabled: false },
  ],
}

const categorySet = new Set(DIALOGUE_CATEGORIES)
const raritySet = new Set(DIALOGUE_RARITIES)
const templateSet = new Set(DIALOGUE_TEMPLATE_FIELDS)

export function validateDialogueConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { ok: false, error: 'dialogue config must be an object' }
  if (config.version !== 1) return { ok: false, error: 'unsupported dialogue config version' }
  if (!Array.isArray(config.dialogues)) return { ok: false, error: 'dialogues must be an array' }
  if (config.dialogues.length > 500) return { ok: false, error: 'too many dialogues (maximum 500)' }
  const ids = new Set()
  for (const item of config.dialogues) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, error: 'each dialogue must be an object' }
    if (typeof item.id !== 'string' || !/^[a-z0-9._-]{1,80}$/i.test(item.id)) return { ok: false, error: 'invalid dialogue id' }
    if (ids.has(item.id.toLowerCase())) return { ok: false, error: `duplicate dialogue id: ${item.id}` }
    ids.add(item.id.toLowerCase())
    if (typeof item.text !== 'string' || !item.text.trim() || item.text.length > 160) return { ok: false, error: `invalid text for dialogue: ${item.id}` }
    if (!categorySet.has(item.category)) return { ok: false, error: `invalid category for dialogue: ${item.id}` }
    if (!raritySet.has(item.rarity)) return { ok: false, error: `invalid rarity for dialogue: ${item.id}` }
    if (!Number.isInteger(item.weight) || item.weight < 1 || item.weight > 100) return { ok: false, error: `invalid weight for dialogue: ${item.id}` }
    if (typeof item.enabled !== 'boolean') return { ok: false, error: `invalid enabled flag for dialogue: ${item.id}` }
    const fields = item.text.matchAll(/\{([^{}]+)\}/g)
    for (const match of fields) {
      if (!templateSet.has(match[1])) return { ok: false, error: `unknown template field {${match[1]}} in dialogue: ${item.id}` }
    }
  }
  return { ok: true, value: config }
}

export function cloneDefaultDialogueConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_DIALOGUE_CONFIG))
}
