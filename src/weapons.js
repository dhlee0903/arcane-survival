// 코만도의 스킬 — 조준 버튼 없이 **자동으로** 나간다.
// 조준도 발사도 플레이어가 하지 않는다.
// 무기마다 레벨 1~6의 수치표를 갖고, fire()에서 게임의 배열에 투사체·장판을 밀어 넣는다.
//
// 아이템 보정(mods)은 여기서 한 번에 먹인다.
//   dmg  = 표 값 × mods.dmg
//   cd   = 표 값 × mods.cd    (짧을수록 자주 나간다)
//   rad  = 표 값 × mods.area

import { MAX_LV, view } from './config.js';

const TAU = Math.PI * 2;

// 레벨 표는 1레벨부터 6레벨까지 6칸. 빠진 값은 앞 레벨에서 이어받는다.
function table(rows) {
  const out = [];
  let prev = {};
  for (let i = 0; i < MAX_LV; i += 1) {
    prev = { ...prev, ...(rows[i] || {}) };
    out.push(prev);
  }
  return out;
}

export const WEAPONS = {
  // ---- 코만도의 스킬 넷 ----
  // 원작과 같은 구성이다: 주 무기(더블 탭) · 보조(페이즈 라운드) · 이동기(택티컬 다이브) ·
  // 특수(제압 사격 / 파편 수류탄). 조준 버튼이 없으므로 표적은 코드가 고르지만,
  // **쏘는 방식**은 원작 그대로다 — 두 발씩 끊어 쏘고, 관통하고, 부채꼴로 퍼붓고, 던진다.
  tap: {
    name: '더블 탭',
    icon: 'skill.tap',
    evo: { into: 'crowdfunder', needs: 'crowbar' },
    desc: '가장 가까운 적에게 권총을 두 발씩 끊어 쏜다',
    up: [
      '연사 속도 증가',
      '피해 증가 · 한 번에 두 표적',
      '연사 속도 증가',
      '피해 증가 · 한 번에 세 표적',
      '탄이 적을 관통한다',
    ],
    lv: table([
      { burst: 2, gap: 5, targets: 1, cd: 36, dmg: 11, pierce: 0, speed: 6.2, r: 4 },
      { cd: 32 },
      { dmg: 15, targets: 2 },
      { cd: 27 },
      { dmg: 20, targets: 3 },
      { cd: 23, dmg: 26, pierce: 1 },
    ]),
    fire(g, s) {
      // 두 발을 한꺼번에 뿌리지 않고 몇 스텝 간격으로 끊어 쏜다(원작의 더블 탭)
      const targets = g.nearestEnemies(g.px, g.py, Math.max(view.w, view.h) * 0.85, s.targets);
      for (let t = 0; t < s.targets; t += 1) {
        for (let i = 0; i < s.burst; i += 1) {
          g.queueShot(i * s.gap, (gg) => {
            const tgt = targets[t] && !targets[t].dead ? targets[t] : gg.nearestEnemies(gg.px, gg.py, 400, 1)[0];
            const a = tgt ? Math.atan2(tgt.y - gg.py, tgt.x - gg.px) : (gg.faceX >= 0 ? 0 : Math.PI);
            gg.addProjectile({
              x: gg.px, y: gg.py - 8, a: a + (gg.rnd() - 0.5) * 0.06, speed: s.speed,
              dmg: s.dmg, pierce: s.pierce, r: s.r, clip: 'bullet', life: 120,
            });
            gg.muzzle = 4;
          });
        }
      }
    },
  },

  phase: {
    name: '페이즈 라운드',
    icon: 'skill.phase',
    evo: { into: 'phaseBlast', needs: 'syringe' },
    desc: '바라보는 방향으로 관통탄 · 줄지어 선 적을 한 번에 꿴다',
    up: ['피해 증가', '관통 증가', '재사용 대기 감소', '피해 증가 · 관통 증가', '탄속 · 피해 대폭 증가'],
    lv: table([
      { cd: 96, dmg: 30, pierce: 3, speed: 8.4, r: 6 },
      { dmg: 40 },
      { pierce: 5 },
      { cd: 84 },
      { dmg: 54, pierce: 7 },
      { cd: 72, dmg: 72, pierce: 99, speed: 9.6 },
    ]),
    fire(g, s) {
      // 표적이 있으면 그쪽, 없으면 바라보는 쪽. 한 발이 줄을 통째로 꿴다
      const t = g.nearestEnemies(g.px, g.py, Math.max(view.w, view.h) * 0.9, 1)[0];
      const a = t ? Math.atan2(t.y - g.py, t.x - g.px) : (g.faceX >= 0 ? 0 : Math.PI);
      g.addProjectile({
        x: g.px, y: g.py - 8, a, speed: s.speed,
        dmg: s.dmg, pierce: s.pierce, r: s.r, clip: null, spr: 'phase',
        flip: Math.abs(a) > Math.PI / 2, life: 120, trail: true,
      });
      g.muzzle = 6;
    },
  },

  suppress: {
    name: '제압 사격',
    icon: 'skill.suppress',
    evo: { into: 'missiles', needs: 'atg' },
    desc: '한 방향으로 탄을 퍼붓는다 · 맞은 적은 밀리고 잠깐 비틀거린다',
    up: ['탄 수 증가', '피해 증가', '탄 수 증가 · 부채꼴 확대', '재사용 대기 감소', '탄 수 대폭 증가'],
    lv: table([
      { shots: 6, gap: 4, spread: 0.20, cd: 190, dmg: 8, speed: 5.6, r: 4 },
      { shots: 8 },
      { dmg: 11 },
      { shots: 11, spread: 0.28 },
      { cd: 160 },
      { shots: 16, dmg: 15, cd: 140 },
    ]),
    fire(g, s) {
      const t = g.nearestEnemies(g.px, g.py, Math.max(view.w, view.h) * 0.85, 1)[0];
      const base = t ? Math.atan2(t.y - g.py, t.x - g.px) : (g.faceX >= 0 ? 0 : Math.PI);
      for (let i = 0; i < s.shots; i += 1) {
        g.queueShot(i * s.gap, (gg) => {
          const a = base + (gg.rnd() - 0.5) * s.spread * 2;
          gg.addProjectile({
            x: gg.px, y: gg.py - 8, a, speed: s.speed,
            dmg: s.dmg, pierce: 0, r: s.r, clip: 'bullet', life: 110, stagger: 12,
          });
          gg.muzzle = 4;
        });
      }
    },
  },

  frag: {
    name: '파편 수류탄',
    icon: 'skill.frag',
    evo: { into: 'behemoth', needs: 'bear' },
    desc: '적 한가운데로 던진다 · 떨어진 자리가 터지고 불이 남는다',
    up: ['피해 증가', '폭발 범위 증가', '재사용 대기 감소', '한 번에 두 발', '피해 · 범위 증가'],
    lv: table([
      { n: 1, cd: 150, dmg: 34, rad: 30, burn: 6, life: 90, fall: 34 },
      { dmg: 46 },
      { rad: 36 },
      { cd: 130 },
      { n: 2 },
      { dmg: 66, rad: 44, burn: 10 },
    ]),
    fire(g, s) {
      // 던져서 **떨어진 자리**가 터진다 — 발밑에 깔던 예전 방식과 다르다
      for (let i = 0; i < s.n; i += 1) {
        const t = g.nearestEnemies(g.px, g.py, Math.max(view.w, view.h) * 0.7, s.n)[i]
          || g.nearestEnemies(g.px, g.py, 400, 1)[0];
        const tx = t ? t.x + (g.rnd() - 0.5) * 16 : g.px + g.faceX * 60;
        const ty = t ? t.y + (g.rnd() - 0.5) * 16 : g.py;
        g.grenades.push({
          x: g.px, y: g.py - 10, tx, ty, t: 0, fall: s.fall,
          dmg: s.dmg, rad: s.rad, burn: s.burn, life: s.life,
        });
      }
    },
  },

  dive: {
    name: '택티컬 다이브',
    icon: 'skill.dive',
    evo: { into: 'slide', needs: 'hoof' },
    desc: '적이 붙으면 굴러서 빠져나간다 · 구르는 동안 **무적**',
    up: ['무적 시간 증가', '재사용 대기 감소', '구르는 거리 증가', '재사용 대기 감소', '지나친 적에게 피해'],
    lv: table([
      { cd: 260, dur: 16, dist: 46, dmg: 0, near: 34 },
      { dur: 20 },
      { cd: 220 },
      { dist: 58 },
      { cd: 180 },
      { dur: 24, dmg: 24 },
    ]),
    // 적이 가까이 붙었을 때만 구른다 — 안 그러면 혼자 굴러다닌다
    ready: (g, s) => !!g.nearestEnemies(g.px, g.py, s.near, 1)[0],
    fire(g, s) {
      g.startDive(s);
    },
  },
};

