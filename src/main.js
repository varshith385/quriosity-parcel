import './style.css'
import { mountUI } from './ui/index.js'
import { createFakeEngine } from './ui/fakeEngine.js'

const engine = createFakeEngine()
mountUI(document.getElementById('app'), engine)
