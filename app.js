'use strict';
/* Тренажёр заботы о себе — всё хранится только на устройстве (localStorage) */

const KEY = 'zabota-v1';
const OWN = { name: 'Моё задание', dot: '#C83E62', bg: '#F9DCE4', ink: '#8E2443' };
const ALB_TYPES = {
  taste:     { name: 'Вкусы',    bg: '#FDE3D6', ink: '#8A3A1E' },
  discovery: { name: 'Открытия', bg: '#2E2453', ink: '#F2C66D', light: true },
  childhood: { name: 'Детство',  bg: '#E7DEF6', ink: '#4B3A7A' },
  other:     { name: 'Другое',   bg: '#DDEFE4', ink: '#1F5139' }
};
const PERIODS = ['В детстве', 'В юности', 'Пару лет назад', 'Недавно'];
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DAYS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

/* ---------- state ---------- */
function freshState() {
  return {
    v: 1, onboarded: false, who: {}, level: 1, off: {}, own: [],
    day: null, week: null, log: [], stones: [], album: [], seen: {},
    calm: { voice: true, bg: true, vol: 0.6 }, hideInstall: false, levelAsked: 0, backupAt: null, created: todayKey()
  };
}
let S;
try { S = Object.assign(freshState(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = freshState(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Не получилось сохранить: память браузера недоступна'); } }

const UI = { onbStep: 0, onbWho: null, albumFilter: 'all', oporaFilter: 'all', memo: null, monthOff: 0 };

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayKey() { return dkey(new Date()); }
function mondayKey(d = new Date()) { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return dkey(x); }
function fmtShort(key) { const [y, m, d] = key.split('-').map(Number); return d + ' ' + MONTHS_GEN[m - 1].slice(0, 3); }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function catOf(t) { return t.c === 'own' ? OWN : CATS[t.c]; }
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function standalone() { return window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }

const ICON = {
  deck: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="3" width="12" height="16" rx="2.5"/><path d="M5 6.5v12A2.5 2.5 0 0 0 7.5 21H15"/></svg>',
  today: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M12 9c.6 2 1.4 2.8 3.4 3.4-2 .6-2.8 1.4-3.4 3.4-.6-2-1.4-2.8-3.4-3.4 2-.6 2.8-1.4 3.4-3.4z"/></svg>',
  album: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="8" height="8" rx="2"/><rect x="13" y="4" width="8" height="5" rx="2"/><rect x="3" y="14" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="9" rx="2"/></svg>',
  jar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h8M9 3v3c-2.5 1-4 3.3-4 6v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6c0-2.7-1.5-5-4-6V3"/><path d="M12 12.5s-2.5-1.5-2.5-3a1.3 1.3 0 0 1 2.5-.5 1.3 1.3 0 0 1 2.5.5c0 1.5-2.5 3-2.5 3z"/></svg>',
  month: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  heart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  wave: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h3l2-4 3 8 2-4h8"/></svg>',
  star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1.2 4.2 3 6 7.2 7.2-4.2 1.2-6 3-7.2 7.2-1.2-4.2-3-6-7.2-7.2C9 9 10.8 7.2 12 3z"/></svg>',
  voice: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  music: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  cup: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h13v4a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4"/></svg>',
  cat: {
    love: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    date: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
    know: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    voice: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    body: '<path d="M12 21c-4-3-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7-7 10z"/><path d="M12 8v6M9 11h6"/>',
    base: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
    own: '<path d="M12 3c1.2 4.2 3 6 7.2 7.2-4.2 1.2-6 3-7.2 7.2-1.2-4.2-3-6-7.2-7.2C9 9 10.8 7.2 12 3z"/>'
  }
};
function catIcon(c, size = 34) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON.cat[c] || ICON.cat.own) + '</svg>'; }

/* ---------- deck logic ---------- */
function taskById(id) { return TASKS.find(t => t.id === id) || (S.own.find(o => o.id === id) ? { id, c: 'own', l: 1, t: S.own.find(o => o.id === id).t, h: 'Твоё задание' } : null); }
function eligible(weekly) {
  let list = TASKS.filter(t => !!t.wk === weekly && !S.off[t.c] && t.l <= S.level && (!t.w || t.w.some(x => S.who[x])));
  if (!weekly && !S.off.own) list = list.concat(S.own.map(o => ({ id: o.id, c: 'own', l: 1, t: o.t, h: 'Твоё задание' })));
  if (!list.length) list = TASKS.filter(t => !!t.wk === weekly && t.l === 1 && !t.w);
  return list;
}
function pick(weekly, exclude) {
  let list = eligible(weekly).filter(t => t.id !== exclude);
  if (!list.length) list = eligible(weekly);
  const min = Math.min(...list.map(t => S.seen[t.id] || 0));
  let cand = list.filter(t => (S.seen[t.id] || 0) === min);
  const cur = cand.filter(t => t.l === S.level);
  if (cur.length && Math.random() < 0.6) cand = cur;
  const t = cand[Math.floor(Math.random() * cand.length)];
  S.seen[t.id] = (S.seen[t.id] || 0) + 1;
  return t.id;
}
function ensureDay() {
  const k = todayKey();
  if (!S.day || S.day.date !== k) {
    const prev = S.day && S.day.taskId;
    S.day = { date: k, taskId: pick(false, prev), flipped: false, redraws: 1, status: 'open', r: { a: 0, g: 0, j: 0 }, saved: false };
    save();
  }
  if (!taskById(S.day.taskId)) { S.day.taskId = pick(false); save(); }
}
function ensureWeek() {
  const k = mondayKey();
  if (!S.week || S.week.key !== k) {
    const prev = S.week && S.week.taskId;
    S.week = { key: k, taskId: pick(true, prev), redraws: 1, status: 'open', r: { a: 0, g: 0, j: 0 }, saved: false };
    save();
  }
}
function weekCount() { const m = mondayKey(); return S.log.filter(l => l.date >= m).length; }

/* ---------- router ---------- */
const TABS = ['today', 'album', 'opora', 'calm', 'month'];
function route() { return (location.hash || '#today').slice(1).split('?')[0] || 'today'; }
function go(to) { if (location.hash === '#' + to) render(); else location.hash = to; }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function render() {
  const app = $('#view');
  const tabs = $('#tabs');
  if (!S.onboarded) { tabs.hidden = true; app.className = 'no-tabs'; app.innerHTML = vOnboarding(); return; }
  const r = route();
  ensureDay(); ensureWeek();
  const views = { today: vToday, album: vAlbum, opora: vOpora, month: vMonth, calm: vCalm, deck: vDeck };
  const fn = views[r] || vToday;
  const withTabs = TABS.includes(r) || !views[r];
  tabs.hidden = !withTabs;
  app.className = withTabs ? '' : 'no-tabs';
  app.innerHTML = fn();
  tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === (views[r] ? r : 'today')));
  tabs.querySelectorAll('a').forEach(a => a.setAttribute('aria-current', a.classList.contains('on') ? 'page' : 'false'));
}

