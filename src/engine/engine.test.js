import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEngine, normalizeLevel, PROGRESS_STORAGE_KEY } from './index.js'
import testLevelFixture from '../fixtures/test-level.json'

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

      // First win: 2 moves (at par 2) -> 3 stars
      engine.applyTool('flip', 'A')
      engine.applyTool('flip', 'A')
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
        engine.applyTool('flip', 'A')
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
})
