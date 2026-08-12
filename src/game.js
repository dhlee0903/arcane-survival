// 게임 상태와 규칙. 그리기는 하지 않는다(renderer.js가 읽기만 한다).
//
// 뱀서 규칙을 그대로 따른다.
//   · 조작은 이동뿐 — 공격은 전부 자동
//   · 적은 화면 밖에서 계속 밀려오고, 죽으면 경험치 보석을 떨군다
//   · 보석을 먹어 레벨이 오르면 시간이 멈추고 카드 세 장 중 하나를 고른다
//   · 15분을 버티면 클리어

import {
  view, PLAYER, RUN_SEC, ENEMY, SCALE, GEM, gemTier, GEM_DRIFT, GEM_CAP,
  DROP, HEART_HEAL, BARREL, COIN_VALUE, ESHOT_LIFE, xpNeed, ITEM_TIER, CHEST_TIERS,
  BOULDER, hash2, FX,
} from './config.js';
import { SKILLS, SKILL_IDS } from './weapons.js';
import { modsOf, rollItem, PASSIVES } from './upgrades.js';
import { Spawner } from './spawner.js';
import { Animator } from './anim.js';
import { submitScore, addGold } from './storage.js';

const TAU = Math.PI * 2;
// 이보다 멀어진 적은 앞쪽 테두리로 다시 세운다. 화면 크기에 비례한다.
const recycleDist = () => Math.max(view.w, view.h) * 1.7;