/* ---------- onboarding ---------- */
function vOnboarding() {
  const s = UI.onbStep;
  if (!UI.onbWho) UI.onbWho = Object.assign({}, S.who);
  const dots = [0, 1, 2, 3, 4].map(i => '<span class="d" style="width:' + (i === s ? 24 : 8) + 'px;background:' + (i <= s ? '#C83E62' : '#D9CEEE') + '"></span>').join('');
  const top = '<div class="dotsbar"><div style="display:flex;gap:6px">' + dots + '</div>' + (s > 0 && s < 4 ? '<button class="link-btn" style="text-decoration:none;font-weight:700" data-act="onbBack">Назад</button>' : '') + '</div>';
  let body = '';
  if (s === 0) body = '<div style="flex:1;display:flex;align-items:center;justify-content:center"><svg width="220" height="260" viewBox="0 0 240 280" aria-hidden="true"><rect x="70" y="40" width="150" height="210" rx="20" fill="#E7DEF6" transform="rotate(10 145 145)"/><rect x="45" y="35" width="150" height="210" rx="20" fill="#FDE3D6" transform="rotate(-6 120 140)"/><rect x="45" y="35" width="150" height="210" rx="20" fill="#2E2453"/><rect x="55" y="45" width="130" height="190" rx="14" fill="none" stroke="#F2C66D" stroke-opacity=".5" stroke-width="1.5"/><circle cx="120" cy="130" r="38" fill="#F2C66D" fill-opacity=".15" stroke="#F2C66D" stroke-width="1.5"/><path d="M120 108c3.6 12.6 9 18 21.6 21.6-12.6 3.6-18 9-21.6 21.6-3.6-12.6-9-18-21.6-21.6 12.6-3.6 18-9 21.6-21.6z" fill="#F2C66D"/></svg></div>' +
    '<h1 style="font-size:28px">Тренажёр заботы о себе</h1><div class="sub" style="color:var(--soft);font-size:16px">Для тех, кто привык растворяться в других и забывать о себе. Каждый день маленький шаг в свою сторону</div><div class="small">Подходит для отношений, где тебе в целом безопасно, но ты теряешь себя</div><button class="btn btn-rose" style="margin-top:8px" data-act="onbNext">Начать</button>';
  if (s === 1) body = '<h1>В ком или в чём ты чаще растворяешься?</h1><div class="sub">Можно выбрать несколько. Колода подмешает задания под это</div><div class="chips" style="margin-top:6px">' +
    WHO.map(w => '<button class="chip big' + (UI.onbWho[w.id] ? ' on' : '') + '" aria-pressed="' + !!UI.onbWho[w.id] + '" data-act="onbWho" data-id="' + w.id + '">' + w.label + '</button>').join('') +
    '<button class="chip big' + (UI.onbWho.unsure ? ' on' : '') + '" aria-pressed="' + !!UI.onbWho.unsure + '" data-act="onbWho" data-id="unsure">Пока не знаю</button></div>' +
    '<div class="small" style="margin-top:auto;text-align:center">Это можно поменять в любой момент</div><button class="btn btn-night" data-act="onbNext">Дальше</button>';
  if (s === 2) body = '<h1>Тренируемся там, где безопасно</h1><div class="sub">Тревожный мозг легко путает «мне будет неприятно» и «мне будет плохо». Научимся их различать</div>' +
    '<div class="box" style="background:var(--sage);color:var(--sage-ink)"><div class="k">Дискомфорт — можно тренироваться</div><div style="font-size:15px;line-height:1.5">Неловко, тревожно, хочется извиниться и всё переиграть. Это неприятно, но последствий нет</div></div>' +
    '<div class="box" style="background:var(--peach);color:#6E2C14"><div class="k" style="color:var(--peach-ink)">Реальный риск — пока пропускаем</div><div style="font-size:15px;line-height:1.5">Можно потерять работу, премию, деньги или жильё. Такие ситуации пока пропускаем</div></div>' +
    '<div style="font-size:14px;line-height:1.5;color:var(--soft)">Начнём с заданий только для себя, потом с незнакомыми людьми, и уже потом с близкими</div><button class="btn btn-night" style="margin-top:auto" data-act="onbNext">Понятно</button>';
  if (s === 3) {
    const how = [['1', 'Карта дня', 'Утром маленькое задание для себя. Пять минут, не больше', '#FDE3D6', '#8A3A1E'], ['7', 'Карта недели', 'Задание посмелее, на всю неделю', '#2E2453', '#F2C66D'], ['∞', 'Копилка и альбом', 'Всё, что получилось и что ты узнала о себе, остаётся с тобой', '#DDEFE4', '#1F5139']];
    body = '<h1>Как это устроено</h1>' + how.map(h => '<div class="entry"><div style="flex:none;width:40px;height:40px;border-radius:12px;background:' + h[3] + ';color:' + h[4] + ';display:flex;align-items:center;justify-content:center;font-family:Unbounded,sans-serif;font-weight:700">' + h[0] + '</div><div><div class="tx" style="font-weight:800">' + h[1] + '</div><div class="small" style="font-size:14px">' + h[2] + '</div></div></div>').join('') +
      '<div class="box" style="background:var(--lilac);color:var(--soft);font-size:14px;line-height:1.5">Здесь нет серий и штрафов. Карту можно перетянуть или сказать «не сегодня» — это тоже забота о себе</div><button class="btn btn-night" style="margin-top:auto" data-act="onbNext">Дальше</button>';
  }
  if (s === 4) body = '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center">' + jarSVG(1, 130) + '<h1>Первый камушек уже в копилке</h1><div class="sub" style="color:var(--soft);font-size:16px;max-width:310px">Ты решила потренировать заботу о себе. Это уже шаг в свою сторону</div></div><button class="btn btn-rose" data-act="onbFinish">Вытянуть первую карту</button>';
  return '<div class="onb">' + top + '<div class="body">' + body + '</div></div>';
}

/* ---------- today ---------- */
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 17 ? 'Добрый день' : h < 23 ? 'Добрый вечер' : 'Доброй ночи'; }
function cardBack() {
  return '<div class="face bk"><svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="14" y="14" width="272" height="372" rx="18" fill="none" stroke="#F2C66D" stroke-opacity=".45" stroke-width="1.5"/><circle cx="150" cy="170" r="92" fill="none" stroke="#F2C66D" stroke-opacity=".25" stroke-width="1.5"/><circle cx="150" cy="170" r="66" fill="none" stroke="#F2C66D" stroke-opacity=".4" stroke-width="1.5"/><circle cx="150" cy="170" r="40" fill="#F2C66D" fill-opacity=".12" stroke="#F2C66D" stroke-width="1.5"/><path d="M150 146c4 14 10 20 24 24-14 4-20 10-24 24-4-14-10-20-24-24 14-4 20-10 24-24z" fill="#F2C66D"/><circle cx="62" cy="64" r="2.5" fill="#F2C66D"/><circle cx="240" cy="88" r="2" fill="#F2C66D"/><circle cx="230" cy="300" r="2.5" fill="#F2C66D"/><circle cx="72" cy="290" r="2" fill="#F2C66D"/><circle cx="250" cy="200" r="1.5" fill="#F2C66D"/><circle cx="48" cy="180" r="1.5" fill="#F2C66D"/></svg><div class="cap"><b>Карта дня</b><span>Нажми, чтобы открыть</span></div></div>';
}
function cardFront(t, weekly) {
  const c = catOf(t);
  return '<div class="face front"><div class="blob" style="background:' + c.bg + '"></div><div class="cat-chip" style="background:' + c.bg + ';color:' + c.ink + '">' + (weekly ? 'Карта недели · ' : '') + esc(c.name) + '</div><div class="cat-icon" style="background:' + c.bg + ';color:' + c.ink + '">' + catIcon(t.c) + '</div><div class="task-text">' + esc(t.t) + '</div><div class="task-hint">' + esc(t.h || '') + '</div></div>';
}
function ratingPanel(scope, r, t) {
  const defs = [['a', 'Тревога', '#C83E62', '#F6C9D5'], ['g', 'Вина', '#7B6A9E', '#D9CEEE'], ['j', 'Удовольствие', '#3C8A63', '#BFE3CE']];
  const rows = defs.map(d => '<div class="rate-row"><div class="nm">' + d[1] + '</div><div class="dots">' + [1, 2, 3, 4, 5].map(n => '<button class="dot" style="border-color:' + d[2] + ';background:' + (r[d[0]] >= n ? d[3] : '#fff') + '" aria-label="' + d[1] + ': ' + n + ' из 5" data-act="rate" data-scope="' + scope + '" data-k="' + d[0] + '" data-n="' + n + '"></button>').join('') + '</div></div>').join('');
  const alb = t.alb ? '<label class="field-label" for="alb-' + scope + '">Находка для альбома себя</label><input type="text" id="alb-' + scope + '" placeholder="Например: люблю гулять одна" maxlength="120">' : '';
  return '<h3>Как это было?</h3>' + rows + '<label class="field-label" for="note-' + scope + '">Что заметила? <span style="font-weight:500;color:var(--muted)">необязательно</span></label><textarea id="note-' + scope + '" rows="2" maxlength="300"></textarea>' + alb +
    '<button class="btn btn-night" data-act="saveTask" data-scope="' + scope + '">Положить в копилку опоры</button>';
}
function vToday() {
  const d = new Date();
  const t = taskById(S.day.taskId);
  const wt = taskById(S.week.taskId);
  const n = weekCount();
  let h = '<div class="head"><button class="icon-btn" style="position:absolute;top:20px;right:16px" aria-label="Настроить колоду" data-act="go" data-to="deck">' + ICON.deck + '</button>' +
    '<div class="small" style="font-size:14px;font-weight:500">' + DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_GEN[d.getMonth()] + '</div><h1>' + greeting() + '</h1><div class="sub" style="font-size:14px">' +
    (n ? 'На этой неделе ты выбрала себя ' + n + ' ' + plural(n, 'раз', 'раза', 'раз') : 'Каждый день маленький шаг в свою сторону') + '</div></div>';

  if (isIOS() && !standalone() && !S.hideInstall) h += '<div class="panel lilac" style="gap:8px"><p style="font-size:14px"><b>Сделай тренажёр приложением.</b> В Safari нажми «Поделиться» и выбери «На экран „Домой“». Так он будет открываться как обычное приложение и работать без интернета</p><button class="link-btn" style="align-self:flex-start;padding:0" data-act="hideInstall">Понятно</button></div>';

  const atLevel = S.log.filter(l => !l.wk && l.l === S.level).length;
  if (S.level < 4 && atLevel >= 10 && S.levelAsked !== S.level) {
    h += '<div class="panel sage"><h3 style="color:var(--sage-ink)">Похоже, ты готова к следующему шагу</h3><p>На уровне «' + LEVELS[S.level - 1].title + '» уже ' + atLevel + ' ' + plural(atLevel, 'задание', 'задания', 'заданий') + '. Добавить в колоду задания уровня «' + LEVELS[S.level].title + '»?</p><div class="row"><button class="btn btn-night" style="min-height:46px;font-size:15px" data-act="levelUp">Добавить</button><button class="btn btn-ghost" style="min-height:46px" data-act="levelStay">Пока останусь</button></div></div>';
  }

  if (S.day.saved) return h + doneBlock(t, wt);

  h += '<div class="card-wrap">';
  if (S.day.status === 'skipped') {
    h += '<div class="card-static" style="background:var(--lilac)"><div class="h-display" style="font-size:20px;line-height:1.3">Не сегодня — тоже выбор</div><div style="font-size:16px;line-height:1.5;color:var(--soft)">Ты прислушалась к себе, и это уже забота. Завтра будет новая карта</div><button class="btn btn-ghost" style="align-self:flex-start;min-height:44px;border-color:var(--lilac-ink);color:var(--lilac-ink);background:transparent" data-act="unskip">Вернуть карту</button></div>';
  } else {
    h += '<button class="card' + (S.day.flipped ? ' flipped' : '') + '" id="dayCard" data-act="flip" aria-label="' + (S.day.flipped ? esc(t.t) : 'Открыть карту дня') + '">' + cardBack() + cardFront(t) + '</button>';
  }
  h += '</div>';

  if (S.day.status === 'open' && S.day.flipped) {
    h += '<div class="pad" style="padding-top:16px;display:flex;flex-direction:column;gap:8px"><div class="row"><button class="btn btn-rose" data-act="done" data-scope="day">Сделала</button><button class="btn btn-ghost" data-act="redraw" data-scope="day"' + (S.day.redraws ? '' : ' disabled') + '>' + (S.day.redraws ? 'Другую карту' : 'Перетянуто') + '</button></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><button class="link-btn" data-act="skip">Не сегодня</button><a class="pill-link" href="#calm">' + ICON.wave + 'Тревожно? Успокоиться</a></div></div>';
  }
  if (S.day.status === 'done' && !S.day.saved) h += '<div class="panel">' + ratingPanel('day', S.day.r, t) + '</div>';

  if (!(S.day.status === 'done' && !S.day.saved)) {
    const wdone = S.week.saved;
    h += '<button class="tile" data-act="openWeek"><div class="ic" style="background:#2E2453;color:#F2C66D">' + ICON.star + '</div><div style="min-width:0"><div class="t1">' + (wdone ? 'Карта недели · выполнена' : 'Карта недели · до воскресенья') + '</div><div class="t2">' + esc(wt.t) + '</div></div></button>';
  }
  return h;
}
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; }

