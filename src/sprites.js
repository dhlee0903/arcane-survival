// 도트 스프라이트 — 한 글자가 한 도트다.
// 여기서 정의한 모든 그림은 시작할 때 **하나의 스프라이트시트(아틀라스)**로 구워지고,
// 이후 렌더러는 아틀라스에서 잘라 쓰기만 한다(drawImage의 9인자 형태).
//
//   '.'  투명       'k'  외곽선
//   나머지 글자의 뜻은 팔레트(PAL)마다 다르다.
//
// 큰 그림(보스)은 좌우 대칭이라 **왼쪽 절반 + 가운데 열**만 찍고 구울 때 뒤집어 붙인다.
// 프레임마다 lift(0/1)를 줄 수 있다 — 굽는 캔버스가 한 줄 더 높고, 1이면 한 줄 떠 있다.
// 발밑(bottom-center) 기준으로 그리므로 lift를 번갈아 주면 걷는 동안 몸이 통통 튄다.
//
// art: 한 월드 단위를 몇 도트로 찍었는지(기본 1). art:2면 같은 크기를 네 배 촘촘하게
// 그린 것이라, 화면에서는 절반 크기로 그려 결과적으로 크기는 그대로 두고 밀도만 올린다.
// 덕분에 그림을 다시 찍어도 이동 속도·판정 반지름 같은 게임 수치는 손대지 않는다.

// ---- 팔레트 ----
export const PAL = {
  // 2배 해상도로 다시 찍은 마법사 — 계조를 넉넉히 뒀다(모자 4단 · 로브 4단 · 수염 3단)
  wizard: {
    k: '#120c22',
    h: '#33217a', H: '#4d33a6', I: '#6f4fd8', J: '#9a7cff',
    t: '#1d1244', r: '#2c1d63', R: '#3f2b8c', T: '#5a3fb8',
    s: '#f5cfa8', S: '#d9a279', e: '#241a3d',
    b: '#f2f5fc', B: '#cfd8e8', a: '#a3aec4',
    w: '#6f4622', W: '#a2703c',
    o: '#4fc9ff', O: '#ffffff', q: '#a8ecff',
  },
  bat: {
    k: '#0d0a18', b: '#3d2f5c', B: '#5b4a85', C: '#7f6bb0',
    e: '#ff5a63', E: '#ffd0d4', w: '#241d3d', W: '#3a2f5e', v: '#4c3f7a',
  },
  slime: { k: '#08180f', g: '#1a5c30', G: '#2f8f4a', L: '#4fc46a', l: '#9ff0b0', e: '#08180f', E: '#ffffff' },
  bone: { k: '#0e0b1a', b: '#eae6d6', B: '#c2bda8', a: '#8f8a76', e: '#ff4a4a', E: '#ffb0b0' },
  ghost: { k: '#160d2a', G: '#dfeaff', g: '#a9c2e8', v: '#7c9ad0', e: '#2b2050' },
  stone: {
    k: '#0c150f', v: '#39463a', S: '#6b7a66', M: '#8e9c86', m: '#b8c6ac',
    g: '#4a8f43', e: '#ffb03a', E: '#fff0c0',
  },
  lich: {
    k: '#08050f', r: '#20153f', R: '#33215e', T: '#4a2f8c',
    b: '#eef2fb', B: '#c0c8dc', a: '#8a92a8',
    e: '#5fd8ff', E: '#ffffff', o: '#b06bff', O: '#e6c8ff',
    c: '#ffd23f', C: '#fff0a0',
  },
  gemBlue: { k: '#071228', g: '#1c5fa8', G: '#3aa0ff', L: '#8fd0ff', l: '#e6f4ff' },
  gemGreen: { k: '#071a0e', g: '#1e7a3c', G: '#3fce6a', L: '#8fe8a8', l: '#e8fff0' },
  gemRed: { k: '#280810', g: '#a8323c', G: '#ff5a63', L: '#ff9ea4', l: '#ffe8ea' },
  heart: { k: '#3a0d16', H: '#ff5a63', h: '#ffd0d4' },
  magnet: { k: '#161a26', m: '#7f8ba3', M: '#c3ccdd', p: '#ff5a63' },
  chest: {
    k: '#1e0f05', w: '#5c360f', W: '#8a5423', n: '#b5793a',
    i: '#3d4450', I: '#6f7a8c', c: '#d9a01f', C: '#ffd23f',
  },
  // 배경을 풍성하게 만드는 장식들
  fungus: { k: '#2a0d12', r: '#a8323c', R: '#ff5a63', p: '#ffe8ea', s: '#c9b89a', S: '#efe4cf' },
  flower: { k: '#2a2410', y: '#d9a01f', Y: '#ffd23f', c: '#fff0a0', g: '#3a7a36', G: '#5aa84e' },
  bones: { k: '#141026', b: '#a8a494', B: '#8a8676', a: '#6d6a5c' },
  stump: { k: '#180e06', w: '#3d240c', W: '#5c360f', n: '#8a5423', g: '#3a7a36' },
  // 부수면 물건이 나오는 항아리
  pot: { k: '#2a1408', c: '#7a4a2c', C: '#a86a44', n: '#c98f66', l: '#e8c9a8', b: '#3f6fd8' },
  moss: { a: '#1f2c1c', b: '#233420', c: '#293c22', d: '#1a2718', e: '#2f4626' },
  arcane: { k: '#1c0a44', o: '#7a52e8', q: '#a88cff', O: '#e6dcff', W: '#ffffff' },
  frost: { k: '#0d2a3c', b: '#2f7fb0', c: '#4fb6e8', C: '#a8e0ff', W: '#ffffff', m: '#6f4622' },
  rune: { k: '#22150a', p: '#8f6224', P: '#c98b3a', y: '#ffd23f', Y: '#fff6c0' },
  zap: { k: '#16255c', b: '#3f6fd8', z: '#7fc4ff', Z: '#ffffff' },
  fire: { k: '#3d0d00', d: '#c43c00', f: '#ff7a1a', F: '#ffb03a', y: '#fff2b0' },
  rock: { k: '#111c14', v: '#3d4a3a', S: '#6e7a6a', M: '#95a08c', m: '#c2ccb4' },
  tuft: { k: '#0e2414', g: '#3a7a36', G: '#5aa84e' },
  grave: { k: '#0d1116', v: '#3a414c', S: '#5f6773', M: '#828b99', d: '#2c2620' },
  // 패시브 아이템 아이콘 — 뱀서처럼 패시브도 "주워 든 물건"으로 보여야 한다
  item: {
    k: '#14101f',
    r: '#a8323c', R: '#ff5a63', p: '#ffd0d4',
    g: '#1e7a3c', G: '#3fce6a',
    b: '#2a5aa8', B: '#4f9bff', C: '#a8dcff',
    y: '#c9932a', Y: '#ffd23f', c: '#fff0a0',
    d: '#c43c00', o: '#ff7a1a', O: '#ffb03a',
    a: '#8f98ad', w: '#c9d3e8', W: '#ffffff',
    m: '#6b4a2a', M: '#a0703c',
    v: '#6b3fb0', V: '#a371f7', X: '#d9c0ff',
  },
  ground: { a: '#22301f', b: '#26381f', c: '#2c4126', d: '#1c2a1b', e: '#334c2b' },
  path: { a: '#3a3324', b: '#453c2a', c: '#4f4530', d: '#2f2a1e', e: '#564a33' },
};

