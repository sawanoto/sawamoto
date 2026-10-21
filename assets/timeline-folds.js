(() => {
  function revealLinkedItem() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id.startsWith('timeline-')) return;
    const target = document.getElementById(id);
    const fold = target?.closest('details.timeline-fold');
    if (fold && !fold.open) {
      fold.open = true;
      target.scrollIntoView();
    }
  }

  revealLinkedItem();
  window.addEventListener('hashchange', revealLinkedItem);
})();
