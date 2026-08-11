// 진입점: 게임·렌더러·입력을 연결하고 오버레이(타이틀·레벨업 카드·일시정지)를 다룬다.
// 캔버스 위 숫자는 도트 글꼴로, 한글 문구는 여기 DOM이 맡는다.

import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { InputController } from './input.js';
import { STEP_MS, MAX_CATCHUP, RUN_SEC } from './config.js';
import { getBest, mmss, totalGold } from './storage.js';
import { SKILLS, SKILL_IDS } from './weapons.js';
import { ITEM_TIER } from './config.js';
import { PASSIVES } from './upgrades.js';
import { attachDebug } from './debug.js';

const $ = (id) => document.getElementById(id);

const renderer = new Renderer($('board'));
const overlay = $('overlay');
const cardsEl = $('cards');
const pauseEl = $('pause');
const gearBtn = $('gear');
const bannerEl = $('banner');
const repoLink = $('repo');

const game = new Game({ onState: handleState });

// eslint-disable-next-line no-new
new InputController($('board'), game);

// 일시정지 화면에 대체 스킬 조합식을 깔아 둔다 — 안 보여주면 알 방법이 없다
// 일시정지 화면에 스킬 셋을 깔아 둔다 — 쿨타임과 계수를 알 방법이 없으면 곤란하다
function fillRecipes() {
  const box = $('recipes');
  if (box.childElementCount) return;
  for (const id of SKILL_IDS) {
    const s = SKILLS[id];
    const row = document.createElement('div');
    row.className = 'recipe';
    row.innerHTML = `<span class="rn">${s.name}</span><i>${s.key}</i>`
      + `<span class="plus">·</span><span class="dim">${s.desc}</span>`
      + `<b>${(s.cd / 60).toFixed(1)}초</b>`;
    row.prepend(iconCanvas(s.icon, 1.5));
    box.appendChild(row);
  }
}

gearBtn.addEventListener('click', () => { fillRecipes(); game.setPaused(true); });
$('pResume').addEventListener('click', () => game.setPaused(false));
$('pRestart').addEventListener('click', () => { game.setPaused(false); game.reset(); game.start(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) game.setPaused(true); });

// 개발용 손잡이 — 콘솔에서 상태를 들여다보거나 브라우저 검증 스크립트가 잡는다
window.__game = game;
window.__renderer = renderer;

// F2: 구워진 스프라이트시트를 눈으로 확인한다(개발용)
window.addEventListener('keydown', (e) => {
  if (e.code === 'F2') { renderer.showSheet = !renderer.showSheet; e.preventDefault(); }
});

function showOverlay(title, html, btn) {
  overlay.innerHTML = `<h2>${title}</h2><p>${html}</p><button class="btn" id="ovBtn">${btn}</button>`;
  overlay.classList.add('show');
  $('ovBtn').onclick = () => { overlay.classList.remove('show'); game.start(); };
}

// 레벨업 — 카드 세 장. 아이콘은 실제 스프라이트시트에서 잘라 그려 넣는다.
function iconCanvas(name, mul = 3) {
  const f = renderer.frames[name];
  const s = mul / (f.art || 1);
  const cv = document.createElement('canvas');
  cv.width = Math.round(f.w * s);
  cv.height = Math.round(f.h * s);
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(renderer.sheet, f.x, f.y, f.w, f.h, 0, 0, cv.width, cv.height);
  return cv;
}

function handleState(state, p) {
  if (state === 'playing') { overlay.classList.remove('show'); return; }
  if (state === 'title') return;

  const r = game.result || { best: getBest(), isNewBest: false };
  const line = r.isNewBest ? '<b>신기록</b>' : `최고 ${mmss(r.best)}`;
  const gold = `금화 ${p.gold}`;
  if (state === 'clear') {
    showOverlay('ALL CLEAR', `15분 생존 · 처치 ${p.kills} · ${gold}<br>${line}`, '다시 하기');
  } else {
    showOverlay('GAME OVER', `생존 ${mmss(p.sec)} · 처치 ${p.kills} · ${gold}<br>${line}`, '다시 하기');
  }
}

// 고정 타임스텝 — update()는 실제 경과 시간에 맞춰 초당 60회만 돈다.
let acc = 0;
let prev = 0;

// 디버그 콘솔이 읽고 쓰는 시계. scale은 슬로우·정지·배속용(평소엔 1).
const clock = { scale: 1, fps: 0, ms: 0, step: 0 };
let fpsCount = 0;
let fpsAt = 0;
const debug = attachDebug({ game, renderer, clock });

