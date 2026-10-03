import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEngine, normalizeLevel, PROGRESS_STORAGE_KEY } from './index.js'
import testLevelFixture from '../fixtures/test-level.json'
import * as sim from '../quantum/sim.js'

vi.mock('./loader.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadLevels: vi.fn(() => []),
  }
})

describe('Game Engine (src/engine/index.js)', () => {
  it('(a) getRenderState() has every key from section 3.4', () => {
    const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    const state = engine.getRenderState()

    const expectedKeys = [
      'levelId',
      'title',
      'goalLine',
      'mode',
      'tier',
      'newWords',
      'target',
      'phase',
      'state',
      'dial',
      'toolsAvailable',
      'lenses',
      'lockedQubits',
      'thread',
      'lights',
      'meters',
      'tally',
      'moveLog',
      'moveCount',
      'failureCount',
      'par',
      'stars',
      'extra',
      'status',
      'feedback',
      'score',
      'progress',
      'levels',
    ]

    expect(Object.keys(state)).toHaveLength(expectedKeys.length)
    for (const key of expectedKeys) {
      expect(state).toHaveProperty(key)
    }
  })

  it('(b) applyTool("flip", "B") on a locked Bob returns feedback.kind "blocked" and state does not change', () => {
    const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    const initialState = engine.getRenderState()

    expect(initialState.lockedQubits).toContain('B')

    engine.applyTool('flip', 'B')
    const afterState = engine.getRenderState()

    expect(afterState.feedback.kind).toBe('blocked')
    expect(afterState.feedback.text).toBe("Bob's twin is locked.")
    expect(afterState.failureCount).toBe(initialState.failureCount + 1)
    expect(afterState.moveCount).toBe(initialState.moveCount)
    expect(afterState.moveLog).toEqual(initialState.moveLog)
    expect(afterState.state).toEqual(initialState.state)
  })

  it('(c) flip then flip on Alice returns the state to the start', () => {
    const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    const startState = engine.getRenderState()

    engine.applyTool('flip', 'A')
    const midState = engine.getRenderState()
    expect(midState.moveCount).toBe(1)
    expect(midState.moveLog).toEqual(['flip'])

    engine.applyTool('flip', 'A')
    const endState = engine.getRenderState()
    expect(endState.moveCount).toBe(2)
    expect(endState.moveLog).toEqual(['flip', 'flip'])
    expect(endState.state).toEqual(startState.state)
  })

  it('(d) subscribe is called after each action and the unsubscribe function stops it', () => {
    const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    const listener = vi.fn()
    const unsubscribe = engine.subscribe(listener)

    expect(listener).not.toHaveBeenCalled()

    engine.applyTool('flip', 'A')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ moveCount: 1, moveLog: ['flip'] })
    )

    engine.send()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: 'transit' })
    )

    engine.deliver()
    expect(listener).toHaveBeenCalledTimes(3)
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: 'bob' })
    )

    unsubscribe()
    engine.reset()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('(e) stars follow the rule: 3 at or under par, 2 at up to 2x par, otherwise 1', () => {
    // par is 2 in testLevelFixture
    // Case 1: moveCount <= par (1 move <= 2 par) -> 3 stars
    const engine1 = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    engine1.applyTool('flip', 'A')
    expect(engine1.getRenderState().moveCount).toBe(1)
    engine1.submit()
    expect(engine1.getRenderState().status).toBe('won')
    expect(engine1.getRenderState().stars).toBe(3)

    // Case 2: moveCount <= par * 2 (3 moves <= 4) -> 2 stars
    const engine2 = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    engine2.applyTool('flip', 'A')
    engine2.applyTool('flip', 'A')
    engine2.applyTool('flip', 'A')
    expect(engine2.getRenderState().moveCount).toBe(3)
    engine2.submit()
    expect(engine2.getRenderState().status).toBe('won')
    expect(engine2.getRenderState().stars).toBe(2)

    // Case 3: moveCount > par * 2 (5 moves > 4) -> 1 star
    const engine3 = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    for (let i = 0; i < 5; i++) {
      engine3.applyTool('flip', 'A')
    }
    expect(engine3.getRenderState().moveCount).toBe(5)
    engine3.submit()
    expect(engine3.getRenderState().status).toBe('won')
    expect(engine3.getRenderState().stars).toBe(1)
  })

  it('(f) reset restores the start state', () => {
    const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
    const startState = engine.getRenderState()

    engine.applyTool('flip', 'A')
    engine.look('A', 'ud')
    engine.send()
    engine.deliver()

    const dirtyState = engine.getRenderState()
    expect(dirtyState.phase).toBe('bob')
    expect(dirtyState.moveCount).toBe(1)
    expect(dirtyState.moveLog).toEqual(['flip'])
    expect(dirtyState.tally.ud[0] + dirtyState.tally.ud[1]).toBeGreaterThan(0)

    engine.reset()
    const resetState = engine.getRenderState()

    expect(resetState.levelId).toBe(startState.levelId)
    expect(resetState.phase).toBe(startState.phase)
    expect(resetState.moveCount).toBe(0)
    expect(resetState.moveLog).toEqual([])
    expect(resetState.failureCount).toBe(0)
    expect(resetState.stars).toBe(0)
    expect(resetState.status).toBe('playing')
    expect(resetState.state).toEqual(startState.state)
    expect(resetState.tally).toEqual({ ud: [0, 0], side: [0, 0] })
    expect(resetState.feedback).toEqual({ kind: null, text: '' })
  })

  it('falls back to test-level.json and logs console.info when loader returns zero levels', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const engine = createEngine()
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to src/fixtures/test-level.json')
    )
    const state = engine.getRenderState()
    expect(state.levelId).toBe(14)
    expect(state.title).toBe('One-hand writing')

    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })

  describe('Progress Saving', () => {
    let mockStore = {}

    beforeEach(() => {
      mockStore = {}
      const mockStorage = {
        getItem: vi.fn((key) => mockStore[key] ?? null),
        setItem: vi.fn((key, val) => {
          mockStore[key] = String(val)
        }),
        removeItem: vi.fn((key) => {
          delete mockStore[key]
        }),
        clear: vi.fn(() => {
          mockStore = {}
        }),
      }
      vi.stubGlobal('localStorage', mockStorage)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('loads saved progress from localStorage under one key on createEngine', () => {
      mockStore[PROGRESS_STORAGE_KEY] = JSON.stringify({
        completedIds: [1, 2],
        starsById: { 1: 3, 2: 2 },
      })

      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      const state = engine.getRenderState()

      expect(localStorage.getItem).toHaveBeenCalledWith(PROGRESS_STORAGE_KEY)
      expect(state.progress.completedIds).toEqual([1, 2])
      expect(state.progress.starsById).toEqual({ 1: 3, 2: 2 })
    })

    it('updates progress on level win, saves to localStorage, and preserves best stars', () => {
      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })

      // First win: 1 move (at par 2) -> 3 stars
      engine.applyTool('twist', 'A')
      engine.submit()

      let state = engine.getRenderState()
      expect(state.status).toBe('won')
      expect(state.stars).toBe(3)
      expect(state.progress.completedIds).toContain(14)
      expect(state.progress.starsById[14]).toBe(3)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        PROGRESS_STORAGE_KEY,
        expect.stringContaining('"completedIds":[14]')
      )

      // Replay level: 5 moves (> 2 * par) -> 1 star
      engine.reset()
      for (let i = 0; i < 5; i++) {
        engine.applyTool('twist', 'A')
      }
      engine.submit()

      state = engine.getRenderState()
      expect(state.status).toBe('won')
      expect(state.stars).toBe(1)
      // Best stars should still be 3!
      expect(state.progress.starsById[14]).toBe(3)

      const savedData = JSON.parse(mockStore[PROGRESS_STORAGE_KEY])
      expect(savedData.starsById[14]).toBe(3)
    })

    it('handles localStorage throwing on read without crashing and uses safe defaults', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => {
          throw new Error('SecurityError: Access to localStorage is denied')
        }),
        setItem: vi.fn(),
      })

      let engine
      expect(() => {
        engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      }).not.toThrow()

      const state = engine.getRenderState()
      expect(state.progress.completedIds).toEqual([])
      expect(state.progress.starsById).toEqual({})
    })

    it('handles localStorage throwing on write without crashing and still updates in-memory progress', () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceededError: storage is full')
        }),
      })

      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      engine.applyTool('flip', 'A')

      expect(() => {
        engine.submit()
      }).not.toThrow()

      const state = engine.getRenderState()
      expect(state.status).toBe('won')
      expect(state.progress.completedIds).toContain(14)
      expect(state.progress.starsById[14]).toBe(3)
    })
  })

  describe('Feedback & Events (level.events and level.hints)', () => {
    it('sets "tool-blocked" feedback when a locked qubit refuses a tool', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        lockedQubits: ['B'],
        events: {
          'tool-blocked': 'Custom locked message: hands off Bob!',
        },
      })
      const engine = createEngine({ levels: [customLevel] })

      engine.applyTool('flip', 'B')
      const state = engine.getRenderState()
      expect(state.feedback).toEqual({
        kind: 'blocked',
        text: 'Custom locked message: hands off Bob!',
      })
      expect(state.failureCount).toBe(1)
    })

    it('sets "no-visible-change" feedback when a tool leaves lights or state unchanged', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        events: {
          'no-visible-change': 'Nothing shifted on the board.',
        },
      })
      const engine = createEngine({ levels: [customLevel] })

      const spy = vi.spyOn(sim, 'applyX').mockImplementation((s) => s)
      engine.applyTool('flip', 'A')
      const state = engine.getRenderState()
      expect(state.feedback).toEqual({
        kind: 'info',
        text: 'Nothing shifted on the board.',
      })
      spy.mockRestore()
    })

    it('clears feedback to null when a tool changes lights', () => {
      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      let callCount = 0
      const spy = vi.spyOn(sim, 'pairFacts').mockImplementation(() => {
        callCount++
        return callCount === 1
          ? { zz: 'agree', xx: 'agree' }
          : { zz: 'differ', xx: 'agree' }
      })

      engine.applyTool('flip', 'A')
      const state = engine.getRenderState()
      expect(state.feedback).toEqual({
        kind: null,
        text: '',
      })
      spy.mockRestore()
    })

    it('sets "no-visible-change" feedback when a tool leaves state unchanged in non-pair mode', () => {
      const dialLevel = normalizeLevel({
        ...testLevelFixture,
        mode: 'dial',
        start: { kind: 'dial', t: 45 },
        events: {
          'no-visible-change': 'State did not change.',
        },
      })
      const engine = createEngine({ levels: [dialLevel] })

      const spy = vi.spyOn(sim, 'applyX').mockImplementation((s) => s)
      engine.applyTool('flip', 'A')
      expect(engine.getRenderState().feedback).toEqual({
        kind: 'info',
        text: 'State did not change.',
      })
      spy.mockRestore()
    })

    it('clears feedback to null when a tool changes state in non-pair mode', () => {
      const dialLevel = normalizeLevel({
        ...testLevelFixture,
        mode: 'dial',
        start: { kind: 'dial', t: 45 },
        events: {
          'no-visible-change': 'State did not change.',
        },
      })
      const engine = createEngine({ levels: [dialLevel] })

      const spy = vi.spyOn(sim, 'applyX').mockReturnValue([0, 1, 0, 0])
      engine.applyTool('flip', 'A')
      expect(engine.getRenderState().feedback).toEqual({
        kind: null,
        text: '',
      })
      spy.mockRestore()
    })

    it('sets "wrong-result" feedback and increments failureCount on a failed submit', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        events: {
          'wrong-result': 'Message mismatch: try again!',
        },
        hints: [
          { afterFailures: 3, text: 'Some hint' },
        ],
      })
      const failChecker = {
        check: vi.fn(() => ({ ok: false, detail: 'Failed test check' })),
      }
      const engine = createEngine({
        levels: [customLevel],
        checker: failChecker,
      })

      engine.submit({ answer: 'wrong' })
      const state = engine.getRenderState()
      expect(state.status).toBe('playing')
      expect(state.failureCount).toBe(1)
      expect(state.feedback).toEqual({
        kind: 'info',
        text: 'Message mismatch: try again!',
      })
    })

    it('sets "win" feedback on successful submit', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        events: {
          win: 'Success! Parcel safely transmitted!',
        },
      })
      const passChecker = {
        check: vi.fn(() => ({ ok: true, detail: 'Passed' })),
      }
      const engine = createEngine({
        levels: [customLevel],
        checker: passChecker,
      })

      engine.submit()
      const state = engine.getRenderState()
      expect(state.status).toBe('won')
      expect(state.feedback).toEqual({
        kind: 'info',
        text: 'Success! Parcel safely transmitted!',
      })
    })

    it('shows a hint when failureCount reaches its afterFailures value', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        events: {
          'wrong-result': 'Wrong answer.',
        },
        hints: [
          { afterFailures: 2, text: 'Hint: Remember to twist before sending!' },
        ],
      })
      const failChecker = {
        check: vi.fn(() => ({ ok: false, detail: 'Failed' })),
      }
      const engine = createEngine({
        levels: [customLevel],
        checker: failChecker,
      })

      // 1st failure: failureCount = 1 (< afterFailures 2) -> shows wrong-result
      engine.submit()
      expect(engine.getRenderState().failureCount).toBe(1)
      expect(engine.getRenderState().feedback).toEqual({
        kind: 'info',
        text: 'Wrong answer.',
      })

      // 2nd failure: failureCount reaches 2 (equals afterFailures 2) -> shows hint!
      engine.submit()
      expect(engine.getRenderState().failureCount).toBe(2)
      expect(engine.getRenderState().feedback).toEqual({
        kind: 'hint',
        text: 'Hint: Remember to twist before sending!',
      })
    })

    it('shows hint when failureCount reaches afterFailures via locked tool refusal', () => {
      const customLevel = normalizeLevel({
        ...testLevelFixture,
        lockedQubits: ['B'],
        events: {
          'tool-blocked': 'Locked!',
        },
        hints: [
          { afterFailures: 1, text: 'Hint: You cannot touch twin B.' },
        ],
      })
      const engine = createEngine({ levels: [customLevel] })

      // 1st failure directly reaches afterFailures = 1
      engine.applyTool('flip', 'B')
      expect(engine.getRenderState().failureCount).toBe(1)
      expect(engine.getRenderState().feedback).toEqual({
        kind: 'hint',
        text: 'Hint: You cannot touch twin B.',
      })
    })
  })

  describe('Transit Road Application in deliver()', () => {
    it('applies sim.applyX on qubit A when transit.road is "X"', () => {
      const applyXSpy = vi.spyOn(sim, 'applyX')
      const applyZSpy = vi.spyOn(sim, 'applyZ')

      const levelWithX = normalizeLevel({
        ...testLevelFixture,
        transit: { spy: false, road: 'X' },
      })
      const engine = createEngine({ levels: [levelWithX] })

      engine.send()
      expect(engine.getRenderState().phase).toBe('transit')

      engine.deliver()
      expect(engine.getRenderState().phase).toBe('bob')
      expect(applyXSpy).toHaveBeenCalledWith(expect.any(Array), 'A')
      expect(applyZSpy).not.toHaveBeenCalled()

      applyXSpy.mockRestore()
      applyZSpy.mockRestore()
    })

    it('applies sim.applyZ on qubit A when transit.road is "Z"', () => {
      const applyXSpy = vi.spyOn(sim, 'applyX')
      const applyZSpy = vi.spyOn(sim, 'applyZ')

      const levelWithZ = normalizeLevel({
        ...testLevelFixture,
        transit: { spy: false, road: 'Z' },
      })
      const engine = createEngine({ levels: [levelWithZ] })

      engine.send()
      engine.deliver()
      expect(engine.getRenderState().phase).toBe('bob')
      expect(applyZSpy).toHaveBeenCalledWith(expect.any(Array), 'A')
      expect(applyXSpy).not.toHaveBeenCalled()

      applyXSpy.mockRestore()
      applyZSpy.mockRestore()
    })

    it('applies sim.applyX and sim.applyZ on qubit A when transit.road is "XZ"', () => {
      const applyXSpy = vi.spyOn(sim, 'applyX')
      const applyZSpy = vi.spyOn(sim, 'applyZ')

      const levelWithXZ = normalizeLevel({
        ...testLevelFixture,
        transit: { spy: false, road: 'XZ' },
      })
      const engine = createEngine({ levels: [levelWithXZ] })

      engine.send()
      engine.deliver()
      expect(engine.getRenderState().phase).toBe('bob')
      expect(applyXSpy).toHaveBeenCalledWith(expect.any(Array), 'A')
      expect(applyZSpy).toHaveBeenCalledWith(expect.any(Array), 'A')

      applyXSpy.mockRestore()
      applyZSpy.mockRestore()
    })
  })

  describe('Look Actor Implied From Phase', () => {
    it('implies actor "alice" in alice phase', () => {
      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      expect(engine.getRenderState().phase).toBe('alice')

      const result = engine.look('A', 'ud')
      expect(result.actor).toBe('alice')
      expect(result.qubit).toBe('A')
      expect(result.lens).toBe('ud')
    })

    it('implies actor "spy" in transit phase', () => {
      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      engine.send()
      expect(engine.getRenderState().phase).toBe('transit')

      const result = engine.look()
      expect(result.actor).toBe('spy')
      expect(result.qubit).toBe('A')
    })

    it('implies actor "bob" in bob phase', () => {
      const engine = createEngine({ levels: [normalizeLevel(testLevelFixture)] })
      engine.send()
      engine.deliver()
      expect(engine.getRenderState().phase).toBe('bob')

      const result = engine.look()
      expect(result.actor).toBe('bob')
      expect(result.qubit).toBe('B')
    })
  })
})
