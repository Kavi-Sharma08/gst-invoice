/**
 * Ripple utility – shared by all landing page buttons.
 * Uses the lp-ripple-out keyframe defined in LandingPage's <style>.
 */
export function addRipple(e, el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const d = Math.max(rect.width, rect.height) * 2;
  const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
  const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
  const span = document.createElement('span');
  const color = getComputedStyle(el).color;
  span.style.cssText = `
    position:absolute;border-radius:50%;
    width:${d}px;height:${d}px;
    left:${x - d / 2}px;top:${y - d / 2}px;
    background:${color};opacity:0.3;
    transform:scale(0);
    animation:lp-ripple-out 0.65s ease-out forwards;
    pointer-events:none;
  `;
  el.appendChild(span);
  setTimeout(() => span.remove(), 700);
}