// ---- 마법사 (art:2 — 월드 15×18 자리를 30×36 도트로 찍었다) ----
// 오른쪽을 보고 있다. 왼쪽으로 갈 때는 그릴 때 좌우로 뒤집는다.
// 빛은 왼쪽 위에서 온다 — 모자 오른쪽 면과 로브 가운데가 밝고 가장자리가 어둡다.
const WIZ_BODY = [
  '........kkk...................',
  '.......kIJIk..................',
  '.......kHIJk..................',
  '......kHHIJk......kkkk........',
  '......kHHIJIk....kqqqqk.......',
  '.....kHHHIJIk...kqOOOOqk......',
  '.....kHHHIJIIk..kqOOOOqk......',
  '....khHHHIJIIk..kqoOOoqk......',
  '....khHHHIJIIIk..kqoooqk......',
  '...khhHHHIJIIIk...kqqqk.......',
  '...khhHHHHIJIIIk...kkk........',
  '..khhhHHHHIJIIIk...kWk........',
  '..khhhHHHHHIJIIIk..kWk........',
  '.kkkkkkkkkkkkkkkkk.kWk........',
  'kIIIIIIIIIIIIIIIIIkkWk........',
  'khhhhhhhhhhhhhhhhhkkwk........',
  'kkkkkkkkkkkkkkkkkkkkwk........',
  '....kssssssssssk...kwk........',
  '...ksssssssssssk...kwk........',
  '...kssseeseesSSk...kwk........',
  '...ksssssssSSSSk...kwk........',
  '...kssbbbbbbbSSk...kwk........',
  '..kbBbbbbbbbbbBak..kwk........',
  '..kbbBbbbbbbBaak...kwk........',
  '.krrbbbbbbbbbbbarkskwk........',
  '.krRrbbbbbbbbbaRrkskwk........',
  '.krRRrbbbbbbbaRRrk.kwk........',
  '.krRTRrbbbbbaRTRrk.kwk........',
  '.krRTTRrbbbaRTTRrk.kwk........',
  '.krRTTTRraaRTTTRrk.kwk........',
  '.krRTTTTRRTTTTTRrk.kwk........',
  '.krRTTTTTTTTTTTRrk.kwk........',
  '.krrRTTTTTTTTTRrrk.kwk........',
  '.krrrRTTTTTTTRrrrk.kwk........',
]

// 아랫단(다리) 세 줄만 갈아 끼워 걸음을 만든다
const WIZ_HEM = {
  stand: [
    '.krrttRTTTTTRttrrk.kwk........',
    '..kttttttttttttk...kwk........',
    '...kkkkkkkkkkkk....kkk........',
  ],
  stepA: [
    '.krrttRTTTTTRttrrk.kwk........',
    '..kttttk..ktttttk..kwk........',
    '..kkkkk....kkkkk...kkk........',
  ],
  stepB: [
    '.krrttRTTTTTRttrrk.kwk........',
    '..kttttttk..kttttk.kwk........',
    '..kkkkkkk...kkkkk..kkk........',
  ],
};

const wiz = (hem, lift) => ({ pal: 'wizard', art: 2, rows: [...WIZ_BODY, ...WIZ_HEM[hem]], lift });

// ---- 리치(보스) 픽셀맵 (art:2) ----
// 왕관 · 해골 · 너덜너덜한 로브. 가슴의 마력 핵은 프레임마다 한 겹 부푼다.
const lichRows = (wide) => [
  '..................c.c.c.c.',
  '.................kcckcckcc',
  '.................kcCcCcCcC',
  '.................kcccccccc',
  '................kkkkkkkkkk',
  '..............kkbbbbbbbbbb',
  '............kkbbbbbbbbbbbb',
  '...........kbbbbbbbbbbbbbb',
  '..........kbbbbbbbbbbbbbbb',
  '..........kbbbbbbbbbbbbbbb',
  '..........kbbkkkkkbbbbbbbb',
  '..........kbkeeeeekbbbbbbb',
  '..........kbkeEEEekbbbbbbb',
  '..........kbkeeeeekbbbbbbb',
  '..........kbbkkkkkbbbbbbbb',
  '..........kbbbbbbbbbbbbbbb',
  '...........kbbbbbbbbbbbbbb',
  '...........kbbbbkbbkbbkbbb',
  '............kbbbkbbkbbkbbb',
  '.............kkbbbbbbbbbbb',
  '...............kkkkkkkkkkk',
  '..........kkkkkkkkkkkkkkkk',
  '.......kkkTTTTTTTTTTTTTTTT',
  '.....kkTTTRTTTTRTTTTRTTTTT',
  '...kkTTTTTRTTTTRTTTTRTTTTT',
  '..kRTTTTTTRTTTTRTTTTRTTTTT',
  '.kRRTTTTTTRTTTTRTTTTTTTTTT',
  wide ? 'kRRTTTTTTTRTTTTRTTTTTkkkkk' : 'kRRTTTTTTTRTTTTRTTTTTTkkkk',
  wide ? 'kRRTTTTTTTRTTTTRTTTTkoooOO' : 'kRRTTTTTTTRTTTTRTTTTTkooOO',
  wide ? 'kRRTTTTTTTRTTTTRTTTkooOOOO' : 'kRRTTTTTTTRTTTTRTTTTkoOOOO',
  wide ? 'kRRTTTTTTTRTTTTRTTTkooOOOO' : 'kRRTTTTTTTRTTTTRTTTTkoOOOO',
  wide ? 'kRRTTTTTTTRTTTTRTTTTkoooOO' : 'kRRTTTTTTTRTTTTRTTTTTkooOO',
  wide ? 'kRRTTTTTTTRTTTTRTTTTTkkkkk' : 'kRRTTTTTTTRTTTTRTTTTTTkkkk',
  '.kRRTTTTTTRTTTTRTTTTTTTTTT',
  'kRRTTTTTTTTTTTTTTTTTTTTTTT',
  'kRrTTTTTTTTTTTTTTTTTTTTTTT',
  'kRrrTTTTTTTTTTTTTTTTTTTTTT',
  'kRrrrTTTTTTTTTTTTTTTTTTTTT',
  '.kRrrrTTTTTTTTTTTTTTTTTTTT',
  '.kRrrrrTTTTTTTTTTTTTTTTTTT',
  '.kRrrrrrTTTTTTTTTTTTTTTTTT',
  '..kRrrrrrTTTTTTTTTTTTTTTTT',
  '..kRrrrrrrTTTTTTTTTTTTTTTT',
  '..kRrrrrrrrTTTTTTTTTTTTTTT',
  '...kRrrrrrrrTTTTTTTTTTTTTT',
  '...kRrrrrrrrrTTTTTTTTTTTTT',
  '....kRrrrrrrrrTTTTTTTTTTTT',
  '....kRrrrrrrrrrTTTTTTTTTTT',
  '.....kRrrrrrrrrrTTTTTTTTTT',
  '.....kkRrrrrrrrrrTTTTTTTTT',
  '......kkRrrrrrrrrrTTTTTTTT',
  '.......kkRrrrrrrrrrTTTTTTT',
  '........kkRrrrrrrrrrrTTTTT',
  '.........kkRrrrrrrrrrrrTTT',
  '..........kkkRrrrrrrrrrrrr',
  '.............kkkkkkkkkkkkk',
];

