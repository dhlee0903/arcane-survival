// 패시브 아이템과 레벨업 선택지 구성.
// 뱀서와 같은 규칙: 레벨업 때 카드 세 장을 뽑고, 고르면 그 자리에서 반영된다.

import { MAX_LV, MAX_WEAPONS, MAX_PASSIVES } from './config.js';
import { WEAPONS, WEAPON_IDS } from './weapons.js';

// 패시브 아이템 — 직접 공격하지 않고 마법사 자신을 바꾼다.
// icon은 스프라이트시트의 프레임 이름(공격 아이템과 같은 11×11 규격).
export const PASSIVES = {
  might: { name: '마력의 구슬', color: '#a371f7', desc: '공격력 +12%', step: 0.12, icon: 'item.might' },
  swift: { name: '바람의 깃털', color: '#e6edf3', desc: '이동 속도 +8%', step: 0.08, icon: 'item.swift' },
  vigor: { name: '생명의 물약', color: '#ff5a63', desc: '최대 체력 +22', step: 22, icon: 'item.vigor' },
  focus: { name: '시간의 모래', color: '#ffd23f', desc: '재사용 대기 -8%', step: 0.08, icon: 'item.focus' },
  area: { name: '확장의 고리', color: '#4f9bff', desc: '효과 범위 +10%', step: 0.10, icon: 'item.area' },
  magnet: { name: '자석', color: '#c3ccdd', desc: '획득 범위 +30%', step: 0.30, icon: 'magnet' },
  wisdom: { name: '지혜의 서', color: '#ffffff', desc: '경험치 +18%', step: 0.18, icon: 'item.wisdom' },
  regen: { name: '재생의 물약', color: '#3fce6a', desc: '초당 체력 +0.5', step: 0.5, icon: 'item.regen' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);

// 보유 패시브 레벨 → 실제 보정 계수
export function modsOf(passives) {
  const lv = (id) => passives[id] || 0;
  return {
    might: 1 + lv('might') * PASSIVES.might.step,
    speed: 1 + lv('swift') * PASSIVES.swift.step,
    hp: lv('vigor') * PASSIVES.vigor.step,
    focus: 1 / (1 + lv('focus') * PASSIVES.focus.step),
    area: 1 + lv('area') * PASSIVES.area.step,
    magnet: 1 + lv('magnet') * PASSIVES.magnet.step,
    wisdom: 1 + lv('wisdom') * PASSIVES.wisdom.step,
    regen: lv('regen') * PASSIVES.regen.step,
  };
}

// 카드 한 장 = { kind, id, name, level, line, color, icon, group }
// group은 화면에 그대로 찍히는 갈래 이름이다 — 공격 / 패시브.
function weaponCard(id, level) {
  const w = WEAPONS[id];
  return {
    kind: 'weapon',
    group: '공격',
    id,
    name: w.name,
    level: level + 1,
    line: level === 0 ? w.desc : w.up[level - 1],
    tag: level === 0 ? 'NEW' : `Lv ${level + 1}`,
    color: '#7ff0ff',
    icon: w.icon,
  };
}

function passiveCard(id, level) {
  const p = PASSIVES[id];
  return {
    kind: 'passive',
    group: '패시브',
    id,
    name: p.name,
    level: level + 1,
    line: p.desc,
    tag: level === 0 ? 'NEW' : `Lv ${level + 1}`,
    color: p.color,
    icon: p.icon,
  };
}

// 뽑기 대상 전체를 만든 뒤 섞어서 n장 자른다.
// 남는 게 없으면(전부 만렙) 회복 카드로 채운다.
export function rollChoices(state, n, rnd) {
  const pool = [];

  for (const id of WEAPON_IDS) {
    const lv = state.weapons[id] || 0;
    if (lv === 0) {
      if (Object.keys(state.weapons).length < MAX_WEAPONS) pool.push(weaponCard(id, 0));
    } else if (lv < MAX_LV) {
      pool.push(weaponCard(id, lv));
    }
  }
  for (const id of PASSIVE_IDS) {
    const lv = state.passives[id] || 0;
    if (lv === 0) {
      if (Object.keys(state.passives).length < MAX_PASSIVES) pool.push(passiveCard(id, 0));
    } else if (lv < MAX_LV) {
      pool.push(passiveCard(id, lv));
    }
  }

  // 피셔-예이츠. rnd는 게임의 시드 난수라 리플레이 가능성을 해치지 않는다.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const out = pool.slice(0, n);
  while (out.length < n) {
    out.push({
      kind: 'heal', group: '보급', id: 'heal', name: '치유의 물약', level: 0,
      line: '체력 40 회복', tag: '즉시', color: '#3fce6a', icon: 'heart',
    });
  }
  return out;
}
