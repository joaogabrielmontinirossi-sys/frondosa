'use strict';
/* Frondosa — utilitários, ícones, datas e armazenamento local (IndexedDB) */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const byId = (list, id) => list.find(r => r.id === id);

const LOGO = '<svg viewBox="0 0 512 512"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a7d5c"/><stop offset="1" stop-color="#0f3b30"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#fg)"/><path d="M256 300C214 268 168 262 120 270M256 300C298 268 344 262 392 270" fill="none" stroke="#e7c48d" stroke-width="20" stroke-linecap="round"/><g fill="#7fd08a"><circle cx="150" cy="212" r="76"/><circle cx="362" cy="212" r="76"/><circle cx="256" cy="158" r="100"/></g><g fill="#b4eb9d"><circle cx="222" cy="128" r="50"/><circle cx="330" cy="186" r="34"/><circle cx="134" cy="192" r="32"/></g><g fill="#ffc94d"><circle cx="300" cy="118" r="15"/><circle cx="176" cy="236" r="15"/><circle cx="376" cy="236" r="15"/></g><path d="M176 456C212 428 214 372 210 236H302C298 372 300 428 336 456Z" fill="#e7c48d"/><ellipse cx="256" cy="326" rx="40" ry="50" fill="#33200f"/><circle cx="240" cy="318" r="14" fill="#ffd24a"/><circle cx="272" cy="318" r="14" fill="#ffd24a"/><circle cx="240" cy="318" r="6.5" fill="#1d120a"/><circle cx="272" cy="318" r="6.5" fill="#1d120a"/><path d="M256 330l-8 11 8 10 8-10z" fill="#f29a2e"/></svg>';

