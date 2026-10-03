/**
 * src/engine/loader.js - Level loader for Quriosity Parcel
 * Uses import.meta.glob to load levels, orders by src/levels/index.json,
 * skips missing files with console.warn, and tolerates missing optional fields.
 */

export function normalizeLevel(raw = {}) {
  const input = raw || {}
  const id = Number(input.id) || 1
  return {
    id,
    act: Number(input.act) || 1,
    tier: Number(input.tier) || 1,
    title: input.title || `Level ${id}`,
    mode: input.mode || 'pair',
    newWords: Array.isArray(input.newWords) ? input.newWords : [],
    tools: Array.isArray(input.tools)
      ? input.tools
      : Array.isArray(input.toolsAvailable)
        ? input.toolsAvailable
        : [],
    lenses: Array.isArray(input.lenses) ? input.lenses : ['ud'],
    lockedQubits: Array.isArray(input.lockedQubits) ? input.lockedQubits : [],
    start:
      input.start && typeof input.start === 'object'
        ? input.start
        : { kind: 'zero', t: 0 },
    phases: Array.isArray(input.phases) ? input.phases : ['alice'],
    transit:
      input.transit && typeof input.transit === 'object'
        ? input.transit
        : { spy: false, road: null },
    target:
      input.target && typeof input.target === 'object'
        ? input.target
        : { type: 'message', bits: '00' },
    par: typeof input.par === 'number' ? input.par : 2,
    goalLine: input.goalLine || '',
    hints: Array.isArray(input.hints) ? input.hints : [],
    events: input.events && typeof input.events === 'object' ? input.events : {},
    extra: input.extra && typeof input.extra === 'object' ? input.extra : {},
    physicsCheck: input.physicsCheck || null,
    removePhysicsNote: input.removePhysicsNote || '',
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