// ---- 대체 스킬 ----
// 원작의 대체 스킬을 이 판의 규칙으로 옮겼다. 스킬을 만렙까지 올리고 지정된 아이템을
// 갖춘 상태에서 **상자를 열면** 대체 스킬로 바뀐다.
// 카드 풀에는 절대 오르지 않는다(evolved 플래그).
const EVOLVED = {
  crowdfunder: {
    name: '크라우드펀더',
    icon: 'skill.tap',
    evolved: true,
    from: 'tap',
    desc: '돈을 쏟아붓듯 멈추지 않고 난사한다',
    lv: table([{ burst: 5, gap: 3, targets: 3, cd: 16, dmg: 16, pierce: 1, speed: 7, r: 4 }]),
    fire: (g, st) => WEAPONS.tap.fire(g, st),
  },
  phaseBlast: {
    name: '페이즈 블래스트',
    icon: 'skill.phase',
    evolved: true,
    from: 'phase',
    desc: '관통탄을 부채꼴로 여덟 발 · 원작의 대체 스킬',
    lv: table([{ count: 8, cd: 70, dmg: 40, pierce: 6, speed: 8.4, r: 6 }]),
    fire(g, s) {
      const t = g.nearestEnemies(g.px, g.py, Math.max(view.w, view.h) * 0.9, 1)[0];
      const base = t ? Math.atan2(t.y - g.py, t.x - g.px) : (g.faceX >= 0 ? 0 : Math.PI);
      for (let i = 0; i < s.count; i += 1) {
        const a = base + (i - (s.count - 1) / 2) * 0.13;
        g.addProjectile({
          x: g.px, y: g.py - 8, a, speed: s.speed,
          dmg: s.dmg, pierce: s.pierce, r: s.r, clip: null, spr: 'phase',
          flip: Math.abs(a) > Math.PI / 2, life: 90,
        });
      }
      g.muzzle = 8;
    },
  },
  missiles: {
    name: '일회용 미사일 발사기',
    icon: 'skill.suppress',
    evolved: true,
    from: 'suppress',
    desc: '유도 미사일을 한꺼번에 열두 발 쏟아낸다',
    lv: table([{ n: 12, gap: 3, cd: 200, dmg: 26 }]),
    fire(g, s) {
      for (let i = 0; i < s.n; i += 1) {
        g.queueShot(i * s.gap, (gg) => {
          const t = gg.nearestEnemies(gg.px, gg.py, 500, s.n)[i % s.n]
            || gg.nearestEnemies(gg.px, gg.py, 500, 1)[0];
          const a = -Math.PI / 2 + (gg.rnd() - 0.5) * 1.2;
          gg.projectiles.push({
            x: gg.px, y: gg.py - 8, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4,
            spr: 'missile', clip: null, dmg: s.dmg, pierce: 0, r: 6, life: 180,
            homing: 0.14, target: t ? t.id : -1, flip: false,
          });
          gg.muzzle = 4;
        });
      }
    },
  },
  behemoth: {
    name: '거대한 광휘',
    icon: 'skill.frag',
    evolved: true,
    from: 'frag',
    desc: '수류탄이 네 발씩 · 터지는 자리마다 불바다가 남는다',
    lv: table([{ n: 4, cd: 110, dmg: 60, rad: 50, burn: 14, life: 130, fall: 30 }]),
    fire: (g, st) => WEAPONS.frag.fire(g, st),
  },
  slide: {
    name: '택티컬 슬라이드',
    icon: 'skill.dive',
    evolved: true,
    from: 'dive',
    desc: '원작의 대체 스킬 · 더 멀리 미끄러지고 지나친 적을 벤다',
    lv: table([{ cd: 110, dur: 26, dist: 84, dmg: 44, near: 56 }]),
    ready: (g, s) => !!g.nearestEnemies(g.px, g.py, s.near, 1)[0],
    fire: (g, st) => WEAPONS.dive.fire(g, st),
  },
};

