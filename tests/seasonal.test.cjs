// Run with node --test tests/seasonal.test.cjs. No npm dependencies required.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/seasonal.js'), 'utf8');

function page({now = '2026-10-15T12:00:00Z', search = ''} = {}) {
  let clock = new Date(now).getTime();
  const timers = new Map();
  const listeners = {};
  const styles = new Map();
  const attributes = new Set();
  const root = {dataset: {}, style: {setProperty: (key, value) => styles.set(key, value)},
    toggleAttribute: (name, enabled) => enabled ? attributes.add(name) : attributes.delete(name)};
  const mark = {hidden: true, innerHTML: ''};
  const window = {location: {search},
    setTimeout: (fn, delay) => {timers.set(fn, delay); return fn;},
    clearTimeout: id => timers.delete(id),
    addEventListener: (type, fn) => {listeners[type] = fn;}};
  const document = {documentElement: root, hidden: false, querySelector: () => mark,
    addEventListener: (type, fn) => {listeners[type] = fn;}};
  class ClockDate extends Date {constructor(...args) {super(...(args.length ? args : [clock]));}}
  vm.runInNewContext(source, {window, document, Intl, Date: ClockDate, URLSearchParams});
  return {root, mark, window, document, styles, attributes, timers,
    advanceTo: date => {clock = new Date(date).getTime();},
    event: type => listeners[type](),
    tick: () => [...timers.keys()][0]()};
}

const luminance = hex => {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
};
const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
};

test('all twelve previews have unique artwork, readable palettes and decorative SVGs', () => {
  const drawings = new Set();
  for (let month = 1; month <= 12; month++) {
    const p = page({search: `?themeMonth=${month}`});
    assert.equal(p.root.dataset.themeMonth, String(month));
    assert.ok(p.root.dataset.themeName);
    assert.equal(p.mark.hidden, false);
    assert.ok(p.attributes.has('data-theme-preview'));
    assert.match(p.mark.innerHTML, /aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(p.mark.innerHTML, /<script|href=|<image/);
    assert.equal(p.timers.size, 0, 'explicit preview stays fixed');
    drawings.add(p.mark.innerHTML);
    const accent = p.styles.get('--accent');
    for (const background of [p.styles.get('--paper'), p.styles.get('--seasonal-wash'), '#ffffff']) {
      for (const text of ['#242923', '#626b63', accent]) {
        assert.ok(contrast(text, background) >= 4.5, `month ${month}: ${text} on ${background}`);
      }
    }
    assert.ok(contrast('#ffffff', accent) >= 4.5, `month ${month}: hovered button`);
  }
  assert.equal(drawings.size, 12);
});

test('uses Japan time, repeats each year, and updates across every month boundary', () => {
  for (const year of [2026, 2027, 2032]) {
    for (let month = 0; month < 12; month++) {
      const boundary = Date.UTC(year, month + 1, 1) - 9 * 60 * 60 * 1000;
      const p = page({now: boundary - 1});
      assert.equal(p.root.dataset.themeMonth, String(month + 1));
      assert.equal([...p.timers.values()][0], 1);
      p.advanceTo(boundary);
      p.tick();
      assert.equal(p.root.dataset.themeMonth, String((month + 1) % 12 + 1));
      assert.equal(p.timers.size, 1, 'only one recheck timer');
    }
  }
});

test('invalid or absent preview falls back to the current Japan month', () => {
  for (const value of ['', '0', '13', '-1', '1.5', 'NaN', '01', '10junk', '%3Cscript%3E']) {
    const p = page({now: '2026-09-30T15:00:00Z', search: `?themeMonth=${value}`});
    assert.equal(p.root.dataset.themeMonth, '10');
    assert.equal(p.attributes.has('data-theme-preview'), false);
    assert.equal(p.timers.size, 1);
  }
});

test('refreshes after sleeping, restoring from bfcache and clock changes', () => {
  for (const event of ['visibilitychange', 'pageshow', 'focus']) {
    const p = page({now: '2026-10-01T00:00:00Z'});
    p.advanceTo('2027-01-01T00:00:00Z');
    p.event(event);
    assert.equal(p.root.dataset.themeMonth, '1');
    assert.equal(p.timers.size, 1);
  }
  const p = page();
  assert.ok([...p.timers.values()][0] <= 60 * 60 * 1000);
  p.advanceTo('2026-09-15T00:00:00Z');
  p.tick();
  assert.equal(p.root.dataset.themeMonth, '9');
});

test('back/forward navigation enters and leaves previews without storing preferences', () => {
  const p = page({search: '?themeMonth=10'});
  p.window.location.search = '?themeMonth=12';
  p.event('popstate');
  assert.equal(p.root.dataset.themeMonth, '12');
  p.window.location.search = '';
  p.event('popstate');
  assert.equal(p.root.dataset.themeMonth, '10');
  assert.equal(p.attributes.has('data-theme-preview'), false);
  assert.equal(p.timers.size, 1);
});
