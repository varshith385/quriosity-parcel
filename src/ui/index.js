/**
 * src/ui/index.js - STUB (Role 3 UI)
 * Exact signature from section 3.3 of ROLES.md
 * Prints the render state as JSON in the root element.
 */

export function mountUI(root, engine) {
  if (!root) {
    return () => {}
  }

  function render(state) {
    root.innerHTML = `<pre id="render-state">${JSON.stringify(state, null, 2)}</pre>`
  }

  render(engine.getRenderState())
  const unsubscribe = engine.subscribe(render)
  return unsubscribe
}
