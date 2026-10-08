'use strict';
/* Frondosa — desenho da árvore: SVG gerado a partir dos galhos (tarefas), ramos (subtarefas) e copas (metas). */

const Tree = (() => {
  const f = n => Math.round(n * 10) / 10;
  // número estável entre 0 e 1 a partir de um texto: cada galho mantém a sua forma entre um desenho e outro
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
  const bez = (p, t) => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]]; };
  const tang = (p, t) => { const u = 1 - t, a = 3 * u * u, b = 6 * u * t, c = 3 * t * t; return [a * (p[1][0] - p[0][0]) + b * (p[2][0] - p[1][0]) + c * (p[3][0] - p[2][0]), a * (p[1][1] - p[0][1]) + b * (p[2][1] - p[1][1]) + c * (p[3][1] - p[2][1])]; };
  // contorno de um galho: grosso na base (w0), fino na ponta (w1)
  function taper(p, w0, w1, n = 16) {
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, [x, y] = bez(p, t), [dx, dy] = tang(p, t), l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * Math.pow(t, 0.75)) / 2, nx = -dy / l * w, ny = dx / l * w;
      L.push(f(x + nx) + ' ' + f(y + ny)); R.unshift(f(x - nx) + ' ' + f(y - ny));
    }
    return 'M' + L.join('L') + 'L' + R.join('L') + 'Z';
  }
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  const delay = id => `style="animation-delay:-${f(hash(id) * 6)}s"`;

  function leaf(x, y, ang, len, cls, id) {
    const a = len * .25, b = len * .75, h = len * .36;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><g class="sway" ${delay(id)}><path class="${cls}" d="M0 0C${f(a)} ${f(-h)} ${f(b)} ${f(-h)} ${len} 0C${f(b)} ${f(h)} ${f(a)} ${f(h)} 0 0Z"/><path class="rib" d="M3 0H${f(len * .78)}"/></g></g>`;
  }
  function flower(x, y, r, id) {
    let p = '';
    for (let i = 0; i < 5; i++) p += `<ellipse class="petal" cx="0" cy="${f(-r * .62)}" rx="${f(r * .42)}" ry="${f(r * .6)}" transform="rotate(${i * 72})"/>`;
    return `<g transform="translate(${f(x)} ${f(y)})"><g class="sway" ${delay(id)}>${p}<circle class="pollen" r="${f(r * .3)}"/></g></g>`;
  }
  const fruit = (x, y, r) => `<g transform="translate(${f(x)} ${f(y)})"><path class="stem" d="M0 ${f(-r * .8)}q2 ${f(-r * .5)} ${f(r * .5)} ${f(-r * .7)}"/><circle class="fruit" r="${r}"/><circle class="shine" cx="${f(-r * .32)}" cy="${f(-r * .32)}" r="${f(r * .26)}"/></g>`;

  function render(narrow) {
    const tasks = sortedTasks();
    const G = narrow
      ? { W: 820, L: 350, hw: 66, SP: 218, crown: 740, rise: 90, SW: 190, SH: 52, t0: 0.38, cl: [[-195, 205], [195, 205], [-205, 485], [205, 485]], cr: 140, back: [[0, 450, 240], [0, 210, 150]], hy: 150 }
      : { W: 2200, L: 840, hw: 105, SP: 280, crown: 610, rise: 150, SW: 204, SH: 46, t0: 0.47, cl: [[-640, 345], [-225, 195], [225, 195], [640, 345]], cr: 178, back: [[0, 340, 275], [-430, 380, 215], [430, 380, 215]], hy: 215 };
    const { W, L, hw, SP, SW, SH } = G, cx = W / 2, k = hw / 105, c = G.crown;
    const rows = Math.max(Math.ceil(tasks.length / 2), 2);
    const y0 = c + (narrow ? 290 : 265), base = y0 + (rows - 1) * SP + SP * .45 + 300, H = base + 170;
    const pos = {};
    let o = '';

    /* ----- céu e chão ----- */
    for (let i = 0; i < 36; i++) o += `<circle class="star" cx="${f(hash('sx' + i) * W * 1.3 - W * .15)}" cy="${f(hash('sy' + i) * c * 1.1 - 60)}" r="${f(1.5 + hash('sr' + i) * 2.5)}" ${delay('st' + i)}/>`;
    o += `<circle class="glow" cx="${W - 170 * k}" cy="${150 * k}" r="${120 * k}"/><circle class="sun" cx="${W - 170 * k}" cy="${150 * k}" r="${62 * k}"/><circle class="crater" cx="${W - 150 * k}" cy="${135 * k}" r="${50 * k}"/>`;
    [[.06, 250, 1], [.8, 430, .8], [.3, 60, .7]].forEach(([x, y, s], i) => { o += `<g class="cloud c${i}" transform="translate(${f(W * x)} ${y * k}) scale(${f(s * (narrow ? .7 : 1.2))})"><ellipse cx="0" cy="0" rx="70" ry="26"/><ellipse cx="-34" cy="-18" rx="38" ry="26"/><ellipse cx="20" cy="-26" rx="46" ry="34"/><ellipse cx="62" cy="-8" rx="34" ry="22"/></g>`; });
    o += `<ellipse class="hill2" cx="${f(cx - W * .42)}" cy="${base + 250}" rx="${f(W * .7)}" ry="330"/><ellipse class="hill2" cx="${f(cx + W * .5)}" cy="${base + 290}" rx="${f(W * .6)}" ry="330"/><ellipse class="hill" cx="${cx}" cy="${base + 262}" rx="${f(W * .8)}" ry="330"/>`;

    /* ----- ramos que sustentam as copas ----- */
    G.cl.forEach(([dx, cy]) => {
      const sx = cx + Math.sign(dx) * hw * .35, sy = c + 80, tx = cx + dx;
      o += `<path class="bark" d="${taper([[sx, sy], [sx, sy - 140 * k], [tx - dx * .35, cy + 170 * k], [tx, cy]], hw * .8, 14 * k)}"/>`;
    });

    /* ----- galhos (tarefas) ----- */
    tasks.forEach((t, i) => {
      const s = i % 2 ? 1 : -1, row = Math.floor(i / 2), y = y0 + row * SP + (s > 0 ? SP * .45 : 0), m = t.subs.length;
      const lf = (.76 + .24 * Math.min(1, m / 6)) * (.94 + .06 * hash(t.id + 'l')), rise = G.rise * (.8 + .4 * hash(t.id + 'r'));
      const P = [[cx + s * hw * .4, y], [cx + s * (hw + L * lf * .3), y + 14], [cx + s * L * lf * .72, y - rise * .85], [cx + s * L * lf, y - rise]];
      const yAt = x => { let b = 0, bd = 1e9; for (let q = 0; q <= 50; q++) { const d = Math.abs(bez(P, q / 50)[0] - x); if (d < bd) { bd = d; b = q / 50; } } return bez(P, b)[1]; };
      const w0 = hw * .5, d = taper(P, w0, 7 * k + 2);
      const sx = cx + s * (hw + 28 + SW / 2), sy = yAt(sx) + 40 * (narrow ? 1.05 : 1), [dn, tot] = taskProg(t), late = t.due && !t.done && t.due < today();
      pos[t.id] = [f(cx + s * L * lf * .5), f(y - rise * .4)];
      let g = `<path class="rope" d="M${f(sx - SW * .3)} ${f(yAt(sx - SW * .3))}V${f(sy + 4)}M${f(sx + SW * .3)} ${f(yAt(sx + SW * .3))}V${f(sy + 4)}"/><path class="bark2" transform="translate(0 7)" d="${d}"/><path class="bark" d="${d}"/>`;
      let top = '';
      if (!m) {
        const [tx, ty] = P[3];
        top += `<g data-act="tdone" data-id="${t.id}" class="hit"><circle cx="${f(tx + s * 18)}" cy="${f(ty - 14)}" r="${narrow ? 44 : 32}" class="hitc"/>${t.done ? flower(tx + s * 14, ty - 12, narrow ? 24 : 20, t.id) : leaf(tx, ty, s > 0 ? -35 : -145, narrow ? 50 : 44, 'l1', t.id)}</g>`;
      }
      t.subs.forEach((sub, j) => {
        const tt = m === 1 ? .985 : G.t0 + (.985 - G.t0) * j / (m - 1), up = narrow || j % 2 === 0, lvl = narrow ? j % 2 : Math.floor(j / 2) % 2;
        const h = narrow ? [58, 88][lvl] : up ? [62, 104][lvl] : [44, 76][lvl], dir = up ? -1 : 1;
        const [bx, by] = bez(P, tt), tx = bx + s * h * .45, ty = by + dir * h;
        g += `<path class="bark" d="${taper([[bx, by], [bx + s * h * .04, by + dir * h * .5], [tx - s * h * .12, ty - dir * h * .3], [tx, ty]], 9 * k + 2, 3)}"/>`;
        const ang = Math.atan2(dir * .8, s) * 180 / Math.PI, len = narrow ? 46 : 42;
        top += `<g data-act="sub" data-id="${t.id}" data-sub="${sub.id}" class="hit"><title>${esc(sub.title)}</title><circle cx="${f(tx + s * 16)}" cy="${f(ty + dir * 12)}" r="${narrow ? 40 : 30}" class="hitc"/>${sub.done ? flower(tx + s * 12, ty + dir * 10, narrow ? 22 : 19, sub.id) : leaf(tx, ty, ang, len, 'l' + (1 + Math.floor(hash(sub.id) * 3)), sub.id)}`;
        if (!narrow) top += `<text class="sub-t${sub.done ? ' done' : ''}" x="${f(tx + s * 18)}" y="${f(up ? ty - 36 : ty + 48)}" text-anchor="middle">${esc(cut(sub.title || 'Ramo', 17))}</text>`;
        top += '</g>';
      });
      // plaquinha pendurada com o nome da tarefa
      const tx0 = sx - SW / 2;
      g += `<rect class="sign-b" x="${f(tx0)}" y="${f(sy)}" width="${SW}" height="${SH}" rx="11"/><text class="sign-t" x="${f(sx)}" y="${f(sy + SH / 2 + (narrow ? 4 : 3))}" text-anchor="middle">${t.done ? '✓ ' : ''}${esc(cut(t.title || 'Novo galho', narrow ? 14 : 17))}</text><rect class="sign-tr" x="${f(tx0 + 14)}" y="${f(sy + SH - 10)}" width="${SW - 28}" height="4" rx="2"/><rect class="sign-p" x="${f(tx0 + 14)}" y="${f(sy + SH - 10)}" width="${f((SW - 28) * dn / tot)}" height="4" rx="2"/>`;
      if (t.due && !t.done) g += `<text class="due${late ? ' late' : ''}" x="${f(sx)}" y="${f(sy + SH + (narrow ? 24 : 20))}" text-anchor="middle">${late ? 'atrasado · ' : 'até '}${fmtDue(t.due)}</text>`;
      o += `<g class="tk${t.done ? ' done' : ''}"><g class="branch" data-act="task" data-id="${t.id}"><title>${esc(t.title)}</title>${g}</g>${top}</g>`;
    });

    /* ----- tronco, raízes e casca ----- */
    const b = base, T = `M${f(cx - hw * 2.5)} ${b}C${f(cx - hw * 1.4)} ${b - 24} ${f(cx - hw * 1.06)} ${b - 130} ${f(cx - hw)} ${b - 300}L${f(cx - hw * .9)} ${c + 100}C${f(cx - hw * .9)} ${c + 20} ${f(cx - hw * 1.25)} ${c - 30} ${f(cx - hw * 1.6)} ${c - 70}L${f(cx + hw * 1.6)} ${c - 70}C${f(cx + hw * 1.25)} ${c - 30} ${f(cx + hw * .9)} ${c + 20} ${f(cx + hw * .9)} ${c + 100}L${f(cx + hw)} ${b - 300}C${f(cx + hw * 1.06)} ${b - 130} ${f(cx + hw * 1.4)} ${b - 24} ${f(cx + hw * 2.5)} ${b}C${f(cx + hw)} ${b + 26} ${f(cx - hw)} ${b + 26} ${f(cx - hw * 2.5)} ${b}Z`;
    o += `<path class="bark" d="${T}"/><path class="bark2 shade" d="M${f(cx + hw * .35)} ${c - 70}L${f(cx + hw * 1.6)} ${c - 70}C${f(cx + hw * 1.25)} ${c - 30} ${f(cx + hw * .9)} ${c + 20} ${f(cx + hw * .9)} ${c + 100}L${f(cx + hw)} ${b - 300}C${f(cx + hw * 1.06)} ${b - 130} ${f(cx + hw * 1.4)} ${b - 24} ${f(cx + hw * 2.5)} ${b}C${f(cx + hw * 1.6)} ${b + 16} ${f(cx + hw * .8)} ${b + 22} ${f(cx + hw * .2)} ${b + 20}C${f(cx + hw * .5)} ${b - 300} ${f(cx + hw * .45)} ${c + 200} ${f(cx + hw * .35)} ${c - 70}Z"/>`;
    const hy = c + G.hy, span = b - hy - 260 * k;
    for (let i = 0; i < Math.max(4, Math.round(span / 150)); i++) {
      const lx = cx + (hash('bl' + i) - .5) * hw * 1.5, ly = hy + 230 * k + hash('bm' + i) * Math.max(span, 60), ll = 60 + hash('bn' + i) * 90;
      o += `<path class="barkline" d="M${f(lx)} ${f(ly)}q${f((hash('bo' + i) - .5) * 26)} ${f(ll / 2)} 0 ${f(ll)}"/>`;
    }
    for (let i = 0; i < 14; i++) { const gx = cx + (hash('gx' + i) - .5) * W * .9, gy = b + 6 + hash('gy' + i) * 60; o += `<path class="grass" d="M${f(gx)} ${f(gy)}q-4 -16 -12 -22M${f(gx)} ${f(gy)}q1 -18 2 -28M${f(gx)} ${f(gy)}q5 -14 13 -20"/>`; }
    if (!tasks.length) o += `<g data-act="new" class="hit"><rect class="sign-b" x="${cx - 190}" y="${b - 150}" width="380" height="64" rx="14"/><text class="sign-t" x="${cx}" y="${b - 110}" text-anchor="middle">Toque em + para brotar um galho</text></g>`;

    /* ----- oco da coruja e calendário ----- */
    const now = new Date(), td = today(), nToday = S.events.filter(e => e.date === td).length + S.tasks.filter(t => t.due === td && !t.done).length;
    o += `<g class="oco hit" data-act="cal" transform="translate(${cx} ${hy}) scale(${f(k)})"><title>Calendário</title>
<clipPath id="ococlip"><ellipse rx="60" ry="80"/></clipPath><ellipse class="oco-rim" rx="72" ry="92"/><ellipse class="oco-in" rx="60" ry="80"/>
<g clip-path="url(#ococlip)"><ellipse class="owl-b" cy="52" rx="46" ry="62"/><circle class="owl-b" cy="-2" r="43"/><path class="owl-b" d="M-42 -20L-33 -56L-8 -34ZM42 -20L33 -56L8 -34Z"/><ellipse class="owl-belly" cy="66" rx="28" ry="40"/><path class="owl-f" d="M-13 50q5 7 10 0M3 50q5 7 10 0M-5 64q5 7 10 0M-13 78q5 7 10 0M3 78q5 7 10 0"/>
<circle class="owl-face" cx="-19" cy="-4" r="20"/><circle class="owl-face" cx="19" cy="-4" r="20"/><g class="blink"><circle class="owl-iris" cx="-19" cy="-4" r="13"/><circle class="owl-iris" cx="19" cy="-4" r="13"/><circle class="owl-pupil" cx="-19" cy="-4" r="6.5"/><circle class="owl-pupil" cx="19" cy="-4" r="6.5"/><circle fill="#fff" cx="-16" cy="-7" r="2.2"/><circle fill="#fff" cx="22" cy="-7" r="2.2"/></g><path class="owl-beak" d="M0 7L-7 17L0 26L7 17Z"/></g>
<g transform="translate(0 106) rotate(-3)"><rect class="card" x="-48" y="0" width="96" height="92" rx="11"/><path class="card-h" d="M-48 11a11 11 0 0 1 11-11h74a11 11 0 0 1 11 11v19h-96z"/><text class="card-m" y="22" text-anchor="middle">${MABBR[now.getMonth()].toUpperCase()}</text><text class="card-d" y="76" text-anchor="middle">${now.getDate()}</text><circle class="nail" cy="-2" r="5"/>${nToday ? `<circle class="badge" cx="46" cy="4" r="15"/><text class="badge-t" x="46" y="10" text-anchor="middle">${nToday}</text>` : ''}</g></g>`;

    /* ----- copas (metas) ----- */
    G.back.forEach(([dx, cy, r]) => { o += `<circle class="cv0" cx="${cx + dx}" cy="${cy}" r="${r}"/>`; });
    PERIODS.forEach((p, i) => {
      const [dx, cy] = G.cl[i], x = cx + dx, r = G.cr, goals = goalsOf(p.id), dn = goals.filter(g => goalDone(g)).length;
      let g = '';
      for (let q = 0; q < 8; q++) { const a = q * .785 + i, rr = q ? r * .56 : 0; g += `<circle class="cv${1 + (q + i) % 3}" cx="${f(x + Math.cos(a) * rr)}" cy="${f(cy + Math.sin(a) * rr * .86)}" r="${f(r * (q ? .5 : .66))}"/>`; }
      g += `<circle class="cv4" cx="${f(x - r * .32)}" cy="${f(cy - r * .42)}" r="${f(r * .3)}"/><circle class="cv4" cx="${f(x + r * .4)}" cy="${f(cy - r * .1)}" r="${f(r * .2)}"/>`;
      goals.forEach((gl, q) => {
        const a = q * 2.39996 + i * 1.3, rr = r * .7 * Math.sqrt((q + .6) / Math.max(goals.length, 6)), gx = x + Math.cos(a) * rr, gy = cy - r * .14 + Math.sin(a) * rr * .8;
        g += `<g><title>${esc(gl.title)}</title>${goalDone(gl) ? fruit(gx, gy, narrow ? 15 : 16) : leaf(gx - 16 * Math.cos(a), gy - 16 * Math.sin(a), a * 180 / Math.PI, narrow ? 36 : 38, 'gleaf', gl.id)}</g>`;
      });
      const tw = narrow ? 206 : 210, th = narrow ? 50 : 46, ty = cy + r * .72;
      g += `<rect class="tag" x="${f(x - tw / 2)}" y="${f(ty)}" width="${tw}" height="${th}" rx="${th / 2}"/><text class="tag-t" x="${f(x)}" y="${f(ty + th / 2 + 7)}" text-anchor="middle">${p.name} · ${goals.length ? dn + '/' + goals.length : '+'}</text>`;
      o += `<g class="cluster hit" data-act="goals" data-p="${p.id}">${g}</g>`;
    });

    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${o}</svg>`, W, H, narrow, pos, focus: [cx, hy] };
  }

  return { render };
})();
