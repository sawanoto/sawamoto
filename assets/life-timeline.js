(() => {
  const root = document.querySelector('.life-timeline');
  if (!root) return;
  const filters = root.querySelector('.life-filters');
  const buttons = [...filters.querySelectorAll('[data-genre]')];
  const records = [...root.querySelectorAll('[data-life-record]')];
  const entries = [...root.querySelectorAll('[data-life-item]')];
  const notes = [...root.querySelectorAll('[data-life-note]')];
  const years = [...root.querySelectorAll('[data-year]')];
  let selected = 'life';
  let importance = 'medium';
  const importanceControls = root.querySelector('.life-importance');
  const importanceButtons = [...importanceControls.querySelectorAll('[data-importance-filter]')];
  const descriptions = {
    life: '人生の節目や経験を一件ずつ表示しています。重要度は、大：人生に大きな影響を与えた出来事、中：印象に残る経験や挑戦、小：小さな出来事や日々の記録です。',
    anime: 'アニメの記録です。まとまりを開くと、その頃の思い出と作品が読めます。アニメ映画は映画タブに掲載しています。',
    movie: '映画の記録です。アニメ映画も含め、まとまりを開くと作品と感想が読めます。',
    reading: '読書の記録です。まとまりを開くと、本とその頃の思い出が読めます。',
    game: 'ゲームの記録です。まとまりを開くと、作品とその頃の思い出が読めます。'
  };
  const validGenre = genre => buttons.some(button => button.dataset.genre === genre) ? genre : 'life';
  function select(genre, updateURL = true) {
    selected = validGenre(genre);
    const matches = item => item.dataset.category === selected && (selected !== 'life' || importance === 'all' || item.dataset.importance === 'major' || (importance === 'medium' && item.dataset.importance === 'medium'));
    records.forEach(item => { item.hidden = !matches(item); });
    notes.forEach(item => { item.hidden = !item.dataset.genres.split(' ').includes(selected); });
    entries.forEach(entry => {
      if (entry.dataset.entryKind === 'hobby') {
        const members = [...entry.querySelectorAll('[data-life-record]')].filter(record => !record.hidden);
        entry.hidden = members.length === 0;
        entry.querySelector('[data-group-count]').textContent = `${members.length}記録`;
      }
    });
    years.forEach(year => {
      year.hidden = ![...year.querySelectorAll('[data-life-item]')].some(item => !item.hidden);
      const jump = root.querySelector(`[data-year-jump="${year.dataset.year}"]`);
      if (jump) jump.closest('li').hidden = year.hidden;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.genre === selected)));
    importanceControls.hidden = selected !== 'life';
    importanceButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.importanceFilter === importance)));
    root.querySelector('[data-category-description]').textContent = descriptions[selected] || `${buttons.find(button => button.dataset.genre === selected).textContent}の記録です。`;
    const count = records.filter(record => !record.hidden).length;
    const label = buttons.find(button => button.dataset.genre === selected).textContent + (selected === 'life' ? `（${importanceButtons.find(button => button.dataset.importanceFilter === importance).textContent}）` : '');
    root.querySelector('[data-timeline-status]').textContent = `${label}：${entries.filter(entry => !entry.hidden).length}項目（${count}記録）`;
    root.querySelector('[data-timeline-empty]').hidden = count !== 0;
    root.querySelector('.life-context').hidden = ![...root.querySelectorAll('.life-context [data-life-note]')].some(note => !note.hidden);
    if (updateURL) {
      const url = new URL(location.href);
      if (selected === 'life') url.searchParams.delete('genre');
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
    if (target?.matches('[data-life-note-anchor]')) {
      target = target.closest('details') || document.getElementById('life-context-heading');
    }
    return target && root.contains(target) ? target : null;
  }
  function revealHash() {
    const target = hashTarget();
    if (!target) return;
    if (target.closest('[hidden]')) {
      const record = target.closest('[data-life-record]');
      const category = record?.dataset.category || target.closest('[data-genres]')?.dataset.genres.split(' ').find(genre => buttons.some(button => button.dataset.genre === genre));
      if (record?.dataset.category === 'life') {
        if (record.dataset.importance === 'minor') importance = 'all';
        else if (importance === 'major' && record.dataset.importance !== 'major') importance = 'medium';
      }
      select(category || 'life', false);
    }
    // A work's permalink must reveal its enclosing hobby group as well.
    let ancestor = target.closest('details');
    while (ancestor && root.contains(ancestor)) {
      ancestor.open = true;
      ancestor = ancestor.parentElement.closest('details');
    }
    if (target.matches('details')) {
      target.querySelector('summary').focus({preventScroll:true});
    }
    target.scrollIntoView({block:'start'});
  }
  importanceButtons.forEach(button => button.addEventListener('click', () => {
    importance = button.dataset.importanceFilter;
    select(selected);
  }));
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.genre)));
  root.querySelectorAll('[data-life-related], [data-life-permalink]').forEach(link => link.addEventListener('click', event => {
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
