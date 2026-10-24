(() => {
  const controls = document.querySelector('.game-filters');
  if (!controls) return;
  const platform = document.querySelector('#game-platform');
  const companion = document.querySelector('#game-companion');
  const entries = [...document.querySelectorAll('.game-entry')];
  function update() {
    const ids = new Set();
    entries.forEach(entry => {
      entry.hidden = Boolean((platform.value && entry.dataset.platform !== platform.value) ||
        (companion.value && !JSON.parse(entry.dataset.companions).includes(companion.value)));
      if (!entry.hidden) ids.add(entry.querySelector('a').getAttribute('href'));
    });
    document.querySelectorAll('.game-period').forEach(section => {
      section.hidden = ![...section.querySelectorAll('.game-entry')].some(entry => !entry.hidden);
    });
    document.querySelector('#game-count').textContent = ids.size ? `${ids.size}作品を表示しています。` : '条件に合う作品はありません。';
  }
  platform.addEventListener('change', update);
  companion.addEventListener('change', update);
  document.querySelector('#game-reset').addEventListener('click', () => {
    platform.value = companion.value = '';
    update();
  });
  controls.hidden = false;
  update();
})();
