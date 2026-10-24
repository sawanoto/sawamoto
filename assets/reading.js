(() => {
  const form = document.querySelector('.reading-controls');
  if (!form) return;
  const container = document.querySelector('#reading-groups');
  const records = [...container.querySelectorAll('.reading-record')];
  const periods = ['幼少期', '小学生', '中学生', '高校生', '大学生', '社会人', '時期不明'];
  const genres = ['SF', '海外文学', '日本文学', '歴史小説', 'ライトノベル', 'ノンフィクション', '思想・社会', 'その他'];
  const get = key => document.querySelector(`#reading-${key}`).value;
  const normalize = text => text.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim();
  function render() {
    const byGenre = get('view') === 'genre';
    const terms = normalize(get('search')).split(' ').filter(Boolean);
    const matches = records.filter(record =>
      (!get('period') || record.dataset.period === get('period')) &&
      (!get('genre') || JSON.parse(record.dataset.genres).includes(get('genre'))) &&
      (!get('status') || record.dataset.status === get('status')) &&
      terms.every(term => normalize(record.dataset.search).includes(term)));
    const fragment = document.createDocumentFragment();
    for (const label of byGenre ? genres : periods) {
      const items = matches.filter(record => byGenre ?
        (JSON.parse(record.dataset.genres)[0] || 'その他') === label : record.dataset.period === label);
      if (!items.length) continue;
      const section = document.createElement('section');
      section.className = 'reading-group';
      const heading = document.createElement('h3');
      heading.textContent = label;
      const grid = document.createElement('div');
      grid.className = 'reading-grid';
      grid.append(...items);
      section.append(heading, grid);
      fragment.append(section);
    }
    container.replaceChildren(fragment);
    document.querySelector('#reading-result').textContent = matches.length ? `表示中の記録：${matches.length}件（シリーズを含む）` : '条件に合う記録がありません。検索語や絞り込み条件を変更してください。';
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('reset', () => setTimeout(render, 0));
  function revealHash() {
    const record = records.find(item => `#${item.id}` === location.hash);
    if (!record) return;
    if (!record.isConnected) {
      form.querySelectorAll('select').forEach(select => { select.selectedIndex = 0; });
      document.querySelector('#reading-search').value = '';
      render();
    }
    record.scrollIntoView();
    record.tabIndex = -1;
    record.focus({preventScroll: true});
  }
  window.addEventListener('hashchange', revealHash);
  document.querySelectorAll('[data-reading-link]').forEach(link => link.addEventListener('click', () => {
    if (location.hash === link.hash) revealHash();
  }));
  form.hidden = false;
  render();
  if (location.hash) revealHash();
})();