/* after the day card is saved: celebration + what's next */
function doneBlock(t, wt) {
  const n = S.stones.length;
  const drop = UI.justSaved; UI.justSaved = false;
  const c = catOf(t);
  let h = '<div class="celebrate' + (drop ? ' drop' : '') + '"><div class="jar-wrap">' + jarSVG(n, 110) + '<span class="falling" aria-hidden="true"></span></div>' +
    '<div class="h-display" style="font-size:22px;line-height:1.25;text-align:center">Камушек в копилке</div>' +
    '<div class="sub" style="text-align:center;max-width:300px">Сегодня ты была на своей стороне. Это уже ' + n + '-й камушек в твоей копилке</div>' +
    '<div class="today-card"><span class="d" style="background:' + c.dot + '"></span><span>' + esc(t.t) + '</span></div></div>';
  h += '<div class="label">Что дальше</div><div class="list">';
  if (!S.week.saved) {
    h += '<button class="entry next" data-act="openWeek"><div class="ic" style="background:#2E2453;color:#F2C66D">' + ICON.star + '</div><div style="flex:1;min-width:0"><div class="tx" style="font-weight:800">Карта недели</div><div class="small">' + esc(wt.t) + '</div></div><span class="chev" aria-hidden="true">›</span></button>';
  } else {
    h += '<div class="entry next" style="opacity:.75"><div class="ic" style="background:var(--sage);color:var(--sage-ink)">✓</div><div style="flex:1"><div class="tx" style="font-weight:800">Карта недели выполнена</div><div class="small">Новая придёт в понедельник</div></div></div>';
  }
  h += '<button class="entry next" data-act="addAlbum"><div class="ic" style="background:#E7DEF6;color:#4B3A7A">' + catIcon('know', 22) + '</div><div style="flex:1;min-width:0"><div class="tx" style="font-weight:800">Находка в альбом себя</div><div class="small">Что ты сегодня узнала о себе: вкус, желание, «оказывается, я люблю…»</div></div><span class="chev" aria-hidden="true">›</span></button>';
  h += '<a class="entry next" href="#calm" style="text-decoration:none;color:inherit"><div class="ic" style="background:#DDEFE4;color:#1F5139">' + ICON.wave + '</div><div style="flex:1;min-width:0"><div class="tx" style="font-weight:800">Пять минут покоя</div><div class="small">Сканирование тела твоим темпом, под поющие чаши</div></div><span class="chev" aria-hidden="true">›</span></a>';
  h += '</div><div class="pad small" style="text-align:center;padding-top:18px;font-size:14px">Новая карта дня откроется завтра утром</div>';
  return h;
}

/* ---------- week sheet ---------- */
function weekSheet() {
  const w = S.week, t = taskById(w.taskId);
  let h = '<div class="grab"></div>' + cardFront(t, true).replace('class="face front"', 'class="face front static"');
  if (w.saved) h += '<div class="panel sage" style="margin:0"><h3>Выполнено</h3><p style="color:#2F6B4B">Записано в копилку опоры. В понедельник придёт новая карта недели</p></div><button class="btn btn-ghost" data-act="closeSheet">Закрыть</button>';
  else if (w.status === 'done') h += '<div class="panel" style="margin:0;padding:0">' + ratingPanel('week', w.r, t) + '</div>';
  else h += '<div class="row"><button class="btn btn-rose" data-act="done" data-scope="week">Сделала</button><button class="btn btn-ghost" data-act="redraw" data-scope="week"' + (w.redraws ? '' : ' disabled') + '>' + (w.redraws ? 'Другую карту' : 'Перетянуто') + '</button></div><button class="link-btn" data-act="closeSheet" style="align-self:center">Закрыть</button>';
  return h;
}

