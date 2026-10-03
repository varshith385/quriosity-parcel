/**
 * src/engine/loader.js - Level loader for Quriosity Parcel
 * Uses import.meta.glob to load levels, orders by src/levels/index.json,
 * skips missing files with console.warn, and tolerates missing optional fields.
 */

export function normalizeLevel(raw = {}) {
  const id = Number(raw.id) || 1
  return {
    id,
    act: Number(raw.act) || 1,
    tier: Number(raw.tier) || 1,
    title: raw.title || `Level ${id}`,
    mode: raw.mode || 'pair',
    newWords: Array.isArray(raw.newWords) ? raw.newWords : [],
    tools: Array.isArray(raw.tools)
      ? raw.tools
      : Array.isArray(raw.toolsAvailable)
        ? raw.toolsAvailable
        : [],
    lenses: Array.isArray(raw.lenses) ? raw.lenses : ['ud'],
    lockedQubits: Array.isArray(raw.lockedQubits) ? raw.lockedQubits : [],
    start:
      raw.start && typeof raw.start === 'object'
        ? raw.start
        : { kind: 'zero', t: 0 },
    phases: Array.isArray(raw.phases) ? raw.phases : ['alice'],
    transit:
      raw.transit && typeof raw.transit === 'object'
        ? raw.transit
        : { spy: false, road: null },
    target:
      raw.target && typeof raw.target === 'object'
        ? raw.target
        : { type: 'message', bits: '00' },
    par: typeof raw.par === 'number' ? raw.par : 2,
    goalLine: raw.goalLine || '',
    hints: Array.isArray(raw.hints) ? raw.hints : [],
    events: raw.events && typeof raw.events === 'object' ? raw.events : {},
    extra: raw.extra && typeof raw.extra === 'object' ? raw.extra : {},
    physicsCheck: raw.physicsCheck || null,
    removePhysicsNote: raw.removePhysicsNote || '',
  }
}

export function loadLevels(customModules) {
  const modules =
    customModules ||
    import.meta.glob('../levels/*.json', { eager: true })

  // Find index.json to determine play order
  let order = null
  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith('index.json')) {
      const content = mod && mod.default !== undefined ? mod.default : mod
      if (content && Array.isArray(content.order)) {
        order = content.order
      }
    }
  }

  // Fallback to default play order 1..20 if index.json is missing or lacks order
  const effectiveOrder =
    order || Array.from({ length: 20 }, (_, i) => i + 1)

  // Map available level files by their level id
  const levelsById = new Map()
  for (const [path, mod] of Object.entries(modules)) {
    if (path.endsWith('index.json')) continue
    const content = mod && mod.default !== undefined ? mod.default : mod
    if (content && typeof content === 'object') {
      let id = content.id
      if (id === undefined) {
        const match = path.match(/(\d+)\.json$/)
        if (match) {
          id = parseInt(match[1], 10)
        }
      }
      if (id !== undefined) {
        levelsById.set(Number(id), normalizeLevel({ ...content, id: Number(id) }))
      }
    }
  }

  // Order levels by index.json order, skipping missing files with console.warn
  const orderedLevels = []
  for (const id of effectiveOrder) {
    const numId = Number(id)
    if (levelsById.has(numId)) {
      orderedLevels.push(levelsById.get(numId))
    } else {
      console.warn(`Level ${numId} not found, skipping.`)
    }
  }

  return orderedLevels
}