// ---- 골렘(엘리트) 픽셀맵 (art:2, 대칭 반쪽 20칸 → 폭 39) ----
const GOLEM_BODY = [
  '.............kkkkkkk',
  '............kSSSSSSS',
  '...........kSMMSSSSS',
  '...........kSMeeSSSS',
  '...........kSMEeSSSS',
  '...........kSSSSSSSS',
  '...........kvvSSSSSS',
  '........kkkkkkSSSSSS',
  '.....kkkSSSSSSSSSSSS',
  '...kkSgSSSSSSSSSSSSS',
  '..kSSSgSSSSSSSSSSSSS',
  '.kSMSSSSSSSSSSSSSSSS',
  'kSMMSSSSSSSSSSSSSSSS',
  'kSMMSSkkkkSSSSSSSSSS',
  'kSMSSkvvvvkSSSeeSSSS',
  'kSSSSkvSSvkSSeeEeSSS',
  'kSSSSkvSSvkSSeEEeSSS',
  'kvSSSkvSSvkSSSeeSSSS',
  'kvSSSkvSSvkSSSSSSSSS',
  'kvvSSkvSSvkSSSSSSSSS',
  'kkvSSkvSSvkSSSSvSSSS',
  '.kkSSkvSSvkSSSvvSSSS',
  '..kkkkvSSvkSSSSSSSSS',
  '.....kvSSvkSSSSSSSSS',
  '.....kkvvvkSSSSSSSSS',
  '......kkkkkSSSSSSSSS',
  '..........kvSSSSSSSS',
  '..........kvvSSSSSSS',
  '..........kkvvvvvvvv',
  '...........kSSSSSSSS',
  '...........kSSSSSSSS',
  '..........kSSSSSSSSS',
  '..........kSSSSSSSSS',
  '.........kSSSSSSSSSS',
];

// 다리 — 대칭이라 걸음 대신 무게중심을 옮긴다(육중하게 뒤뚱거린다)
const GOLEM_LEGS = {
  a: [
    '.........kSSSSSk....',
    '.........kSSSSSk....',
    '........kSSSSSSk....',
    '........kSSSSSSk....',
    '........kSvvvvSk....',
    '........kkkkkkkk....',
  ],
  b: [
    '.........kSSSSSk....',
    '........kSSSSSSk....',
    '........kSSSSSSk....',
    '.......kSSSSSSSk....',
    '.......kSvvvvvSk....',
    '.......kkkkkkkkk....',
  ],
};


// ---- 결정적 노이즈로 굽는 바닥 타일 ----
// 손으로 16×16 잡티를 찍는 건 읽기도 고치기도 어렵다. 대신 시드 고정 난수로
// 글자를 흩뿌려 만든다 — 결과는 다른 그림과 똑같이 아틀라스에 구워진다.
function noiseTile(size, weights, seed) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const bag = [];
  for (const [ch, n] of weights) for (let i = 0; i < n; i += 1) bag.push(ch);
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    let line = '';
    for (let x = 0; x < size; x += 1) line += bag[Math.floor(rnd() * bag.length)];
    rows.push(line);
  }
  return rows;
}

const GRASS_MIX = [['a', 9], ['b', 6], ['c', 3], ['d', 3], ['e', 1]];
const PATH_MIX = [['a', 9], ['b', 6], ['c', 3], ['d', 3], ['e', 1]];

// ---- 해골 몸통 (art:2, 18칸 폭) ----
const SKELE_BODY = [
  '.......kkkkkk.....',
  '.....kkbbbbbbkk...',
  '....kbbbbbbbbbbk..',
  '...kbbbbbbbbbbbbk.',
  '...kbbbbbbbbbbbbk.',
  '...kbbkkkbbkkkbbk.',
  '...kbkeekbbkeekbk.',
  '...kbkeEkbbkeEkbk.',
  '...kbbkkkbbkkkbbk.',
  '...kbbbbbbbbbbbbk.',
  '....kbbbkkkkbbbk..',
  '....kbbkbkbkbbbk..',
  '.....kbbbbbbbbk...',
  '......kkbbbbkk....',
  '........kkkk......',
  '.........kbk......',
  '.......kkkbkkk....',
  '.....kkbBbbbBbkk..',
  '....kbbBbbbbbBbbk.',
  '....kbkbkbbbkbkbk.',
  '....kbkbkbbbkbkbk.',
  '....kbbBbbbbbBbbk.',
  '....kbkbkbbbkbkbk.',
  '....kbkbkbbbkbkbk.',
  '....kbbBbbbbbBbbk.',
  '.....kkbbbbbbbkk..',
  '......kbbbbbbk....',
  '......kbbkkbbk....',
];

const SKELE_LEGS = {
  a: [
    '......kbk..kbk....',
    '......kbk..kbk....',
    '.....kbk....kbk...',
    '.....kbk....kbk...',
    '....kbbk...kbbk...',
    '....kkkk...kkkk...',
  ],
  b: [
    '......kbk..kbk....',
    '.......kbkkbk.....',
    '......kbk.kbk.....',
    '.....kbk...kbk....',
    '....kbbk..kbbk....',
    '....kkkk..kkkk....',
  ],
};

// ---- 유령 몸통 (art:2, 대칭 반쪽 13칸 → 폭 25) ----
const GHOST_BODY = [
  '.......kkkkkk',
  '....kkkGGGGGG',
  '..kkGGGGGGGGG',
  '.kGGGGGGGGGGG',
  'kGGGGGGGGGGGG',
  'kGGGGGGGGGGGG',
  'kGGGkkkGGGGGG',
  'kGGkeeekGGGGG',
  'kGGkeeekGGGGG',
  'kGGkeeekGGGGG',
  'kGGGkkkGGGGGG',
  'kGGGGGGGGGGGG',
  'kGGGGGGGGGGkk',
  'kGGGGGGGGGGkk',
  'kgGGGGGGGGGkk',
  'kgGGGGGGGGGGG',
  'kgGGGGGGGGGGG',
  'kvgGGGGGGGGGG',
  'kvggGGGGGGGGG',
  '.kvgggggggggg',
  '.kvvggggggggg',
  '..kvvgggggggg',
];

// 아래로 흘러내리는 자락 — 프레임마다 물결이 어긋난다
const GHOST_TAIL = {
  a: [
    '..kvvvggggggg',
    '..kkvvggkgggg',
    '....kkk.kkggg',
    '.........kkkk',
    '.............',
    '.............',
  ],
  b: [
    '..kvvvggggggg',
    '..kvvggggkggg',
    '...kkkggg.kkk',
    '.....kkkk....',
    '.............',
    '.............',
  ],
};

