// 먼 곳의 횃대 — 상수 (single source of truth).

export const VERSION = 'v5.3';

// 로직은 초당 60회 고정. 아래 값은 모두 "1스텝(1/60초)당" 기준이다.
export const STEP_MS = 1000 / 60;
export const MAX_CATCHUP = 5;

// ---- 화면 ----
// 캔버스는 창을 꽉 채운다. 논리 해상도는 고정이 아니라 **창 크기 ÷ ZOOM**이다.
//   · ZOOM이 클수록 도트가 크게 보이고 보이는 세상은 좁아진다.
//   · 덕분에 세로 폰은 지금까지처럼 세로로 길고, PC는 가로로 넓은 화면이 된다.
// view.w / view.h를 상수처럼 구조 분해해 두면 안 된다 — 창이 바뀌면 값도 바뀐다.
export const view = { w: 320, h: 560, zoom: 2 };

// 작은 화면(폰)은 2배, 큰 화면(PC)은 3배로 키운다.
// 3배에서 멈추는 이유: 더 키우면 보이는 세상이 좁아져 적이 코앞에서 튀어나온다.
export function setView(cssW, cssH) {
  view.zoom = Math.min(cssW, cssH) < 620 ? 2 : 3;
  view.w = cssW / view.zoom;
  view.h = cssH / view.zoom;
  return view;
}

// 보이는 넓이 배율(기준 320×560 대비).
// 화면이 좁아지면 같은 수의 적이 훨씬 빽빽해진다 — 소환량과 상한을 이 값으로 맞춰
// 어떤 화면에서도 "화면당 적 밀도"가 같게 유지한다.
export function areaScale() {
  return (view.w * view.h) / (320 * 560);
}

// 한 판 길이. 이 시간을 버티면 ALL CLEAR.
export const RUN_SEC = 900;           // 15분

// ---- 플레이어 ----
export const PLAYER = {
  // 원작 코만도: 체력 110(+33/레벨) · 공격력 12(+2.4/레벨)
  hp: 110,
  dmg: 12,
  dmgPerLevel: 2.4,
  hpPerLevel: 12,
  dodgeCd: 150,         // 회피(Shift) 재사용 대기

  r: 6,                 // 피격 반지름(그림보다 작게)
  speed: 1.5,           // 스텝당 이동 거리
  pickR: 40,            // 경험치 흡수 반지름
  hurtCd: 40,           // 피격 후 무적 프레임
  faceKeep: 24,         // 멈춰도 이 프레임 동안 마지막 방향을 유지(파편 던지는 방향)
};

// ---- 성장 ----
// 레벨 n → n+1 에 필요한 경험치.
// 초반은 성큼성큼 오르고(무기를 빨리 갖추게) 뒤로 갈수록 완만히 무거워진다.
// 전 구간을 한 번에 낮추려면 아래 세 계수를 같이 줄인다(지금은 이전 대비 약 13% 감소).
export function xpNeed(level) {
  const n = level - 1;
  return Math.max(4, Math.round(5 + n * 4.4 + n * n * 0.30));
}

export const MAX_PASSIVES = 5;
export const MAX_LV = 6;              // 스킬·아이템 공통 최대 레벨

// (경험치 보석은 없앴다 — 처치하면 그 자리에서 경험치와 골드가 붙는다)
// 옛 등급표 — 적 종류가 어떤 등급을 떨구는지는 ENEMY.gem.
// 보석은 실제 경험치 값을 들고 다니고, 등급은 그 값으로 정해진다(합쳐질 수 있으므로).
export const GEM = [
  { xp: 1, spr: 'gem.blue' },
  { xp: 5, spr: 'gem.green' },
  { xp: 16, spr: 'gem.red' },
];

export function gemTier(xp) { return xp >= GEM[2].xp ? 2 : (xp >= GEM[1].xp ? 1 : 0); }

export const GEM_DRIFT = 220;   // 이 거리 안의 보석은 천천히 끌려온다
export const GEM_CAP = 150;     // 넘치면 먼 것부터 합친다(값은 보존)

