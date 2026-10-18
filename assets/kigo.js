(() => {
  'use strict';
  const widget = document.querySelector('.daily-kigo');
  if (!widget) return;
  const data = JSON.parse(document.getElementById('kigo-data').textContent);
  const details = widget.querySelector('details');
  const summary = details.querySelector('summary');
  const dateNode = widget.querySelector('time');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const numerals = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const kanji = n => n < 10 ? numerals[n] : (n < 20 ? '十' : numerals[Math.floor(n / 10)] + '十') + numerals[n % 10];
  let timer;
  let currentKey;
  function update() {
    window.clearTimeout(timer);
    const now = new Date();
    const parts = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
    const key = `${parts.month}-${parts.day}`;
    if (currentKey !== key) {
      const entry = data[key];
      details.open = false;
      dateNode.textContent = `${kanji(Number(parts.month))}月${kanji(Number(parts.day))}日`;
      for (const field of ['term', 'reading', 'season', 'summary', 'scene']) {
        widget.querySelectorAll(`[data-kigo="${field}"]`).forEach(node => { node.textContent = entry[field]; });
      }
      widget.querySelector('[data-kigo="source"]').href = entry.source;
      currentKey = key;
      widget.dataset.kigoDate = key;
      widget.hidden = false;
    }
    // Keep the semantic date current even when revisiting the same month/day in another year.
    dateNode.dateTime = `${parts.year}-${key}`;
    const nextMidnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1) - 9 * 60 * 60 * 1000;
    timer = window.setTimeout(update, Math.max(1, nextMidnight - now.getTime()));
  }
  function close() {
    details.open = false;
    summary.focus();
  }
  widget.querySelector('.kigo-close').addEventListener('click', close);
  document.addEventListener('pointerdown', event => {
    if (details.open && !widget.contains(event.target)) details.open = false;
  });
  widget.addEventListener('keydown', event => {
    if (event.key === 'Escape' && details.open) { event.preventDefault(); close(); }
  });
  // Background tabs and restored pages may have had their timers suspended.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('pageshow', update);
  window.addEventListener('focus', update);
  update();
})();