Object.assign(WEAPONS, EVOLVED);

export const WEAPON_IDS = Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved);
export const EVOLVED_IDS = Object.keys(EVOLVED);

// 어떤 스킬이 지금 바뀔 수 있는지 — 만렙 + 필요한 아이템 보유
export function evolvableWeapon(weapons, passives, maxLv) {
  for (const id of Object.keys(weapons)) {
    const def = WEAPONS[id];
    if (!def || !def.evo) continue;
    if (weapons[id] < maxLv) continue;
    if (!passives[def.evo.needs]) continue;
    return { from: id, into: def.evo.into };
  }
  return null;
}

// 조합식 목록(일시정지 화면에 보여준다)
export function evoRecipes() {
  return WEAPON_IDS
    .filter((id) => WEAPONS[id].evo)
    .map((id) => ({
      from: WEAPONS[id].name,
      fromIcon: WEAPONS[id].icon,
      needs: WEAPONS[id].evo.needs,
      into: WEAPONS[WEAPONS[id].evo.into].name,
      intoIcon: WEAPONS[WEAPONS[id].evo.into].icon,
    }));
}

// 레벨 + 패시브 보정을 먹인 최종 수치
export function statsOf(id, level, mods) {
  const base = WEAPONS[id].lv[Math.min(level, MAX_LV) - 1];
  const s = { ...base };
  if (s.dmg) s.dmg = Math.max(1, Math.round(s.dmg * mods.dmg));
  if (s.cd) s.cd = Math.max(6, Math.round(s.cd * mods.cd));
  if (s.rad) s.rad = Math.round(s.rad * mods.area);
  if (s.splash) s.splash = Math.round(s.splash * mods.area);
  return s;
}
