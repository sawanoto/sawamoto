/* Progressive enhancement: the generated document remains readable in Japanese. */
(() => {
  'use strict';
  const data = document.getElementById('home-i18n');
  if (!data) return;
  const { strings, title } = JSON.parse(data.textContent);
  const storageKey = 'sawamoto.language';
  const controls = document.querySelector('.language-switch');
  const hasJapanese = text => /[\u3000-\u9fff\uff00-\uffef]/u.test(text);
  const translate = text => strings[text] || text.split(' · ').map(part => strings[part] || part).join(' · ');
  const texts = [];
  const attributes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script, style, .language-switch')) continue;
    const original = node.textContent;
    const trimmed = original.trim();
    if (translate(trimmed) !== trimmed) texts.push({node, original, trimmed});
  }
  document.querySelectorAll('[aria-label], [title], img[alt]').forEach(node => {
    for (const name of ['aria-label', 'title', 'alt']) {
      const original = node.getAttribute(name);
      if (original && strings[original]) attributes.push({node, name, original});
    }
  });
  // Content and proper names without translations keep their correct reading language.
  document.querySelectorAll('.brand, h1, .footer > span, .card h3, .card-body > p, .daily-kigo time, [data-kigo]').forEach(node => {
    if (hasJapanese(node.textContent) || node.hasAttribute('data-kigo')) node.lang = 'ja';
  });
  const notes = [];
  document.querySelectorAll('.card-body').forEach(node => {
    const note = document.createElement('small');
    note.className = 'content-language';
    note.lang = 'en';
    note.textContent = 'Japanese';
    note.hidden = true;
    node.append(note);
    notes.push(note);
  });
  const guide = document.createElement('p');
  guide.className = 'language-guide';
  guide.lang = 'en';
  guide.textContent = 'Articles and other pages are in Japanese. You can use your browser’s translation feature to read them.';
  guide.hidden = true;
  document.querySelector('.hero .intro').after(guide);
  const description = document.querySelector('meta[name="description"]').content;
  function apply(language) {
    document.documentElement.lang = language;
    texts.forEach(({node, original, trimmed}) => {
      node.textContent = language === 'en' ? original.replace(trimmed, translate(trimmed)) : original;
    });
    attributes.forEach(({node, name, original}) => node.setAttribute(name, language === 'en' ? strings[original] : original));
    document.querySelectorAll('.card-body > p').forEach(node => {
      node.lang = hasJapanese(node.textContent) ? 'ja' : language;
    });
    document.title = title[language];
    const summary = language === 'en' ? strings[description] || description : description;
    document.querySelector('meta[name="description"]').content = summary;
    document.querySelector('meta[property="og:title"]').content = title[language];
    document.querySelector('meta[property="og:description"]').content = summary;
    document.querySelector('meta[property="og:locale"]').content = language === 'en' ? 'en_US' : 'ja_JP';
    controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    notes.forEach(note => { note.hidden = language !== 'en'; });
    guide.hidden = language !== 'en';
  }
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  const browserLanguage = navigator.languages?.[0] || navigator.language || 'en';
  apply(['ja', 'en'].includes(saved) ? saved : /^ja(?:-|$)/i.test(browserLanguage) ? 'ja' : 'en');
  controls.hidden = false;
  controls.addEventListener('click', event => {
    const button = event.target.closest('button[data-language]');
    if (!button) return;
    const language = button.dataset.language;
    apply(language);
    try { localStorage.setItem(storageKey, language); } catch { /* Switching still works. */ }
  });
})();