/* ---------- album ---------- */
function vAlbum() {
  const f = UI.albumFilter;
  const items = S.album.filter(a => f === 'all' || a.type === f).slice().reverse();
  const month = S.album.filter(a => a.date.slice(0, 7) === todayKey().slice(0, 7)).length;
  let h = '<div class="head"><button class="icon-btn" style="position:absolute;top:20px;right:16px" aria-label="Добавить находку" data-act="addAlbum">' + ICON.plus + '</button><h1>Альбом себя</h1><div class="sub">' +
    (S.album.length ? 'Всё, что ты узнала о себе. ' + month + ' ' + plural(month, 'находка', 'находки', 'находок') + ' за ' + MONTHS[new Date().getMonth()] : 'Здесь будут твои находки о себе') + '</div></div>';
  h += '<div class="pad" style="padding-top:14px"><div class="chips">' + [['all', 'Все']].concat(Object.keys(ALB_TYPES).map(k => [k, ALB_TYPES[k].name])).map(x => '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-act="albumFilter" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>';
  if (!items.length) {
    h += '<div class="panel" style="margin-top:16px"><h3>' + (S.album.length ? 'В этой категории пока пусто' : 'Альбом пока чистый') + '</h3><p style="color:var(--muted)">Находки появляются после заданий «Узнать себя». А можно добавить первую прямо сейчас: любимый запах, вкус, время суток или то, что радовало в детстве</p><button class="btn btn-night" data-act="addAlbum">Добавить находку</button></div>';
    return h;
  }
  h += '<div class="grid">' + items.map((a, i) => {
    const ty = ALB_TYPES[a.type] || ALB_TYPES.other;
    const wide = a.text.length > 38 || (i === 0 && items.length > 2);
    return '<button class="acard' + (wide ? ' wide' : '') + '" style="background:' + ty.bg + ';color:' + (ty.light ? '#fff' : 'var(--ink)') + '" data-act="albumItem" data-id="' + a.id + '"><div class="k" style="color:' + ty.ink + '">' + ty.name + '</div><div class="v">' + esc(a.text) + '</div><div class="dt">' + fmtShort(a.date) + '</div></button>';
  }).join('') + '</div>';
  return h;
}
function albumSheet() {
  return '<div class="grab"></div><h2>Новая находка</h2><div class="small" style="font-size:14px">Что ты узнала о себе? Даже мелочь — часть тебя</div><div class="chips" id="albTypes">' +
    Object.keys(ALB_TYPES).map((k, i) => '<button class="chip' + (i === 0 ? ' on' : '') + '" data-act="albType" data-k="' + k + '">' + ALB_TYPES[k].name + '</button>').join('') +
    '</div><label class="field-label" for="albText">Находка</label><input type="text" id="albText" maxlength="120" placeholder="Например: люблю раннее утро, пока все спят"><div class="row"><button class="btn btn-ghost" style="flex:none" data-act="closeSheet">Отмена</button><button class="btn btn-night" data-act="saveAlbum">Добавить в альбом</button></div>';
}

/* ---------- opora ---------- */
function jarSVG(n, w = 76) {
  const pos = [[32, 79, 6], [46, 80, 5], [22, 74, 5], [56, 72, 5], [39, 70, 5], [27, 64, 4], [50, 63, 5], [36, 58, 4], [60, 60, 4], [18, 56, 4], [44, 50, 4], [29, 48, 4], [55, 46, 4], [38, 40, 4]];
  const cols = ['#F2C66D', '#C83E62', '#7B6A9E', '#3C8A63', '#C8643B', '#3F7FA3', '#F2C66D'];
  const fill = Math.min(1, n / 14);
  let stones = '';
  for (let i = 0; i < Math.min(n, pos.length); i++) stones += '<circle cx="' + pos[i][0] + '" cy="' + pos[i][1] + '" r="' + pos[i][2] + '" fill="' + cols[i % cols.length] + '"/>';
  const glow = n > 3 ? '<path d="M9 ' + (86 - 30 * fill) + 'h58v' + (30 * fill - 12) + 'a12 12 0 0 1-12 12H21A12 12 0 0 1 9 74z" fill="#FBEFCB" opacity=".7"/>' : '';
  return '<svg width="' + w + '" height="' + Math.round(w * 92 / 76) + '" viewBox="0 0 76 92" aria-hidden="true"><rect x="22" y="4" width="32" height="10" rx="3" fill="#2E2453"/><path d="M24 14v8C12 26 6 36 6 48v26a14 14 0 0 0 14 14h36a14 14 0 0 0 14-14V48c0-12-6-22-18-26v-8z" fill="#fff" stroke="#2E2453" stroke-width="2.2"/>' + glow + stones + '</svg>';
}
function stoneMeta(s) {
  if (s.kind === 'past') return { label: 'Из прошлого', when: s.when, dot: '#F2C66D', ring: true };
  if (s.kind === 'first') return { label: 'Первый камушек', when: fmtShort(s.date), dot: '#F2C66D', ring: true };
  const c = s.cat === 'own' ? OWN : CATS[s.cat];
  return { label: s.wk ? 'Карта недели' : (c ? c.name : 'Задание'), when: fmtShort(s.date), dot: c ? c.dot : '#C83E62' };
}
function vOpora() {
  const n = S.stones.length;
  const f = UI.oporaFilter;
  let h = '<div class="head" style="flex-direction:row;align-items:center;gap:16px"><div style="flex:1;display:flex;flex-direction:column;gap:6px"><h1>Копилка опоры</h1><div class="sub">' +
    (n <= 1 ? 'Здесь будут моменты, когда ты была на своей стороне' : n + ' ' + plural(n, 'момент', 'момента', 'моментов') + ', когда ты была на своей стороне') + '</div></div>' + jarSVG(n) + '</div>';
  h += '<div class="pad" style="padding-top:18px">';
  if (UI.memo) {
    const m = UI.memo;
    h += '<div class="panel night" style="margin:0;padding:22px;border-radius:24px">' +
      (m.empty ? '<div class="small" style="color:var(--gold);font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:12px">Давай найдём опору сейчас</div><div style="font-size:16px;line-height:1.5">Сделай выдох длиннее вдоха, четыре раза. Потом назови три вещи, которые ты сегодня уже сделала для себя. Даже «поела» и «встала» считаются</div>'
        : '<div class="small" style="color:var(--gold);font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:12px">Помнишь? · ' + esc(m.when) + '</div><div class="h-display" style="font-size:18px;font-weight:500;line-height:1.4">' + esc(m.text) + '</div><div style="font-size:14px;color:#CFC6E6">Опора уже есть. Ты сама её собрала</div>') +
      '<div class="row">' + (m.empty ? '<a class="btn btn-gold" href="#calm" style="font-size:15px;min-height:46px">Успокоиться</a>' : '<button class="btn btn-gold" style="font-size:15px;min-height:46px" data-act="memoNext">Ещё одну</button>') + '<button class="btn btn-ghost-dark" style="min-height:46px" data-act="memoClose">Мне легче</button></div></div>';
  } else {
    h += '<div class="row"><button class="btn btn-rose" style="min-height:60px;border-radius:20px;font-size:17px" data-act="anxious">' + ICON.heart + 'Мне тревожно</button><button class="btn btn-ghost" style="flex:none;width:60px;min-height:60px;border-radius:20px;border-color:var(--night);padding:0" aria-label="Добавить камушек из прошлого" data-act="addPast">' + ICON.plus + '</button></div>';
  }
  h += '</div>';
  if (n <= 1) {
    h += '<div class="panel night"><h3 style="color:var(--gold)">Опора у тебя уже есть</h3><p style="color:#E4DDF5">Просто она пока не записана. Вспомни один раз, когда ты справилась сама, — даже маленький</p><button class="btn btn-gold" data-act="addPast">Положить камушек из прошлого</button></div>';
  }
  if (n > 1) h += '<div class="pad" style="padding-top:18px"><div class="chips">' + [['all', 'Все'], ['task', 'Задания'], ['past', 'Из прошлого']].map(x => '<button class="chip' + (f === x[0] ? ' on' : '') + '" data-act="oporaFilter" data-f="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>';
  const list = S.stones.filter(s => f === 'all' || (f === 'past' ? (s.kind === 'past' || s.kind === 'first') : s.kind === 'task')).slice().reverse();
  h += '<div class="list">' + list.map(s => {
    const m = stoneMeta(s);
    return '<button class="entry" data-act="stoneItem" data-id="' + s.id + '"><div class="d" style="background:' + m.dot + (m.ring ? ';box-shadow:0 0 0 3px #FBEFCB' : '') + '"></div><div style="min-width:0"><div class="tx">' + esc(s.text) + '</div>' + (s.note ? '<div class="small" style="margin-top:3px;color:var(--soft)">' + esc(s.note) + '</div>' : '') + '<div class="mt">' + esc(m.when) + ' · ' + esc(m.label) + '</div></div></button>';
  }).join('') + '</div>';
  if (!list.length && n > 1) h += '<div class="pad small" style="padding-top:10px">Здесь пока пусто</div>';
  return h;
}
function pastSheet() {
  return '<div class="grab"></div><h2>Камушек из прошлого</h2><div class="small" style="font-size:14px">Всё, с чем ты справилась до приложения, тоже считается. Даже то, что тогда казалось мелочью</div>' +
    '<div class="field-label">Когда это было</div><div class="chips" id="periods">' + PERIODS.map((p, i) => '<button class="chip' + (i === 1 ? ' on' : '') + '" data-act="period" data-p="' + p + '">' + p + '</button>').join('') + '</div>' +
    '<div class="field-label">Подсказки</div><div class="chips">' + ['Справилась сама, когда…', 'Решилась на…', 'Сказала «нет»…', 'Пережила…'].map(p => '<button class="chip soft" data-act="starter" data-p="' + p + '">' + p + '</button>').join('') + '</div>' +
    '<label class="field-label" for="pastText">Что ты сделала</label><textarea id="pastText" rows="3" maxlength="300" placeholder="Например: в 19 лет сама переехала в другой город"></textarea>' +
    '<div class="row"><button class="btn btn-ghost" style="flex:none" data-act="closeSheet">Отмена</button><button class="btn btn-night" data-act="savePast">Положить в копилку</button></div>';
}

/* ---------- month ---------- */
function vMonth() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + UI.monthOff);
  const ym = base.getFullYear() + '-' + pad(base.getMonth() + 1);
  const logs = S.log.filter(l => l.date.slice(0, 7) === ym);
  const finds = S.album.filter(a => a.date.slice(0, 7) === ym).length;
  const isCur = UI.monthOff === 0;
  let h = '<div class="head"><div class="small" style="font-size:14px;font-weight:500">Итог месяца</div><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h1>Твой ' + MONTHS[base.getMonth()] + '</h1><div style="display:flex;gap:6px"><button class="icon-btn" aria-label="Предыдущий месяц" data-act="month" data-d="-1">' + ICON.back + '</button><button class="icon-btn" aria-label="Следующий месяц" data-act="month" data-d="1"' + (isCur ? ' disabled style="opacity:.35"' : '') + '><span style="transform:scaleX(-1);display:flex">' + ICON.back + '</span></button></div></div></div>';
  h += '<div class="grid" style="padding-top:14px"><div class="stat" style="background:var(--night);color:#fff"><b style="color:var(--gold)">' + logs.length + '</b><div style="font-size:14px;line-height:1.35;color:#E4DDF5">' + plural(logs.length, 'раз', 'раза', 'раз') + ' ты выбрала себя</div></div><div class="stat" style="background:#fff"><b style="color:var(--rose)">' + finds + '</b><div style="font-size:14px;line-height:1.35;color:var(--muted)">' + plural(finds, 'новая находка', 'новые находки', 'новых находок') + ' о себе</div></div></div>';
  const rated = logs.filter(l => l.a > 0);
  h += '<div class="panel"><div><div style="font-size:16px;font-weight:800">Тревога после заданий</div><div class="small">Средняя по неделям, из 5</div></div>';
  if (rated.length < 2) {
    h += '<p style="color:var(--muted);font-size:14px">Здесь появится график, когда ты отметишь тревогу после нескольких заданий</p>';
  } else {
    const wk = {};
    rated.forEach(l => { const w = Math.min(4, Math.floor((Number(l.date.slice(8, 10)) - 1) / 7)); (wk[w] = wk[w] || []).push(l.a); });
    const keys = Object.keys(wk).map(Number).sort();
    const last = keys[keys.length - 1];
    h += '<div class="bars">' + keys.map(k => { const v = wk[k].reduce((a, b) => a + b, 0) / wk[k].length; return '<div class="bar-col"><div style="font-size:13px;font-weight:800">' + v.toFixed(1).replace('.', ',') + '</div><div class="bar" style="height:' + Math.round(v / 5 * 92) + 'px;background:' + (k === last ? '#C83E62' : '#E7A9BA') + '"></div></div>'; }).join('') + '</div>';
    h += '<div style="display:flex;justify-content:space-between;gap:12px;padding:0 4px">' + keys.map(k => '<div style="flex:1;text-align:center;font-size:12px;color:var(--muted)">' + (k + 1) + ' нед</div>').join('') + '</div>';
  }
  h += '</div>';
  const byCat = {};
  logs.forEach(l => { byCat[l.c] = (byCat[l.c] || 0) + 1; });
  const ks = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  if (ks.length) {
    const max = byCat[ks[0]];
    h += '<div class="panel"><div style="font-size:16px;font-weight:800">Где ты была на своей стороне</div>' + ks.map(k => { const c = k === 'own' ? OWN : CATS[k]; return '<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;font-size:14px"><span style="font-weight:700">' + esc(c.name) + '</span><span style="color:var(--muted)">' + byCat[k] + '</span></div><div class="prog"><div style="width:' + Math.round(byCat[k] / max * 100) + '%;background:' + c.dot + '"></div></div></div>'; }).join('') + '</div>';
  } else if (isCur) {
    h += '<div class="panel"><p style="color:var(--muted)">Этот месяц только начинается. Первая карта ждёт на экране «Сегодня»</p></div>';
  }
  h += '<div class="pad small" style="text-align:center;padding-top:14px;font-size:14px">Здесь только то, что получилось</div>';
  return h;
}