// ---- 적 ----
// hp / 속도 / 접촉 피해 / 반지름 / 경험치 등급 / 스프라이트 클립
// atk — 원작처럼 **적도 쏜다**. 접촉 피해만 있으면 그냥 몰려오는 벽이라, 피할 것이
// 있어야 이동이 의미를 갖는다.
//   wind : 조준 시간(스텝). 이 동안 멈춰 서서 예고한다 — 보고 피하라고 두는 시간이다
//   keep : 이 거리 안으로는 더 붙지 않는다(원거리 몬스터가 뒤로 물러난다)
//   kind : shot(직선탄) · nova(자폭 폭발) · mortar(발밑에 떨어지는 곡사) · laser(즉발 광선)
export const ENEMY = {
  // 원작 수치를 그대로 옮기면(레무리안 80 · 타이탄 2100) 이쪽 밀도에서는 벽이 된다.
  // 서열과 성격만 가져왔다. 해파리는 느릿느릿 다가와서 터진다.
  lemurian:  {
    hp: 10, speed: 1.02, dmg: 8, r: 7, gem: 0, knock: 0.7, clip: 'lemurian',
    atk: { kind: 'shot', n: 1, dmg: 5, speed: 1.9, cd: 220, wind: 36, range: 150, r: 4, spr: 'spit' },
  },
  wisp:      {
    hp: 8, speed: 0.86, dmg: 5, r: 6, gem: 0, knock: 1.0, clip: 'wisp',
    // 원작처럼 1.6초쯤 조준한 뒤 불덩이 세 발을 흩뿌린다
    atk: { kind: 'shot', n: 3, spread: 0.26, dmg: 3, speed: 1.5, cd: 250, wind: 96, range: 190, keep: 120, r: 4, spr: 'ember' },
  },
  jellyfish: {
    hp: 16, speed: 0.62, dmg: 6, r: 7, gem: 0, knock: 0.8, clip: 'jellyfish',
    // 쏘지 않는다. 느릿느릿 다가와 몸으로 밀어붙일 뿐이다
  },
  beetle:    { hp: 28, speed: 1.16, dmg: 10, r: 7, gem: 1, knock: 0.5, clip: 'beetle' },
  guard:     {
    hp: 170, speed: 0.62, dmg: 16, r: 12, gem: 2, knock: 0.15, clip: 'guard', elite: true,
    // 발밑으로 떨어지는 곡사 세 발 — 서 있으면 맞는다
    atk: { kind: 'mortar', n: 3, dmg: 11, cd: 200, wind: 44, range: 230, keep: 90, rad: 26, fall: 46 },
  },
  titan:     {
    hp: 820, speed: 0.58, dmg: 20, r: 15, gem: 2, knock: 0, clip: 'titan', boss: true,
    // 눈이 달아오른 뒤 굵은 광선을 쏜다. 예고가 길어서 옆으로 빠지면 피할 수 있다
    atk: { kind: 'laser', dmg: 22, cd: 260, wind: 70, range: 300, keep: 130, w: 14 },
  },
  // 배럴 — 적이 아니라 부술 수 있는 물건이다. 적과 같은 배열에 담아 두면
  // 피격·조준 코드를 그대로 쓸 수 있어서 kind 하나로 끝난다(prop 플래그로 구분).
  barrel:    { hp: 1, speed: 0, dmg: 0, r: 9, gem: 0, knock: 0, clip: 'barrel', prop: true },
};

// 적 투사체
export const ESHOT_LIFE = 60 * 6;

// 배럴 — 화면 근처에 띄엄띄엄 놓인다. 부수면 자석 · 금화 · 회복 중 하나가 나온다.
export const BARREL = {
  every: 60 * 9,        // 소환 간격(스텝)
  max: 5,               // 동시에 존재할 수 있는 수
  loot: [
    ['coin', 0.55],
    ['heart', 0.25],
    ['magnet', 0.20],
  ],
};

export const COIN_VALUE = [3, 12];   // 금화 하나가 주는 골드 범위
export const KEY_GOLD = 'og-gold-day10';

// 시간이 갈수록 강해진다 — 분 단위로 곱해지는 배율.
// 무기 강화가 6단계에서 멈추므로 체력 배율을 너무 세게 주면 후반이 벽이 된다.
export const SCALE = {
  hp: (min) => 1 + min * 0.40,
  speed: (min) => 1 + min * 0.020,
  dmg: (min) => 1 + min * 0.09,
};

export const MAX_ENEMIES = 90;       // 이 수를 넘으면 새로 소환하지 않는다(사건 소환은 예외)

// ---- 낙하물 ----
export const DROP = {
  heartChance: 0.012,   // 일반 적 처치 시
  magnetChance: 0.005,
  chestFromElite: true,
  life: 60 * 25,        // 보석 외 낙하물이 사라지기까지
};

export const HEART_HEAL = 30;

// ---- 점수(기록) ----
// 홈 카드는 "생존 시간(초)"을 최고 기록으로 쓴다.
export const KEY_BEST = 'og-hs-day10';

// ---- 연출 ----
export const FX = {
  hitFlash: 6,          // 피격 시 흰색으로 타는 프레임
  shakeHurt: 5,
  shakeBoss: 8,
};

// ---- 아이템 등급 ----
// 원작과 같다 — 일반(하양) · 레어(초록) · 전설(빨강). 테두리 색이 등급이다.
export const ITEM_TIER = {
  common: { name: '일반', color: '#e8eef8' },
  rare: { name: '레어', color: '#33b558' },
  legend: { name: '전설', color: '#e8394f' },
};

// 상자 — 등급마다 값이 다르고 나오는 아이템 등급이 다르다
export const CHEST_TIERS = [
  { id: 'common', price: 25, weight: 0.62 },
  { id: 'rare', price: 60, weight: 0.30 },
  { id: 'legend', price: 140, weight: 0.08 },
];

// 좌표 해시 — 저장하지 않아도 어디로 가든 같은 풍경·같은 자리에 물건이 있다
export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
