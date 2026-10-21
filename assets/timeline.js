(() => {
  const controls = document.querySelector('.timeline-controls');
  if (!controls) return;

  const buttons = [...controls.querySelectorAll('[data-timeline-filter]')];
  const items = [...document.querySelectorAll('.timeline-item[data-importance]')];
  let mode = 'major';

  function show(modeToShow) {
    mode = modeToShow;
    for (const item of items) {
      item.hidden = mode === 'major' && item.dataset.importance !== 'major'
        || mode === 'medium' && item.dataset.importance === 'minor';
    }
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.timelineFilter === mode));
    }
  }

  function revealLinkedItem() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = items.find((item) => item.id === id);
    if (target && target.hidden) show('all');
  }

  controls.hidden = false;
  show(mode);
  revealLinkedItem();
  controls.addEventListener('click', (event) => {
    const button = event.target.closest('[data-timeline-filter]');
    if (button && controls.contains(button)) show(button.dataset.timelineFilter);
  });
  window.addEventListener('hashchange', revealLinkedItem);
})();
