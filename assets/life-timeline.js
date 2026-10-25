(() => {
  const root = document.querySelector('.life-timeline');
  if (!root) return;
  const filters = root.querySelector('.life-filters');
  const buttons = [...filters.querySelectorAll('[data-genre]')];
  const records = [...root.querySelectorAll('[data-life-record]')];
  const notes = [...root.querySelectorAll('[data-life-note]')];
  const years = [...root.querySelectorAll('[data-year]')];
  let selected = 'all';
  const validGenre = genre => buttons.some(button => button.dataset.genre === genre) ? genre : 'all';
  function select(genre, updateURL = true) {
    selected = validGenre(genre);
    const matches = item => selected === 'all' || item.dataset.genres.split(' ').includes(selected);
    [...records, ...notes].forEach(item => { item.hidden = !matches(item); });
    years.forEach(year => {
      year.hidden = ![...year.querySelectorAll('[data-life-record], [data-life-note]')].some(item => !item.hidden);
      const jump = root.querySelector(`[data-year-jump="${year.dataset.year}"]`);
      if (jump) jump.closest('li').hidden = year.hidden;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.genre === selected)));
    const count = records.filter(record => !record.hidden).length;
    const label = buttons.find(button => button.dataset.genre === selected).textContent;
    root.querySelector('[data-timeline-status]').textContent = `${label}：${count}件`;
    root.querySelector('[data-timeline-empty]').hidden = count !== 0;
    root.querySelector('.life-context').hidden = ![...root.querySelectorAll('.life-context [data-life-note]')].some(note => !note.hidden);
    if (updateURL) {
      const url = new URL(location.href);
      if (selected === 'all') url.searchParams.delete('genre');
      else url.searchParams.set('genre', selected);
      const target = hashTarget();
      if (target?.closest('[hidden]')) url.hash = '';
      history.replaceState(null, '', url);
    }
  }
  function hashTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return null; }
    let target = document.getElementById(id);
    // Keep bookmarks made with the earlier local life-only implementation usable.
    if (!target && id.startsWith('timeline-')) target = document.getElementById(`life-${id.slice(9)}`);
    return target && root.contains(target) ? target : null;
  }
  function revealHash() {
    const target = hashTarget();
    if (!target) return;
    if (target.closest('[hidden]')) select('all');
    if (target.matches('details')) {
      target.open = true;
      target.querySelector('summary').focus({preventScroll:true});
    }
    target.scrollIntoView({block:'start'});
  }
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.genre)));
  root.querySelectorAll('[data-life-related]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    history.pushState(null, '', link.getAttribute('href'));
    revealHash();
  }));
  select(new URL(location.href).searchParams.get('genre'), false);
  filters.hidden = false;
  revealHash();
  window.addEventListener('hashchange', revealHash);
  window.addEventListener('popstate', () => {
    select(new URL(location.href).searchParams.get('genre'), false);
    revealHash();
  });
})();
