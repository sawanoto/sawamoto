(() => {
  const node = document.getElementById('timeline-redirect-data');
  if (!node) return;
  const data = JSON.parse(node.textContent);
  function redirect() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    const target = Object.hasOwn(data.anchors, id) ? data.anchors[id] : data.target;
    if (target) location.replace(target);
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();