const IC = {
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  gear: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  leaf: 'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  zin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
  zout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  cut: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.1 8.1L20 20M20 4L8.1 15.9',
  check: 'M4 12l5 5L20 6',
  sync: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5',
  rep: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  dl: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  up: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  arrowu: 'M12 19V5M6 11l6-6 6 6',
  arrowd: 'M12 5v14M6 13l6 6 6-6',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24"><path d="${IC[n] || ''}"/></svg>`;

/* ---------- Datas e períodos das metas ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MABBR = MONTHS.map(m => m.slice(0, 3));
const dayKey = ts => ymd(new Date(ts));
function fmtRel(ts) {
  const diff = Date.now() - ts, min = 60000;
  if (diff < min) return 'agora';
  if (diff < 60 * min) return `há ${Math.floor(diff / min)} min`;
  if (dayKey(ts) === today()) return `há ${Math.floor(diff / (60 * min))} h`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function fmtDue(s) {
  const n = Math.round((pd(s) - pd(today())) / 864e5), d = pd(s);
  return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : `${d.getDate()} ${MABBR[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

const PERIODS = [
  { id: 'day', name: 'Diárias', hint: 'Hábitos e metas de hoje' },
  { id: 'quarter', name: 'Trimestrais', hint: 'O que conquistar neste trimestre' },
  { id: 'half', name: 'Semestrais', hint: 'O que conquistar neste semestre' },
  { id: 'year', name: 'Anuais', hint: 'Os grandes objetivos do ano' },
];
function pkey(p, d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  return p === 'day' ? ymd(d) : p === 'quarter' ? `${y}-T${Math.floor(m / 3) + 1}` : p === 'half' ? `${y}-S${m < 6 ? 1 : 2}` : String(y);
}
function plabel(p) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  return p === 'day' ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : p === 'quarter' ? `${Math.floor(m / 3) + 1}º trimestre de ${y}` : p === 'half' ? `${m < 6 ? 1 : 2}º semestre de ${y}` : `Ano de ${y}`;
}
function pleft(p) {
  if (p === 'day') return '';
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const end = p === 'quarter' ? new Date(y, Math.floor(m / 3) * 3 + 3, 0) : p === 'half' ? new Date(y, m < 6 ? 6 : 12, 0) : new Date(y, 12, 0);
  const n = Math.round((end - pd(today())) / 864e5);
  return n === 0 ? 'termina hoje' : n === 1 ? 'falta 1 dia' : `faltam ${n} dias`;
}

/* ---------- Banco local ---------- */
const DB = (() => {
  const STORES = ['tasks', 'goals', 'events', 'kv'];
  const SYNCED = ['tasks', 'goals', 'events'];
  let db = null, mem = null, tomb = { id: 'tombstones', items: {} };
  const useMem = () => { mem = {}; STORES.forEach(s => mem[s] = new Map()); };
  const run = (store, mode, fn) => new Promise((res, rej) => {
    const t = db.transaction(store, mode), rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq && rq.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
  return {
    STORES, SYNCED,
    onChange: () => {},
    tomb: () => tomb.items,
    setTomb: t => { tomb = t; },
    saveTomb: () => DB.put('kv', tomb),
    open: () => new Promise(res => {
      try {
        const rq = indexedDB.open('frondosa', 1);
        rq.onupgradeneeded = () => STORES.forEach(s => rq.result.objectStoreNames.contains(s) || rq.result.createObjectStore(s, { keyPath: 'id' }));
        rq.onsuccess = () => { db = rq.result; res(); };
        rq.onerror = rq.onblocked = () => { useMem(); res(); };
      } catch (e) { useMem(); res(); }
    }),
    all: s => mem ? Promise.resolve([...mem[s].values()]) : run(s, 'readonly', o => o.getAll()),
    // raw = gravação vinda da sincronização: não carimba a data de modificação nem dispara novo envio
    put(s, v, raw) {
      if (!raw && SYNCED.includes(s)) { v.mod = Date.now(); DB.onChange(); }
      return mem ? Promise.resolve(mem[s].set(v.id, v)) : run(s, 'readwrite', o => o.put(v)).catch(e => { console.error(e); toast('Não foi possível salvar: armazenamento cheio?'); });
    },
    del(s, id, raw) {
      if (!raw && SYNCED.includes(s)) { tomb.items[s + ':' + id] = Date.now(); DB.saveTomb(); DB.onChange(); }
      return mem ? Promise.resolve(mem[s].delete(id)) : run(s, 'readwrite', o => o.delete(id));
    },
    clear: s => mem ? Promise.resolve(mem[s].clear()) : run(s, 'readwrite', o => o.clear()),
  };
})();

/* ---------- Estado em memória ---------- */
const S = {
  tasks: [], goals: [], events: [],
  set: { id: 'settings', theme: 'auto', gClient: '', gWas: false },
};

const str = v => typeof v === 'string' ? v : '';
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
/* Garante o formato de um registro vindo de fora (sincronização, backup). */
const NORM = {
  tasks: t => ({
    id: str(t.id) || uid(), title: str(t.title), note: str(t.note), due: isDate(t.due) ? t.due : '', done: +t.done || 0, order: +t.order || 0,
    subs: (Array.isArray(t.subs) ? t.subs : []).filter(s => s && typeof s === 'object').map(s => ({ id: str(s.id) || uid(), title: str(s.title), done: !!s.done })),
    created: +t.created || Date.now(), mod: +t.mod || 0, ...(t.seed ? { seed: true } : {}),
  }),
  goals: g => ({
    id: str(g.id) || uid(), period: PERIODS.some(p => p.id === g.period) ? g.period : 'day', title: str(g.title), key: str(g.key), repeat: !!g.repeat,
    done: g.done && typeof g.done === 'object' ? Object.fromEntries(Object.entries(g.done).filter(([, v]) => +v).map(([k, v]) => [k, +v])) : {},
    created: +g.created || Date.now(), mod: +g.mod || 0, ...(g.seed ? { seed: true } : {}),
  }),
  events: e => ({
    id: str(e.id) || uid(), title: str(e.title), date: isDate(e.date) ? e.date : today(), time: /^\d{2}:\d{2}$/.test(e.time) ? e.time : '',
    created: +e.created || Date.now(), mod: +e.mod || 0, ...(e.seed ? { seed: true } : {}),
  }),
};

const Data = {
  put(s, r) { if (!S[s].includes(r)) S[s].push(r); delete r.seed; return DB.put(s, r); },
  del(s, id) { S[s] = S[s].filter(r => r.id !== id); return DB.del(s, id); },
  // restaura um registro excluído (botão Desfazer)
  restore(s, r) { delete DB.tomb()[s + ':' + r.id]; DB.saveTomb(); return Data.put(s, r); },
  raw(s, r) { const i = S[s].findIndex(x => x.id === r.id); if (i >= 0) S[s][i] = r; else S[s].push(r); return DB.put(s, r, true); },
  rawDel(s, id) { S[s] = S[s].filter(r => r.id !== id); return DB.del(s, id, true); },
};

const goalsOf = p => S.goals.filter(g => g.period === p && (g.repeat || g.key === pkey(p))).sort((a, b) => a.created - b.created);
const goalDone = (g, key = pkey(g.period)) => !!g.done[key];
const taskProg = t => t.subs.length ? [t.subs.filter(s => s.done).length, t.subs.length] : [t.done ? 1 : 0, 1];
const sortedTasks = () => S.tasks.slice().sort((a, b) => a.order - b.order || a.created - b.created);

const Store = {
  async load() {
    await DB.open();
    for (const s of DB.SYNCED) S[s] = (await DB.all(s)).map(NORM[s]);
    const kv = await DB.all('kv');
    const st = kv.find(k => k.id === 'settings');
    if (st) Object.assign(S.set, st);
    const tb = kv.find(k => k.id === 'tombstones');
    if (tb) DB.setTomb(tb);
    if (!st && !S.tasks.length && !S.goals.length) Store.seed();
  },
  // seed: true marca os exemplos, descartados se a primeira sincronização já encontrar dados
  seed() {
    const now = Date.now(), plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    const task = (title, due, subs, i) => NORM.tasks({ title, due, order: i, created: now + i, seed: true, subs: subs.map(([t, d]) => ({ title: t, done: !!d })) });
    const goal = (period, title, done, i) => NORM.goals({ period, title, key: pkey(period), repeat: period === 'day', done: done ? { [pkey(period)]: now } : {}, created: now + i, seed: true });
    S.tasks = [
      task('Organizar a casa', plus(3), [['Doar roupas paradas', 1], ['Arrumar a estante'], ['Trocar as lâmpadas'], ['Limpar a varanda']], 0),
      task('Projeto do trabalho', plus(10), [['Definir o escopo', 1], ['Montar o cronograma', 1], ['Primeira entrega'], ['Revisão com a equipe'], ['Apresentação final']], 1),
      task('Cuidar da saúde', '', [['Marcar check-up'], ['Comprar tênis de corrida', 1], ['Planejar o cardápio']], 2),
      task('Viagem de fim de ano', plus(40), [['Escolher o destino', 1], ['Reservar hospedagem'], ['Comprar passagens'], ['Montar o roteiro']], 3),
      task('Estudar inglês', '', [['Assistir às aulas da semana'], ['Praticar conversação']], 4),
    ];
    S.goals = [
      goal('day', 'Beber 2 litros de água', 1, 0), goal('day', 'Ler 20 páginas', 0, 1), goal('day', 'Caminhar 30 minutos', 0, 2),
      goal('quarter', 'Terminar um curso', 0, 3), goal('quarter', 'Guardar parte do salário', 1, 4),
      goal('half', 'Correr 5 km sem parar', 0, 5), goal('half', 'Ler 6 livros', 0, 6),
      goal('year', 'Fazer uma grande viagem', 0, 7), goal('year', 'Aprender algo novo', 1, 8), goal('year', 'Montar a reserva de emergência', 0, 9),
    ];
    S.events = [NORM.events({ title: 'Conhecer a Frondosa', date: today(), time: '', seed: true })];
    for (const s of DB.SYNCED) S[s].forEach(r => DB.put(s, r, true));
    Store.saveSet();
  },
  saveSet: () => DB.put('kv', S.set),
};
