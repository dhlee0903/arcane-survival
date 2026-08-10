// PC 전용 디버그 콘솔. 터치 기기에서는 아예 만들지 않는다(화면도 좁고 오조작만 난다).
//
//   `  또는 F1   콘솔 열기/닫기
//   F2           구워진 스프라이트시트 보기
//
// 게임 로직은 건드리지 않는다 — 상태를 읽어 보여주고, 버튼이 game/renderer의
// 공개된 값을 바꾸기만 한다. 콘솔을 지워도 게임은 그대로 돈다.

import { view, areaScale, MAX_LV, RUN_SEC } from './config.js';
import { WEAPON_IDS } from './weapons.js';
import { PASSIVE_IDS } from './upgrades.js';

const SPEEDS = [0, 0.25, 1, 2, 4];

export function attachDebug({ game, renderer, clock }) {
  // 마우스가 있는 기기에서만
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return null;

  const el = document.createElement('div');
  el.className = 'debug';
  el.innerHTML = `
    <div class="dbg-head">
      <b>DEBUG</b>
      <span class="dbg-hint">\` 로 열고 닫는다</span>
    </div>
    <pre class="dbg-stat" id="dbgStat"></pre>
    <div class="dbg-row" id="dbgSpeed"></div>
    <div class="dbg-row">
      <button data-act="step">한 스텝</button>
      <button data-act="god">무적 OFF</button>
      <button data-act="hitbox">히트박스</button>
      <button data-act="sheet">시트</button>
    </div>
    <div class="dbg-row">
      <button data-act="levelup">레벨업</button>
      <button data-act="maxweapons">무기 만렙</button>
      <button data-act="maxpassives">패시브 만렙</button>
    </div>
    <div class="dbg-row">
      <button data-act="boss">보스</button>
      <button data-act="elite">엘리트</button>
      <button data-act="swarm">떼거리</button>
      <button data-act="clear">전멸</button>
    </div>
    <div class="dbg-row">
      <button data-act="skip">+1분</button>
      <button data-act="heal">회복</button>
      <button data-act="chest">상자</button>
      <button data-act="reset">리셋</button>
    </div>`;
  document.body.appendChild(el);

  // 배속 버튼
  const speedRow = el.querySelector('#dbgSpeed');
  SPEEDS.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = s === 0 ? '정지' : `${s}x`;
    b.dataset.speed = String(s);
    speedRow.appendChild(b);
  });

  const stat = el.querySelector('#dbgStat');
  let open = false;
  const setOpen = (v) => { open = v; el.classList.toggle('show', open); };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote' || e.code === 'F1') { setOpen(!open); e.preventDefault(); }
  });

  speedRow.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    clock.scale = Number(b.dataset.speed);
    syncButtons();
  });

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    act(b.dataset.act);
    syncButtons();
  });

  function act(what) {
    switch (what) {
      case 'step': {
        // 멈춰 있어도 한 스텝만 굴린다
        const paused = game.paused;
        game.paused = false;
        game.update();
        game.paused = paused;
        break;
      }
      case 'god': game.god = !game.god; break;
      case 'hitbox': renderer.showHitbox = !renderer.showHitbox; break;
      case 'sheet': renderer.showSheet = !renderer.showSheet; break;
      case 'levelup': game.xp = game.xpNext; break;
      case 'maxweapons':
        for (const id of WEAPON_IDS.slice(0, 5)) for (let i = 0; i < MAX_LV; i += 1) game.grantWeapon(id);
        break;
      case 'maxpassives':
        for (const id of PASSIVE_IDS.slice(0, 5)) for (let i = 0; i < MAX_LV; i += 1) game.grantPassive(id);
        break;
      case 'boss': game.spawn('lich', game.spawner.edgePoint(game)); break;
      case 'elite': game.spawn('golem', game.spawner.edgePoint(game)); break;
      case 'swarm':
        for (let i = 0; i < 40; i += 1) {
          const a = (i / 40) * Math.PI * 2;
          const kind = ['bat', 'slime', 'skeleton', 'ghost'][i % 4];
          g_spawnAt(game, kind, a);
        }
        break;
      case 'clear':
        for (const e of game.enemies) e.dead = true;
        game.enemies.length = 0;
        break;
      case 'skip': game.skipSeconds(60); break;
      case 'heal': game.hp = game.maxHp; break;
      case 'chest': game.drops.push({ kind: 'chest', x: game.px + 20, y: game.py, life: 600 }); break;
      case 'reset': game.reset(); game.start(); break;
      default: break;
    }
  }

  function syncButtons() {
    el.querySelector('[data-act="god"]').textContent = `무적 ${game.god ? 'ON' : 'OFF'}`;
    for (const b of speedRow.children) b.classList.toggle('on', Number(b.dataset.speed) === clock.scale);
    el.querySelector('[data-act="hitbox"]').classList.toggle('on', !!renderer.showHitbox);
    el.querySelector('[data-act="sheet"]').classList.toggle('on', !!renderer.showSheet);
  }
  syncButtons();

  const pad = (s, n) => String(s).padStart(n, ' ');

  return {
    // 멈춰 있어도 계속 갱신된다
    update() {
      if (!open) return;
      const g = game;
      const m = g.mods;
      stat.textContent = [
        `fps ${pad(clock.fps, 3)}   frame ${pad(clock.ms.toFixed(1), 5)}ms   step ${pad(clock.step.toFixed(2), 5)}ms`,
        `time ${pad(g.sec, 3)}s / ${RUN_SEC}s   phase ${g.phase}${g.paused ? ' (일시정지)' : ''}`,
        `view ${Math.round(view.w)}x${Math.round(view.h)}  zoom ${view.zoom}  area ${areaScale().toFixed(2)}`,
        '',
        `hp ${Math.ceil(g.hp)}/${Math.round(g.maxHp)}   lv ${g.level}   xp ${g.xp}/${g.xpNext}   kill ${g.kills}`,
        `pos ${Math.round(g.px)}, ${Math.round(g.py)}`,
        '',
        `enemy ${pad(g.enemies.length, 4)}  gem ${pad(g.gems.length, 4)}  proj ${pad(g.projectiles.length, 3)}`,
        `part  ${pad(g.parts.length, 4)}  drop ${pad(g.drops.length, 4)}  fire ${pad(g.patches.length, 3)}`,
        '',
        `무기   ${fmtItems(g.weapons)}`,
        `패시브 ${fmtItems(g.passives)}`,
        `보정   공${m.might.toFixed(2)} 속${m.speed.toFixed(2)} 쿨${m.focus.toFixed(2)} 범${m.area.toFixed(2)}`,
      ].join('\n');
    },
  };
}

function fmtItems(map) {
  const keys = Object.keys(map);
  return keys.length ? keys.map((k) => `${k}:${map[k]}`).join(' ') : '-';
}

// 떼거리 소환 — 플레이어를 둘러싸는 고리
function g_spawnAt(game, kind, angle) {
  const rad = Math.max(view.w, view.h) * 0.45;
  game.spawn(kind, { x: game.px + Math.cos(angle) * rad, y: game.py + Math.sin(angle) * rad });
}
