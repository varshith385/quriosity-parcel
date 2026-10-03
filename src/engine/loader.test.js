import { describe, it, expect, vi } from 'vitest'
import { loadLevels, normalizeLevel } from './loader.js'
import testLevelFixture from '../fixtures/test-level.json'

describe('Level Loader (src/engine/loader.js)', () => {
  it('(a) returns levels in the order given by index.json', () => {
    const fakeModules = {
      '../levels/05.json': { id: 5, title: 'Two lenses', mode: 'dial' },
      '../levels/14.json': { id: 14, title: 'One-hand writing', mode: 'pair' },
      '../levels/02.json': { id: 2, title: 'Two bits, two parcels', mode: 'post' },
      '../levels/index.json': { order: [14, 2, 5] },
    }

    const levels = loadLevels(fakeModules)
    expect(levels.map((l) => l.id)).toEqual([14, 2, 5])
    expect(levels[0].title).toBe('One-hand writing')
    expect(levels[1].title).toBe('Two bits, two parcels')
    expect(levels[2].title).toBe('Two lenses')
  })

  it('(b) skips an id listed in index.json with no matching file with console.warn and does not throw', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const fakeModulesWithMissing = {
      '../levels/index.json': { order: [14, 99, 100] },
      '../levels/14.json': { id: 14, title: 'One-hand writing', mode: 'pair' },
    }

    let levels
    expect(() => {
      levels = loadLevels(fakeModulesWithMissing)
    }).not.toThrow()

    expect(levels.map((l) => l.id)).toEqual([14])
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Level 99 not found'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Level 100 not found'))

    warnSpy.mockRestore()
  })

  it('(c) loads src/fixtures/test-level.json with section 3.2 fields and tolerates missing optional fields', () => {
    // 1. Verify test-level.json loads correctly with all section 3.2 fields
    const normalized = normalizeLevel(testLevelFixture)
    expect(normalized.id).toBe(14)
    expect(normalized.act).toBe(4)
    expect(normalized.tier).toBe(1)
    expect(normalized.title).toBe('One-hand writing')
    expect(normalized.mode).toBe('pair')
    expect(normalized.newWords).toEqual(['flip', 'twist'])
    expect(normalized.tools).toEqual(['flip', 'twist'])
    expect(normalized.lenses).toEqual(['ud'])
    expect(normalized.lockedQubits).toEqual(['B'])
    expect(normalized.start).toEqual({ kind: 'pair', t: 0 })
    expect(normalized.phases).toEqual(['alice'])
    expect(normalized.transit).toEqual({ spy: false, road: null })
    expect(normalized.target).toEqual({ type: 'message', bits: '10' })
    expect(normalized.par).toBe(2)
    expect(normalized.goalLine).toBe('Make the lights match the message.')
    expect(normalized.hints).toHaveLength(1)
    expect(normalized.events['tool-blocked']).toBe("Bob's twin is locked.")
    expect(normalized.physicsCheck).toBe('check-03')
    expect(normalized.removePhysicsNote).toContain('Without the pair')

    // 2. Verify missing optional fields do not throw and fall back to safe defaults
    const bareLevel = { id: 7 }
    let bareNormalized
    expect(() => {
      bareNormalized = normalizeLevel(bareLevel)
    }).not.toThrow()

    expect(bareNormalized.id).toBe(7)
    expect(bareNormalized.act).toBe(1)
    expect(bareNormalized.tier).toBe(1)
    expect(bareNormalized.title).toBe('Level 7')
    expect(bareNormalized.mode).toBe('pair')
    expect(bareNormalized.newWords).toEqual([])
    expect(bareNormalized.tools).toEqual([])
    expect(bareNormalized.lenses).toEqual(['ud'])
    expect(bareNormalized.lockedQubits).toEqual([])
    expect(bareNormalized.start).toEqual({ kind: 'zero', t: 0 })
    expect(bareNormalized.phases).toEqual(['alice'])
    expect(bareNormalized.transit).toEqual({ spy: false, road: null })
    expect(bareNormalized.target).toEqual({ type: 'message', bits: '00' })
    expect(bareNormalized.par).toBe(2)
    expect(bareNormalized.goalLine).toBe('')
    expect(bareNormalized.hints).toEqual([])
    expect(bareNormalized.events).toEqual({})
    expect(bareNormalized.extra).toEqual({})
    expect(bareNormalized.physicsCheck).toBeNull()
    expect(bareNormalized.removePhysicsNote).toBe('')

    // Edge case: null or empty input
    expect(() => normalizeLevel({})).not.toThrow()
    expect(() => normalizeLevel(null)).not.toThrow()
  })

  it('runs against actual glob without crashing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => loadLevels()).not.toThrow()
    warnSpy.mockRestore()
  })
})
