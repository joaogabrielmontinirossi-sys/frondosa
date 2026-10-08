'use strict';
/* Frondosa — tela da árvore, painéis (galho, metas, calendário, ajustes) e ações */

let toastT;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Desfazer</button>' : ''}`;
  el.classList.add('on');
  if (undo) el.querySelector('button').onclick = () => { el.classList.remove('on'); undo(); };
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), undo ? 6500 : 2800);
}

const App = (() => {
  const stage = $('#stage'), world = $('#world'), drawer = $('#drawer');
  const cam = { x: 0, y: 0, k: 1 };
  let view = null;   // painel aberto: { type: 'task' | 'goals' | 'cal' | 'settings', ... }
  let geo = null;    // geometria do último desenho da árvore
  let inst = null;   // convite de instalação guardado (Android/desktop)
  const narrow = () => innerWidth < 760;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  /* ---------- Tema ---------- */
  function applyTheme() {
    const t = S.set.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : S.set.theme;
    document.documentElement.dataset.theme = t;
    $('meta[name=theme-color]').content = t === 'dark' ? '#0b1730' : '#1f6f54';
  }

  /* ---------- Câmera: arrastar, pinça e roda do mouse ---------- */
  const applyCam = () => { world.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.k})`; };
  const glide = () => { world.classList.add('glide'); setTimeout(() => world.classList.remove('glide'), 480); };
  function fit(all) {
    const w = stage.clientWidth, h = stage.clientHeight, top = narrow() ? 62 : 76, bot = narrow() ? 92 : 16, kAll = Math.min(w / geo.W, (h - top - bot) / geo.H);
    cam.k = all ? kAll : Math.max(kAll, Math.min(w / geo.W, narrow() ? .5 : .64));
    cam.x = (w - geo.W * cam.k) / 2;
    cam.y = geo.H * cam.k <= h - top - bot ? top + (h - top - bot - geo.H * cam.k) / 2 : top;
    applyCam();
  }
  function zoomAt(px, py, k2) {
    k2 = clamp(k2, .1, 2.6);
    cam.x = px - (px - cam.x) * k2 / cam.k; cam.y = py - (py - cam.y) * k2 / cam.k; cam.k = k2;
    applyCam();
  }
  function reveal(id) {
    const p = geo.pos[id]; if (!p) return;
    const w = stage.clientWidth - (narrow() ? 0 : 430), h = stage.clientHeight * (narrow() ? .38 : 1);
    cam.k = Math.max(cam.k, narrow() ? .5 : .6); cam.x = w / 2 - p[0] * cam.k; cam.y = h / 2 - p[1] * cam.k;
    glide(); applyCam();
  }
  const ptrs = new Map();
  let moved = false, pinch = 0;
  stage.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) moved = false; pinch = 0; });
  addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p[0], dy = e.clientY - p[1];
    if (ptrs.size === 1) {
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; stage.classList.add('drag'); cam.x += dx; cam.y += dy; applyCam();
    }
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, cam.k * d / pinch);
      pinch = d; moved = true;
    }
  });
  const ptrEnd = e => { ptrs.delete(e.pointerId); pinch = 0; if (!ptrs.size) stage.classList.remove('drag'); };
  addEventListener('pointerup', ptrEnd); addEventListener('pointercancel', ptrEnd);
  stage.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, cam.k * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016))); }, { passive: false });

  /* ---------- Desenho ---------- */
  function render() {
    const n = narrow(), r = Tree.render(n), first = !geo || geo.narrow !== n;
    world.innerHTML = r.svg; world.style.width = r.W + 'px'; world.style.height = r.H + 'px';
    geo = r;
    if (first) fit();
    renderBar();
  }
  function renderBar() {
    const leaves = S.tasks.reduce((a, t) => { const [d, n] = taskProg(t); return [a[0] + d, a[1] + n]; }, [0, 0]), st = Sync.status();
    $('#bar').innerHTML = `<div class="brand">${LOGO}<div><b>Frondosa</b><small>${S.tasks.length} ${S.tasks.length === 1 ? 'galho' : 'galhos'} · ${leaves[0]}/${leaves[1]} folhas em flor</small></div></div>
      <div class="acts"><button class="btn wide" data-act="new">${ic('plus')}<span>Novo galho</span></button><button class="btn ghost wide" data-act="goals">${ic('leaf')}<span>Metas</span></button><button class="btn ghost wide" data-act="cal">${ic('cal')}<span>Calendário</span></button>
      <button class="btn ghost${st ? '' : ' sq'}" data-act="settings" title="Ajustes e sincronização">${ic(Sync.any() ? 'sync' : 'gear')}${st ? `<span class="${/Falha|Reconectar/.test(st) ? 'err' : ''}">${st}</span>` : ''}</button></div>`;
    $('#dock').innerHTML = `<button data-act="goals">${ic('leaf')}<span>Metas</span></button><button class="fab" data-act="new" aria-label="Novo galho">${ic('plus')}</button><button data-act="cal">${ic('cal')}<span>Calendário</span></button>`;
    $('#zoom').innerHTML = `<button data-act="zin" title="Aproximar">${ic('zin')}</button><button data-act="zout" title="Afastar">${ic('zout')}</button><button data-act="fit" title="Ver a árvore inteira">${ic('fit')}</button>`;
  }

  /* ---------- Painel lateral ---------- */
  function open(v) { view = v; drawer.classList.add('on'); $('#scrim').classList.add('on'); draw(); }
  function close() { view = null; drawer.classList.remove('on'); $('#scrim').classList.remove('on'); }
  const head = (kicker, title) => `<header class="dh"><div><small>${kicker}</small>${title ? `<h2>${title}</h2>` : ''}</div><button class="icb" data-act="close" aria-label="Fechar">${ic('x')}</button></header>`;
  function draw() {
    if (!view) return;
    const y = drawer.scrollTop;
    drawer.innerHTML = { task: taskView, goals: goalsView, cal: calView, settings: settingsView }[view.type]();
    drawer.scrollTop = y;
  }

  function taskView() {
    const t = byId(S.tasks, view.id); if (!t) { close(); return ''; }
    const [dn, tot] = taskProg(t), list = sortedTasks(), i = list.indexOf(t);
    return `${head('Galho · tarefa')}
      <input class="title" data-f="title" value="${esc(t.title)}" placeholder="Nome do galho" maxlength="80">
      <div class="prog"><i style="width:${Math.round(dn / tot * 100)}%"></i></div>
      <p class="muted sm">${t.subs.length ? `${dn} de ${tot} ${tot === 1 ? 'ramo floriu' : 'ramos floriram'}` : 'Sem ramos: o próprio galho é a tarefa.'}</p>
      <div class="row"><label class="fld">Prazo<input type="date" data-f="due" value="${t.due}"></label><button class="btn ${t.done ? '' : 'ghost'}" data-act="tdone" data-id="${t.id}">${ic('check')}<span>${t.done ? 'Concluído' : 'Concluir'}</span></button></div>
      <h4>Ramos · subtarefas</h4>
      <ul class="list">${t.subs.map(s => `<li class="${s.done ? 'done' : ''}"><label class="ck"><input type="checkbox" data-ck="sub" data-sub="${s.id}"${s.done ? ' checked' : ''}><i>${ic('check')}</i></label><input class="li-t" data-subt="${s.id}" value="${esc(s.title)}" placeholder="Ramo" maxlength="80"><button class="icb sm" data-act="subdel" data-sub="${s.id}" aria-label="Remover ramo">${ic('x')}</button></li>`).join('')}</ul>
      <form class="add" data-form="sub"><input placeholder="Novo ramo…" maxlength="80" enterkeyhint="done"><button class="btn sq" aria-label="Adicionar">${ic('plus')}</button></form>
      <h4>Anotações</h4>
      <textarea data-f="note" rows="4" placeholder="Detalhes, links, ideias…">${esc(t.note)}</textarea>
      <footer class="df"><div class="inl"><button class="btn ghost sq" data-act="tmove" data-d="-1" title="Subir na árvore"${i <= 0 ? ' disabled' : ''}>${ic('arrowu')}</button><button class="btn ghost sq" data-act="tmove" data-d="1" title="Descer na árvore"${i >= list.length - 1 ? ' disabled' : ''}>${ic('arrowd')}</button></div><button class="btn ghost danger" data-act="tdel">${ic('cut')}<span>Podar galho</span></button></footer>`;
  }

  function goalsView() {
    const p = PERIODS.find(x => x.id === view.p), goals = goalsOf(p.id), dn = goals.filter(g => goalDone(g)).length, left = pleft(p.id);
    return `${head('Copa · metas pessoais')}
      <div class="tabs">${PERIODS.map(x => { const gs = goalsOf(x.id); return `<button class="${x.id === p.id ? 'on' : ''}" data-act="gtab" data-p="${x.id}">${x.name}<small>${gs.filter(g => goalDone(g)).length}/${gs.length}</small></button>`; }).join('')}</div>
      <div class="period"><b>${esc(plabel(p.id))}</b>${left ? `<span>${left}</span>` : ''}</div>
      <div class="prog gold"><i style="width:${goals.length ? Math.round(dn / goals.length * 100) : 0}%"></i></div>
      <ul class="list">${goals.map(g => `<li class="${goalDone(g) ? 'done' : ''}"><label class="ck gold"><input type="checkbox" data-ck="goal" data-id="${g.id}"${goalDone(g) ? ' checked' : ''}><i>${ic('check')}</i></label><input class="li-t" data-goalt="${g.id}" value="${esc(g.title)}" placeholder="Meta" maxlength="100"><button class="icb sm${g.repeat ? ' act' : ''}" data-act="grep" data-id="${g.id}" title="${g.repeat ? 'Repete a cada período' : 'Só neste período'}">${ic('rep')}</button><button class="icb sm" data-act="gdel" data-id="${g.id}" aria-label="Remover meta">${ic('x')}</button></li>`).join('') || `<li class="empty">${p.hint}. Cada meta vira uma folha na copa; ao cumprir, ela vira fruto.</li>`}</ul>
      <form class="add" data-form="goal"><input placeholder="Nova meta ${p.name.toLowerCase().replace(/s$/, '')}…" maxlength="100" enterkeyhint="done"><button class="btn sq" aria-label="Adicionar">${ic('plus')}</button></form>
      <p class="muted sm">${ic('rep')} ${p.id === 'day' ? 'Metas diárias repetem todo dia e recomeçam à meia-noite.' : 'Ative a repetição para a meta voltar a cada período; sem ela, a meta vale só para o período atual.'}</p>`;
  }

  const dayItems = d => ({ ev: S.events.filter(e => e.date === d).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')), tk: S.tasks.filter(t => t.due === d), gl: S.goals.filter(g => g.period === 'day' && (g.repeat || g.key === d)) });
  function calView() {
    const [y, m] = view.month.split('-').map(Number), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), td = today();
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const k = `${y}-${pad(m)}-${pad(d)}`, it = dayItems(k), gd = it.gl.filter(g => g.done[k]).length;
      cells += `<button class="${k === td ? 'today ' : ''}${k === view.sel ? 'sel' : ''}" data-act="calday" data-d="${k}">${d}<i>${it.ev.length ? '<b class="d-ev"></b>' : ''}${it.tk.length ? `<b class="d-tk${it.tk.every(t => t.done) ? ' ok' : ''}"></b>` : ''}${gd && gd === it.gl.length ? '<b class="d-gl"></b>' : ''}</i></button>`;
    }
    const it = dayItems(view.sel), sd = pd(view.sel), gd = it.gl.filter(g => g.done[view.sel]).length;
    return `${head('Oco da coruja · calendário')}
      <div class="calnav"><button class="icb" data-act="calmv" data-d="-1" aria-label="Mês anterior">${ic('left')}</button><b>${MONTHS[m - 1]} de ${y}</b><button class="icb" data-act="calmv" data-d="1" aria-label="Próximo mês">${ic('right')}</button><button class="btn ghost sm" data-act="caltoday">Hoje</button></div>
      <div class="cal"><div class="wd">${'DSTQQSS'.split('').map(c => `<span>${c}</span>`).join('')}</div><div class="grid">${cells}</div></div>
      <div class="legend"><span><b class="d-ev"></b>evento</span><span><b class="d-tk"></b>prazo de galho</span><span><b class="d-gl"></b>metas do dia cumpridas</span></div>
      <h4>${view.sel === td ? 'Hoje, ' : ''}${sd.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
      <ul class="list">${it.ev.map(e => `<li><span class="dot d-ev"></span><span class="time">${e.time || 'dia todo'}</span><input class="li-t" data-evt="${e.id}" value="${esc(e.title)}" maxlength="100"><button class="icb sm" data-act="evdel" data-id="${e.id}" aria-label="Remover evento">${ic('x')}</button></li>`).join('')}
      ${it.tk.map(t => `<li class="${t.done ? 'done' : ''}"><span class="dot d-tk"></span><button class="lnk" data-act="task" data-id="${t.id}">${esc(t.title || 'Galho')}</button><span class="time">${taskProg(t).join('/')}</span></li>`).join('')}
      ${it.gl.length && view.sel <= td ? `<li><span class="dot d-gl"></span><button class="lnk" data-act="goals" data-p="day">Metas diárias</button><span class="time">${gd}/${it.gl.length}</span></li>` : ''}
      ${!it.ev.length && !it.tk.length ? '<li class="empty">Nada marcado para este dia.</li>' : ''}</ul>
      <form class="add" data-form="event"><input placeholder="Novo evento…" maxlength="100" enterkeyhint="done"><input type="time" aria-label="Horário"><button class="btn sq" aria-label="Adicionar">${ic('plus')}</button></form>`;
  }

  function settingsView() {
    const s = S.set, g = Sync.g, on = Sync.gOn(), canInst = !Sync.avail && !standalone() && location.protocol === 'https:' && (inst || isIOS());
    const done = S.tasks.filter(t => t.done).length;
    return `${head('Ajustes', 'Frondosa')}
      <h4>Aparência</h4>
      <div class="seg">${[['auto', 'Automático'], ['light', 'Dia'], ['dark', 'Noite']].map(([v, n]) => `<button class="${s.theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${n}</button>`).join('')}</div>
      <h4>Sincronização · pasta do Google Drive</h4>
      ${Sync.avail ? `<p class="muted sm">Como nos seus outros aplicativos: a Frondosa grava <b>frondosa-sync.json</b> numa pasta sincronizada, e o Drive leva aos outros computadores.</p>
        <p>${Sync.on ? `Ativa em <b>${esc(Sync.folder || '')}</b>${Sync.error ? `<br><span class="err">${esc(Sync.error)}</span>` : Sync.last ? ` · ${fmtRel(Sync.last)}` : ''}` : Sync.detected ? 'Desativada. Google Drive encontrado neste computador.' : 'Desativada. Não encontrei o Google Drive; escolha uma pasta sincronizada.'}</p>
        <div class="inl wrap">${Sync.on ? '<button class="btn ghost sm" data-act="foff">Desativar</button>' : Sync.detected ? '<button class="btn sm" data-act="fauto">Ativar no Google Drive</button>' : ''}${Sync.drives.filter(d => d !== Sync.folder).map(d => `<button class="btn ghost sm" data-act="fdrive" data-path="${esc(d)}">Usar ${esc(d.slice(0, 2))}</button>`).join('')}<button class="btn ghost sm" data-act="fpick">Escolher outra pasta…</button></div>`
      : '<p class="muted sm">Disponível no programa de Windows (Frondosa.exe). No site e no celular, use a conta Google abaixo.</p>'}
      <h4>Sincronização · conta Google (Windows, site e celular)</h4>
      <p class="muted sm">Com a sua conta Google, a mesma árvore aparece no .exe, no site e no celular (os dados ficam na área privada do aplicativo no seu Google Drive). O Google exige um “ID do cliente” gratuito, criado uma vez só. <button class="lnk" data-act="gguide">Ver o passo a passo</button></p>
      <label class="fld">ID do cliente OAuth<input data-s="gClient" value="${esc(s.gClient)}" placeholder="0000000000-xxxxxxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false"></label>
      <p>${on ? `Conectado${g.error ? `<br><span class="err">${esc(g.error)}</span>` : g.last ? ` · sincronizado ${fmtRel(g.last)}` : ''}` : s.gWas ? '<span class="err">A sessão do Google expirou (ela dura cerca de 1 hora). Clique em Reconectar.</span>' : 'Não conectado.'}</p>
      <div class="inl wrap"><button class="btn sm" data-act="gcon">${on || s.gWas ? 'Reconectar' : 'Conectar ao Google'}</button>${on ? '<button class="btn ghost sm" data-act="gnow">Sincronizar agora</button>' : ''}${on || s.gWas ? '<button class="btn ghost sm" data-act="goff">Desconectar</button>' : ''}</div>
      <div id="guide" hidden><ol>
        <li>Abra <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">console.cloud.google.com</a> com a sua conta Google e crie um projeto (ou use o mesmo dos seus outros aplicativos).</li>
        <li>Em <b>APIs e serviços › Biblioteca</b>, ative a <b>Google Drive API</b>.</li>
        <li>Em <b>Tela de permissão OAuth</b>, escolha <b>Externo</b>, preencha o nome e o seu e-mail, e adicione o seu e-mail em <b>Usuários de teste</b>.</li>
        <li>Em <b>Credenciais › Criar credenciais › ID do cliente OAuth</b>, tipo <b>Aplicativo da Web</b>. Em <b>Origens JavaScript autorizadas</b>, adicione:<br><code>https://joaogabrielmontinirossi-sys.github.io</code><br><code>http://localhost:${PORT}</code>${new RegExp('github\\.io|localhost:' + PORT).test(location.origin) || !/^http/.test(location.origin) ? '' : `<br><code>${esc(location.origin)}</code>`}</li>
        <li>Copie o <b>ID do cliente</b>, cole acima e clique em <b>Conectar ao Google</b>. Repita só a colagem em cada aparelho.</li></ol>
        <p class="muted sm">O ID do cliente não é uma senha: ele só identifica o aplicativo. O acesso é autorizado por você na janela do próprio Google e pode ser revogado em myaccount.google.com › Segurança.</p></div>
      <h4>Dados</h4>
      <div class="inl wrap"><button class="btn ghost sm" data-act="export">${ic('dl')}<span>Exportar backup</span></button><button class="btn ghost sm" data-act="import">${ic('up')}<span>Importar…</span></button>${done ? `<button class="btn ghost sm" data-act="prune">${ic('cut')}<span>Podar ${done} ${done === 1 ? 'galho concluído' : 'galhos concluídos'}</span></button>` : ''}<button class="btn ghost sm danger" data-act="wipe">${ic('trash')}<span>Apagar tudo</span></button></div>
      ${canInst ? `<h4>Aplicativo</h4><p class="muted sm">${inst ? 'Instale a Frondosa para abrir em tela cheia, com ícone próprio e sem internet.' : 'No iPhone/iPad: toque em Compartilhar e depois em “Adicionar à Tela de Início”.'}</p>${inst ? `<button class="btn sm" data-act="install">${ic('dl')}<span>Instalar o aplicativo</span></button>` : ''}` : ''}
      <p class="muted sm about">Frondosa 1.0 · suas tarefas são galhos, suas metas são a copa.</p>`;
  }

  /* ---------- Ações ---------- */
  const cur = () => view && view.type === 'task' ? byId(S.tasks, view.id) : null;
  const refresh = () => { render(); draw(); };
  function afterSubs(t) {
    const all = t.subs.length > 0 && t.subs.every(s => s.done);
    if (all && !t.done) { t.done = Date.now(); toast(`Galho florido: ${t.title || 'tarefa'} 🌸`); }
    else if (!all && t.done && t.subs.length) t.done = 0;
    Data.put('tasks', t); refresh();
  }
  function toggleTask(t) {
    t.done = t.done ? 0 : Date.now();
    if (t.done) { t.subs.forEach(s => s.done = true); toast(`Galho florido: ${t.title || 'tarefa'} 🌸`); }
    Data.put('tasks', t); refresh();
  }
  function removeTask(t) {
    Data.del('tasks', t.id); close(); render();
    toast(`Galho podado: ${t.title || 'tarefa'}`, () => { Data.restore('tasks', t); render(); });
  }
  const busy = async (b, fn) => { b.disabled = true; try { await fn(); } catch (e) { toast(e.message || 'Não foi possível concluir'); } refresh(); };

  const ACT = {
    close,
    fit: () => { glide(); fit(true); },
    zin: () => { glide(); zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, cam.k * 1.35); },
    zout: () => { glide(); zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, cam.k / 1.35); },
    new() {
      const t = NORM.tasks({ title: '', order: (Math.max(-1, ...S.tasks.map(x => x.order)) + 1) });
      Data.put('tasks', t); render(); open({ type: 'task', id: t.id }); reveal(t.id);
      const inp = $('.title', drawer); if (inp && !narrow()) inp.focus();
    },
    task: b => open({ type: 'task', id: b.dataset.id }),
    sub(b) { const t = byId(S.tasks, b.dataset.id), s = t && byId(t.subs, b.dataset.sub); if (!s) return; s.done = !s.done; if (s.done && !t.subs.every(x => x.done)) toast(`Floriu: ${s.title || 'ramo'}`); afterSubs(t); },
    tdone(b) { const t = byId(S.tasks, b.dataset.id); if (t) toggleTask(t); },
    tdel() { const t = cur(); if (t) removeTask(t); },
    tmove(b) {
      const list = sortedTasks(), i = list.indexOf(cur()), j = i + +b.dataset.d; if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((t, n) => { if (t.order !== n) { t.order = n; Data.put('tasks', t); } });
      refresh(); reveal(view.id);
    },
    subdel(b) { const t = cur(); t.subs = t.subs.filter(s => s.id !== b.dataset.sub); afterSubs(t); },
    goals: b => open({ type: 'goals', p: b.dataset.p || (view && view.type === 'goals' ? view.p : 'day') }),
    gtab(b) { view.p = b.dataset.p; draw(); },
    grep(b) { const g = byId(S.goals, b.dataset.id); g.repeat = !g.repeat; if (!g.repeat) g.key = pkey(g.period); Data.put('goals', g); draw(); },
    gdel(b) { const g = byId(S.goals, b.dataset.id); Data.del('goals', g.id); refresh(); toast('Meta removida', () => { Data.restore('goals', g); refresh(); }); },
    cal: () => open({ type: 'cal', month: today().slice(0, 7), sel: today() }),
    calmv(b) { const [y, m] = view.month.split('-').map(Number), d = new Date(y, m - 1 + +b.dataset.d, 1); view.month = ymd(d).slice(0, 7); draw(); },
    caltoday() { view.month = today().slice(0, 7); view.sel = today(); draw(); },
    calday(b) { view.sel = b.dataset.d; draw(); },
    evdel(b) { const e = byId(S.events, b.dataset.id); Data.del('events', e.id); refresh(); toast('Evento removido', () => { Data.restore('events', e); refresh(); }); },
    settings: () => open({ type: 'settings' }),
    theme(b) { S.set.theme = b.dataset.v; Store.saveSet(); applyTheme(); draw(); },
    foff: b => busy(b, () => Sync.config('off')),
    fauto: b => busy(b, () => Sync.config('auto')),
    fdrive: b => busy(b, () => Sync.config(b.dataset.path)),
    fpick: b => { toast('Escolha a pasta na janela que abriu'); busy(b, () => Sync.config('choose')); },
    gcon(b) {
      const v = $('[data-s=gClient]').value.trim();
      if (!/\.apps\.googleusercontent\.com$/.test(v)) return toast('Cole o ID do cliente OAuth (termina em .apps.googleusercontent.com)');
      S.set.gClient = v; Store.saveSet(); busy(b, () => Sync.connect());
    },
    gnow: b => busy(b, () => Sync.run()),
    goff() { Sync.disconnect(); refresh(); },
    gguide() { const g = $('#guide'); g.hidden = !g.hidden; if (!g.hidden) g.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    export() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(Sync.payload(), null, 1)], { type: 'application/json' }));
      a.download = `frondosa-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    import: () => $('#filepick').click(),
    prune() {
      const gone = S.tasks.filter(t => t.done); gone.forEach(t => Data.del('tasks', t.id)); refresh();
      toast(`${gone.length} ${gone.length === 1 ? 'galho podado' : 'galhos podados'}`, () => { gone.forEach(t => Data.restore('tasks', t)); refresh(); });
    },
    async wipe(b) {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('span').textContent = 'Clique de novo para apagar tudo'; return; }
      if (Sync.on) await Sync.api('sync/config', { method: 'POST', body: 'off' }).catch(() => {});
      Sync.on = false; Sync.disconnect();
      for (const s of DB.STORES) await DB.clear(s);
      location.reload();
    },
    async install() { if (!inst) return; inst.prompt(); await inst.userChoice.catch(() => {}); inst = null; draw(); },
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (stage.contains(b) && moved) return;
    const fn = ACT[b.dataset.act]; if (fn) fn(b, e);
  });
  drawer.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.ck === 'sub') { const t = cur(), s = byId(t.subs, el.dataset.sub); s.done = el.checked; afterSubs(t); }
    else if (el.dataset.ck === 'goal') {
      const g = byId(S.goals, el.dataset.id), k = pkey(g.period);
      if (el.checked) g.done[k] = Date.now(); else delete g.done[k];
      Data.put('goals', g); refresh();
      const gs = goalsOf(g.period); if (el.checked && gs.every(x => goalDone(x))) toast(`Copa em fruto: todas as metas ${PERIODS.find(p => p.id === g.period).name.toLowerCase()} cumpridas 🍊`);
    }
    else if (el.dataset.f === 'due') { const t = cur(); t.due = isDate(el.value) ? el.value : ''; Data.put('tasks', t); render(); }
    else if (el.dataset.s === 'gClient') { S.set.gClient = el.value.trim(); Store.saveSet(); }
  });
  // os textos são gravados enquanto se digita; só a árvore é redesenhada, para o campo não perder o foco
  const typed = debounce(() => render(), 250);
  drawer.addEventListener('input', e => {
    const el = e.target, d = el.dataset;
    if (d.f === 'title' || d.f === 'note') { const t = cur(); t[d.f] = el.value; Data.put('tasks', t); }
    else if (d.subt) { const t = cur(); byId(t.subs, d.subt).title = el.value; Data.put('tasks', t); }
    else if (d.goalt) { const g = byId(S.goals, d.goalt); g.title = el.value; Data.put('goals', g); }
    else if (d.evt) { const ev = byId(S.events, d.evt); ev.title = el.value; Data.put('events', ev); }
    else return;
    typed();
  });
  drawer.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target, inp = $('input', form), v = inp.value.trim(); if (!v) return inp.focus();
    const kind = form.dataset.form;
    if (kind === 'sub') { const t = cur(); t.subs.push({ id: uid(), title: v, done: false }); afterSubs(t); }
    else if (kind === 'goal') { Data.put('goals', NORM.goals({ period: view.p, title: v, key: pkey(view.p), repeat: view.p === 'day' })); refresh(); }
    else if (kind === 'event') { Data.put('events', NORM.events({ title: v, date: view.sel, time: $('input[type=time]', form).value })); refresh(); }
    const again = $(`form[data-form=${kind}] input`, drawer); if (again) again.focus();
  });
  $('#filepick').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== 'frondosa') throw 0;
      // um backup traz de volta também o que foi excluído depois dele
      for (const s of DB.SYNCED) for (const r of j.stores[s] || []) delete DB.tomb()[s + ':' + r.id];
      j.tomb = {}; const ch = await Sync.merge(j); DB.saveTomb(); DB.onChange();
      refresh(); toast(ch ? 'Backup importado' : 'Nada novo neste backup');
    } catch (err) { toast('Este arquivo não é um backup da Frondosa'); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && view) close(); });
  addEventListener('resize', debounce(() => { const n = narrow(); if (geo && geo.narrow !== n) render(); }, 150));
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); inst = e; });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  async function init() {
    await Store.load();
    applyTheme();
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    if (/^https?:$/.test(location.protocol)) await Sync.init();
    // virada do dia: as metas diárias recomeçam e o calendário da coruja muda de folha
    let day = today();
    setInterval(() => { if (today() !== day) { day = today(); refresh(); } else renderBar(); }, 60000);
  }

  return { init, open, synced(changed) { if (changed) refresh(); else { renderBar(); if (view && view.type === 'settings') draw(); } } };
})();

App.init();
