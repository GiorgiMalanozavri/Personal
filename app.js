const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));

function select(tab) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', String(active));
  });
  panels.forEach((p) => {
    const active = p.id === tab.getAttribute('aria-controls');
    p.classList.toggle('is-active', active);
    p.hidden = !active;
  });
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  // arrow-key navigation across the tablist
  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    next.focus();
    select(next);
  });
});
