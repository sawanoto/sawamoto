/* All twelve palettes and drawings live here. No network, storage or build-time date. */
(() => {
  'use strict';

  const star = (x, y, size = 1) => `<path transform="translate(${x} ${y}) scale(${size})" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z" fill="var(--seasonal-highlight)" stroke="none"/>`;
  const leaf = (x, y, rotation = 0) => `<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M0 14C-20 5-15-12 0-18 15-12 20 5 0 14Z" fill="var(--seasonal-secondary)"/><path d="M0 14V-10M0 4 7-3M0-2-6-8" fill="none"/></g>`;
  const petal = (rotation) => `<path transform="rotate(${rotation})" d="M0 0C-17-9-12-25-4-23L0-18 4-23C12-25 17-9 0 0Z" fill="var(--seasonal-secondary)" stroke="none"/>`;
  const flower = (x, y, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${[0, 72, 144, 216, 288].map(petal).join('')}<circle r="3" fill="var(--seasonal-highlight)" stroke="none"/></g>`;

  // paper/wash keep body text readable; accent also serves links, focus and buttons.
  const THEMES = {
    1: {name: 'お正月', paper: '#fcf8f4', wash: '#f8e9e4', accent: '#923c3b', line: '#e5d6cf', secondary: '#698069', highlight: '#c99645', art: '<path d="M20 44H85"/><circle cx="72" cy="18" r="12" fill="#b84c48" stroke="none"/><path d="M35 44V12M35 17 20 27H50ZM35 27 15 38H55Z" fill="var(--seasonal-secondary)"/><path d="M59 44V35M52 39H66"/>'},
    2: {name: '雪と冬', paper: '#f4f8fb', wash: '#e6f0f7', accent: '#35617a', line: '#ccdce7', secondary: '#8eb7cf', highlight: '#c6dce9', art: '<g transform="translate(51 27)"><path d="M0-21V21M-18-10 18 10M-18 10 18-10M-5-15 0-10 5-15M-5 15 0 10 5 15M-16-3-10-5-11-12M16 3 10 5 11 12M-16 3-10 5-11 12M16-3 10-5 11-12" fill="none"/></g><circle cx="20" cy="15" r="2" fill="var(--seasonal-secondary)" stroke="none"/><circle cx="83" cy="38" r="3" fill="var(--seasonal-secondary)" stroke="none"/>'},
    3: {name: '春の芽吹き', paper: '#f7f9f1', wash: '#eaf0da', accent: '#526637', line: '#d6dfc8', secondary: '#a4bc78', highlight: '#dbc570', art: '<path d="M18 46H84M50 44V25"/><path d="M50 29C28 31 26 14 29 12 43 11 51 19 50 29ZM50 24C49 9 65 6 73 10 73 21 62 29 50 24Z" fill="var(--seasonal-secondary)"/><path d="M27 46V38M24 39 27 35 30 39M75 46V39" fill="none"/>'},
    4: {name: '桜', paper: '#fcf7f9', wash: '#f7e5ed', accent: '#88465e', line: '#e8d2dc', secondary: '#e8b6ca', highlight: '#c69b53', art: `${flower(45, 28, .95)}${flower(77, 36, .48)}<path d="M18 41C7 34 15 27 22 29 27 34 23 40 18 41Z" fill="var(--seasonal-secondary)" stroke="none"/>`},
    5: {name: '新緑', paper: '#f4f9f2', wash: '#e1efdf', accent: '#386443', line: '#cddfc9', secondary: '#8dbb82', highlight: '#c7d68a', art: `<path d="M28 46 71 9"/>${leaf(38, 28, -48)}${leaf(68, 25, 42)}`},
    6: {name: '梅雨と紫陽花', paper: '#f7f6fc', wash: '#f0edf8', accent: '#645080', line: '#d9d2e8', secondary: '#b3a1d3', highlight: '#8eb5cd', art: '<path d="M33 44C37 33 50 31 61 40 50 48 40 48 33 44Z" fill="#8da38a" stroke="none"/><g fill="var(--seasonal-secondary)" stroke="var(--paper)"><circle cx="42" cy="21" r="9"/><circle cx="55" cy="20" r="9"/><circle cx="36" cy="32" r="9"/><circle cx="50" cy="32" r="9"/><circle cx="63" cy="31" r="9"/></g><path d="M19 13 16 20M80 12 77 19M85 29 82 36" stroke="var(--seasonal-highlight)"/>'},
    7: {name: '七夕', paper: '#f5f7fb', wash: '#e4eaf5', accent: '#354e77', line: '#d1d9e8', secondary: '#91adbc', highlight: '#e4c873', art: `<rect x="7" y="4" width="90" height="46" rx="17" fill="#243c60" stroke="none"/>${star(25, 21, .7)}${star(73, 16, .5)}<path d="M37 8 78 45M48 17V24M64 31V36" stroke="#a8c6aa"/><path d="M44 24H53V41L49 38 44 41ZM60 36H68V47L64 44 60 47Z" fill="var(--seasonal-secondary)" stroke="none"/><circle cx="82" cy="34" r="1.5" fill="#fff" stroke="none"/>`},
    8: {name: '夏とひまわり', paper: '#fcfaf1', wash: '#f8edc8', accent: '#795b20', line: '#e6ddbe', secondary: '#e4bf50', highlight: '#bc8e40', art: `<path d="M48 32V49M48 43C57 30 69 35 65 40 59 46 48 43 48 43Z" fill="#8ba36a"/><g transform="translate(48 24)">${[0,45,90,135,180,225,270,315].map(r=>`<ellipse transform="rotate(${r})" cy="-13" rx="5" ry="10" fill="var(--seasonal-secondary)" stroke="none"/>`).join('')}<circle r="10" fill="#80633f" stroke="none"/><circle r="5" fill="#a18351" stroke="none"/></g>`},
    9: {name: '月見', paper: '#faf9f1', wash: '#f1edce', accent: '#70602d', line: '#e1dcc5', secondary: '#c7b378', highlight: '#e3cf81', art: '<circle cx="37" cy="23" r="17" fill="var(--seasonal-highlight)" stroke="none"/><path d="M63 48 71 13M72 48 84 22M57 47 60 26M67 25 66 17M69 22 75 18M78 37 86 32M61 39 55 33" stroke="var(--seasonal-secondary)"/><path d="M16 47H88"/>'},
    10: {name: 'ハロウィン', paper: '#fcf7f0', wash: '#f8e6d0', accent: '#905025', line: '#e7d5c4', secondary: '#d98a43', highlight: '#e8ba66', art: '<path d="M66 15 68 8 73 7" stroke="#63794d"/><path d="M47 32C43 13 62 13 67 19 78 11 92 20 88 36 85 48 75 48 67 45 53 50 46 41 47 32Z" fill="var(--seasonal-secondary)" stroke="none"/><path d="m56 28 5-4 3 6Zm15 2 4-6 5 4ZM57 36 63 39 67 35 71 39 79 35" fill="#704528" stroke="#704528"/><path d="M12 20 16 11 24 16 28 10 31 21 41 17 36 27 30 25 26 31 22 25 16 28Z" fill="#675a65" stroke="none"/>'},
    11: {name: '紅葉', paper: '#fbf7f2', wash: '#f6eadf', accent: '#854b32', line: '#e5d2c2', secondary: '#c37f50', highlight: '#cfaf56', art: `<path d="M35 45 40 29"/><path d="M40 32C21 32 15 17 23 10 32 8 36 16 39 19 40 9 52 7 58 13 65 22 55 31 40 32Z" fill="var(--seasonal-highlight)" stroke="none"/>${leaf(75, 34, 48)}<path d="M34 31 26 17M42 29 51 16" fill="none"/>`},
    12: {name: 'クリスマス', paper: '#f5f8f4', wash: '#e2ede0', accent: '#345c48', line: '#cfddce', secondary: '#668970', highlight: '#c49d4a', art: `<path d="M52 47V40" stroke="#806141"/><path d="M52 13 37 29H44L31 43H73L60 29H67Z" fill="var(--seasonal-secondary)" stroke="none"/>${star(52, 11, .65)}<circle cx="47" cy="29" r="2.5" fill="#ad514d" stroke="none"/><circle cx="59" cy="36" r="2.5" fill="#ad514d" stroke="none"/><circle cx="23" cy="20" r="2" fill="var(--seasonal-highlight)" stroke="none"/>`},
  };

  const root = document.documentElement;
  const mark = document.querySelector('.seasonal-mark');
  if (!mark) return;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric',
  });
  let timer;

  function refresh() {
    window.clearTimeout(timer);
    const date = new Date();
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    const year = Number(parts.year);
    const currentMonth = Number(parts.month);
    const value = new URLSearchParams(window.location.search).get('themeMonth');
    const preview = /^(?:[1-9]|1[0-2])$/.test(value || '') ? Number(value) : null;
    const month = preview || currentMonth;
    const theme = THEMES[month];

    if (root.dataset.themeMonth !== String(month)) {
      for (const key of ['paper', 'accent', 'line']) root.style.setProperty(`--${key}`, theme[key]);
      for (const key of ['wash', 'secondary', 'highlight']) root.style.setProperty(`--seasonal-${key}`, theme[key]);
      mark.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 54" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${theme.art}</svg>`;
      mark.hidden = false;
      root.dataset.themeMonth = String(month);
      root.dataset.themeName = theme.name;
    }
    root.toggleAttribute('data-theme-preview', preview !== null);

    // JST has no DST: UTC of next month's first day minus nine hours.
    // Wake at the boundary, with an hourly recheck for a changed system clock.
    if (preview === null) {
      const nextMonth = Date.UTC(year, currentMonth, 1) - 9 * 60 * 60 * 1000;
      timer = window.setTimeout(refresh, Math.max(1, Math.min(nextMonth - date.getTime(), 60 * 60 * 1000)));
    }
  }

  refresh();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', refresh); // Includes back/forward cache restores.
  window.addEventListener('focus', refresh);
  window.addEventListener('popstate', refresh);
})();