// 시드 난수 — 같은 판에서 나오는 무작위를 한 군데로 모은다
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Game {
  constructor({ onState } = {}) {
    this.onState = onState || (() => {});
    this.spawner = new Spawner();
    this.reset();
  }

  reset(seed = (Date.now() & 0x7fffffff)) {
    this.rnd = mulberry32(seed);
    this.phase = 'title';
    this.paused = false;
    this.t = 0;

    this.px = 0;
    this.py = 0;
    this.vx = 0;
    this.vy = 0;
    this.faceX = 1;
    this.faceHold = 0;
    this.moving = false;
    this.anim = new Animator('commando.idle');

    this.maxHp = PLAYER.hp;
    this.hp = PLAYER.hp;
    this.hurtCd = 0;
    this.regenBank = 0;

    this.level = 1;
    this.xp = 0;
    this.xpNext = xpNeed(1);
    this.kills = 0;
    this.gold = 0;
    this.eshots = [];      // 적이 쏜 것 — 맞으면 아프다
    this.beams = [];       // 타이탄 광선 · 잠깐 그려지고 사라진다
    this.diveT = 0;        // 택티컬 다이브 — 구르는 동안 무적
    this.diveVx = 0;
    this.diveVy = 0;
    this.diveDmg = 0;
    this.muzzle = 0;       // 총구 화염
    this.queue = [];       // 몇 스텝 뒤에 나갈 사격(제압사격)
    this.want = { primary: false, special: false, special2: false, dodge: false };
    this.aim = null;       // 마우스 조준(화면 좌표)
    this.aimStick = null;  // 터치 조준 스틱
    this.cds = { primary: 0, special: 0, special2: 0, dodge: 0 };
    this.chests = [];      // 맵에 흩어진 상자 — 찾아서 골드로 연다
    this.arcs = [];        // 우쿨렐레 전기 아크
    this.trails = [];      // 위상조정탄이 지나간 자리 — 서서히 사라진다
    this.sites = new Set();   // 이미 훑은 칸
    this.rocks = [];       // 큰 돌 — 벽이다. 사람도 적도 총알도 못 지나간다
    this.pops = [];        // 화면에 떠오르는 숫자(골드)
    this.loot = [];        // 상자에서 떨어져 나와 바닥에 놓인 아이템
    this.pickFx = [];      // 주운 아이템이 머리 위로 떴다 사라진다
    this.potCd = 60 * 4;    // 첫 항아리는 조금 일찍

    // 시작 무기는 뱀서처럼 하나만 — 나머지는 레벨업으로 얻는다
    this.passives = {};
    this.mods = modsOf(this.passives);

    this.enemies = [];
    this.projectiles = [];
    this.drops = [];
    this.zaps = [];
    this.patches = [];
    this.parts = [];
    this.auraPulse = 0;

    this.god = false;       // 디버그 콘솔에서만 켠다
    this.stick = null;      // input.js가 채운다(가상 스틱 표시용)
    this.inx = 0;
    this.iny = 0;
    this.shake = 0;
    this.bannerText = '';
    this.bannerT = 0;
    this.eid = 1;

    this.spawner.reset();
    this.emit();
  }

  start() {
    if (this.phase === 'over' || this.phase === 'clear') this.reset();
    this.phase = 'playing';
    this.emit();
  }

  setPaused(on) {
    if (this.phase !== 'playing') return;
    this.paused = on;
  }

  emit() {
    this.onState(this.phase, this.summary());
  }

  summary() {
    return {
      sec: Math.floor(this.t / 60),
      kills: this.kills,
      gold: this.gold,
      cds: this.cds,
      items: this.passives,
      level: this.level,
    };
  }

  get sec() { return Math.floor(this.t / 60); }

  // ---- 입력 ----
  // input.js가 매 스텝 -1~1 방향을 넣어준다
  setMove(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    this.inx = dx;
    this.iny = dy;
  }

  // ---- 갱신 ----
  update() {
    if (this.phase !== 'playing' || this.paused) return;
    this.t += 1;

    this.tickRocks();
    this.movePlayer();
    this.tickSkills();
    this.tickSites();
    this.tickLoot();
    this.tickPops();
    this.tickProjectiles();
    this.tickZaps();
    this.tickPatches();
    this.spawner.update(this);
    this.tickEnemies();
    this.tickEnemyShots();
    this.tickQueue();
    this.tickPickups();
    this.tickParts();

    if (this.bannerT > 0) this.bannerT -= 1;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.35);
    if (this.auraPulse > 0) this.auraPulse -= 1;
    if (this.hurtCd > 0) this.hurtCd -= 1;
    if (this.muzzle > 0) this.muzzle -= 1;

    // 재생
    if (this.mods.regen > 0 && this.hp > 0) {
      this.regenBank += this.mods.regen / 60;
      if (this.regenBank >= 1) {
        const heal = Math.floor(this.regenBank);
        this.regenBank -= heal;
        this.hp = Math.min(this.maxHp, this.hp + heal);
      }
    }

    // 들소 스테이크는 최대 체력을 직접 올린다
    const bonus = this.mods.steak || 0;
    if (this.hpBonus !== bonus) { this.maxHp += bonus - (this.hpBonus || 0); this.hp += bonus - (this.hpBonus || 0); this.hpBonus = bonus; }
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    if (this.xp >= this.xpNext) this.levelUp();
    if (this.hp <= 0) this.finish('over');
    else if (this.t >= RUN_SEC * 60) this.finish('clear');
  }

  movePlayer() {
    // 구르는 중에는 입력을 무시하고 구르기가 민다
    if (this.diveT > 0) {
      this.diveT -= 1;
      this.px += this.diveVx;
      this.py += this.diveVy;
      this.diveVx *= 0.9;
      this.diveVy *= 0.9;
      if (this.diveDmg > 0) {
        for (const e of this.enemies) {
          if (e.dead || e.prop || e.hitByDive) continue;
          const ddx = e.x - this.px;
          const ddy = e.y - this.py + 6;
          const rr = e.r + PLAYER.r + 6;
          if (ddx * ddx + ddy * ddy > rr * rr) continue;
          e.hitByDive = true;
          this.damageEnemy(e, this.diveDmg, { knock: 3, kx: ddx, ky: ddy });
        }
      }
      if (this.diveT % 3 === 0) this.spark(this.px, this.py, 3, '#cfd8e8');
      this.clampToRocks();          // 구르기로도 돌을 통과할 수는 없다
      this.anim.set('commando.walk');
      this.anim.step(2);
      return;
    }
    const sp = PLAYER.speed * this.mods.speed;
    const dx = (this.inx || 0) * sp;
    const dy = (this.iny || 0) * sp;
    this.px += dx;
    this.py += dy;
    this.clampToRocks();
    this.moving = dx !== 0 || dy !== 0;

    if (dx !== 0) { this.faceX = dx > 0 ? 1 : -1; this.faceHold = PLAYER.faceKeep; } else if (this.faceHold > 0) this.faceHold -= 1;

    this.anim.set(this.moving ? 'commando.walk' : 'commando.idle');
    this.anim.step(1);
  }

  // ---- 스킬 ----
  // 자동 공격은 없다. 누른 것만 나간다. 기본공격은 누르고 있으면 계속 나간다.
  atkSpeed() {
    return 1 + (this.passives.syringe || 0) * 0.15;
  }

  // 캐릭터 공격력 — 레벨과 아이템으로만 오른다(원작 코만도: 12 + 레벨당 2.4)
  damage() {
    return PLAYER.dmg + (this.level - 1) * PLAYER.dmgPerLevel;
  }

  // 조준 방향 — 마우스 · 터치 스틱 · 없으면 바라보는 쪽
  aimDir() {
    if (this.aimStick && this.aimStick.on && Math.hypot(this.aimStick.dx, this.aimStick.dy) > 4) {
      return Math.atan2(this.aimStick.dy, this.aimStick.dx);
    }
    if (this.aim) {
      // 화면 좌표 → 월드. 카메라는 늘 플레이어를 가운데 둔다
      return Math.atan2(this.aim.y - view.h / 2, this.aim.x - view.w / 2);
    }
    return this.faceX >= 0 ? 0 : Math.PI;
  }

  shoot(dir, o) {
    const a = dir + (o.spread ? (this.rnd() - 0.5) * o.spread * 2 : 0);
    this.addProjectile({
      x: this.px, y: this.py - 8, a, speed: o.speed,
      dmg: Math.round(this.damage() * o.coef), pierce: o.pierce || 0, r: o.r,
      clip: o.spr ? null : 'bullet', spr: o.spr, trail: o.trail || 0, trailColor: o.trailColor, ghost: o.ghost || 0, flip: Math.abs(a) > Math.PI / 2,
      life: o.life || 110, grow: o.grow || 0, stagger: o.stagger || 0,
    });
    this.muzzle = 4;
    if (dir !== undefined) this.faceX = Math.cos(dir) >= 0 ? 1 : -1;
  }

  tickSkills() {
    for (const id of SKILL_IDS) if (this.cds[id] > 0) this.cds[id] -= 1;
    if (this.cds.dodge > 0) this.cds.dodge -= 1;

    if (this.want.dodge && this.cds.dodge <= 0 && this.diveT <= 0) {
      this.cds.dodge = PLAYER.dodgeCd;
      this.startDive({ dur: 18, dist: 62, dmg: 0 });
    }
    this.want.dodge = false;

    if (this.diveT > 0) return;             // 구르는 동안은 못 쏜다
    const dir = this.aimDir();
    if (this.want.primary && this.cds.primary <= 0) {
      this.cds.primary = Math.max(6, Math.round(SKILLS.primary.cd / this.atkSpeed()));
      SKILLS.primary.fire(this, dir);
    }
    if (this.want.special && this.cds.special <= 0) {
      this.cds.special = SKILLS.special.cd;
      SKILLS.special.fire(this, dir);
    }
    if (this.want.special2 && this.cds.special2 <= 0) {
      this.cds.special2 = SKILLS.special2.cd;
      SKILLS.special2.fire(this, dir);
    }
    this.want.special2 = false;
  }

  // ---- 큰 돌 ----
  // 장식이 아니라 **벽**이다. 상자·항아리와 같이 좌표 해시로 자리를 정하므로 어디로
  // 가든 같은 자리에 있고, 저장할 것도 없다. 화면 근처 것만 목록에 들고 있는다.
  tickRocks() {
    const { cell } = BOULDER;
    // 상자를 놓는 범위(tickSites)보다 넓게 훑는다 — 그래야 상자가 아직 목록에 없는
    // 돌 위에 놓이는 일이 없다
    const reach = Math.max(view.w, view.h) * 1.3;
    const c0 = Math.floor((this.px - reach) / cell);
    const c1 = Math.floor((this.px + reach) / cell);
    const r0 = Math.floor((this.py - reach) / cell);
    const r1 = Math.floor((this.py + reach) / cell);
    this.rocks.length = 0;
    for (let cy = r0; cy <= r1; cy += 1) {
      for (let cx = c0; cx <= c1; cx += 1) {
        if (hash2(cx * 17 - 9, cy * 23 + 4) >= BOULDER.chance) continue;
        this.rocks.push({
          x: (cx + 0.18 + hash2(cx + 31, cy) * 0.64) * cell,
          y: (cy + 0.18 + hash2(cx, cy - 17) * 0.64) * cell,
          r: BOULDER.r,
        });
      }
    }
  }

  // 캐릭터는 발밑이 아니라 몸통 기준으로 부딪힌다 — 그림 아래쪽이 돌에 살짝 겹쳐야
  // 돌 뒤로 돌아가는 게 자연스럽다
  clampToRocks() {
    const p = { x: this.px, y: this.py };
    this.pushOutOfRocks(p, PLAYER.r);
    this.px = p.x;
    this.py = p.y;
  }

  rockNear(x, y, pad = 0) {
    for (const s of this.rocks) {
      const dx = x - s.x;
      const dy = y - s.y;
      const rr = s.r + pad;
      if (dx * dx + dy * dy < rr * rr) return s;
    }
    return null;
  }

  // 원 밖으로 밀어낸다 — 벽에 부딪혀도 멈추지 않고 미끄러지듯 옆으로 흐르게.
  // 좌표를 통째로 되돌리면 벽에 붙었을 때 아예 못 움직여서 답답하다.
  pushOutOfRocks(p, r) {
    for (const s of this.rocks) {
      let dx = p.x - s.x;
      let dy = p.y - s.y;
      const rr = s.r + r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      let d = Math.sqrt(d2);
      if (d < 0.001) { dx = 0; dy = -1; d = 1; }      // 정확히 겹쳤으면 위로 뺀다
      p.x = s.x + (dx / d) * rr;
      p.y = s.y + (dy / d) * rr;
    }
  }

  // ---- 상자 ----
  // 원작처럼 맵에 놓여 있고, 골드가 모자라면 못 연다. 찾아다녀야 한다.
  // 상자와 항아리는 **세상에 미리 놓여 있다.** 좌표 해시로 자리를 정하므로
  // 어디로 가든 같은 자리에 있고, 화면 밖에서 걸어 들어가야 만난다 — 눈앞에서
  // 갑자기 생기지 않는다(예전에는 타이머로 소환해서 뻥 튀어나왔다).
  siteAt(cx, cy) {
    const h = hash2(cx * 3 + 11, cy * 7 - 5);
    if (h < 0.055) {
      const t = hash2(cx * 13 - 3, cy * 5 + 9);
      const tier = t < 0.08 ? CHEST_TIERS[2] : (t < 0.34 ? CHEST_TIERS[1] : CHEST_TIERS[0]);
      return { kind: 'chest', tier };
    }
    if (h < 0.16) return { kind: 'barrel' };
    return null;
  }

  tickSites() {
    const CELL = 150;
    const reach = Math.max(view.w, view.h) * 1.1;
    const c0 = Math.floor((this.px - reach) / CELL);
    const c1 = Math.floor((this.px + reach) / CELL);
    const r0 = Math.floor((this.py - reach) / CELL);
    const r1 = Math.floor((this.py + reach) / CELL);
    for (let cy = r0; cy <= r1; cy += 1) {
      for (let cx = c0; cx <= c1; cx += 1) {
        const key = `${cx},${cy}`;
        if (this.sites.has(key)) continue;
        const site = this.siteAt(cx, cy);
        this.sites.add(key);
        if (!site) continue;
        const x = (cx + 0.2 + hash2(cx, cy) * 0.6) * CELL;
        const y = (cy + 0.2 + hash2(cx + 7, cy - 3) * 0.6) * CELL;
        if (Math.hypot(x - this.px, y - this.py) < 90) continue;   // 발밑에는 놓지 않는다
        if (this.rockNear(x, y, 22)) continue;                     // 큰 돌에 파묻히지 않게
        if (site.kind === 'chest') {
          this.chests.push({
            x, y, tier: site.tier.id, open: false, t: 0,
            // 값은 **생길 때** 정해지고 그대로 굳는다. 뒤로 갈수록 새 상자가 비싸진다
            price: Math.round(site.tier.price * (1 + (this.t / 3600) * 1.1)),
          });
        } else {
          this.spawn('barrel', { x, y });
        }
      }
    }
    // 멀어진 상자는 목록에서 뺀다(다시 오면 같은 자리에 다시 생긴다)
    this.chests = this.chests.filter((ch) => {
      if (Math.hypot(ch.x - this.px, ch.y - this.py) < reach * 1.6) return true;
      this.sites.delete(`${Math.floor(ch.x / CELL)},${Math.floor(ch.y / CELL)}`);
      return false;
    });

    for (const c of this.chests) {
      c.t += 1;
      if (c.open) continue;
      const dx = this.px - c.x;
      const dy = this.py - 6 - c.y;
      if (dx * dx + dy * dy > 20 * 20) continue;
      if (this.gold < c.price) { c.deny = 20; continue; }
      this.gold -= c.price;
      c.open = true;
      const id = rollItem(this.rnd, c.tier);
      this.loot.push({ id, x: c.x, y: c.y + 12, t: 0 });
      this.spark(c.x, c.y, 18, ITEM_TIER[c.tier].color);
    }
  }

  tickLoot() {
    const keep = [];
    for (const l of this.loot) {
      l.t += 1;
      const dx = this.px - l.x;
      const dy = this.py - 6 - l.y;
      if (dx * dx + dy * dy < 14 * 14) {
        this.grantPassive(l.id);
        // 주운 물건이 머리 위로 떴다 사라진다(1초)
        this.pickFx.push({ id: l.id, t: 0, life: 60 });
        this.banner(PASSIVES[l.id].name, 70);
        continue;
      }
      keep.push(l);
    }
    this.loot = keep;
  }

  tickPops() {
    for (const a of this.arcs) a.t += 1;
    this.arcs = this.arcs.filter((a) => a.t < a.life);
    for (const p of this.pops) p.t += 1;
    this.pops = this.pops.filter((p) => p.t < p.life);
    for (const f of this.pickFx) f.t += 1;
    this.pickFx = this.pickFx.filter((f) => f.t < f.life);
  }

  // 여기서 필드를 골라 담기 때문에, 새 옵션을 넣을 때 이 목록에 빠뜨리면 조용히 사라진다.
  // (위상조정탄의 궤적·관통 증폭이 그렇게 오래 죽어 있었다.)
  addProjectile(p) {
    this.projectiles.push({
      x: p.x, y: p.y,
      x0: p.x, y0: p.y,                       // 쏜 자리 — 궤적을 여기서부터 긋는다
      vx: Math.cos(p.a) * p.speed,
      vy: Math.sin(p.a) * p.speed,
      r: p.r, dmg: p.dmg, pierce: p.pierce || 0,
      clip: p.clip || null, spr: p.spr || null, flip: !!p.flip,
      trail: p.trail || 0, trailColor: p.trailColor, ghost: p.ghost || 0,
      grow: p.grow || 0, stagger: p.stagger || 0,
      life: p.life, t: 0, hits: null,
    });
  }

  tickProjectiles() {
    // 잔상 — 총알이 지나간 토막을 남겨 두고 시간에 따라 지운다.
    // 총알 자체가 사라진 뒤에도 줄기가 남아 천천히 옅어진다.
    for (const t of this.trails) t.t += 1;
    this.trails = this.trails.filter((t) => t.t < t.life);
    for (const p of this.projectiles) {
      if (!p.trail) continue;
      this.trails.push({
        x1: p.x, y1: p.y, x2: p.x + p.vx, y2: p.y + p.vy,
        t: 0, life: 44, color: p.trailColor || '#6fc8ff',
      });
    }
    if (this.trails.length > 400) this.trails.splice(0, this.trails.length - 400);

    // AtG 미사일은 목표를 향해 휜다
    for (const p of this.projectiles) {
      if (!p.homing) continue;
      const t = this.enemies.find((e) => e.id === p.target && !e.dead)
        || this.nearestEnemies(p.x, p.y, 400, 1)[0];
      if (!t) continue;
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      const sp = Math.hypot(p.vx, p.vy) || 2.6;
      p.vx += (Math.cos(a) * sp - p.vx) * p.homing;
      p.vy += (Math.sin(a) * sp - p.vy) * p.homing;
      const n = Math.hypot(p.vx, p.vy) || 1;
      p.vx = (p.vx / n) * 2.8;
      p.vy = (p.vy / n) * 2.8;
    }
    const keep = [];
    for (const p of this.projectiles) {
      p.x += p.vx;
      p.y += p.vy;
      p.t += 1;
      p.life -= 1;
      let alive = p.life > 0;
      if (alive) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (p.hits && p.hits.has(e.id)) continue;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const rr = p.r + e.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          this.damageEnemy(e, p.dmg, { knock: 2.6, kx: p.vx, ky: p.vy });
          if (p.grow) p.dmg = Math.round(p.dmg * (1 + p.grow));   // 뚫을수록 세진다
          if (p.stagger) e.stun = Math.max(e.stun || 0, p.stagger);
          if (p.pierce > 0) {
            p.pierce -= 1;
            if (!p.hits) p.hits = new Set();
            p.hits.add(e.id);
          } else { alive = false; break; }
        }
      }
      // 큰 돌에 막힌다 — 관통탄도 예외가 아니다. 돌은 엄폐물이라야 의미가 있다
      if (alive && this.rockNear(p.x, p.y, p.r)) {
        this.spark(p.x, p.y, 4, '#b9c6cc');
        alive = false;
      }
      // 화면에서 한참 벗어나면 버린다
      if (alive && (Math.abs(p.x - this.px) > view.w || Math.abs(p.y - this.py) > view.h)) alive = false;
      if (alive) keep.push(p);
    }
    this.projectiles = keep;
  }

  tickZaps() {
    const keep = [];
    for (const z of this.zaps) {
      if (!z.done) {
        z.done = true;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dx = e.x - z.x;
          const dy = e.y - z.y;
          const rr = z.splash + e.r;
          if (dx * dx + dy * dy <= rr * rr) this.damageEnemy(e, z.dmg, { knock: 3, kx: dx, ky: dy });
        }
        this.spark(z.x, z.y, 6, '#cfe9ff');
      }
      z.t += 1;
      if (z.t < z.life) keep.push(z);
    }
    this.zaps = keep;
  }

  tickPatches() {
    const keep = [];
    for (const f of this.patches) {
      f.t += 1;
      f.life -= 1;
      f.tick -= 1;
      if (f.tick <= 0) {
        f.tick = 20;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dx = e.x - f.x;
          const dy = (e.y - f.y) / 0.7;
          const rr = f.r + e.r;
          if (dx * dx + dy * dy <= rr * rr) this.damageEnemy(e, f.dmg, { knock: 0 });
        }
      }
      if (f.life > 0) keep.push(f);
    }
    this.patches = keep;
  }

  // 항아리는 적이 아니라 풍경에 놓인 물건이다 — 화면 근처에 띄엄띄엄 놓는다

  // ---- 적 ----
  // 몇 스텝 뒤에 나갈 사격을 담아 둔다. 한꺼번에 뿌리지 않고 끊어 쏘는 스킬(더블 탭 ·
  // 제압 사격)이 원작처럼 "타타타" 나가게 하는 장치다.
  queueShot(delay, fn) {
    this.queue.push({ t: delay, fn });
  }

  tickQueue() {
    if (!this.queue.length) return;
    const rest = [];
    for (const q of this.queue) {
      if (q.t > 0) { q.t -= 1; rest.push(q); continue; }
      q.fn(this);
    }
    this.queue = rest;
  }

  // 택티컬 다이브 — 적 반대쪽으로 굴러 빠져나간다. 구르는 동안 무적
  // 구르는 방향은 **누르고 있는 방향키**다. 아무것도 안 누르면 적 반대쪽으로 뺀다.
  startDive(s) {
    let ax = this.inx || 0;
    let ay = this.iny || 0;
    if (ax === 0 && ay === 0) {
      for (const e of this.nearestEnemies(this.px, this.py, 200, 3)) {
        const d = Math.hypot(e.x - this.px, e.y - this.py) || 1;
        ax -= (e.x - this.px) / d;
        ay -= (e.y - this.py) / d;
      }
    }
    if (ax === 0 && ay === 0) { ax = this.faceX; ay = 0; }
    const n = Math.hypot(ax, ay) || 1;
    this.diveT = s.dur;
    this.diveVx = (ax / n) * (s.dist / s.dur) * 2;
    this.diveVy = (ay / n) * (s.dist / s.dur) * 2;
    this.diveDmg = s.dmg;
    for (const e of this.enemies) e.hitByDive = false;
    this.banner('회피', 20);
  }

  // 아이템 프록 — 우쿨렐레(연쇄 번개)와 AtG(유도 미사일)
  procItems(e, dmg) {
    if (this.mods.uke > 0 && this.rnd() < 0.25) {
      // 원작처럼 가까운 적으로만 옮겨 붙는다. 첫 도약은 90, 이후는 70 안쪽만.
      const chains = 2 + this.mods.uke;
      let from = e;
      let reach = 90;
      const hit = new Set([e.id]);
      for (let i = 0; i < chains; i += 1) {
        let best = null;
        let bd = reach;
        for (const o of this.enemies) {
          if (o.dead || o.prop || hit.has(o.id)) continue;
          const d = Math.hypot(o.x - from.x, o.y - from.y);
          if (d < bd) { bd = d; best = o; }
        }
        if (!best) break;                       // 닿을 적이 없으면 거기서 끊긴다
        hit.add(best.id);
        this.arcs.push({ x1: from.x, y1: from.y - from.r * 0.5, x2: best.x, y2: best.y - best.r * 0.5, t: 0, life: 9 });
        this.damageEnemy(best, Math.round(dmg * 0.8), { proc: false });
        from = best;
        reach = 70;
      }
    }
    if (this.mods.atg > 0 && this.rnd() < 0.10) {
      for (let i = 0; i < this.mods.atg; i += 1) {
        this.projectiles.push({
          x: this.px, y: this.py - 8, vx: 0, vy: -2.4, spr: 'missile', clip: null,
          dmg: Math.round(dmg * 3), pierce: 0, r: 6, life: 150, homing: 0.16, target: e.id, flip: false,
        });
      }
    }
  }

  // ---- 적의 공격 ----
  // 예고(wind)가 끝나는 순간 실제로 쏜다. 종류마다 피하는 법이 다르다 —
  // 직선탄은 옆으로, 곡사는 자리를 옮겨서, 광선은 예고 동안 축에서 벗어나서.
  enemyFire(e, atk) {
    const dx = this.px - e.x;
    const dy = this.py - 6 - e.y;
    const base = Math.atan2(dy, dx);
    if (atk.kind === 'shot') {
      for (let i = 0; i < (atk.n || 1); i += 1) {
        const off = (i - ((atk.n || 1) - 1) / 2) * (atk.spread || 0);
        const a = base + off;
        this.eshots.push({
          kind: 'shot', x: e.x, y: e.y - e.r * 0.6,
          vx: Math.cos(a) * atk.speed, vy: Math.sin(a) * atk.speed,
          dmg: Math.round(atk.dmg * SCALE.dmg(this.t / 3600)), r: atk.r || 4,
          spr: atk.spr || 'ember', life: ESHOT_LIFE, flip: Math.abs(a) > Math.PI / 2,
        });
      }
      this.spark(e.x, e.y - e.r * 0.6, 4, '#ff9a3c');
    } else if (atk.kind === 'mortar') {
      for (let i = 0; i < (atk.n || 1); i += 1) {
        const a = this.rnd() * Math.PI * 2;
        const spread = i === 0 ? 0 : 14 + this.rnd() * 20;
        this.eshots.push({
          kind: 'mortar', x: this.px + Math.cos(a) * spread, y: this.py + Math.sin(a) * spread,
          dmg: Math.round(atk.dmg * SCALE.dmg(this.t / 3600)), rad: atk.rad,
          life: atk.fall, fall: atk.fall,
        });
      }
    } else if (atk.kind === 'laser') {
      const len = atk.range + 60;
      this.beams.push({ x: e.x, y: e.y - e.r, a: base, len, w: atk.w, life: 12 });
      const hx = this.px - e.x;
      const hy = this.py - 6 - (e.y - e.r);
      const along = hx * Math.cos(base) + hy * Math.sin(base);
      const perp = Math.abs(-hx * Math.sin(base) + hy * Math.cos(base));
      if (along > 0 && along < len && perp < atk.w / 2 + PLAYER.r) {
        this.hurt(Math.round(atk.dmg * SCALE.dmg(this.t / 3600)));
      }
      this.shake = Math.max(this.shake, FX.shakeBoss);
    }
  }

  tickEnemyShots() {
    const alive = [];
    for (const s of this.eshots) {
      s.life -= 1;
      if (s.kind === 'shot') {
        s.x += s.vx;
        s.y += s.vy;
        const dx = this.px - s.x;
        const dy = this.py - 6 - s.y;
        if (dx * dx + dy * dy <= (s.r + PLAYER.r) ** 2) {
          this.hurt(s.dmg);
          this.spark(s.x, s.y, 6, '#ff9a3c');
          continue;
        }
        // 적 탄도 큰 돌에 막힌다 — 돌 뒤가 실제로 안전해야 엄폐가 성립한다
        if (this.rockNear(s.x, s.y, s.r)) {
          this.spark(s.x, s.y, 4, '#ff9a3c');
          continue;
        }
      } else if (s.kind === 'mortar' && s.life <= 0) {
        const dx = this.px - s.x;
        const dy = this.py - 6 - s.y;
        if (dx * dx + dy * dy <= (s.rad + PLAYER.r) ** 2) this.hurt(s.dmg);
        this.spark(s.x, s.y, 14, '#ffb03a');
        this.shake = Math.max(this.shake, 3);
      }
      if (s.life > 0) alive.push(s);
    }
    this.eshots = alive;
    this.beams = this.beams.filter((b) => (b.life -= 1) > 0);
  }

  spawn(kind, at) {
    const def = ENEMY[kind];
    const min = this.t / 3600;
    const hp = Math.round(def.hp * SCALE.hp(min));
    this.enemies.push({
      id: this.eid += 1,
      kind,
      x: at.x,
      y: at.y,
      hp,
      maxHp: hp,
      r: def.r,
      speed: def.speed * SCALE.speed(min),
      dmg: Math.round(def.dmg * SCALE.dmg(min)),
      boss: !!def.boss,
      elite: !!def.elite,
      prop: !!def.prop,
      face: -1,
      kx: 0,
      ky: 0,
      flash: 0,
      flashCd: 0,
      wind: 0,
      atkCd: Math.floor(30 + this.rnd() * 60),
      stun: 0,
      t: Math.floor(this.rnd() * 60),
      dead: false,
    });
  }

  tickEnemies() {
    const alive = [];
    // 서로 겹쳐 한 점에 뭉치지 않게 격자에 담아 이웃끼리만 밀어낸다
    const CELL = 18;
    const grid = new Map();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const key = `${Math.floor(e.x / CELL)},${Math.floor(e.y / CELL)}`;
      const cell = grid.get(key);
      if (cell) cell.push(e); else grid.set(key, [e]);
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += 1;
      if (e.flash > 0) e.flash -= 1;
      if (e.bleed > 0) {                    // 출혈 — 12스텝마다 한 조각씩
        e.bleedT = (e.bleedT || 0) + 1;
        if (e.bleedT % 12 === 0) {
          const tick = Math.max(1, Math.round(e.bleed / 5));
          e.bleed -= tick;
          this.spark(e.x, e.y - e.r * 0.5, 2, '#e8394f');
          this.damageEnemy(e, tick, { proc: false });
        }
      }
      if (e.flashCd > 0) e.flashCd -= 1;

      if (e.prop) { alive.push(e); continue; }   // 항아리는 제자리에 가만히 있는다

      let dx = this.px - e.x;
      let dy = this.py - e.y;
      let d = Math.hypot(dx, dy) || 1;
      // 한참 뒤로 처진 적은 버리지 않고 앞쪽 테두리로 돌려세운다.
      // 안 그러면 달아나는 동안 적이 화면 밖에 끝없이 늘어서기만 한다.
      if (d > recycleDist() && !e.boss) {
        const p = this.spawner.edgePoint(this);
        e.x = p.x;
        e.y = p.y;
        e.kx = 0;
        e.ky = 0;
        dx = this.px - e.x;
        dy = this.py - e.y;
        d = Math.hypot(dx, dy) || 1;
      }
      e.face = dx >= 0 ? 1 : -1;

      // 공격 — 원작처럼 조준(wind) 동안 멈춰 서서 예고하고, 원거리형은 거리를 지킨다.
      const atk = ENEMY[e.kind].atk;
      let hold = false;
      if (atk && atk.kind !== 'nova') {
        if (e.wind > 0) {
          e.wind -= 1;
          hold = true;
          if (e.wind === 0) this.enemyFire(e, atk);
        } else if (e.atkCd > 0) {
          e.atkCd -= 1;
        } else if (d < atk.range) {
          e.wind = atk.wind;
          e.atkCd = atk.cd;
          hold = true;
        }
      }
      if (e.stun > 0) { e.stun -= 1; hold = true; }
      const back = atk && atk.keep && d < atk.keep ? -1 : 1;
      const move = hold ? 0 : e.speed * back;
      e.x += (dx / d) * move + e.kx;
      e.y += (dy / d) * move + e.ky;
      if (this.rocks.length) this.pushOutOfRocks(e, e.r);   // 적도 큰 돌은 못 지나간다
      e.kx *= 0.82;
      e.ky *= 0.82;
      if (Math.abs(e.kx) < 0.02) e.kx = 0;
      if (Math.abs(e.ky) < 0.02) e.ky = 0;

      // 이웃 밀어내기(같은 칸과 오른쪽·아래 칸만 봐서 쌍마다 한 번씩)
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      for (let ox = 0; ox <= 1; ox += 1) {
        for (let oy = ox === 0 ? 0 : -1; oy <= 1; oy += 1) {
          const cell = grid.get(`${cx + ox},${cy + oy}`);
          if (!cell) continue;
          for (const o of cell) {
            if (o === e || o.dead || o.boss) continue;
            const ddx = o.x - e.x;
            const ddy = o.y - e.y;
            const min = e.r + o.r;
            const dd = ddx * ddx + ddy * ddy;
            if (dd >= min * min || dd === 0) continue;
            const dist = Math.sqrt(dd) || 1;
            const push = (min - dist) * 0.22;
            const ux = ddx / dist;
            const uy = ddy / dist;
            o.x += ux * push;
            o.y += uy * push;
            e.x -= ux * push;
            e.y -= uy * push;
          }
        }
      }

      // 접촉 피해
      if (this.hurtCd === 0) {
        const rr = e.r + PLAYER.r;
        const hx = this.px - e.x;
        const hy = this.py - 6 - e.y;
        if (hx * hx + hy * hy <= rr * rr) {
          this.hurt(e.dmg);

        }
      }

      alive.push(e);
    }
    this.enemies = alive;
  }

  // 원작의 프록 구조를 그대로 옮겼다. 때릴 때마다 아이템이 굴러가고, 그 결과가
  // 다시 적을 때린다(연쇄는 proc:false로 넘겨 무한히 번지지 않게 막는다).
  damageEnemy(e, dmg, opt = {}) {
    if (e.dead) return;
    // 크로우바 — 아직 성한 적에게만 붙는다
    if (this.mods.crowbar > 0 && e.hp >= e.maxHp * 0.9) dmg *= 1 + this.mods.crowbar;
    if (this.mods.boss > 0 && (e.boss || e.elite)) dmg *= 1 + this.mods.boss;   // 관통 탄환
    const crit = this.mods.crit > 0 && this.rnd() < this.mods.crit;
    if (crit) {
      dmg *= 2;
      this.spark(e.x, e.y - e.r, 5, '#ffd23f');
    }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (opt.proc !== false && !e.prop) this.procItems(e, dmg);
    // 삼각 단검 — 출혈. 시간에 걸쳐 기본 피해의 240%가 들어간다
    if (opt.proc !== false && this.mods.bleed > 0 && this.rnd() < this.mods.bleed) {
      e.bleed = (e.bleed || 0) + Math.round(this.damage() * 2.4);
      e.bleedT = 0;
    }
    // 계속 때리는 스킬 안에 있으면 매 프레임 흰색으로 타 실루엣만 남는다.
    // 번쩍인 뒤에는 잠깐 쉬게 해서 원래 그림이 보이게 한다.
    if (e.flashCd <= 0) { e.flash = FX.hitFlash; e.flashCd = FX.hitFlash + 10; }
    const kn = (opt.knock || 0) * (ENEMY[e.kind].knock ?? 1);
    if (kn > 0) {
      const d = Math.hypot(opt.kx || 0, opt.ky || 0) || 1;
      e.kx += ((opt.kx || 0) / d) * kn;
      e.ky += ((opt.ky || 0) / d) * kn;
    }
    if (e.hp > 0) return;
    e.dead = true;
    if (e.prop) { this.breakBarrel(e); return; }
    this.kills += 1;
    // 골드는 처치에서 나온다 — 이게 있어야 상자를 열 수 있다(원작과 같은 순환).
    // 줍는 물건이 아니라 그 자리에서 숫자가 튀어오른다.
    const g = 2 + Math.floor(this.t / 3600) + (e.elite ? 12 : 0) + (e.boss ? 60 : 0);
    this.gold += g;
    this.pops.push({ x: e.x, y: e.y - e.r, t: 0, life: 46, text: `+${g}`, color: '#ffd23f' });
    this.xp += ENEMY[e.kind].gem * 4 + 3;
    // 몬스터의 이빨 — 처치할 때마다 작은 회복 구슬이 떨어진다
    // 휘발유 — 죽은 자리가 불탄다
    if (this.mods.gas > 0) {
      this.patches.push({
        x: e.x, y: e.y, r: 26 + this.mods.gas * 8, life: 60,
        dmg: Math.round(this.damage() * 1.5 * this.mods.gas), t: 0, tick: 0,
      });
    }
    if (this.mods.tooth > 0) {
      this.drops.push({ kind: 'tooth', x: e.x, y: e.y, life: DROP.life, heal: 6 + this.mods.tooth * 2 });
    }
    this.killDrop(e);
  }


  // 보석이 너무 많이 깔리면 화면도 지저분하고 처리도 무겁다.
  // 가장 먼 보석을 그 다음으로 먼 보석에 합친다 — 경험치 총량은 그대로다.

  // 항아리를 부수면 자석 · 금화 · 회복 중 하나가 나온다
  breakBarrel(e) {
    this.spark(e.x, e.y, 12, '#c98f66');
    let r = this.rnd();
    let kind = BARREL.loot[BARREL.loot.length - 1][0];
    for (const [k, w] of BARREL.loot) {
      if (r < w) { kind = k; break; }
      r -= w;
    }
    this.drops.push({ kind, x: e.x, y: e.y, life: DROP.life });
  }

  killDrop(e) {
    const def = ENEMY[e.kind];
    this.spark(e.x, e.y, e.boss ? 40 : e.elite ? 16 : 6, e.boss ? '#b06bff' : '#ffd6a0');

    if (e.boss) {
      this.shake = Math.max(this.shake, FX.shakeBoss);
      this.banner('보스 격파', 110);
      this.drops.push({ kind: 'chest', x: e.x, y: e.y, life: DROP.life });
      // 보스는 보석을 여러 개 떨군다
      for (let i = 0; i < 6; i += 1) {
        const a = this.rnd() * TAU;
      }
      return;
    }
    if (e.elite && DROP.chestFromElite) {
      this.drops.push({ kind: 'chest', x: e.x, y: e.y, life: DROP.life });
      return;
    }
    const r = this.rnd();
    if (r < DROP.heartChance) this.drops.push({ kind: 'heart', x: e.x, y: e.y, life: DROP.life });
  }

  hurt(dmg) {
    if (this.diveT > 0) return;                       // 구르는 동안은 무적
    if (this.mods.block > 0 && this.rnd() < this.mods.block) {
      this.banner('막았다', 24);
      this.spark(this.px, this.py - 8, 8, '#f0a8ff');
      return;
    }
    if (this.god) return;          // 디버그 콘솔의 무적
    this.hp -= dmg;
    this.hurtCd = PLAYER.hurtCd;
    this.shake = Math.max(this.shake, FX.shakeHurt);
    this.spark(this.px, this.py - 8, 5, '#ff5a63');
  }

  // ---- 획득물 ----
  tickPickups() {
    const pull = PLAYER.pickR * this.mods.pick;

    const keepDrops = [];
    for (const d of this.drops) {
      d.life -= 1;
      const dx = this.px - d.x;
      const dy = this.py - 6 - d.y;
      if (dx * dx + dy * dy < 12 * 12) { this.collect(d); continue; }
      if (d.life > 0) keepDrops.push(d);
    }
    this.drops = keepDrops;
  }

  collect(d) {
    if (d.kind === 'tooth') {
      this.hp = Math.min(this.maxHp, this.hp + (d.heal || 6));
    } else if (d.kind === 'coin') {
      const [lo, hi] = COIN_VALUE;
      const amount = lo + Math.floor(this.rnd() * (hi - lo + 1));
      this.gold += amount;
      this.banner(`금화 +${amount}`, 50);
    } else if (d.kind === 'heart') {
      this.hp = Math.min(this.maxHp, this.hp + HEART_HEAL);
      this.banner('회복', 60);
    } else if (d.kind === 'chest') {
      this.openChest();
    }
  }

  // 엘리트·보스가 떨구는 상자는 그 자리에서 열린다(맵에 놓인 상자와 달리 공짜다)
  // 엘리트·보스가 떨구는 상자 — 그 자리에 아이템이 떨어진다(값은 없다)
  openChest() {
    const tier = this.rnd() < 0.25 ? 'legend' : 'rare';
    const id = rollItem(this.rnd, tier);
    this.loot.push({ id, x: this.px, y: this.py + 14, t: 0 });
    this.spark(this.px, this.py - 8, 20, ITEM_TIER[tier].color);
  }

  // ---- 성장 ----
  // 카드를 고르는 일은 없다. 레벨은 체력과 공격력만 올린다(원작과 같다).
  levelUp() {
    this.xp -= this.xpNext;
    this.level += 1;
    this.xpNext = xpNeed(this.level);
    this.maxHp += PLAYER.hpPerLevel;
    this.hp = Math.min(this.maxHp, this.hp + PLAYER.hpPerLevel);
    this.banner(`LEVEL ${this.level}`, 70);
    this.emit();
  }

  // 상한이 없다 — 종류도 개수도 무한히 쌓인다(원작과 같다)
  grantPassive(id) {
    if (!this.passives[id]) {
      this.passives[id] = 1;
    } else {
      this.passives[id] += 1;
    }
    const before = this.mods.hp;
    this.mods = modsOf(this.passives);
    // 최대 체력이 늘면 늘어난 만큼 바로 채워준다
    const gain = this.mods.hp - before;
    this.maxHp = PLAYER.hp + this.mods.hp;
    if (gain > 0) this.hp = Math.min(this.maxHp, this.hp + gain);
  }

  // ---- 조회 ----
  nearestEnemies(x, y, maxD, n) {
    const found = [];
    const max2 = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 <= max2) found.push({ e, d2 });
    }
    found.sort((a, b) => a.d2 - b.d2);
    return found.slice(0, n).map((f) => f.e);
  }

  enemiesOnScreen() {
    const out = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.px) < view.w / 2 && Math.abs(e.y - this.py) < view.h / 2) out.push(e);
    }
    return out;
  }

  // ---- 연출 ----
  spark(x, y, n, color) {
    if (this.parts.length > 300) return;
    for (let i = 0; i < n; i += 1) {
      const a = this.rnd() * TAU;
      const sp = 0.6 + this.rnd() * 1.9;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4,
        life: 16 + Math.floor(this.rnd() * 14), color,
      });
    }
  }

  tickParts() {
    const keep = [];
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.94;
      p.life -= 1;
      if (p.life > 0) keep.push(p);
    }
    this.parts = keep;
  }

  // 디버그용 시간 점프. 건너뛴 구간의 사건(보스·포위)은 한꺼번에 터지지 않도록
  // 지나간 것으로 처리한다.
  skipSeconds(sec) {
    this.t += sec * 60;
    this.spawner.catchUp(this.t);
  }

  banner(text, life) {
    this.bannerText = text;
    this.bannerT = life;
  }

  finish(phase) {
    this.phase = phase;
    this.result = submitScore(this.sec);
    this.totalGold = addGold(this.gold);
    this.emit();
  }
}