function syncChrome() {
  const playing = game.phase === 'playing' && !game.paused;
  pauseEl.classList.toggle('show', game.paused);
  // 설정 버튼과 GitHub 링크는 같은 자리(오른쪽 위)를 쓴다 — 번갈아 보인다
  gearBtn.hidden = !playing;
  repoLink.hidden = playing;
  if (game.bannerT > 0) {
    bannerEl.textContent = game.bannerText;
    bannerEl.classList.add('show');
  } else {
    bannerEl.classList.remove('show');
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  syncChrome();
  if (debug) debug.update();          // 멈춰 있어도 계속 갱신된다
  if (game.paused || game.phase !== 'playing') {
    acc = 0;
    prev = now;
    renderer.render(game);
    syncTray(game.summary());
    return;
  }
  if (!prev) { prev = now; renderer.render(game); return; }

  const dt = Math.min(now - prev, 250);
  acc += dt * clock.scale;
  prev = now;

  clock.ms = dt;
  fpsCount += 1;
  if (now - fpsAt >= 500) { clock.fps = Math.round((fpsCount * 1000) / (now - fpsAt)); fpsCount = 0; fpsAt = now; }

  const t0 = performance.now();
  let steps = 0;
  while (acc >= STEP_MS && steps < MAX_CATCHUP) {
    game.update();
    acc -= STEP_MS;
    steps += 1;
  }
  if (steps === MAX_CATCHUP) acc = 0;   // 못 따라잡을 만큼 밀리면 빚을 버린다
  clock.step = performance.now() - t0;

  renderer.render(game);
  syncTray(game.summary());
}
requestAnimationFrame(loop);

// 타이틀
const best = getBest();
showOverlay(
  '<span class="title">먼 곳의 횃대</span><span class="sub">DISTANT ROOST · COMMANDO</span>',
  `이동만 하면 된다 · 공격은 자동<br>${RUN_SEC / 60}분을 버티면 승리`
  + `<br><span class="dim">이동 WASD · 조준 마우스 · 좌클릭 2연사 · 우클릭 위상조정탄 · R 제압사격 · Shift 회피</span>`
  + `<br><span class="dim">모바일: 왼쪽 절반 이동 · 오른쪽 절반 조준(누르면 발사)</span>`
  + (best ? `<br><span class="dim">최고 생존 ${mmss(best)}</span>` : '')
  + (totalGold() ? `<span class="dim"> · 모은 금화 ${totalGold()}</span>` : ''),
  '시작',
);


// ---- 하단 트레이 ----
// 스킬은 남은 쿨타임을 초로 보여 주고, 아이템은 등급 색 테두리와 개수를 단다.
// 툴팁은 DOM으로 두는 편이 낫다 — 캔버스에 그리면 마우스 위치를 따로 계산해야 한다.
const skillRow = $('skillRow');
const itemRow = $('itemRow');
const slotCache = new Map();

function makeSlot(cls, icon, title, body, key) {
  const el = document.createElement('div');
  el.className = 'slot';
  el.appendChild(iconCanvas(icon, cls === 'item' ? 2 : 3));
  if (key) {
    const k = document.createElement('span');
    k.className = 'key';
    k.textContent = key;
    el.appendChild(k);
  }
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.innerHTML = `<b>${title}</b><span class="dim">${body}</span>`;
  el.appendChild(tip);
  return el;
}

function syncTray(p) {
  if (!skillRow.childElementCount) {
    for (const id of SKILL_IDS) {
      const s = SKILLS[id];
      const el = makeSlot('skill', s.icon, s.name, `${s.desc}<br>쿨타임 ${(s.cd / 60).toFixed(1)}초`, s.key);
      const cd = document.createElement('div');
      cd.className = 'cd';
      cd.style.display = 'none';
      el.appendChild(cd);
      skillRow.appendChild(el);
      slotCache.set(id, cd);
    }
  }
  for (const id of SKILL_IDS) {
    const left = (p.cds && p.cds[id]) || 0;
    const cd = slotCache.get(id);
    cd.style.display = left > 0 ? 'flex' : 'none';
    if (left > 0) cd.textContent = (left / 60).toFixed(1);
  }
  const items = Object.keys(p.items || {});
  const sig = items.map((id) => `${id}${p.items[id]}`).join(',');
  if (itemRow.dataset.sig !== sig) {
    itemRow.dataset.sig = sig;
    itemRow.textContent = '';
    for (const id of items) {
      const it = PASSIVES[id];
      const tier = ITEM_TIER[it.tier];
      const el = makeSlot('item', it.icon, `${it.name} <span class="dim">· ${tier.name}</span>`, it.desc);
      el.style.borderColor = tier.color;
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = p.items[id];
      el.appendChild(n);
      itemRow.appendChild(el);
    }
  }
}