// ---- 프레임 목록 ----
// name → { pal, rows, mirror?, lift?, flipX? }
export const MAPS = {
  'wizard.idle0': wiz('stand', 0),
  'wizard.idle1': wiz('stand', 1),
  'wizard.walk0': wiz('stepA', 1),
  'wizard.walk1': wiz('stand', 0),
  'wizard.walk2': wiz('stepB', 1),
  'wizard.walk3': wiz('stand', 0),

  // ---- 박쥐 (art:2 · 좌우 대칭이라 왼쪽 절반만 찍는다) ----
  'bat.0': {
    pal: 'bat', art: 2, mirror: true, lift: 1,
    rows: [
      'kk..........',
      'kWk.........',
      'kWWk........',
      'kWWWk.......',
      '.kWWWk......',
      '.kWWWWk.....',
      '..kWWWWk....',
      '..kWWWWWk...',
      '...kWWWWWk..',
      '...kWWWWWWk.',
      '....kWWWWWkk',
      '.....kkkkbbb',
      '........kbBB',
      '.......kbBBB',
      '.......kbeEB',
      '.......kbeEB',
      '.......kbBBB',
      '........kbBB',
      '........kkbb',
      '.........kkk',
    ],
  },
  'bat.1': {
    pal: 'bat', art: 2, mirror: true, lift: 0,
    rows: [
      '............',
      '............',
      '............',
      '............',
      '.........kbk',
      '........kbbk',
      '........kbbb',
      '.......kbBBB',
      '.......kbeEB',
      '.......kbeEB',
      '.......kbBBB',
      '..kk...kbBBB',
      '.kWWk..kbBBB',
      'kWWWWkkbBBBB',
      'kWWWWWWWbBBB',
      'kWWWWWWWkbBB',
      '.kWWWWWWkkbb',
      '..kWWWWWk.kk',
      '...kWWWk....',
      '....kkk.....',
    ],
  },

  // ---- 슬라임 (art:2 · 대칭) ----
  'slime.0': {
    pal: 'slime', art: 2, mirror: true,
    rows: [
      '.......kkkkkk',
      '....kkkGGGGGG',
      '..kkGLlllLGGG',
      '.kGGLllllLGGG',
      '.kGLlllllLGGG',
      'kGGLllllLGGGG',
      'kGGGLllLGGGGG',
      'kGGGGLLGGGGGG',
      'kGGGGGGGGGGGG',
      'kGGGkkkGGGGGG',
      'kGGkeeekGGGGG',
      'kGGkeEekGGGGG',
      'kGGGkkkGGGGGG',
      'kGGGGGGGGGGGG',
      'kGGGGGGGGGkkk',
      'kGGGGGGGGGkGG',
      'kgGGGGGGGGGGG',
      'kggGGGGGGGGGG',
      '.kgggGGGGGGGG',
      '.kggggggggggg',
      '..kkggggggggg',
      '...kkkkkkkkkk',
    ],
  },
  'slime.1': {
    pal: 'slime', art: 2, mirror: true,
    rows: [
      '.............',
      '.............',
      '.....kkkkkkkk',
      '..kkkGLllLGGG',
      '.kGGLlllllLGG',
      'kGGGLllllLGGG',
      'kGGGGLllLGGGG',
      'kGGGGGLLGGGGG',
      'kGGGGGGGGGGGG',
      'kGGGkkkGGGGGG',
      'kGGkeeekGGGGG',
      'kGGkeEekGGGGG',
      'kGGGkkkGGGGGG',
      'kGGGGGGGGGGGG',
      'kGGGGGGGGGkkk',
      'kGGGGGGGGGkGG',
      'kgGGGGGGGGGGG',
      'kggGGGGGGGGGG',
      '.kgggGGGGGGGG',
      '.kggggggggggg',
      '..kkggggggggg',
      '...kkkkkkkkkk',
    ],
  },

  // ---- 해골 (art:2) ----
  // 다리가 번갈아 나가야 걷는 걸로 읽혀서 좌우 대칭을 쓰지 않는다.
  'skeleton.0': {
    pal: 'bone', art: 2, lift: 0,
    rows: [...SKELE_BODY, ...SKELE_LEGS.a],
  },
  'skeleton.1': {
    pal: 'bone', art: 2, lift: 1,
    rows: [...SKELE_BODY, ...SKELE_LEGS.b],
  },

  // ---- 유령 (art:2 · 대칭) ----
  'ghost.0': {
    pal: 'ghost', art: 2, mirror: true, lift: 0,
    rows: [...GHOST_BODY, ...GHOST_TAIL.a],
  },
  'ghost.1': {
    pal: 'ghost', art: 2, mirror: true, lift: 1,
    rows: [...GHOST_BODY, ...GHOST_TAIL.b],
  },

  // ---- 골렘(엘리트) (art:2 · 대칭) ----
  'golem.0': { pal: 'stone', art: 2, mirror: true, lift: 0, rows: [...GOLEM_BODY, ...GOLEM_LEGS.a] },
  'golem.1': { pal: 'stone', art: 2, mirror: true, lift: 1, rows: [...GOLEM_BODY, ...GOLEM_LEGS.b] },

  // ---- 리치(보스) (art:2 · 대칭 반쪽 26칸 → 폭 51) ----
  'lich.0': { pal: 'lich', art: 2, mirror: true, lift: 0, rows: lichRows(false) },
  'lich.1': { pal: 'lich', art: 2, mirror: true, lift: 1, rows: lichRows(true) },

  'gem.blue': { pal: 'gemBlue', art: 2, mirror: true, rows: gemRows() },
  'gem.green': { pal: 'gemGreen', art: 2, mirror: true, rows: gemRows() },
  'gem.red': { pal: 'gemRed', art: 2, mirror: true, rows: gemRows() },

  'heart': {
    pal: 'heart', art: 2, mirror: true,
    rows: [
      '..kkkk...',
      '.kHHHHkk.',
      'kHhHHHHHk',
      'kHhHHHHHH',
      'kHHHHHHHH',
      'kHHHHHHHH',
      '.kHHHHHHH',
      '.kHHHHHHH',
      '..kHHHHHH',
      '..kHHHHHH',
      '...kHHHHH',
      '....kHHHH',
      '.....kHHH',
      '......kHH',
      '.......kH',
      '........k',
    ],
  },
  'magnet': {
    pal: 'magnet', art: 2, mirror: true,
    rows: [
      '..kkkkkkk',
      '.kmMMMMMM',
      'kmMMMMMMM',
      'kmMMMMMMM',
      'kmMMkkkkk',
      'kmMMk....',
      'kmMMk....',
      'kmMMk....',
      'kmMMk....',
      'kmMMk....',
      'kmMMk....',
      'kpppk....',
      'kpppk....',
      'kpppk....',
      'kkkkk....',
      '.........',
    ],
  },

  'chest': {
    pal: 'chest', art: 2, mirror: true,
    rows: [
      '...kkkkkk',
      '.kkwWWWWW',
      'kwWnnnnnn',
      'kwWnnnnnn',
      'kwWnnnnnn',
      'kwWnnniii',
      'kwWWWWiII',
      'kkkkkkiII',
      'kwwwwwiII',
      'kwWWWWicC',
      'kwWWWWicC',
      'kwWWWWiII',
      'kwWWWWiII',
      'kwWWWWiII',
      'kwwwwwwww',
      'kwwwwwwww',
      '.kkkkkkkk',
    ],
  },

  // 항아리 — 부수면 자석 · 금화 · 회복이 나온다
  'pot': {
    pal: 'pot', art: 2, mirror: true,
    rows: [
      '......kkkk',
      '.....kcccc',
      '.....kcnnn',
      '....kkkkkk',
      '...kcCCCCC',
      '..kcCnnlll',
      '.kcCnnllll',
      'kcCnnlllll',
      'kcCnnlllll',
      'kcCnnllbll',
      'kcCnnlbbbl',
      'kcCnnllbll',
      'kcCnnlllll',
      'kcCCnnllll',
      '.kcCCnnlll',
      '.kccCCnnnn',
      '..kcccCCnn',
      '...kkccccc',
      '....kkkkkk',
    ],
  },

  // ---- 배경 장식 ----
  'mushroom': {
    pal: 'fungus', art: 2, mirror: true,
    rows: [
      '....kkk',
      '..kkrrr',
      '.krrRRR',
      'krrRppR',
      'krRppRR',
      'krRRRRR',
      'kkkkkkk',
      '...ksSS',
      '...ksSS',
      '...ksSS',
      '..kssSS',
      '..kkkkk',
    ],
  },
  'flower': {
    pal: 'flower', art: 2, mirror: true,
    rows: [
      '...kkk',
      '.kkyYY',
      'kyYYcc',
      'kyYYcc',
      '.kkyYY',
      '...kkk',
      '....kg',
      '....kg',
      '...kgG',
      '...kgG',
      '..kggG',
      '...kkk',
    ],
  },
  'bones': {
    pal: 'bones', art: 2, mirror: true,
    rows: [
      '.........',
      '..kk...kk',
      '.kbbk.kbb',
      '.kbbkkbbb',
      '..kbbbbbb',
      '...kbbbbb',
      '..kbbbbbb',
      '.kbbkkbbb',
      '.kbbk.kbb',
      '..kk...kk',
    ],
  },

  'stump': {
    pal: 'stump', art: 2, mirror: true,
    rows: [
      '.....kkkkk',
      '...kknnnnn',
      '..knnnnnnn',
      '.knnnWWWWW',
      'knnnWWnnnn',
      'knnWWnnnnn',
      'knnWnnnnnn',
      'knnWWnnnnn',
      'knnnWWnnnn',
      '.knnnWWWWW',
      '..knnnnnnn',
      '..kkwwwwww',
      '...kwwwwww',
      '...kwWwwWw',
      '...kwwwwww',
      '...kkkkkkk',
    ],
  },

  'tile.moss0': { pal: 'moss', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 51423) },
  'tile.moss1': { pal: 'moss', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 90210) },

  'bolt.0': { pal: 'arcane', art: 2, mirror: true, rows: boltRows(0) },
  'bolt.1': { pal: 'arcane', art: 2, mirror: true, rows: boltRows(1) },

  'shard': {
    pal: 'frost', art: 2,
    rows: [
      '..................kkk.',
      '.................kcCk.',
      '................kcCCk.',
      'kkkkkkkkkkkkkkkkcCCWk.',
      'kmmbbbbbbbbbbbbcCCWWCk',
      'kmmbccccccccccCCWWWWCk',
      'kmmbbbbbbbbbbbbcCCWWCk',
      'kkkkkkkkkkkkkkkkcCCWk.',
      '................kcCCk.',
      '.................kcCk.',
      '..................kkk.',
      '......................',
    ],
  },

  'rune.0': {
    pal: 'rune', art: 2, mirror: true,
    rows: [
      '.....kkkk',
      '..kkkyyyy',
      '.kyyyyyyy',
      'kyyPPPPPP',
      'kyPPkkkkk',
      'kyPkkyyyy',
      'kyPkyyPPP',
      'kyPkyPPkk',
      'kyPkyPkkp',
      'kyPkyPkpp',
      'kyPkyPkkp',
      'kyPkyPPkk',
      'kyPkyyPPP',
      'kyPkkyyyy',
      'kyPPkkkkk',
      'kyyPPPPPP',
      '.kyyyyyyy',
      '..kkkyyyy',
      '.....kkkk',
    ],
  },
  'rune.1': {
    pal: 'rune', art: 2, mirror: true,
    rows: [
      '......kkk',
      '......kyy',
      '......kyy',
      '......kyP',
      '......kyP',
      '......kyP',
      '......kyP',
      '......kPp',
      '......kPp',
      '......kPp',
      '......kPp',
      '......kPp',
      '......kyP',
      '......kyP',
      '......kyP',
      '......kyP',
      '......kyy',
      '......kyy',
      '......kkk',
    ],
  },

  'zap.0': { pal: 'zap', art: 2, rows: zapRows() },
  'zap.1': { pal: 'zap', art: 2, rows: zapRows(), flipX: true },

  'flame.0': { pal: 'fire', art: 2, mirror: true, rows: flameRows(0) },
  'flame.1': { pal: 'fire', art: 2, mirror: true, rows: flameRows(1) },
  'flame.2': { pal: 'fire', art: 2, mirror: true, rows: flameRows(2) },

  'rock': {
    pal: 'rock', art: 2, mirror: true,
    rows: [
      '.....kkkk',
      '...kkSSSS',
      '..kSSSmmS',
      '.kSSSmmSS',
      'kSSSmmSSS',
      'kSSSSSSSS',
      'kSSSSSSSS',
      'kvSSSSSSS',
      'kvvSSSSSS',
      '.kvvvvvvv',
      '..kvvvvvv',
      '...kkkkkk',
    ],
  },
  'tuft': {
    pal: 'tuft', art: 2, mirror: true,
    rows: [
      '.k.....',
      'kg.kk..',
      'kg.kG..',
      'kg.kG.k',
      'kgkkGkG',
      'kgkGGkG',
      '.kgGGGG',
      '..kgGGG',
      '...kkkk',
      '.......',
    ],
  },
  'grave': {
    pal: 'grave', art: 2, mirror: true,
    rows: [
      '......kkkkk',
      '....kkSSSSS',
      '..kkSSMMMMM',
      '.kSSSMMMMMM',
      'kSSSMMMMMMM',
      'kSSSMMMMMMM',
      'kSSSMMMMMMM',
      'kSSSMMMvvvv',
      'kSSSMMMvvvv',
      'kSSvvvvvvvv',
      'kSSvvvvvvvv',
      'kSSSMMMvvvv',
      'kSSSMMMvvvv',
      'kSSSMMMvvvv',
      'kSSSMMMMMMM',
      'kSSSMMMMMMM',
      'kSSSMMMMMMM',
      'kvSSSMMMMMM',
      'kvvSSSSSSSS',
      'kvvvvvvvvvv',
      '.kkkkkkkkkk',
      '..dddddddddd'.slice(0, 11),
      '..dddddddddd'.slice(0, 11),
      '...kkkkkkkk',
    ],
  },

  'tile.grass0': { pal: 'ground', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 20260810) },
  'tile.grass1': { pal: 'ground', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 77712) },
  'tile.path': { pal: 'path', art: 2, flat: true, rows: noiseTile(32, PATH_MIX, 31337) },

  // ---- 아이템 아이콘 (art:2 · 22×22) ----
  // 뱀서처럼 아이템은 두 갈래다 — 공격 아이템(무기)과 패시브 아이템.
  // 전부 같은 규격이라 HUD 슬롯과 카드가 가지런하다. 대칭인 것은 반쪽만 찍는다.
  'item.bolt': {
    pal: 'item', art: 2, flat: true,
    rows: [
      '..................kkk.',
      '.................kvVXk',
      '................kvVXXk',
      '...............kvVXXVk',
      '..............kvVXXVk.',
      '.............kvVXXVk..',
      '............kvVXXVk...',
      '...........kvVXXVk....',
      '..........kvVXXVk.....',
      '.........kvVXXVk......',
      '........kvVXXVk.......',
      '.......kvVXXVk........',
      '......kvVXXVk.........',
      '.....kvVXXVk..........',
      '....kvVXXVk...........',
      '...kvVXXVk............',
      '..kvVXXVk.............',
      '.kvVXVk...............',
      'kvVXVk................',
      'kvVVk.................',
      'kvvk..................',
      '.kk...................',
    ],
  },
  'item.shard': {
    pal: 'item', art: 2,
    rows: [
      '......................',
      '......................',
      '......................',
      '................kkk...',
      '...............kBCk...',
      '..............kBCCk...',
      '.............kBCCCk...',
      'kkkkkkkkkk..kBCCCWk...',
      'kmMMMMMMMkkkBCCWWCk...',
      'kmMbbbbbbbBCCWWWWCk...',
      'kmMbBBBBBBCCWWWWWCk...',
      'kmMbbbbbbbBCCWWWWCk...',
      'kmMMMMMMMkkkBCCWWCk...',
      'kkkkkkkkkk..kBCCCWk...',
      '.............kBCCCk...',
      '..............kBCCk...',
      '...............kBCk...',
      '................kkk...',
      '......................',
      '......................',
      '......................',
      '......................',
    ],
  },
  'item.rune': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '.......kkkkk',
      '....kkkyyyyy',
      '..kkyyyyyyyy',
      '.kyyYYYYYYYY',
      'kyyYYkkkkkkk',
      'kyYYkkyyyyyy',
      'kyYkkyyYYYYY',
      'kyYkyYYYkkkk',
      'kyYkyYYkkyyy',
      'kyYkyYkkyyYY',
      'kyYkyYkyYYcc',
      'kyYkyYkyYYcc',
      'kyYkyYkkyyYY',
      'kyYkyYYkkyyy',
      'kyYkyYYYkkkk',
      'kyYkkyyYYYYY',
      'kyYYkkyyyyyy',
      'kyyYYkkkkkkk',
      '.kyyYYYYYYYY',
      '..kkyyyyyyyy',
      '....kkkyyyyy',
      '.......kkkkk',
    ],
  },
  'item.aura': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '..........k',
      '.........kc',
      '........kOc',
      '.......kOOc',
      '......kdOOc',
      '.....kdoOOc',
      '....kdooOOc',
      '...kdoookkk',
      '..kdookkyyy',
      '..kdokkyYYc',
      '.kdokkyYYcc',
      '.kdokkyYYcc',
      '..kdokkyYYc',
      '..kdookkyyy',
      '...kdoookkk',
      '....kdooOOc',
      '.....kdoOOc',
      '......kdOOc',
      '.......kOOc',
      '........kOc',
      '.........kc',
      '..........k',
    ],
  },
  'item.zap': {
    pal: 'item', art: 2,
    rows: [
      '..........kkkk........',
      '.........kbBWWk.......',
      '........kbBWWk........',
      '.......kbBWWk.........',
      '......kbBWWk..........',
      '.....kbBWWk...........',
      '....kbBWWkkkkkk.......',
      '...kbBWWWWWWWWk.......',
      '..kbBWWWWWWWWk........',
      '..kbBBBBBBWWk.........',
      '..kkkkkkbBWWk.........',
      '.......kbBWWk.........',
      '........kbBWWk........',
      '.........kbBWWk.......',
      '..........kbBWWk......',
      '...........kbBWWk.....',
      '............kbBWk.....',
      '.............kbWk.....',
      '..............kbk.....',
      '..............kk......',
      '......................',
      '......................',
    ],
  },
  'item.brand': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '..........k',
      '.........ko',
      '.........ko',
      '........kdo',
      '........kdo',
      '.......kdoO',
      '.......kdoO',
      '......kdooO',
      '......kdooO',
      '.....kdoooO',
      '.....kdoooO',
      '....kdooOOc',
      '....kdooOOc',
      '...kdooOOcc',
      '...kdooOOcc',
      '..kddooOOcc',
      '..kkkkkkkkk',
      '.kmMMMMMMMM',
      '.kmMMMMMMMM',
      '.kkkkkkkkkk',
      '...........',
      '...........',
    ],
  },

  'item.might': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '.......kkkk',
      '.....kkVVVV',
      '...kkVVVVVV',
      '..kVVXXVVVV',
      '.kVVXXXVVVV',
      '.kVXXXXVVVV',
      'kVVXXXVVVVV',
      'kVVXXVVVVVV',
      'kVVXVVVVVVV',
      'kVVVVVVVVVV',
      'kVVVVVVVVVV',
      'kVVVVVVVVVV',
      'kvVVVVVVVVV',
      'kvvVVVVVVVV',
      '.kvvVVVVVVV',
      '.kvvvVVVVVV',
      '..kvvvvVVVV',
      '...kkvvvvvv',
      '.....kkvvvv',
      '.......kkkk',
      '...........',
      '...........',
    ],
  },
  'item.swift': {
    pal: 'item', art: 2,
    rows: [
      '..................kkk.',
      '.................kWWWk',
      '................kwWWWk',
      '...............kwWWWWk',
      '..............kwWWWWk.',
      '.............kwWWWWk..',
      '............kwaWWWk...',
      '...........kwaWWWk.k..',
      '..........kwaWWWk.k...',
      '.........kwaWWWk.k....',
      '........kwaWWWk.k.....',
      '.......kwaWWWk.k......',
      '......kwaWWWk.k.......',
      '.....kwaWWWk.k........',
      '....kwaWWWk.k.........',
      '...kwaWWWk.k..........',
      '..kwaWWWk.k...........',
      '.kwaWWWk.k............',
      'kwaWWWk.k.............',
      'kwaWk.k...............',
      'kwk.k.................',
      '.k.k..................',
    ],
  },
  'item.vigor': { pal: 'item', art: 2, mirror: true, rows: potionRows('R', 'p') },
  'item.regen': { pal: 'item', art: 2, mirror: true, rows: potionRows('G', 'W') },
  'item.focus': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      'kkkkkkkkkkk',
      'kmMMMMMMMMM',
      'kmMMMMMMMMM',
      'kkkkkkkkkkk',
      '.kwYYYYYYYY',
      '..kwYYYYYYY',
      '...kwYYYYYY',
      '....kwYYYYY',
      '.....kwYYYY',
      '......kwYYY',
      '.......kwYY',
      '.......kwYY',
      '......kwyYY',
      '.....kwyyYY',
      '....kwyyyYY',
      '...kwyyyyYY',
      '..kwyyyyyYY',
      '.kwyyyyyyYY',
      'kkkkkkkkkkk',
      'kmMMMMMMMMM',
      'kmMMMMMMMMM',
      'kkkkkkkkkkk',
    ],
  },
  'item.area': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '.......kkkk',
      '.....kkBBBB',
      '...kkBBBBBB',
      '..kBBCCBBBB',
      '.kBBCCBBBBB',
      '.kBCCBBkkkk',
      'kBBCBBkkbbb',
      'kBBCBkbbbbb',
      'kBBBkbbbbbb',
      'kBBBkbbbbbb',
      'kBBBkbbbbbb',
      'kBBBkbbbbbb',
      'kBBBkbbbbbb',
      'kBBBkbbbbbb',
      'kBBBBkbbbbb',
      '.kBBBkkbbbb',
      '.kBBBBkkkkk',
      '..kBBBBBBBB',
      '...kkBBBBBB',
      '.....kkBBBB',
      '.......kkkk',
      '...........',
    ],
  },
  'item.wisdom': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '...........',
      '..kkkkkkkkk',
      '.kvvvvvvvvv',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWwwwwwwWk',
      'kvWWWWWWWWk',
      'kvWWWWWWWWk',
      'kvvvvvvvvvk',
      '.kvvvvvvvvv',
      '..kkkkkkkkk',
      '...........',
      '...........',
    ],
  },

  // 금화 — 항아리에서 나온다
  'coin': {
    pal: 'item', art: 2, mirror: true,
    rows: [
      '...kkkkk',
      '.kkyyyyy',
      'kyyccccc',
      'kycccccc',
      'kyccYYYY',
      'kyccYYYY',
      'kycYYYYY',
      'kyyYYYYY',
      'kyyYYYYY',
      'kyyYYYYY',
      'kyyYYYYY',
      '.kyYYYYY',
      '.kyyYYYY',
      '..kyyyyy',
      '....kkkk',
      '........',
    ],
  },

  'tile.grass0': { pal: 'ground', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 20260810) },
  'tile.grass1': { pal: 'ground', art: 2, flat: true, rows: noiseTile(32, GRASS_MIX, 77712) },
  'tile.path': { pal: 'path', art: 2, flat: true, rows: noiseTile(32, PATH_MIX, 31337) },

  // ---- 아이템 아이콘 (모두 11×11) ----
  // 뱀서처럼 아이템은 두 갈래다 — 공격 아이템(무기)과 패시브 아이템.
  // 전부 같은 크기로 찍어야 HUD 슬롯이 가지런하고, 투사체 그림을 그대로 쓰면
  // 오라와 낙인처럼 같은 불꽃을 쓰는 둘을 구분할 수 없다.
  'item.bolt': {
    pal: 'item', flat: true,
    rows: [
      '.........kk',
      '........kVk',
      '.......kVVk',
      '......kVWVk',
      '.....kVWVk.',
      '....kVWVk..',
      '...kVWVk...',
      '..kVWVk....',
      '.kVVVk.....',
      'kVVk.......',
      'kk.........',
    ],
  },
  'item.shard': {
    pal: 'item', flat: true,
    rows: [
      '...........',
      '...........',
      '........kk.',
      '.......kBk.',
      'kkkkkkkBWk.',
      'kmWBBBBBWBk',
      'kkkkkkkBWk.',
      '.......kBk.',
      '........kk.',
      '...........',
      '...........',
    ],
  },
  'item.rune': {
    pal: 'item', flat: true,
    rows: [
      '...kkkkk...',
      '..kYYYYYk..',
      '.kYkkkkkYk.',
      'kYkYYYYYkYk',
      'kYkYkkkYkYk',
      'kYkYkWkYkYk',
      'kYkYkkkYkYk',
      'kYkYYYYYkYk',
      '.kYkkkkkYk.',
      '..kYYYYYk..',
      '...kkkkk...',
    ],
  },
  'item.aura': {
    pal: 'item', flat: true,
    rows: [
      '.....k.....',
      '....kOk....',
      '...kOOOk...',
      '..kOoooOk..',
      '.kOokkkoOk.',
      'kOok...koOk',
      'kOok...koOk',
      '.kOokkkoOk.',
      '..kOoooOk..',
      '...koook...',
      '....kkk....',
    ],
  },
  'item.zap': {
    pal: 'item', flat: true,
    rows: [
      '.....kkk...',
      '....kWBk...',
      '...kWBk....',
      '..kWBk.....',
      '.kWBkkkk...',
      'kWBBBBBBk..',
      '.kkkkWBk...',
      '....kWBk...',
      '...kWBk....',
      '..kWk......',
      '..kk.......',
    ],
  },
  'item.brand': {
    pal: 'item', flat: true,
    rows: [
      '.....k.....',
      '....kOk....',
      '...kOok....',
      '...kOok....',
      '..kOooOk...',
      '..kOooOk...',
      '.kOoooooOk.',
      '.kOoooooOk.',
      '..kkkkkkk..',
      '.kmmmmmmmk.',
      '..kkkkkkk..',
    ],
  },

  'item.might': {
    pal: 'item', flat: true,
    rows: [
      '....kkk....',
      '...kVVVk...',
      '..kVWWVVk..',
      '.kVWVVVVVk.',
      'kVWVVVVVVVk',
      'kVVVVVVVVVk',
      'kVVVVVVVVVk',
      '.kVVVVVVVk.',
      '..kVVVVVk..',
      '...kVVVk...',
      '....kkk....',
    ],
  },
  'item.swift': {
    pal: 'item', flat: true,
    rows: [
      '........kk.',
      '.......kWWk',
      '......kwWWk',
      '.....kwwWk.',
      '....kwwWk..',
      '...kwwWk.k.',
      '..kwwWk.k..',
      '.kwwWk.k...',
      'kwwWk.k....',
      'kwk.k......',
      '.k.k.......',
    ],
  },
  'item.vigor': {
    pal: 'item', flat: true,
    rows: [
      '...kkkkk...',
      '...kmmmk...',
      '...kwwwk...',
      '..kwwwwwk..',
      '.kwRRRRRwk.',
      'kwRRRRRRRwk',
      'kwRRRRRRRwk',
      'kwRRpRRRRwk',
      'kwRRRRRRRwk',
      '.kwRRRRRwk.',
      '..kkkkkkk..',
    ],
  },
  'item.regen': {
    pal: 'item', flat: true,
    rows: [
      '...kkkkk...',
      '...kmmmk...',
      '...kwwwk...',
      '..kwwwwwk..',
      '.kwGGGGGwk.',
      'kwGGGGGGGwk',
      'kwGGGGGGGwk',
      'kwGGWGGGGwk',
      'kwGGGGGGGwk',
      '.kwGGGGGwk.',
      '..kkkkkkk..',
    ],
  },
  'item.focus': {
    pal: 'item', flat: true,
    rows: [
      'kkkkkkkkkkk',
      'kmmmmmmmmmk',
      '.kwYYYYYwk.',
      '..kwYYYwk..',
      '...kwYwk...',
      '....kYk....',
      '...kwYwk...',
      '..kwYYYwk..',
      '.kwYYYYYwk.',
      'kmmmmmmmmmk',
      'kkkkkkkkkkk',
    ],
  },
  'item.area': {
    pal: 'item', flat: true,
    rows: [
      '....kkk....',
      '...kBBBk...',
      '..kBBBBBk..',
      '.kBBkkkBBk.',
      'kBBk...kBBk',
      'kBk.....kBk',
      'kBBk...kBBk',
      '.kBBkkkBBk.',
      '..kBBBBBk..',
      '...kBBBk...',
      '....kkk....',
    ],
  },
  'item.wisdom': {
    pal: 'item', flat: true,
    rows: [
      '...........',
      '.kkkkkkkkk.',
      'kwWWWkWWWwk',
      'kwWWWkWWWwk',
      'kwWWWkWWWwk',
      'kwWWWkWWWwk',
      'kwWWWkWWWwk',
      'kwWWWkWWWwk',
      'kvvvvkvvvvk',
      '.kkkkkkkkk.',
      '...........',
    ],
  },

};