/* ---------- calm ---------- */
function vCalm() {
  const pr = [['breath', '4·6', 'Дыхание с длинным выдохом', 'Вдох на 4, выдох на 6. Выдох успокаивает тело', '2 мин', '#DDEFE4', '#1F5139'], ['ground', '5', 'Заземление 5-4-3-2-1', 'Назови, что видишь, слышишь, чувствуешь кожей', '3 мин', '#FDE3D6', '#8A3A1E'], ['heart', '♡', 'Ладонь на сердце', 'Тепло ладони и слова, которые сказала бы подруге', '1 мин', '#E7DEF6', '#4B3A7A']];
  return '<div class="head"><h1>Успокоиться</h1><div class="sub">Тревога перед непривычным — нормальна. Она значит, что ты делаешь новое, а не что ты в опасности</div></div>' +
    '<div class="panel night" style="margin-top:18px;padding:22px;border-radius:26px;position:relative;overflow:hidden"><div style="position:absolute;right:-40px;top:-40px;width:170px;height:170px;border-radius:50%;background:#3D3168"></div><div style="position:absolute;right:0;top:0;width:90px;height:90px;border-radius:50%;background:#4A3D7A"></div>' +
    '<div style="position:relative;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--gold)">Сканирование тела · 5 минут</div><div class="h-display" style="position:relative;font-size:20px;line-height:1.3">Расслабься сверху вниз</div><p style="position:relative;color:#E4DDF5">От бровей и щёк до кончиков пальцев ног. Шаг за шагом, в своём темпе</p><button class="btn btn-gold" style="position:relative" data-act="play" data-p="scan">Начать</button></div>' +
    '<div class="label">Ещё практики</div><div class="list">' + pr.map(p => '<button class="entry" style="align-items:center" data-act="play" data-p="' + p[0] + '"><div style="flex:none;width:44px;height:44px;border-radius:14px;background:' + p[5] + ';color:' + p[6] + ';display:flex;align-items:center;justify-content:center;font-family:Unbounded,sans-serif;font-size:13px;font-weight:700">' + p[1] + '</div><div style="flex:1;min-width:0"><div class="tx" style="font-weight:800">' + p[2] + '</div><div class="small">' + p[3] + '</div></div><div class="small" style="flex:none;font-weight:700">' + p[4] + '</div></button>').join('') + '</div>' +
    '<div class="pad small" style="padding-top:14px">Голос в сканировании — Таисия Штеменко, психолог. Фон из поющих чаш, колокольчиков и дождевой палки можно выключить кнопками вверху практики</div>';
}

/* ---------- deck ---------- */
function vDeck() {
  let h = '<div class="head"><button class="back" data-act="go" data-to="today">' + ICON.back + 'Сегодня</button><h1>Твоя колода</h1><div class="sub">Из каких заданий собираются карты дня и недели</div></div>';
  h += '<div class="label">Уровень смелости</div><div class="list" style="gap:8px">' + LEVELS.map(l => {
    const cur = S.level === l.n, past = l.n < S.level;
    const note = cur ? 'Сейчас здесь' : past ? 'Входит в колоду, можно вернуться' : 'Обычно после 10 заданий прошлого уровня, но решаешь ты';
    return '<button class="entry" style="align-items:center;border:2px solid ' + (cur ? 'var(--rose)' : '#fff') + '" aria-pressed="' + cur + '" data-act="level" data-n="' + l.n + '"><div style="flex:none;width:36px;height:36px;border-radius:12px;background:' + (cur ? '#C83E62' : past ? '#DDEFE4' : '#F0EAF7') + ';color:' + (cur ? '#fff' : past ? '#1F5139' : '#5E5577') + ';display:flex;align-items:center;justify-content:center;font-family:Unbounded,sans-serif;font-size:14px;font-weight:700">' + l.n + '</div><div><div class="tx" style="font-weight:800">' + l.title + '</div><div class="small">' + note + '</div></div></button>';
  }).join('') + '</div><div class="pad small" style="padding-top:8px">Задания из уровней ниже текущего тоже остаются в колоде</div>';
  h += '<div class="label">Где ты растворяешься</div><div class="pad" style="padding-top:10px"><div class="chips">' + WHO.map(w => '<button class="chip' + (S.who[w.id] ? ' on' : '') + '" aria-pressed="' + !!S.who[w.id] + '" data-act="who" data-id="' + w.id + '">' + w.label + '</button>').join('') + '</div></div>';
  const cats = Object.keys(CATS).map(k => [k, CATS[k]]).concat(S.own.length ? [['own', OWN]] : []);
  h += '<div class="label">Категории</div><div class="panel" style="margin-top:10px;padding:4px 16px;gap:0">' + cats.map(([k, c]) => '<div class="setrow"><div style="flex:none;width:12px;height:12px;border-radius:50%;background:' + c.dot + '"></div><div style="flex:1;font-size:15px;font-weight:700">' + esc(c.name) + '</div><button class="sw' + (S.off[k] ? '' : ' on') + '" role="switch" aria-checked="' + !S.off[k] + '" aria-label="' + esc(c.name) + '" data-act="cat" data-k="' + k + '"><i></i></button></div>').join('') + '</div>';
  h += '<div class="label">Мои задания</div><div class="list" style="gap:8px">' + S.own.map(o => '<div class="entry" style="align-items:center"><span style="color:#C83E62;display:flex">' + ICON.star + '</span><div class="tx" style="flex:1">' + esc(o.t) + '</div><button class="icon-btn" style="background:#F4EFF8;width:40px;height:40px" aria-label="Удалить задание" data-act="delOwn" data-id="' + o.id + '">' + ICON.close + '</button></div>').join('') +
    '<div class="row"><label for="ownInput" class="sr-only">Новое задание</label><input type="text" id="ownInput" maxlength="140" placeholder="Своё задание" style="flex:1;min-width:0"><button class="btn btn-night" style="flex:none;min-height:48px;font-size:14px" data-act="addOwn">Добавить</button></div></div>';
  h += '<div class="panel night" style="margin-top:24px;padding:20px;border-radius:24px"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--gold)">Хочешь глубже</div><h3 style="font-size:17px">Откуда берётся растворение в других</h3><p style="color:#E4DDF5;font-size:14px">В гайде «Типы привязанности» — про тревожный и избегающий тип в паре, в деньгах и в отношениях с собой</p><div class="row"><a class="btn btn-gold" style="min-height:46px;font-size:14px" href="' + LINKS.guide + '" target="_blank" rel="noopener">Гайд · 790 ₽</a><a class="btn btn-ghost-dark" style="min-height:46px;font-size:14px" href="' + LINKS.consult + '" target="_blank" rel="noopener">Консультация</a></div></div>';
  h += '<div class="panel" style="flex-direction:row;align-items:center;gap:14px"><div style="flex:none;width:44px;height:44px;border-radius:14px;background:var(--peach);color:var(--peach-ink);display:flex;align-items:center;justify-content:center">' + ICON.cup + '</div><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:800">Поддержать автора</div><div class="small">Приложение бесплатное и останется таким. Если оно тебе помогает, можно отблагодарить любой суммой</div></div></div><div class="pad" style="padding-top:8px"><a class="btn btn-line-rose" style="width:100%;min-height:46px;font-size:15px" href="' + LINKS.donate + '" target="_blank" rel="noopener">Отблагодарить</a></div>';
  h += '<div class="label">Твои данные</div><div class="panel" style="margin-top:10px"><p style="font-size:14px;color:var(--soft)">Всё хранится только на этом телефоне: никто, кроме тебя, не видит твои записи. Сохраняй копию время от времени, чтобы ничего не потерять при смене телефона</p>' +
    (S.backupAt ? '<div class="small">Последняя копия: ' + fmtShort(S.backupAt) + '</div>' : '') +
    '<div class="row"><button class="btn btn-ghost" style="font-size:14px;min-height:46px" data-act="backup">Сохранить копию</button><button class="btn btn-ghost" style="font-size:14px;min-height:46px" data-act="restore">Восстановить</button></div><input type="file" id="restoreFile" accept="application/json,.json" hidden><button class="link-btn" style="align-self:flex-start;padding:0" data-act="reOnb">Пройти знакомство заново</button></div>';
  return h;
}

