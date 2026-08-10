// 읽기 전용 렌더러 — 1픽셀 = 1도트.
// 모든 그림은 시작할 때 구운 **스프라이트시트 한 장**에서 잘라 쓴다(this.sheet).
// 카메라는 항상 마법사를 화면 한가운데 둔다.

import { view, setView, PLAYER, VERSION, GEM, ENEMY, RUN_SEC, MAX_WEAPONS, MAX_PASSIVES, MAX_LV } from './config.js';
import { evolvableWeapon } from './weapons.js';
import { buildSheet, FONT } from './sprites.js';
import { frameAt } from './anim.js';
import { WEAPONS } from './weapons.js';
import { PASSIVES } from './upgrades.js';

const TILE = 16;
const SLOT = 15;      // HUD 아이템 칸 크기
// 흔한 것부터 — 앞쪽일수록 자주 나온다
const GRASS = ['tile.grass0', 'tile.moss0', 'tile.grass1', 'tile.moss1'];
// 흔한 것부터 — 앞쪽일수록 자주 나온다
const DECOR = ['tuft', 'tuft', 'tuft', 'tuft', 'flower', 'rock', 'tuft', 'rock', 'mushroom', 'bones', 'stump', 'grave'];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cssW = 0;
    this.cssH = 0;

    const { canvas: sheet, tinted, frames } = buildSheet();
    this.sheet = sheet;
    this.tinted = tinted;
    this.frames = frames;
    this.showSheet = false;      // 디버그: 아틀라스를 화면에 띄운다
    this.showHitbox = false;     // 디버그: 실제 판정 원을 그린다
    this.resize();
  }

  // 캔버스는 창을 꽉 채운다. 창이 바뀌면 백버퍼와 논리 해상도를 다시 잡는다.
  // 도트가 커지는 건 여기 한 줄이 전부다 — 월드를 view.zoom배로 확대해 그린다.
  resize() {
    const cssW = this.canvas.clientWidth || 320;
    const cssH = this.canvas.clientHeight || 560;
    if (cssW === this.cssW && cssH === this.cssH) return;
    this.cssW = cssW;
    this.cssH = cssH;
    setView(cssW, cssH);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    const s = dpr * view.zoom;
    this.ctx.setTransform(s, 0, 0, s, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---- 시트에서 한 장 잘라 그리기 ----
  // 기준점은 발밑(bottom-center). 정수 좌표로 반올림해 도트가 흔들리지 않게 한다.
  blit(c, name, x, y, opt = {}) {
    const f = this.frames[name];
    if (!f) return;
    const img = opt.tint ? this.tinted : this.sheet;
    // art배로 촘촘히 찍은 그림은 그만큼 작게 그린다(화면 크기는 그대로, 밀도만 올라간다).
    // 반올림도 도트 격자(art) 위에서 해야 확대했을 때 가장자리가 흔들리지 않는다.
    const a = f.art || 1;
    const w = f.w / a;
    const h = f.h / a;
    const dx = Math.round(x * a - f.w / 2) / a;
    const dy = Math.round(y * a - (opt.mid ? f.h / 2 : f.h)) / a;
    if (opt.alpha !== undefined) { c.save(); c.globalAlpha = opt.alpha; }
    if (opt.flip) {
      c.save();
      c.translate(dx + w, dy);
      c.scale(-1, 1);
      c.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, w, h);
      c.restore();
    } else {
      c.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, w, h);
    }
    if (opt.alpha !== undefined) c.restore();
  }

  render(g) {
    this.resize();
    const c = this.ctx;
    c.fillStyle = '#1a2418';
    c.fillRect(0, 0, view.w, view.h);

    // 화면 흔들림 — 월드만 밀고 HUD는 제자리
    const sx = g.shake > 0 ? Math.round(Math.sin(g.t * 2.7) * g.shake) : 0;
    const sy = g.shake > 0 ? Math.round(Math.cos(g.t * 3.9) * g.shake) : 0;
    // 카메라: 월드 좌표 + off = 화면 좌표
    this.ox = Math.round(view.w / 2 - g.px) + sx;
    this.oy = Math.round(view.h / 2 - g.py) + sy;

    this.ground(c, g);
    this.patches(c, g);
    this.gems(c, g);
    this.drops(c, g);
    this.aura(c, g);
    this.actors(c, g);
    this.orbs(c, g);
    this.projectiles(c, g);
    this.zaps(c, g);
    this.parts(c, g);
    if (this.showHitbox) this.hitboxes(c, g);
    this.stick(c, g);
    this.hud(c, g);
    if (this.showSheet) this.sheetOverlay(c);
  }

  // ---- 바닥 ----
  // 타일 두 종과 흩뿌린 장식. 어떤 칸에 무엇이 놓이는지는 좌표 해시로 정한다 —
  // 저장할 필요 없이 어디로 가든 같은 풍경이 나온다.
  ground(c, g) {
    const left = Math.floor((g.px - view.w / 2) / TILE) - 1;
    const top = Math.floor((g.py - view.h / 2) / TILE) - 1;
    const cols = Math.ceil(view.w / TILE) + 2;
    const rows = Math.ceil(view.h / TILE) + 2;

    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const wx = (left + tx) * TILE;
        const wy = (top + ty) * TILE;
        // 땅은 두 겹으로 정한다.
        //   1) 2×2 덩어리로 뭉친 흙 — 칸마다 따로 뽑으면 얼룩처럼 흩어진다
        //   2) 나머지는 서로 비슷한 잔디 네 종을 칸마다 섞는다
        // 넓은 "지대"로 묶어봤더니 색이 갈리는 자리에 사각형 경계가 그대로 드러났다.
        // 비슷한 타일을 잘게 섞는 쪽이 결이 곱고 이음새도 안 보인다.
        const cxw = left + tx;
        const cyw = top + ty;
        const dirt = hash2(cxw >> 1, cyw >> 1) < 0.09;
        const h = hash2(cxw, cyw);
        const name = dirt ? 'tile.path' : GRASS[Math.floor(h * GRASS.length)];
        const f = this.frames[name];
        c.drawImage(this.sheet, f.x, f.y, f.w, f.h, wx + this.ox, wy + this.oy, TILE, TILE);
      }
    }
    // 장식은 타일 위에 한 겹 더
    for (let ty = 0; ty < rows; ty += 1) {
      for (let tx = 0; tx < cols; tx += 1) {
        const cxw = left + tx;
        const cyw = top + ty;
        const h = hash2(cxw * 7 + 13, cyw * 3 - 5);
        if (h > 0.105) continue;
        const wx = cxw * TILE + 8 + Math.floor(hash2(cxw, cyw + 99) * 6) - 3;
        const wy = cyw * TILE + 12 + Math.floor(hash2(cxw + 51, cyw) * 6) - 3;
        const name = DECOR[Math.min(DECOR.length - 1, Math.floor((h / 0.105) * DECOR.length))];
        this.blit(c, name, wx + this.ox, wy + this.oy);
      }
    }
  }

  patches(c, g) {
    for (const f of g.patches) {
      const x = f.x + this.ox;
      const y = f.y + this.oy;
      const fade = f.life < 40 ? f.life / 40 : 1;
      c.save();
      c.globalAlpha = 0.34 * fade;
      ellipse(c, x, y, f.r, f.r * 0.7, '#ff7a1a');
      c.globalAlpha = 0.22 * fade;
      ellipse(c, x, y, f.r * 0.6, f.r * 0.42, '#ffd23f');
      c.restore();
      const n = Math.max(2, Math.round(f.r / 10));
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 + f.t * 0.02;
        const d = f.r * 0.55;
        this.blit(c, frameAt('flame', f.t + i * 7), x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 + 3, { alpha: fade });
      }
    }
  }

  gems(c, g) {
    for (const gem of g.gems) {
      const bob = Math.sin(gem.t * 0.14) * 1.2;
      this.blit(c, GEM[gem.tier].spr, gem.x + this.ox, gem.y + this.oy + bob, { mid: true });
    }
  }

  drops(c, g) {
    for (const d of g.drops) {
      // 사라지기 직전엔 깜빡인다
      if (d.life < 90 && Math.floor(d.life / 6) % 2 === 0) continue;
      const bob = Math.sin(d.life * 0.09) * 1.5;
      this.blit(c, d.kind, d.x + this.ox, d.y + this.oy + bob, { mid: true });
    }
  }

  aura(c, g) {
    const id = g.weapons.inferno ? 'inferno' : (g.weapons.aura ? 'aura' : null);
    if (!id) return;
    const s = WEAPONS[id].lv[g.weapons[id] - 1];
    const r = Math.round(s.rad * g.mods.area);
    const x = g.px + this.ox;
    const y = g.py + this.oy - 6;
    c.save();
    c.globalAlpha = 0.13 + (g.auraPulse > 0 ? 0.16 * (g.auraPulse / 14) : 0);
    ellipse(c, x, y, r, r * 0.72, '#ff7a1a');
    c.restore();
  }

  // 적·플레이어를 y 순으로 그려 앞뒤가 맞게 한다
  actors(c, g) {
    const list = [];
    for (const e of g.enemies) if (!e.dead && this.onScreen(e.x, e.y, 40)) list.push(e);
    list.push({ player: true, x: g.px, y: g.py });
    list.sort((a, b) => a.y - b.y);

    for (const a of list) {
      if (a.player) { this.player(c, g); continue; }
      const name = frameAt(ENEMY[a.kind].clip, a.t);
      this.blit(c, name, a.x + this.ox, a.y + this.oy + a.r, { flip: a.face < 0, tint: a.flash > 0 });
      if (a.boss || a.elite) this.hpBar(c, a);
    }
  }

  player(c, g) {
    // 피격 직후엔 깜빡인다
    if (g.hurtCd > 0 && Math.floor(g.hurtCd / 4) % 2 === 1) return;
    const face = g.faceX < 0;
    this.blit(c, g.anim.frame(), g.px + this.ox, g.py + this.oy + PLAYER.r + 2, { flip: face, tint: g.hurtCd > PLAYER.hurtCd - 6 });
  }

  // 체력 막대는 머리 바로 위에 붙인다 — 멀리 띄우면 허공에 뜬 판때기처럼 보인다
  hpBar(c, e) {
    const w = e.boss ? 30 : 18;
    const x = Math.round(e.x + this.ox - w / 2);
    const y = Math.round(e.y + this.oy - e.r - (e.boss ? 20 : 12));
    c.fillStyle = '#0b0718';
    c.fillRect(x - 1, y - 1, w + 2, 5);
    c.fillStyle = e.boss ? '#b06bff' : '#ffb03a';
    c.fillRect(x, y, Math.max(0, Math.round((e.hp / e.maxHp) * w)), 3);
  }

  // 룬은 공전 각도에 맞춰 앞면/옆면을 고른다 — 돌아가는 동전처럼 보이게
  orbs(c, g) {
    const n = g.orbs.length;
    for (let i = 0; i < n; i += 1) {
      const o = g.orbs[i];
      const a = g.runeA + (i / n) * Math.PI * 2;
      const face = Math.abs(Math.sin(a)) > 0.42 ? 'rune.0' : 'rune.1';
      this.blit(c, face, o.x + this.ox, o.y + this.oy, { mid: true });
    }
  }

  projectiles(c, g) {
    for (const p of g.projectiles) {
      const name = p.spr || frameAt(p.clip, p.t);
      this.blit(c, name, p.x + this.ox, p.y + this.oy, { mid: true, flip: p.flip });
    }
  }

  zaps(c, g) {
    for (const z of g.zaps) {
      const a = z.t < 3 ? 1 : Math.max(0, 1 - (z.t - 3) / (z.life - 3));
      this.blit(c, frameAt('zap', z.t), z.x + this.ox, z.y + this.oy + 4, { alpha: a });
      if (z.t < 4) {
        c.save();
        c.globalAlpha = 0.5;
        ellipse(c, z.x + this.ox, z.y + this.oy, z.splash, z.splash * 0.6, '#cfe9ff');
        c.restore();
      }
    }
  }

  parts(c, g) {
    for (const p of g.parts) {
      c.fillStyle = p.color;
      c.globalAlpha = Math.min(1, p.life / 12);
      c.fillRect(Math.round(p.x + this.ox), Math.round(p.y + this.oy), 2, 2);
    }
    c.globalAlpha = 1;
  }

  stick(c, g) {
    const s = g.stick;
    if (!s || !s.on) return;
    c.save();
    c.globalAlpha = 0.28;
    ring(c, s.x, s.y, 30, '#e6edf3');
    c.globalAlpha = 0.5;
    ellipse(c, s.x + s.dx, s.y + s.dy, 8, 8, '#e6edf3');
    c.restore();
  }

  // 그림이 아니라 실제로 맞는 크기를 본다 — 그림보다 작다
  hitboxes(c, g) {
    c.strokeStyle = 'rgba(255,90,99,.9)';
    c.lineWidth = 1;
    for (const e of g.enemies) {
      if (e.dead || !this.onScreen(e.x, e.y, 20)) continue;
      c.beginPath();
      c.arc(Math.round(e.x + this.ox), Math.round(e.y + this.oy), e.r, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = 'rgba(127,240,255,.95)';
    c.beginPath();
    c.arc(Math.round(g.px + this.ox), Math.round(g.py + this.oy - 6), PLAYER.r, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(163,113,247,.55)';
    for (const p of g.projectiles) {
      c.beginPath();
      c.arc(Math.round(p.x + this.ox), Math.round(p.y + this.oy), p.r, 0, Math.PI * 2);
      c.stroke();
    }
  }

  onScreen(x, y, m = 0) {
    const sx = x + this.ox;
    const sy = y + this.oy;
    return sx > -m && sx < view.w + m && sy > -m && sy < view.h + m;
  }

  // ---- HUD ----
  hud(c, g) {
    // 경험치 막대 — 맨 위 한 줄
    c.fillStyle = '#0b0718';
    c.fillRect(0, 0, view.w, 4);
    c.fillStyle = '#a371f7';
    c.fillRect(0, 0, Math.round((g.xp / g.xpNext) * view.w), 3);

    // 남은 시간 — 가장 중요한 정보라 맨 위 가운데를 통째로 준다.
    // 좁은 화면에서 체력·레벨과 겹치지 않도록 아래 줄부터 나머지를 깐다.
    const left = RUN_SEC - g.sec;
    const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0');
    const ss = String(Math.max(0, left) % 60).padStart(2, '0');
    this.text(c, `${mm}:${ss}`, Math.round(view.w / 2 - 30), 6, '#ffffff', 2);

    // 체력 — 오른쪽 위는 설정 버튼 자리라 왼쪽에 모아 둔다
    const hw = Math.round(Math.min(78, view.w * 0.34));
    c.fillStyle = '#0b0718';
    c.fillRect(4, 18, hw + 2, 8);
    c.fillStyle = g.hp / g.maxHp < 0.3 ? '#ff5a63' : '#3fce6a';
    c.fillRect(5, 19, Math.max(0, Math.round((g.hp / g.maxHp) * hw)), 6);
    this.text(c, `${Math.max(0, Math.ceil(g.hp))}/${Math.round(g.maxHp)}`, hw + 10, 19, '#9fb0c8', 1);

    this.text(c, `LV ${g.level}`, 5, 29, '#ffd23f', 1);
    this.text(c, `KILL ${g.kills}`, 41, 29, '#9fb0c8', 1);
    // 금화 — 항아리에서 나온다
    this.blit(c, 'coin', 8, 43, { mid: true });
    this.text(c, String(g.gold), 14, 40, '#ffd23f', 1);

    this.slots(c, g);
    this.text(c, VERSION, view.w - 24, view.h - 8, 'rgba(255,255,255,.3)', 1);
  }

  // 가진 아이템 — 뱀서처럼 두 줄로 나눈다. 위가 공격, 아래가 패시브.
  // 빈 칸도 그려서 앞으로 몇 개를 더 들 수 있는지 보이게 한다.
  slots(c, g) {
    // 진화 준비가 끝난 무기는 칸을 금색으로 물들여 알려준다(상자를 열면 진화한다)
    const ready = evolvableWeapon(g.weapons, g.passives, MAX_LV);
    const weapons = Object.keys(g.weapons).map((id) => ({
      icon: WEAPONS[id].icon,
      lv: g.weapons[id],
      hot: (ready && ready.from === id) || !!WEAPONS[id].evolved,
    }));
    const passives = Object.keys(g.passives).map((id) => ({ icon: PASSIVES[id].icon, lv: g.passives[id] }));
    const y = view.h - SLOT * 2 - 6;
    this.slotRow(c, y, MAX_WEAPONS, weapons, '#7ff0ff');
    this.slotRow(c, y + SLOT + 1, MAX_PASSIVES, passives, '#ffb03a');
  }

  slotRow(c, y, cap, items, tone) {
    for (let i = 0; i < cap; i += 1) {
      const x = 4 + i * (SLOT + 1);
      const it = items[i];
      c.fillStyle = it ? 'rgba(11,7,24,.8)' : 'rgba(11,7,24,.35)';
      c.fillRect(x, y, SLOT, SLOT);
      c.strokeStyle = it ? (it.hot ? '#ffd23f' : tone) : 'rgba(255,255,255,.12)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, SLOT - 1, SLOT - 1);
      if (!it) continue;
      this.blit(c, it.icon, x + SLOT / 2, y + SLOT / 2, { mid: true });
      // 레벨은 오른쪽 아래 구석에. 그림 위에 얹히므로 바탕을 깔아 읽히게 한다.
      c.fillStyle = 'rgba(11,7,24,.85)';
      c.fillRect(x + SLOT - 6, y + SLOT - 8, 6, 8);
      this.text(c, String(it.lv), x + SLOT - 5, y + SLOT - 7, it.lv >= MAX_LV ? '#ffd23f' : '#cfc6f5', 1);
    }
  }

  // 5×7 비트맵 글꼴. 한글 문구는 DOM 오버레이가 맡는다.
  text(c, str, x, y, color, scale = 1) {
    c.fillStyle = color;
    let cx = Math.round(x);
    for (const raw of String(str).toUpperCase()) {
      const glyph = FONT[raw] || FONT[' '];
      for (let gy = 0; gy < 7; gy += 1) {
        const row = glyph[gy];
        for (let gx = 0; gx < 5; gx += 1) {
          if (row[gx] === '1') c.fillRect(cx + gx * scale, Math.round(y) + gy * scale, scale, scale);
        }
      }
      cx += 6 * scale;
    }
  }

  // 디버그: 구워진 스프라이트시트 원본을 4배로 띄운다
  sheetOverlay(c) {
    const s = 2;
    c.fillStyle = 'rgba(6,4,14,.92)';
    c.fillRect(0, 0, view.w, view.h);
    c.drawImage(this.sheet, 0, 0, this.sheet.width, this.sheet.height,
      4, 20, this.sheet.width * s, this.sheet.height * s);
    this.text(c, `SHEET ${this.sheet.width}X${this.sheet.height}`, 6, 8, '#7ff0ff', 1);
  }
}

// 도트 타원 — 스프라이트가 아닌 범위 표시(오라·장판)에 쓴다
function ellipse(c, cx, cy, rx, ry, color) {
  c.fillStyle = color;
  const top = Math.ceil(cy - ry);
  const bot = Math.floor(cy + ry);
  for (let y = top; y <= bot; y += 1) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)));
    if (half > 0) c.fillRect(Math.round(cx) - half, y, half * 2, 1);
  }
}

function ring(c, cx, cy, r, color) {
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(Math.round(cx), Math.round(cy), r, 0, Math.PI * 2);
  c.stroke();
}

// 좌표 → 0~1. 저장 없이 같은 자리에서 늘 같은 값이 나오는 해시.
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
