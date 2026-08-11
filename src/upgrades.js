// 아이템 — 상자를 열어야 나온다. 레벨업 선택지 같은 건 없다.
// 수치만 올려 주는 건 둘뿐이고 나머지는 때릴 때마다 굴리는 프록이다.

// 아이템 — 직접 쏘지 않고 코만도 자신을 바꾼다. 이름은 원작에서 그대로 가져왔다.
// icon은 스프라이트시트의 프레임 이름(스킬 아이콘과 같은 11×11 규격).
export const PASSIVES = {
  // 수치만 올려 주는 아이템은 두 개뿐이다. 나머지는 **때릴 때마다 굴리는** 것들이라
  // 같은 스킬을 써도 무엇을 들었느냐에 따라 화면이 달라진다(원작의 프록).
  crowbar: { tier: 'common', name: '크로우바', color: '#e8394f', desc: '체력 90% 이상 적에게 피해 +75%', step: 0.75, icon: 'item.crowbar' },
  hoof: { tier: 'common', name: '폴의 염소 발굽', color: '#c19a6b', desc: '이동 속도 +14%', step: 0.14, icon: 'item.hoof' },
  bear: { tier: 'rare', name: '곰 인형', color: '#f0a8ff', desc: '피해를 통째로 막을 확률 +15%', step: 0.15, icon: 'item.bear' },
  syringe: { tier: 'common', name: '군인의 주사기', color: '#ffd23f', desc: '공격 속도 +15%', step: 0.15, icon: 'item.syringe' },
  ukulele: { tier: 'rare', name: '우쿨렐레', color: '#c19a6b', desc: '타격 시 25% 확률로 번개가 튄다', step: 1, icon: 'item.ukulele' },
  atg: { tier: 'legend', name: 'AtG 미사일 Mk.1', color: '#a8dcff', desc: '타격 시 10% 확률로 유도 미사일', step: 1, icon: 'item.atg' },
  glasses: { tier: 'rare', name: '렌즈 제작자의 안경', color: '#a8dcff', desc: '치명타 확률 +7%', step: 0.07, icon: 'item.glasses' },
  steak: { tier: 'common', name: '들소 스테이크', color: '#e8394f', desc: '최대 체력 +25 (중첩당 +25)', step: 25, icon: 'item.steak' },
  dagger: { tier: 'common', name: '삼각 단검', color: '#dbe4f2', desc: '타격 시 10% 확률로 출혈 · 240% 피해 (중첩당 +10%)', step: 0.10, icon: 'item.dagger' },
  rounds: { tier: 'common', name: '관통 탄환', color: '#ffd23f', desc: '보스에게 피해 +20% (중첩당 +20%)', step: 0.20, icon: 'item.rounds' },
  gas: { tier: 'rare', name: '휘발유', color: '#ff7a1a', desc: '처치 시 주변을 태운다 · 150% 피해 (중첩당 +150%)', step: 1.5, icon: 'item.gas' },
  tooth: { tier: 'common', name: '몬스터의 이빨', color: '#ffffff', desc: '처치 시 회복 구슬을 떨군다', step: 1, icon: 'item.tooth' },
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
    steak: lv('steak') * PASSIVES.steak.step,
    bleed: lv('dagger') * PASSIVES.dagger.step,
    boss: lv('rounds') * PASSIVES.rounds.step,
    gas: lv('gas'),
    hp: 0,
    area: 1,
    regen: 0,
  };
}

// 상자에서 나올 아이템 하나 — 원작처럼 무작위다(이미 가진 것이면 중첩된다)
export function rollItem(rnd, tier = 'common') {
  const pool = PASSIVE_IDS.filter((id) => PASSIVES[id].tier === tier);
  const from = pool.length ? pool : PASSIVE_IDS;
  return from[Math.floor(rnd() * from.length)];
}
