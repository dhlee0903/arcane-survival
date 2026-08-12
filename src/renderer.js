// 읽기 전용 렌더러 — 1픽셀 = 1도트.
// 모든 그림은 시작할 때 구운 **스프라이트시트 한 장**에서 잘라 쓴다(this.sheet).
// 카메라는 항상 코만도를 화면 한가운데 둔다.

import { view, setView, PLAYER, VERSION, ENEMY, RUN_SEC, ITEM_TIER, hash2 } from './config.js';
import { buildSheet, FONT } from './sprites.js';
import { frameAt } from './anim.js';
import { PASSIVES } from './upgrades.js';

const TILE = 16;
const SLOT = 15;      // HUD 아이템 칸 크기
// 흔한 것부터 — 앞쪽일수록 자주 나온다
const GRASS = ['tile.grass0', 'tile.moss0', 'tile.grass1', 'tile.moss1'];
// 바닥에 흩뿌리는 장식. **풀과 돌만** 둔다 — 버섯 · 묘비 · 그루터기 · 뼈다귀를 섞었더니
// 무대가 공동묘지처럼 잡다해지고, 큰 돌(장애물)이 그 사이에 묻혀 안 보였다.
// 큰 돌은 여기 없다. 장식이 아니라 충돌 판정이 있는 물건이라 game.rocks에서 그린다.
const DECOR = ['tuft', 'tuft', 'tuft', 'tuft', 'rock', 'tuft', 'tuft', 'rock'];

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
    this.drops(c, g);
    this.actors(c, g);
    this.projectiles(c, g);
    this.chests(c, g);
    this.enemyShots(c, g);
    this.beams(c, g);
    this.trails(c, g);
    this.arcs(c, g);
    this.zaps(c, g);
    this.parts(c, g);
    if (this.showHitbox) this.hitboxes(c, g);
    this.crosshair(c, g);
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
        //   1) 드문드문 드러난 맨흙 — 흙 타일은 가장자리에 풀색 술이 물려 있어서
        //      한 칸씩 따로 놓아야 자연스럽다(붙여 놓으면 술이 안쪽에도 생겨 금이 보인다)
        //   2) 나머지는 서로 비슷한 잔디 네 종을 칸마다 섞는다
        // 넓은 "지대"로 묶어봤더니 색이 갈리는 자리에 사각형 경계가 그대로 드러났다.
        // 비슷한 타일을 잘게 섞는 쪽이 결이 곱고 이음새도 안 보인다.
        const cxw = left + tx;
        const cyw = top + ty;
        const dirt = hash2(cxw * 5 + 3, cyw * 11 - 7) < 0.05;
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


  drops(c, g) {
    for (const d of g.drops) {
      // 사라지기 직전엔 깜빡인다
      if (d.life < 90 && Math.floor(d.life / 6) % 2 === 0) continue;
      const bob = Math.sin(d.life * 0.09) * 1.5;
      this.blit(c, d.kind, d.x + this.ox, d.y + this.oy + bob, { mid: true });
    }
  }


  // 적·플레이어를 y 순으로 그려 앞뒤가 맞게 한다
  actors(c, g) {
    const list = [];
    for (const e of g.enemies) if (!e.dead && this.onScreen(e.x, e.y, 40)) list.push(e);
    // 큰 돌도 같이 줄 세운다 — 뒤로 돌아가면 가려지고 앞에 서면 돌이 뒤에 남는다
    for (const s of g.rocks) if (this.onScreen(s.x, s.y, 60)) list.push({ rock: true, x: s.x, y: s.y, r: s.r });
    list.push({ player: true, x: g.px, y: g.py });
    list.sort((a, b) => a.y - b.y);

    for (const a of list) {
      if (a.player) { this.player(c, g); continue; }
      if (a.rock) {
        this.shadow(c, a.x + this.ox, a.y + this.oy + 3, a.r * 1.5);
        this.blit(c, 'boulder', a.x + this.ox, a.y + this.oy + a.r * 0.9);
        continue;
      }
      const name = frameAt(ENEMY[a.kind].clip, a.t);
      this.shadow(c, a.x + this.ox, a.y + this.oy + a.r, a.r * 1.15);
      this.blit(c, name, a.x + this.ox, a.y + this.oy + a.r, { flip: a.face < 0, tint: a.flash > 0 });
      if (a.boss || a.elite) this.hpBar(c, a);
    }
  }

  // 발밑 그림자 — 이게 없으면 스프라이트가 바닥에 붙지 않고 떠 보인다
  shadow(c, x, y, rx) {
    c.save();
    c.globalAlpha = 0.34;
    // 발끝보다 한 칸 아래에 둔다 — 스프라이트에 다 가려지면 있으나 마나다
    ellipse(c, x, y + 1, rx, rx * 0.42, '#000000');
    c.restore();
  }

  player(c, g) {
    // 피격 직후엔 깜빡인다
    this.shadow(c, g.px + this.ox, g.py + this.oy + PLAYER.r + 2, PLAYER.r * 1.3);
    if (g.hurtCd > 0 && Math.floor(g.hurtCd / 4) % 2 === 1) return;
    const face = g.faceX < 0;
    this.blit(c, g.anim.frame(), g.px + this.ox, g.py + this.oy + PLAYER.r + 2, { flip: face, tint: g.hurtCd > PLAYER.hurtCd - 6 });
    if (g.muzzle > 0) {                       // 총구 화염 — 쏘는 게 눈에 보여야 한다
      c.save();
      c.globalAlpha = 0.9;
      ellipse(c, g.px + this.ox + (face ? -9 : 9), g.py + this.oy - 8, 4, 3, '#ffd23f');
      c.restore();
    }
  }

  // 체력 막대는 머리 바로 위에 붙인다 — 멀리 띄우면 허공에 뜬 판때기처럼 보인다.
  // 높이는 지금 그려지는 프레임에서 읽는다(그림을 다시 찍어도 따라온다).
  hpBar(c, e) {
    const w = e.boss ? 30 : 18;
    const x = Math.round(e.x + this.ox - w / 2);
    const f = this.frames[frameAt(ENEMY[e.kind].clip, e.t)];
    const tall = f ? f.h / (f.art || 1) : e.r * 2;
    // 그림은 발밑(e.y + e.r) 기준으로 그려진다 — 머리 끝은 거기서 키만큼 위다
    const y = Math.round(e.y + this.oy + e.r - tall - 4);
    c.fillStyle = '#0b0718';
    c.fillRect(x - 1, y - 1, w + 2, 5);
    c.fillStyle = e.boss ? '#b06bff' : '#ffb03a';
    c.fillRect(x, y, Math.max(0, Math.round((e.hp / e.maxHp) * w)), 3);
  }

  // 룬은 공전 각도에 맞춰 앞면/옆면을 고른다 — 돌아가는 동전처럼 보이게

  // 총알은 **날아가는 방향으로 돌려서** 그린다. 가로로만 뒤집으면 위아래로 쏠 때 어색하다.
  projectiles(c, g) {
    for (const p of g.projectiles) {
      const name = p.spr || frameAt(p.clip, p.t);
      const f = this.frames[name];
      if (!f) continue;
      const a = Math.atan2(p.vy, p.vx);
      if (p.trail) {
        // 지나온 길을 그대로 긋는다 — 쏜 자리(x0,y0)부터 지금까지, 최대 trail 길이만큼.
        // 방향으로 무작정 뒤로 긋던 예전 방식은 아직 날아오지 않은 구간까지 그렸다.
        const flown = Math.hypot(p.x - p.x0, p.y - p.y0);
        const len = Math.min(flown, p.trail);
        const tx = p.x - Math.cos(a) * len;
        const ty = p.y - Math.sin(a) * len;
        c.save();
        const grad = c.createLinearGradient(tx + this.ox, ty + this.oy, p.x + this.ox, p.y + this.oy);
        grad.addColorStop(0, 'rgba(47,111,224,0)');
        grad.addColorStop(0.5, 'rgba(63,138,232,.5)');
        grad.addColorStop(1, p.trailColor || '#6fc8ff');
        c.strokeStyle = grad;
        c.lineCap = 'round';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(tx + this.ox, ty + this.oy);
        c.lineTo(p.x + this.ox, p.y + this.oy);
        c.stroke();
        c.globalAlpha = 0.7;                    // 심지 — 가운데 하얀 선
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(tx + this.ox, ty + this.oy);
        c.lineTo(p.x + this.ox, p.y + this.oy);
        c.stroke();
        c.restore();
      }
      const art = f.art || 1;
      if (p.ghost) {                            // 잔상 — 지나온 자리에 흐릿한 사본을 남긴다
        for (let i = 1; i <= p.ghost; i += 1) {
          c.save();
          c.globalAlpha = 0.36 * (1 - i / (p.ghost + 1));
          c.translate(Math.round(p.x + this.ox - Math.cos(a) * i * 7),
            Math.round(p.y + this.oy - Math.sin(a) * i * 7));
          c.rotate(a);
          c.imageSmoothingEnabled = false;
          c.drawImage(this.sheet, f.x, f.y, f.w, f.h,
            -f.w / art / 2, -f.h / art / 2, f.w / art, f.h / art);
          c.restore();
        }
      }
      c.save();
      c.translate(Math.round(p.x + this.ox), Math.round(p.y + this.oy));
      c.rotate(a);
      c.imageSmoothingEnabled = false;
      c.drawImage(this.sheet, f.x, f.y, f.w, f.h,
        -f.w / art / 2, -f.h / art / 2, f.w / art, f.h / art);
      c.restore();
    }
  }

  // 적이 쏜 것 — 플레이어 탄과 색을 확실히 갈라놔야 피할 수 있다(적탄은 주황)
  enemyShots(c, g) {
    for (const s of g.eshots) {
      const x = s.x + this.ox;
      const y = s.y + this.oy;
      if (s.kind === 'shot') {
        // 적탄도 날아가는 방향으로 돌려 그린다
        const f = this.frames[s.spr];
        if (f) {
          const art = f.art || 1;
          c.save();
          c.translate(Math.round(x), Math.round(y));
          c.rotate(Math.atan2(s.vy, s.vx));
          c.imageSmoothingEnabled = false;
          c.drawImage(this.sheet, f.x, f.y, f.w, f.h,
            -f.w / art / 2, -f.h / art / 2, f.w / art, f.h / art);
          c.restore();
        }
        continue;
      }
      // 곡사 — 떨어질 자리를 미리 그려 준다. 보고 비켜서라고 두는 표식이다
      const u = 1 - s.life / s.fall;
      c.save();
      c.globalAlpha = 0.28 + u * 0.4;
      ellipse(c, x, y, s.rad, s.rad * 0.5, '#ff7a1a');
      c.globalAlpha = 0.9;
      ellipse(c, x, y, s.rad * (1 - u), s.rad * (1 - u) * 0.5, '#ffd23f');
      c.restore();
    }
  }

  beams(c, g) {
    for (const b of g.beams) {
      c.save();
      c.globalAlpha = Math.min(1, b.life / 8);
      c.translate(b.x + this.ox, b.y + this.oy);
      c.rotate(b.a);
      c.fillStyle = '#ffd23f';
      c.fillRect(0, -b.w / 2, b.len, b.w);
      c.fillStyle = '#ffffff';
      c.fillRect(0, -b.w / 4, b.len, b.w / 2);
      c.restore();
    }
  }

  // 맵에 놓인 상자 — 값이 붙어 있고 골드가 모자라면 붉게 뜬다
  chests(c, g) {
    for (const ch of g.chests) {
      const x = ch.x + this.ox;
      const y = ch.y + this.oy;
      this.shadow(c, x, y, 10);
      this.blit(c, `chest.${ch.tier}${ch.open ? '.open' : ''}`, x, y);
      if (ch.open) continue;
      const enough = g.gold >= ch.price;
      const label = `$${ch.price}`;
      this.text(c, label, Math.round(x - label.length * 3), Math.round(y - 24),
        enough ? '#ffd23f' : '#ff6a6a', 1);
    }
    // 바닥에 놓인 아이템 — 닿으면 줍는다
    for (const l of g.loot) {
      const x = l.x + this.ox;
      const y = l.y + this.oy + Math.sin(l.t * 0.08) * 1.5;
      const tone = ITEM_TIER[PASSIVES[l.id].tier].color;
      c.save();
      c.globalAlpha = 0.35 + Math.sin(l.t * 0.1) * 0.12;
      ellipse(c, x, l.y + this.oy + 3, 9, 4, tone);
      c.restore();
      this.blit(c, PASSIVES[l.id].icon, x, y, { mid: true });
    }
    // 골드 숫자
    for (const p of g.pops) {
      const u = p.t / p.life;
      c.save();
      c.globalAlpha = 1 - u * u;
      this.text(c, p.text, Math.round(p.x + this.ox - p.text.length * 3),
        Math.round(p.y + this.oy - 6 - u * 14), p.color, 1);
      c.restore();
    }
    // 주운 아이템 — 머리 위로 떠올랐다 사라진다
    for (const f of g.pickFx) {
      const u = f.t / f.life;
      c.save();
      c.globalAlpha = 1 - u;
      this.blit(c, PASSIVES[f.id].icon, g.px + this.ox, g.py + this.oy - 22 - u * 16, { mid: true });
      c.restore();
    }
    // 쿨타임이 돌아온 스킬 — 머리 위에서 톡 튀어올랐다 사라진다.
    // 아래 트레이의 숫자는 손이 있는 곳이 아니라서 눈이 못 따라간다.
    // 여러 개가 같이 돌아오면 옆으로 늘어놓는다.
    if (g.ready.length) {
      const n = g.ready.length;
      for (let i = 0; i < n; i += 1) {
        const f = g.ready[i];
        const u = f.t / f.life;
        // 처음 몇 프레임은 위로 튕겼다가 제자리로 내려앉고, 끝에서 옅어진다
        const pop = u < 0.18 ? (1 - u / 0.18) * 5 : 0;
        c.save();
        c.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        const x = g.px + this.ox + (i - (n - 1) / 2) * 16;
        const y = g.py + this.oy - 30 - pop;
        ellipse(c, x, y, 7, 7, 'rgba(6, 5, 14, .72)');
        this.blit(c, f.icon, x, y, { mid: true });
        c.restore();
      }
    }
  }


  // 위상조정탄 잔상 — 지나간 토막이 굵기와 밝기를 잃으며 사라진다
  trails(c, g) {
    if (!g.trails || !g.trails.length) return;
    c.save();
    c.lineCap = 'round';
    for (const t of g.trails) {
      // 선형으로 지우면 끝에서 뚝 끊긴다. 뒤쪽을 완만하게 눌러 서서히 옅어지게 한다
      const u = (1 - t.t / t.life) ** 0.6;
      c.globalAlpha = u * 0.8;
      c.strokeStyle = t.color;
      c.lineWidth = 1 + u * 3;
      c.beginPath();
      c.moveTo(t.x1 + this.ox, t.y1 + this.oy);
      c.lineTo(t.x2 + this.ox, t.y2 + this.oy);
      c.stroke();
      if (u > 0.55) {                      // 갓 지나간 자리엔 하얀 심지가 남는다
        c.globalAlpha = (u - 0.55) * 2;
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1;
        c.stroke();
      }
    }
    c.restore();
  }

  // 우쿨렐레 연쇄 번개 — 파란 전기에 하얀 심지. 곧게 잇지 않고 지그재그로 꺾는다
  arcs(c, g) {
    for (const a of g.arcs) {
      const x1 = a.x1 + this.ox;
      const y1 = a.y1 + this.oy;
      const x2 = a.x2 + this.ox;
      const y2 = a.y2 + this.oy;
      const seg = 7;
      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;
      const pts = [];
      for (let i = 0; i <= seg; i += 1) {
        const t = i / seg;
        const j = i === 0 || i === seg ? 0 : (hash2(Math.round(a.x1) + i, Math.round(a.y2) + a.t) - 0.5) * 18;
        pts.push([x1 + (x2 - x1) * t + (nx / len) * j, y1 + (y2 - y1) * t + (ny / len) * j]);
      }
      c.save();
      // 오래 남기되 끝에서 뚝 끊기지 않게 완만하게 옅어진다
      const u = Math.max(0, 1 - a.t / a.life) ** 0.55;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      // 흐릿한 겉불꽃 → 파란 속 → 하얀 심지. 겉을 옅게 넓히면 빛나는 것처럼 보인다.
      // 심지는 끝까지 또렷하게 남겨야 어디로 튀었는지 읽힌다.
      for (const [w, color, al] of [[10, '#1d4fb0', 0.30], [6, '#2f6fe0', 0.55],
                                    [3, '#7fc4ff', 0.85], [1.5, '#ffffff', 1]]) {
        c.globalAlpha = u * al;
        c.strokeStyle = color;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        for (const [px, py] of pts.slice(1)) c.lineTo(px, py);
        c.stroke();
      }
      c.restore();
    }
  }

  zaps(c, g) {
    for (const z of g.zaps) {
      const a = z.t < 3 ? 1 : Math.max(0, 1 - (z.t - 3) / (z.life - 3));
      this.blit(c, frameAt('uke', z.t), z.x + this.ox, z.y + this.oy + 4, { alpha: a });
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

  // 조준선 — 어디를 쏘는지 보여야 한다
  crosshair(c, g) {
    if (!g.aim && !(g.aimStick && g.aimStick.on)) return;
    let x;
    let y;
    if (g.aimStick && g.aimStick.on) {
      const a = Math.atan2(g.aimStick.dy, g.aimStick.dx);
      x = view.w / 2 + Math.cos(a) * 46;
      y = view.h / 2 + Math.sin(a) * 46;
    } else {
      x = g.aim.x;
      y = g.aim.y;
    }
    c.strokeStyle = 'rgba(255,210,63,.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, 4.5, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#ffd23f';
    c.fillRect(Math.round(x), Math.round(y) - 7, 1, 3);
    c.fillRect(Math.round(x), Math.round(y) + 5, 1, 3);
    c.fillRect(Math.round(x) - 7, Math.round(y), 3, 1);
    c.fillRect(Math.round(x) + 5, Math.round(y), 3, 1);
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
    // 경험치 막대 — 맨 위 한 줄. 위에 밝은 선을 한 줄 얹어 유리처럼 보이게 한다
    c.fillStyle = '#000000';
    c.fillRect(0, 0, view.w, 5);
    const xw = Math.round((g.xp / g.xpNext) * view.w);
    c.fillStyle = '#7a52e0';
    c.fillRect(0, 0, xw, 4);
    c.fillStyle = '#c8a8ff';
    c.fillRect(0, 0, xw, 1);

    // 남은 시간 — 가장 중요한 정보라 맨 위 가운데를 통째로 준다.
    // 좁은 화면에서 체력·레벨과 겹치지 않도록 아래 줄부터 나머지를 깐다.
    const left = RUN_SEC - g.sec;
    const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0');
    const ss = String(Math.max(0, left) % 60).padStart(2, '0');
    this.text(c, `${mm}:${ss}`, Math.round(view.w / 2 - 30), 6, '#ffffff', 2);

    // 체력 — 오른쪽 위는 설정 버튼 자리라 왼쪽에 모아 둔다
    const hw = Math.round(Math.min(78, view.w * 0.34));
    const low = g.hp / g.maxHp < 0.3;
    c.fillStyle = '#000000';
    c.fillRect(4, 18, hw + 4, 10);
    c.fillStyle = '#241c3a';
    c.fillRect(5, 19, hw + 2, 8);
    const fill = Math.max(0, Math.min(hw, Math.round((g.hp / g.maxHp) * hw)));
    c.fillStyle = low ? '#c41f36' : '#1f9e46';
    c.fillRect(6, 20, fill, 6);
    c.fillStyle = low ? '#ff5a63' : '#3fce6a';
    c.fillRect(6, 20, fill, 3);
    // 숫자는 막대 안에 오른쪽으로 붙인다 — 밖으로 빼면 좁은 화면에서 시간과 겹친다
    const hpTxt = `${Math.max(0, Math.ceil(g.hp))}/${Math.round(g.maxHp)}`;
    this.text(c, hpTxt, 4 + hw - hpTxt.length * 6, 20, '#ffffff', 1);

    this.text(c, `LV ${g.level}`, 5, 31, '#ffd23f', 1);
    this.text(c, `KILL ${g.kills}`, 41, 31, '#cfd8e8', 1);
    // 금화 — 항아리에서 나온다
    this.blit(c, 'coin', 8, 45, { mid: true });
    this.text(c, String(g.gold), 14, 42, '#ffd23f', 1);

    this.text(c, VERSION, view.w - 24, view.h - 8, 'rgba(255,255,255,.3)', 1);
  }


  // 5×7 비트맵 글꼴. 한글 문구는 DOM 오버레이가 맡는다.
  // HUD 글씨는 그림자를 한 겹 깔고 찍는다 — 밝은 바닥 위에서도 글자가 뭉개지지 않는다
  text(c, str, x, y, color, scale = 1, shadow = '#000000') {
    for (const pass of shadow ? [shadow, color] : [color]) {
      c.fillStyle = pass;
      const oy = pass === color ? 0 : scale;
      let cx = Math.round(x) + (pass === color ? 0 : scale);
      for (const raw of String(str).toUpperCase()) {
        const glyph = FONT[raw] || FONT[' '];
        for (let gy = 0; gy < 7; gy += 1) {
          const row = glyph[gy];
          for (let gx = 0; gx < 5; gx += 1) {
            if (row[gx] === '1') c.fillRect(cx + gx * scale, Math.round(y) + oy + gy * scale, scale, scale);
          }
        }
        cx += 6 * scale;
      }
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