// 물약 — 색만 갈아 끼운다(생명 · 재생)
function potionRows(body, shine) {
  return [
    '.....kkkkk',
    '.....kmMMM',
    '.....kmMMM',
    '.....kmMMM',
    '....kkkkkk',
    '....kwwwww',
    '...kwwwwww',
    '..kwwwwwww',
    '.kw' + body.repeat(7),
    'kw' + body.repeat(8),
    'kw' + shine + body.repeat(7),
    'kw' + shine + body.repeat(7),
    'kw' + body.repeat(8),
    'kw' + body.repeat(8),
    'kw' + body.repeat(8),
    'kw' + body.repeat(8),
    'kw' + body.repeat(8),
    '.kw' + body.repeat(7),
    '.kww' + body.repeat(6),
    '..kkwwwwww',
    '....kkkkkk',
    '..........',
  ];
}

function gemRows() {
  return [
    '.....kkk',
    '...kkGGG',
    '..kGllGG',
    '.kGllLGG',
    '.kGlLGGG',
    'kGlLGGGG',
    'kGLGGGGG',
    'kGGGGGGG',
    'kGGGGGGG',
    'kGGGGGGG',
    'kgGGGGGG',
    '.kgGGGGG',
    '.kggGGGG',
    '..kgggGG',
    '...kkggg',
    '.....kkk',
  ];
}

