(() => {
  const input = document.querySelector('#anime-search');
  if (!input) return;
  const search = document.querySelector('.anime-search');
  const sections = [...document.querySelectorAll('.anime-era')];
  const rows = [...document.querySelectorAll('[data-anime-title]')];
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, '');
  const filter = () => {
    const query = normalize(input.value);
    let count = 0;
    rows.forEach(row => {
      row.hidden = !normalize(row.dataset.animeTitle).includes(query);
      if (!row.hidden) count++;
    });
    sections.forEach(section => {
      section.hidden = ![...section.querySelectorAll('[data-anime-title]')].some(row => !row.hidden);
      section.querySelector('.anime-memory').hidden = Boolean(query);
    });
    document.querySelector('#anime-result').textContent = count ? `${count}作品を表示中` : '該当する作品はありません。作品名を変えて検索してください。';
  };
  search.hidden = false;
  input.addEventListener('input', filter);
  // Jump links always lead to a visible era, including after a search.
  document.querySelectorAll('.anime-jumps a').forEach(link => link.addEventListener('click', () => {
    input.value = '';
    filter();
  }));
  filter();
})();
