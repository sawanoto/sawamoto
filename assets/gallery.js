const viewer = document.querySelector('#photo-view');
if (viewer?.showModal) {
  document.querySelectorAll('.gallery-photo').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); viewer.querySelector('img').src = link.href; viewer.showModal();
  }));
  viewer.querySelector('button').onclick = () => viewer.close();
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
}

const galleryFilters = document.querySelector('.gallery-filters');
if (galleryFilters) {
  const buttons = [...galleryFilters.querySelectorAll('[data-gallery-category]')];
  const categories = buttons.map(button => button.dataset.galleryCategory);
  function selectCategory(category) {
    if (!categories.includes(category)) category = 'physical';
    buttons.forEach(button => {
      const selected = button.dataset.galleryCategory === category;
      button.setAttribute('aria-pressed', String(selected));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  function readCategory() {
    const url = new URL(location.href);
    const legacyCategory = url.hash.match(/^#(physical|digital|life)-gallery$/)?.[1];
    selectCategory(legacyCategory || url.searchParams.get('category') || (/\/gallery\/life\//.test(url.pathname) ? 'life' : 'physical'));
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.galleryCategory;
    selectCategory(category);
    const url = new URL(location.href);
    url.searchParams.set('category', category);
    if (/^#(physical|digital|life)-gallery$/.test(url.hash)) url.hash = '';
    history.replaceState(null, '', url);
  }));
  window.addEventListener('popstate', readCategory);
  window.addEventListener('hashchange', readCategory);
  readCategory();
  galleryFilters.hidden = false;
}