// 마력 화살 — 0은 부푼 순간, 1은 오므린 순간
function boltRows(step) {
  return step === 0 ? [
    '....kkk',
    '..kkqOO',
    '.kqOOOO',
    '.kqOOOW',
    'kqOOOWW',
    'kqOOOWW',
    'kqOOOWW',
    'kqOOOWW',
    'kqOOOWW',
    '.kqOOOW',
    '.kqOOOO',
    '..kkqOO',
    '....kkk',
    '.......',
  ] : [
    '.......',
    '...kkkk',
    '..koqOO',
    '.koqOOO',
    '.koqOOW',
    'koqOOOW',
    'koqOOOW',
    'koqOOOW',
    '.koqOOW',
    '.koqOOO',
    '..koqOO',
    '...kkkk',
    '.......',
    '.......',
  ];
}

// 불꽃 — 세 단계로 일렁인다
function flameRows(step) {
  const tip = [
    ['......k', '.....kf', '....kfF'],
    ['.......', '......k', '.....kf'],
    ['.......', '.......', '......k'],
  ][step];
  return [
    tip[0],
    tip[1],
    tip[2],
    '....kfF',
    '...kfFFy'.slice(0, 7),
    '..kdfFyy'.slice(0, 7),
    '..kdfFyy'.slice(0, 7),
    '.kdfFFyy'.slice(0, 7),
    '.kdffFyy'.slice(0, 7),
    'kddffFyy'.slice(0, 7),
    'kddffFyy'.slice(0, 7),
    'kddffFyy'.slice(0, 7),
    'kdddffFy'.slice(0, 7),
    'kdddffff'.slice(0, 7),
    '.kddddff'.slice(0, 7),
    '..kddddd'.slice(0, 7),
    '...kkddd'.slice(0, 7),
    '.....kkk'.slice(0, 7),
  ];
}

