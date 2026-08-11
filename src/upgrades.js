// 아이템과 레벨업 선택지 구성.
// 뱀서와 같은 규칙: 레벨업 때 카드 세 장을 뽑고, 고르면 그 자리에서 반영된다.

import { MAX_LV, MAX_WEAPONS, MAX_PASSIVES } from './config.js';
import { WEAPONS, WEAPON_IDS } from './weapons.js';

// 아이템 — 직접 쏘지 않고 코만도 자신을 바꾼다. 이름은 원작에서 그대로 가져왔다.
// icon은 스프라이트시트의 프레임 이름(스킬 아이콘과 같은 11×11 규격).
export const PASSIVES = {
  crowbar: { name: '크로우바', color: '#e8394f', desc: '공격력 +12%', step: 0.12, icon: 'item.crowbar' },
  hoof: { name: '폴의 염소 발굽', color: '#c19a6b', desc: '이동 속도 +8%', step: 0.08, icon: 'item.hoof' },
  infusion: { name: '주입', color: '#ff5a63', desc: '최대 체력 +22', step: 22, icon: 'item.infusion' },
  syringe: { name: '군인의 주사기', color: '#ffd23f', desc: '공격 속도 +8%', step: 0.08, icon: 'item.syringe' },
  gasoline: { name: '휘발유', color: '#ff7a1a', desc: '효과 범위 +10%', step: 0.10, icon: 'item.gasoline' },
  scanner: { name: '레이더 스캐너', color: '#7fe2ff', desc: '획득 범위 +30%', step: 0.30, icon: 'item.scanner' },
  glasses: { name: '렌즈 제작자의 안경', color: '#a8dcff', desc: '치명타 확률 +7%', step: 0.07, icon: 'item.glasses' },
  medkit: { name: '의료 키트', color: '#ffffff', desc: '초당 체력 +0.5', step: 0.5, icon: 'item.medkit' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);

// 보유 아이템 레벨 → 실제 보정 계수
export function modsOf(passives) {
  const lv = (id) => passives[id] || 0;
  return {
    dmg: 1 + lv('crowbar') * PASSIVES.crowbar.step,
    speed: 1 + lv('hoof') * PASSIVES.hoof.step,
    hp: lv('infusion') * PASSIVES.infusion.step,
    cd: 1 / (1 + lv('syringe') * PASSIVES.syringe.step),
    area: 1 + lv('gasoline') * PASSIVES.gasoline.step,
    pick: 1 + lv('scanner') * PASSIVES.scanner.step,
    crit: lv('glasses') * PASSIVES.glasses.step,
    regen: lv('medkit') * PASSIVES.medkit.step,
  };
}

// 카드 한 장 = { kind, id, name, level, line, color, icon, group }
// group은 화면에 그대로 찍히는 갈래 이름이다 — 스킬 / 아이템.
function weaponCard(id, level) {
  const w = WEAPONS[id];
  return {
    kind: 'weapon',
    group: '스킬',
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
    group: '아이템',
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
  // 대체 스킬이 차지한 칸도 슬롯을 쓴다 — 새 스킬 여유는 실제 보유 수로 센다
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
