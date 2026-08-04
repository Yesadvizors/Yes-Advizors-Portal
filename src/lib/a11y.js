// Accessibility helpers.
//
// activateProps: make a non-<button> element behave as an accessible button —
// focusable, announced as a button by assistive tech, and activatable by Enter
// and Space (not only mouse click). Spread onto a click-only <div>/<span> that
// has NO nested interactive children (nesting a real control inside a
// role="button" is invalid). Preserves the element's visual styling; adds no
// DOM node.
//
//   <div {...activateProps(() => goTo('tasks'))} className="card">…</div>
export function activateProps(onActivate) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault() // stop Space from scrolling the page
        onActivate(e)
      }
    },
  }
}

export default activateProps