/* ---------- sheet ---------- */
function openSheet(html, id) {
  closeSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg'; bg.id = 'sheetBg';
  bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" data-sheet="' + (id || '') + '">' + html + '</div>';
  bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); });
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
}
function closeSheet() { const b = $('#sheetBg'); if (b) b.remove(); document.body.style.overflow = ''; }
function refreshSheet(id, html) { const s = $('.sheet[data-sheet="' + id + '"]'); if (s) s.innerHTML = html; }

/* ---------- actions ---------- */
const A = {
  go: el => go(el.dataset.to),
  back: () => { if (history.length > 1) history.back(); else go('today'); },
  onbNext: () => { UI.onbStep++; render(); window.scrollTo(0, 0); },
  onbBack: () => { UI.onbStep = Math.max(0, UI.onbStep - 1); render(); },
  onbWho: el => { const id = el.dataset.id; UI.onbWho[id] = !UI.onbWho[id]; if (id === 'unsure' && UI.onbWho.unsure) WHO.forEach(w => UI.onbWho[w.id] = false); if (id !== 'unsure') UI.onbWho.unsure = false; render(); },
  onbFinish: () => {
    S.who = {}; WHO.forEach(w => { if (UI.onbWho[w.id]) S.who[w.id] = true; });
    S.onboarded = true;
    if (!S.stones.some(s => s.kind === 'first')) S.stones.unshift({ id: uid(), kind: 'first', text: 'Ты решила потренировать заботу о себе. Это уже шаг в свою сторону', date: todayKey() });
    S.day = null; S.week = null; save(); UI.onbStep = 0; UI.onbWho = null;
    location.hash = 'today'; render();
  },
  hideInstall: () => { S.hideInstall = true; save(); render(); },
  flip: () => {
    if (S.day.flipped) return;
    S.day.flipped = true; save();
    const c = $('#dayCard'); if (c) c.classList.add('flipped');
    setTimeout(render, 650);
  },
  redraw: el => {
    const sc = el.dataset.scope, o = sc === 'day' ? S.day : S.week;
    if (!o.redraws) return;
    o.taskId = pick(sc === 'week', o.taskId); o.redraws--; save();
    if (sc === 'week') refreshSheet('week', weekSheet()); else render();
  },
  done: el => {
    const sc = el.dataset.scope;
    (sc === 'day' ? S.day : S.week).status = 'done'; save();
    if (sc === 'week') refreshSheet('week', weekSheet()); else render();
  },
  skip: () => { S.day.status = 'skipped'; save(); render(); },
  unskip: () => { S.day.status = 'open'; S.day.flipped = false; save(); render(); },
  rate: el => {
    const sc = el.dataset.scope, o = sc === 'day' ? S.day : S.week;
    o.r[el.dataset.k] = Number(el.dataset.n); save();
    const box = el.closest('.dots');
    box.querySelectorAll('.dot').forEach((d, i) => { const defs = { a: '#F6C9D5', g: '#D9CEEE', j: '#BFE3CE' }; d.style.background = i < o.r[el.dataset.k] ? defs[el.dataset.k] : '#fff'; });
  },
  saveTask: el => {
    const sc = el.dataset.scope, o = sc === 'day' ? S.day : S.week, t = taskById(o.taskId);
    const note = ($('#note-' + sc) || {}).value || '';
    const alb = ($('#alb-' + sc) || {}).value || '';
    const today = todayKey();
    S.stones.push({ id: uid(), kind: 'task', text: t.t, note: note.trim(), date: today, cat: t.c, wk: sc === 'week' });
    S.log.push({ date: today, id: t.id, c: t.c, l: t.l, wk: sc === 'week', a: o.r.a, g: o.r.g, j: o.r.j });
    if (alb.trim()) S.album.push({ id: uid(), type: t.alb || 'other', text: alb.trim(), date: today });
    o.saved = true; if (sc === 'day') UI.justSaved = true; save();
    if (sc === 'week') { refreshSheet('week', weekSheet()); toast(alb.trim() ? 'Камушек в копилке, находка в альбоме' : 'Камушек в копилке'); } else { render(); window.scrollTo(0, 0); if (alb.trim()) toast('Находка в альбоме'); }
  },
  openWeek: () => openSheet(weekSheet(), 'week'),
  closeSheet: () => { closeSheet(); render(); },
  levelUp: () => { S.levelAsked = S.level; S.level = Math.min(4, S.level + 1); save(); render(); toast('Новые задания добавлены в колоду'); },
  levelStay: () => { S.levelAsked = S.level; save(); render(); },
  albumFilter: el => { UI.albumFilter = el.dataset.f; render(); },
  addAlbum: () => openSheet(albumSheet(), 'album'),
  albType: el => { el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); },
  saveAlbum: () => {
    const text = $('#albText').value.trim(); if (!text) { $('#albText').focus(); return; }
    const k = ($('#albTypes .chip.on') || {}).dataset.k || 'other';
    S.album.push({ id: uid(), type: k, text, date: todayKey() }); save(); closeSheet(); render(); toast('Находка в альбоме себя');
  },
  albumItem: el => {
    const a = S.album.find(x => x.id === el.dataset.id); if (!a) return;
    const ty = ALB_TYPES[a.type] || ALB_TYPES.other;
    openSheet('<div class="grab"></div><div class="small" style="font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:12px">' + ty.name + ' · ' + fmtShort(a.date) + '</div><h2>' + esc(a.text) + '</h2><div class="row"><button class="btn btn-ghost" data-act="closeSheet">Закрыть</button><button class="btn btn-line-rose" data-act="delAlbum" data-id="' + a.id + '">Удалить</button></div>', 'albumItem');
  },
  delAlbum: el => { S.album = S.album.filter(x => x.id !== el.dataset.id); save(); closeSheet(); render(); },
  oporaFilter: el => { UI.oporaFilter = el.dataset.f; render(); },
  anxious: () => {
    const pool = S.stones.filter(s => s.kind !== 'first');
    UI.memo = pool.length ? Object.assign({}, pool[Math.floor(Math.random() * pool.length)]) : { empty: true };
    if (!UI.memo.empty) UI.memo.when = stoneMeta(UI.memo).when;
    render();
  },
  memoNext: () => {
    const pool = S.stones.filter(s => s.kind !== 'first');
    if (pool.length > 1) { let m; do { m = pool[Math.floor(Math.random() * pool.length)]; } while (m.text === UI.memo.text); UI.memo = Object.assign({}, m, { when: stoneMeta(m).when }); }
    render();
  },
  memoClose: () => { UI.memo = null; render(); },
  addPast: () => openSheet(pastSheet(), 'past'),
  period: el => { el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); },
  starter: el => { const ta = $('#pastText'); ta.value = el.dataset.p.replace('…', ' '); ta.focus(); },
  savePast: () => {
    const text = $('#pastText').value.trim(); if (!text) { $('#pastText').focus(); return; }
    const when = ($('#periods .chip.on') || {}).dataset.p || 'Из прошлого';
    S.stones.push({ id: uid(), kind: 'past', text, when, date: todayKey() }); save(); closeSheet(); render(); toast('Камушек в копилке');
  },
  stoneItem: el => {
    const s = S.stones.find(x => x.id === el.dataset.id); if (!s) return;
    const m = stoneMeta(s);
    openSheet('<div class="grab"></div><div class="small" style="font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:12px">' + esc(m.when) + ' · ' + esc(m.label) + '</div><h2>' + esc(s.text) + '</h2>' + (s.note ? '<p style="margin:0;color:var(--soft);line-height:1.5">' + esc(s.note) + '</p>' : '') + '<div class="row"><button class="btn btn-ghost" data-act="closeSheet">Закрыть</button>' + (s.kind === 'first' ? '' : '<button class="btn btn-line-rose" data-act="delStone" data-id="' + s.id + '">Удалить</button>') + '</div>', 'stone');
  },
  delStone: el => { S.stones = S.stones.filter(x => x.id !== el.dataset.id); save(); closeSheet(); render(); },
  month: el => { UI.monthOff = Math.min(0, UI.monthOff + Number(el.dataset.d)); render(); },
  level: el => { S.level = Number(el.dataset.n); S.levelAsked = 0; save(); render(); },
  who: el => { const id = el.dataset.id; if (S.who[id]) delete S.who[id]; else S.who[id] = true; save(); render(); },
  cat: el => { const k = el.dataset.k; if (S.off[k]) delete S.off[k]; else S.off[k] = true; save(); render(); },
  addOwn: () => { const i = $('#ownInput'); const t = i.value.trim(); if (!t) { i.focus(); return; } S.own.push({ id: 'own-' + uid(), t }); save(); render(); toast('Задание добавлено в колоду'); },
  delOwn: el => { S.own = S.own.filter(o => o.id !== el.dataset.id); save(); render(); },
  backup: async () => {
    const data = JSON.stringify(Object.assign({}, S, { exportedAt: new Date().toISOString() }), null, 1);
    const name = 'zabota-kopiya-' + todayKey() + '.json';
    const file = new File([data], name, { type: 'application/json' });
    S.backupAt = todayKey(); save();
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Копия тренажёра' }); render(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); render();
  },
  restore: () => $('#restoreFile').click(),
  reOnb: () => { UI.onbStep = 0; UI.onbWho = Object.assign({}, S.who); S.onboarded = false; save(); render(); },
  play: el => Player.open(el.dataset.p)
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = A[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('change', e => {
  if (e.target.id !== 'restoreFile') return;
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d || !Array.isArray(d.stones)) throw new Error('bad');
      if (!confirm('Заменить текущие данные копией от ' + (d.exportedAt ? fmtShort(d.exportedAt.slice(0, 10)) : 'неизвестной даты') + '?')) return;
      delete d.exportedAt; S = Object.assign(freshState(), d); save(); render(); toast('Копия восстановлена');
    } catch (err) { toast('Это не похоже на копию тренажёра'); }
  };
  rd.readAsText(f);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'ownInput') { e.preventDefault(); A.addOwn(); }
  if (e.key === 'Escape') { if (Player.el) Player.close(); else closeSheet(); }
});