function zapRows() {
  return [
    '........kkkk..........',
    '.......kbzZZk.........',
    '.......kbzZZk.........',
    '......kbzZZZk.........',
    '......kbzZZk..........',
    '.....kbzZZZk..........',
    '.....kbzZZk...........',
    '....kbzZZZk...........',
    '....kbzZZk............',
    '...kbzZZZk............',
    '...kbzZZk.............',
    '..kbzZZZk.............',
    '..kbzZZk..............',
    '.kbzZZZkkkk...........',
    '.kbzZZZZZZk...........',
    'kbzZZZZZZZk...........',
    'kbbzzzzZZk............',
    'kkkkkkbzZZk...........',
    '......kbzZZk..........',
    '.......kbzZZk.........',
    '.......kbzZZk.........',
    '........kbzZZk........',
    '........kbzZZk........',
    '.........kbzZZk.......',
    '.........kbzZZk.......',
    '..........kbzZZk......',
    '..........kbzZZk......',
    '...........kbzZk......',
    '...........kbzZk......',
    '............kbzk......',
    '............kbzk......',
    '.............kbk......',
    '.............kbk......',
    '..............kk......',
    '..............kk......',
    '...............k......',
    '......................',
    '......................',
    '......................',
    '......................',
  ];
}

// ---- 5×7 비트맵 글꼴(HUD 전용) ----
// 캔버스 위 숫자·라벨은 도트로 찍는다. 한글 문구는 DOM 오버레이가 맡는다.
export const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

