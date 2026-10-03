import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'

describe('FakeEngine for Level 16', () => {
  let engine

  beforeEach(() => {
    engine = createFakeEngine({ levelId: 16 })
  })

  it('solved path ends in won status with all decoded matching', () => {
    // 4 deliveries
    for (let i = 0; i < 4; i++) {
      engine.applyTool('linker', 'A')
      engine.applyTool('lens', 'A')
      engine.look('A', 'ud')
      engine.look('B', 'ud')
    }

    const state = engine.getRenderState()
    expect(state.status).toBe('won')
    expect(state.extra.decoded).toEqual(['10', '01', '00', '11'])
  })

  it('looking twice at the same twin does not change the reading', () => {
    engine.applyTool('linker', 'A')
    engine.applyTool('lens', 'A')
    
    engine.look('A', 'ud')
    const state1 = engine.getRenderState()
    const readingA1 = state1.extra.readings.A
    
    // look again at A
    engine.look('A', 'ud')
    const state2 = engine.getRenderState()
    expect(state2.extra.readings.A).toBe(readingA1)
    expect(state2.feedback.text).toContain('already read')
  })

  it('renderState does not leak answers or have messages', () => {
    const state = engine.getRenderState()
    const str = JSON.stringify(state)
    
    expect(str).not.toContain('"messages":')
    expect(state.extra.messages).toBeUndefined()
  })
})
