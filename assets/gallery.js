const viewer = document.querySelector('#photo-view');
if (viewer?.showModal) {
  document.querySelectorAll('.gallery-photo').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); viewer.querySelector('img').src = link.href; viewer.showModal();
  }));
  viewer.querySelector('button').onclick = () => viewer.close();
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
}
