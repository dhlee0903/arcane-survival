// 아이템과 레벨업 선택지 구성.
// 뱀서와 같은 규칙: 레벨업 때 카드 세 장을 뽑고, 고르면 그 자리에서 반영된다.

import { MAX_LV, MAX_WEAPONS, MAX_PASSIVES } from './config.js';
import { WEAPONS, WEAPON_IDS } from './weapons.js';

// 아이템 — 직접 쏘지 않고 코만도 자신을 바꾼다. 이름은 원작에서 그대로 가져왔다.
// icon은 스프라이트시트의 프레임 이름(스킬 아이콘과 같은 11×11 규격).
export const PASSIVES = {
  // 수치만 올려 주는 아이템은 두 개뿐이다. 나머지는 **때릴 때마다 굴리는** 것들이라
  // 같은 스킬을 써도 무엇을 들었느냐에 따라 화면이 달라진다(원작의 프록).
  crowbar: { name: '크로우바', color: '#e8394f', desc: '체력 90% 이상 적에게 피해 +75%', step: 0.75, icon: 'item.crowbar' },
  hoof: { name: '폴의 염소 발굽', color: '#c19a6b', desc: '이동 속도 +14%', step: 0.14, icon: 'item.hoof' },
  bear: { name: '곰 인형', color: '#f0a8ff', desc: '피해를 통째로 막을 확률 +15%', step: 0.15, icon: 'item.bear' },
  syringe: { name: '군인의 주사기', color: '#ffd23f', desc: '공격 속도 +15%', step: 0.15, icon: 'item.syringe' },
  ukulele: { name: '우쿨렐레', color: '#c19a6b', desc: '타격 시 25% 확률로 번개가 튄다', step: 1, icon: 'item.ukulele' },
  atg: { name: 'AtG 미사일 Mk.1', color: '#a8dcff', desc: '타격 시 10% 확률로 유도 미사일', step: 1, icon: 'item.atg' },
  glasses: { name: '렌즈 제작자의 안경', color: '#a8dcff', desc: '치명타 확률 +7%', step: 0.07, icon: 'item.glasses' },
  tooth: { name: '몬스터의 이빨', color: '#ffffff', desc: '처치 시 회복 구슬을 떨군다', step: 1, icon: 'item.tooth' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);

// 보유 아이템 레벨 → 실제 보정 계수
export function modsOf(passives) {
  const lv = (id) => passives[id] || 0;
  return {
    dmg: 1,                                              // 평평한 공격력 증가는 없앴다
    crowbar: lv('crowbar') * PASSIVES.crowbar.step,      // 성한 적에게만 붙는 보너스
    speed: 1 + lv('hoof') * PASSIVES.hoof.step,
    // 중첩할수록 늘지만 100%에는 닿지 않는다(원작과 같은 수렴)
    block: 1 - (1 - PASSIVES.bear.step) ** lv('bear'),
    cd: 1 / (1 + lv('syringe') * PASSIVES.syringe.step),
    uke: lv('ukulele'),
    atg: lv('atg'),
    crit: lv('glasses') * PASSIVES.glasses.step,
    tooth: lv('tooth'),
    hp: 0,
    area: 1,
    regen: 0,
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