/* ---------- ambient background: singing bowls, chimes, rain stick (synthesised live) ---------- */
const Ambient = {
  ctx: null, master: null, timer: null, next: {}, vol: 0.6,
  start(vol) {
    this.vol = vol;
    if (this.ctx) { this.setVolume(vol); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const ctx = this.ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const sr = ctx.sampleRate;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime(0.32 * vol, ctx.currentTime + 2);
    this.master.connect(ctx.destination);
    // reverb
    const len = Math.floor(sr * 4.5), ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr * 1.3); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    this.verb.connect(lp); lp.connect(wet); wet.connect(this.master);
    this.dry = ctx.createGain(); this.dry.gain.value = 0.75; this.dry.connect(this.master);
    this.rain = this.makeRain();
    const t = ctx.currentTime;
    this.next = { bowl: t + 1.2, chime: t + 9, rain: t + 26, k: 0 };
    this.timer = setInterval(() => this.schedule(), 400);
    this.schedule();
  },
  out(pan) { const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : this.ctx.createGain(); if (p.pan) p.pan.value = pan; p.connect(this.dry); p.connect(this.verb); return p; },
  bowl(f0, at, amp) {
    const ctx = this.ctx, o = this.out((Math.random() - 0.5) * 0.5);
    const ratios = [1, 2.76, 5.18, 8.35], taus = [9, 5, 2.6, 1.4], gains = [1, 0.55, 0.25, 0.1];
    ratios.forEach((r, i) => {
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(amp * gains[i] * 0.5, at + 0.03);
      g.gain.setTargetAtTime(0.0001, at + 0.03, taus[i]);
      g.connect(o);
      const beat = 0.6 + Math.random() * 1.6;
      [0, beat].forEach(det => { const osc = ctx.createOscillator(); osc.frequency.value = f0 * r + det; osc.connect(g); osc.start(at); osc.stop(at + taus[i] * 6); });
    });
  },
  chime(f, at, amp) {
    const ctx = this.ctx, o = this.out((Math.random() - 0.5) * 1.4);
    [[1, 1, 1.1], [2.76, 0.3, 3]].forEach(([r, a, dec]) => {
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(amp * a, at + 0.008); g.gain.setTargetAtTime(0.0001, at + 0.01, 1 / dec); g.connect(o);
      const osc = ctx.createOscillator(); osc.frequency.value = f * r; osc.connect(g); osc.start(at); osc.stop(at + 6);
    });
  },
  makeRain() {
    const ctx = this.ctx, sr = ctx.sampleRate, L = 6.5, n = Math.floor(sr * L);
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), cl = Math.floor(0.012 * sr);
    for (let k = 0; k < 900; k++) {
      const p = Math.random() * L; if (Math.random() > Math.pow(Math.sin(Math.PI * p / L), 1.5)) continue;
      const f = 2200 + Math.random() * 4300, g = 0.2 + Math.random() * 0.8, dec = 350 + Math.random() * 350, i0 = Math.floor(p * sr);
      for (let j = 0; j < cl && i0 + j < n; j++) { const tt = j / sr; d[i0 + j] += g * Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * dec); }
    }
    let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i])); for (let i = 0; i < n; i++) d[i] /= (mx || 1);
    return buf;
  },
  playRain(at) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.rain; src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.16;
    src.connect(bp); bp.connect(g); g.connect(this.out((Math.random() - 0.5) * 0.8)); src.start(at);
  },
  schedule() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, ahead = now + 2, N = this.next;
    const bowls = [146.8, 220.0, 293.7], order = [0, 1, 2, 1];
    while (N.bowl < ahead) { const f = bowls[order[N.k++ % 4]]; this.bowl(f, N.bowl, f < 200 ? 0.42 : 0.32); N.bowl += 18 + Math.random() * 8; }
    const penta = [74, 76, 78, 81, 83, 86, 88];
    while (N.chime < ahead) { const c = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < c; i++) { const m = penta[Math.floor(Math.random() * penta.length)]; this.chime(440 * Math.pow(2, (m - 69) / 12), N.chime + Math.random() * 1.6, 0.025 + Math.random() * 0.02); } N.chime += 20 + Math.random() * 10; }
    while (N.rain < ahead) { this.playRain(N.rain); N.rain += 45 + Math.random() * 15; }
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(0.32 * v, this.ctx.currentTime, 0.2); },
  stop() {
    if (!this.ctx) return;
    const ctx = this.ctx; clearInterval(this.timer); this.timer = null;
    this.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    this.ctx = null;
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 2500);
  }
};