// ---- 검증 ----
// 픽셀맵은 손으로 찍는다 — 줄 길이가 하나만 어긋나도 그림이 밀린다.
// 굽기 전에 직사각형인지, 팔레트에 없는 글자가 없는지 본다.
export function validateMaps() {
  const bad = [];
  for (const [name, m] of Object.entries(MAPS)) {
    const pal = PAL[m.pal];
    if (!pal) { bad.push(`${name}: 팔레트 '${m.pal}' 없음`); continue; }
    const w = m.rows[0].length;
    m.rows.forEach((row, y) => {
      if (row.length !== w) bad.push(`${name}: ${y}번째 줄 길이 ${row.length} (기대 ${w})`);
      for (const ch of row) {
        if (ch !== '.' && !pal[ch]) bad.push(`${name}: ${y}번째 줄에 모르는 글자 '${ch}'`);
      }
    });
  }
  return bad;
}

// ---- 굽기 ----
// 모든 프레임을 선반(shelf) 방식으로 하나의 캔버스에 채운다.
// 반환: { canvas, tinted, frames } — frames[name] = { x, y, w, h }
const SHEET_W = 384;
const GAP = 1;

// 캐릭터 프레임은 한 줄 더 높게 굽는다(lift용).
// flat은 그 여유 줄을 빼는 것 — 바닥 타일(이어 붙여야 한다)과 아이콘(가운데 정렬)에 쓴다.
// art:2인 프레임은 여유 줄도 두 줄이어야 한 월드 단위만큼 뜬다.
export function frameSize(m) {
  const half = m.rows[0].length;
  const art = m.art || 1;
  return {
    w: m.mirror ? half * 2 - 1 : half,
    h: m.rows.length + (m.flat ? 0 : art),
    art,
  };
}

function paintFrame(ctx, m, ox, oy) {
  const pal = PAL[m.pal];
  const half = m.rows[0].length;
  const w = m.mirror ? half * 2 - 1 : half;
  const top = oy + (m.flat || m.lift ? 0 : (m.art || 1));
  for (let y = 0; y < m.rows.length; y += 1) {
    const row = m.rows[y];
    for (let x = 0; x < half; x += 1) {
      const ch = row[x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch];
      const px = m.flipX ? w - 1 - x : x;
      ctx.fillRect(ox + px, top + y, 1, 1);
      if (m.mirror) {
        const mx = w - 1 - x;
        if (mx !== x) ctx.fillRect(ox + mx, top + y, 1, 1);
      }
    }
  }
}

export function buildSheet() {
  const problems = validateMaps();
  if (problems.length) console.error('스프라이트 픽셀맵 오류:\n' + problems.join('\n'));

  const names = Object.keys(MAPS);
  // 높은 것부터 채우면 선반 낭비가 준다
  const order = [...names].sort((a, b) => frameSize(MAPS[b]).h - frameSize(MAPS[a]).h);

  const frames = {};
  let x = GAP;
  let y = GAP;
  let shelf = 0;
  for (const name of order) {
    const { w, h, art } = frameSize(MAPS[name]);
    if (x + w + GAP > SHEET_W) { x = GAP; y += shelf + GAP; shelf = 0; }
    frames[name] = { x, y, w, h, art };
    x += w + GAP;
    if (h > shelf) shelf = h;
  }
  const height = y + shelf + GAP;

  const canvas = document.createElement('canvas');
  canvas.width = SHEET_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const name of order) paintFrame(ctx, MAPS[name], frames[name].x, frames[name].y);

  // 피격 순간에 쓸 흰 실루엣 — 같은 좌표계라 프레임 표를 그대로 쓴다
  const tinted = document.createElement('canvas');
  tinted.width = canvas.width;
  tinted.height = canvas.height;
  const tc = tinted.getContext('2d');
  tc.drawImage(canvas, 0, 0);
  tc.globalCompositeOperation = 'source-atop';
  tc.fillStyle = 'rgba(255,255,255,.88)';
  tc.fillRect(0, 0, tinted.width, tinted.height);

  return { canvas, tinted, frames };
}
