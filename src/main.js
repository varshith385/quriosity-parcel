import { createEngine } from './engine/index.js'
import { mountUI } from './ui/index.js'

const engine = createEngine()
mountUI(document.getElementById('app'), engine)
