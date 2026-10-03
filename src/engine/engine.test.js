import { describe, it, expect, vi } from 'vitest'
import { createEngine, normalizeLevel } from './index.js'
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
})