/* ---------- practice player ---------- */
const Player = {
  el: null, type: null, step: 0, t: 0, paused: false, timer: null, audio: null,
  open(type) {
    this.type = type; this.step = 0; this.t = 0; this.paused = false;
    this.el = document.createElement('div'); this.el.className = 'player'; this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true');
    document.body.appendChild(this.el); document.body.style.overflow = 'hidden';
    if (!this.audio) { this.audio = new Audio(); this.audio.preload = 'auto'; }
    // unlock audio on this tap (iOS)
    if (type === 'scan' && S.calm.voice) { this.audio.src = 'audio/01.m4a'; this.audio.play().catch(() => {}); }
    if (S.calm.bg) Ambient.start(S.calm.vol);
    this.draw();
    this.timer = setInterval(() => this.tick(), 1000);
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { e.stopPropagation(); this[b.dataset.p](b); } });
    this.el.addEventListener('input', e => { if (e.target.id === 'volR') { S.calm.vol = Number(e.target.value); Ambient.setVolume(S.calm.vol); save(); } });
  },
  close() {
    clearInterval(this.timer); this.timer = null;
    if (this.audio) { this.audio.pause(); }
    Ambient.stop();
    if (this.el) this.el.remove(); this.el = null; document.body.style.overflow = '';
  },
  toggleVoice() { S.calm.voice = !S.calm.voice; save(); if (!S.calm.voice && this.audio) this.audio.pause(); this.drawTop(); },
  toggleBg() { S.calm.bg = !S.calm.bg; save(); if (S.calm.bg) Ambient.start(S.calm.vol); else Ambient.stop(); this.drawTop(); },
  pause() { this.paused = !this.paused; if (this.audio) { if (this.paused) this.audio.pause(); } this.draw(); },
  next() { this.advance(); },
  exit() { this.close(); },
  steps() {
    if (this.type === 'scan') return PRACTICE_STEPS;
    if (this.type === 'ground') return GROUNDING.map(g => ({ zone: String(g.n), text: g.text, sec: 30 }));
    if (this.type === 'breath') return [{ zone: '', text: '', sec: 120 }];
    return [{ zone: 'Ладонь на сердце', text: 'Положи ладонь на грудь и почувствуй её тепло. Скажи себе то, что сказала бы подруге: «Я рядом. Ты справляешься. Можно не торопиться»', sec: 60 }];
  },
  playVoice() {
    if (this.type !== 'scan' || !S.calm.voice || !this.audio) return;
    this.audio.src = 'audio/' + pad(this.step + 1) + '.m4a';
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  },
  advance() {
    const st = this.steps();
    if (this.step < st.length - 1) { this.step++; this.t = 0; this.playVoice(); this.draw(); }
    else { this.t = st[this.step].sec; this.finished = true; this.draw(); }
  },
  tick() {
    if (this.paused || this.finished) return;
    const st = this.steps()[this.step];
    this.t++;
    if (this.type === 'breath') this.breathTick();
    if (this.t >= st.sec) { if (this.type === 'ground' || this.type === 'heart') { this.finished = this.step >= this.steps().length - 1 && this.type !== 'ground' ? true : this.finished; if (this.type === 'heart') { this.draw(); return; } return; } this.advance(); return; }
    const p = $('#pbar', this.el); if (p) p.style.width = Math.min(100, Math.round(this.t / st.sec * 100)) + '%';
    const rest = $('#prest', this.el); if (rest) { const r = st.sec - this.t; rest.textContent = Math.floor(r / 60) + ':' + pad(r % 60); }
  },
  breathTick() {
    const cyc = this.t % 10, phase = cyc < 4 ? 'Вдох' : 'Выдох';
    const z = $('#bzone', this.el); if (z && z.textContent !== phase) z.textContent = phase;
    const o = $('#borb', this.el); if (o) { if (cyc === 0) { o.style.transition = 'transform 4s ease-in-out'; o.style.transform = 'scale(1)'; } if (cyc === 4) { o.style.transition = 'transform 6s ease-in-out'; o.style.transform = 'scale(.62)'; } }
  },
  drawTop() {
    const top = $('.top', this.el); if (!top) return;
    top.innerHTML = '<button class="icon-btn" aria-label="Закрыть практику" data-p="exit">' + ICON.close + '</button><div class="small" style="color:#CFC6E6;font-weight:700">' + this.label() + '</div><div style="display:flex;gap:8px">' +
      (this.type === 'scan' ? '<button class="icon-btn' + (S.calm.voice ? '' : ' off') + '" aria-pressed="' + S.calm.voice + '" aria-label="Голос" data-p="toggleVoice">' + ICON.voice + '</button>' : '') +
      '<button class="icon-btn' + (S.calm.bg ? '' : ' off') + '" aria-pressed="' + S.calm.bg + '" aria-label="Фоновая музыка" data-p="toggleBg">' + ICON.music + '</button></div>';
    const v = $('#volWrap', this.el); if (v) v.hidden = !S.calm.bg;
  },
  label() { const st = this.steps(); return this.type === 'scan' || this.type === 'ground' ? (this.step + 1) + ' из ' + st.length : this.type === 'breath' ? 'Дыхание 4·6' : 'Ладонь на сердце'; },
  draw() {
    const st = this.steps(), s = st[this.step], fin = this.finished;
    let mid = '';
    if (this.type === 'breath') {
      mid = '<div class="orb" aria-hidden="true"><div class="o1" id="borb" style="transform:scale(.62)"></div><div class="zone" id="bzone">' + (fin ? 'Готово' : 'Вдох') + '</div></div><div class="say">' + (fin ? 'Две минуты спокойного дыхания. Заметь, как ты сейчас' : 'Вдыхай, пока круг растёт, и медленно выдыхай, пока он сжимается') + '</div>';
    } else {
      mid = '<div class="orb' + (this.type === 'ground' ? '' : ' breathe') + (this.paused ? ' paused' : '') + '" aria-hidden="true"><div class="o1"></div><div class="o2"></div><div class="zone">' + esc(fin && this.type !== 'heart' ? 'Готово' : s.zone) + '</div></div><div class="say" aria-live="polite">' + esc(fin && this.type !== 'heart' ? 'Ты справилась. Можно вернуться к своему дню' : s.text) + '</div>';
    }
    let bottom = '';
    if (fin) bottom = '<div style="display:flex;flex-direction:column;gap:10px"><a class="btn btn-gold" href="#today" data-p="exit">Вернуться к заданию</a><button class="btn btn-ghost-dark" style="border:0" data-p="again">Ещё раз</button></div>';
    else if (this.type === 'ground') bottom = '<button class="btn btn-gold" style="width:100%" data-p="next">' + (this.step < st.length - 1 ? 'Дальше' : 'Готово') + '</button>';
    else bottom = '<div style="display:flex;flex-direction:column;gap:12px"><div class="ptrack"><div id="pbar" style="width:' + Math.round(this.t / s.sec * 100) + '%"></div></div>' + (this.type !== 'scan' ? '<div class="small" style="color:#CFC6E6;text-align:center" id="prest"></div>' : '') +
      '<div class="row"><button class="btn btn-ghost-dark" data-p="pause">' + (this.paused ? 'Продолжить' : 'Пауза') + '</button>' + (this.type === 'scan' ? '<button class="btn btn-gold" data-p="next">Дальше</button>' : '') + '</div></div>';
    const bars = this.type === 'scan' || this.type === 'ground' ? '<div class="steps-bar">' + st.map((x, i) => '<div class="' + (i <= this.step ? 'on' : '') + '"></div>').join('') + '</div>' : '';
    this.el.innerHTML = '<div class="top"></div>' + bars + '<div class="mid">' + mid + '</div><div class="vol" id="volWrap"' + (S.calm.bg ? '' : ' hidden') + '><span>Фон</span><input type="range" id="volR" min="0.1" max="1" step="0.05" value="' + S.calm.vol + '" aria-label="Громкость фона"></div><div style="height:12px"></div>' + bottom;
    this.drawTop();
    if (this.type === 'breath' && !fin) setTimeout(() => this.breathTick(), 50);
  },
  again() { this.step = 0; this.t = 0; this.finished = false; this.paused = false; this.playVoice(); this.draw(); }
};
// make ground practice finish on last "Готово"
const _adv = Player.advance.bind(Player);
Player.advance = function () { const st = this.steps(); if (this.type === 'ground' && this.step >= st.length - 1) { this.finished = true; this.draw(); return; } _adv(); };
Player.next = function () { this.advance(); };
const _open = Player.open.bind(Player);
Player.open = function (t) { this.finished = false; _open(t); };
const _tick = Player.tick.bind(Player);
Player.tick = function () {
  if (this.type === 'heart' && !this.paused && !this.finished) {
    const s = this.steps()[0]; this.t++;
    const p = $('#pbar', this.el); if (p) p.style.width = Math.min(100, Math.round(this.t / s.sec * 100)) + '%';
    const r = Math.max(0, s.sec - this.t); const rest = $('#prest', this.el); if (rest) rest.textContent = '0:' + pad(r);
    if (this.t >= s.sec) { this.finished = true; this.draw(); }
    return;
  }
  if (this.type === 'breath' && !this.paused && !this.finished) {
    const s = this.steps()[0]; this.t++; this.breathTick();
    const p = $('#pbar', this.el); if (p) p.style.width = Math.min(100, Math.round(this.t / s.sec * 100)) + '%';
    const r = Math.max(0, s.sec - this.t); const rest = $('#prest', this.el); if (rest) rest.textContent = Math.floor(r / 60) + ':' + pad(r % 60);
    if (this.t >= s.sec) { this.finished = true; this.draw(); }
    return;
  }
  if (this.type === 'ground') return;
  _tick();
};

/* ---------- boot ---------- */
render();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
