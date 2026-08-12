// 소환 — 시간이 곧 난이도다. 화면 바깥 테두리에서 밀려 들어온다.
//
// PHASES: 시간대별 적 구성과 소환 간격. 지난 구간 중 가장 마지막 것이 적용된다.
// EVENTS: 정해진 시각에 한 번만 터지는 사건(포위 · 엘리트 · 보스).

import { view, areaScale, MAX_ENEMIES } from './config.js';

const S = (sec) => sec * 60;   // 초 → 스텝

// 적 체력을 2배 넘게 올린 만큼(config.js ENEMY) 소환 간격도 늘렸다. 화면에 동시에
// 서 있는 수는 비슷하되 한 마리 한 마리가 오래 버틴다 — 쓸어담는 게 아니라 겨눠 잡는 쪽.
// 뭉치기(burst 2)는 없앴다. 두 배 튼튼한 적이 두 마리씩 붙으면 벽이 된다.
export const PHASES = [
  { at: S(0), kinds: [['lemurian', 1]], every: 290, burst: 1 },
  { at: S(40), kinds: [['lemurian', 4], ['wisp', 2]], every: 225, burst: 1 },
  { at: S(90), kinds: [['lemurian', 4], ['wisp', 2], ['jellyfish', 2]], every: 185, burst: 1 },
  { at: S(150), kinds: [['lemurian', 4], ['wisp', 2], ['jellyfish', 3]], every: 148, burst: 1 },
  { at: S(230), kinds: [['lemurian', 4], ['wisp', 2], ['jellyfish', 3], ['beetle', 2]], every: 120, burst: 1 },
  { at: S(330), kinds: [['lemurian', 3], ['wisp', 2], ['jellyfish', 3], ['beetle', 3]], every: 102, burst: 1 },
  { at: S(430), kinds: [['lemurian', 3], ['jellyfish', 3], ['beetle', 4]], every: 88, burst: 1 },
  { at: S(540), kinds: [['lemurian', 3], ['wisp', 3], ['beetle', 5]], every: 76, burst: 1 },
  { at: S(660), kinds: [['lemurian', 4], ['jellyfish', 4], ['beetle', 5]], every: 64, burst: 1 },
  { at: S(780), kinds: [['lemurian', 4], ['wisp', 4], ['jellyfish', 4], ['beetle', 6]], every: 54, burst: 1 },
];

// 정해진 시각에 한 번만 터지는 사건. 포위(ring) · 무리(line) · 엘리트 · 보스.
// 마릿수는 체력을 올리면서 같이 줄였다 — 사건은 "많이"가 아니라 "덩어리로" 온다.
export const EVENTS = [
  { at: S(75), type: 'ring', kind: 'wisp', n: 6 },
  { at: S(140), type: 'line', kind: 'jellyfish', n: 5 },
  { at: S(200), type: 'elite', kind: 'guard', n: 3 },
  { at: S(260), type: 'ring', kind: 'lemurian', n: 8 },
  { at: S(300), type: 'boss', kind: 'titan' },
  { at: S(380), type: 'elite', kind: 'guard', n: 3 },
  { at: S(440), type: 'line', kind: 'beetle', n: 5 },
  { at: S(500), type: 'ring', kind: 'lemurian', n: 9 },
  { at: S(560), type: 'elite', kind: 'guard', n: 4 },
  { at: S(600), type: 'boss', kind: 'titan' },
  { at: S(680), type: 'ring', kind: 'beetle', n: 8 },
  { at: S(740), type: 'elite', kind: 'guard', n: 4 },
  { at: S(800), type: 'line', kind: 'lemurian', n: 9 },
  { at: S(860), type: 'boss', kind: 'titan' },
];

export class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.cd = 30;
    this.nextEvent = 0;
    this.phase = PHASES[0];
  }

  // 시간을 건너뛸 때, 지나친 사건을 몰아서 터뜨리지 않고 지나간 것으로 표시한다
  catchUp(t) {
    while (this.nextEvent < EVENTS.length && t >= EVENTS[this.nextEvent].at) this.nextEvent += 1;
  }

  update(g) {
    // 현재 구간 갱신
    for (let i = PHASES.length - 1; i >= 0; i -= 1) {
      if (g.t >= PHASES[i].at) { this.phase = PHASES[i]; break; }
    }

    while (this.nextEvent < EVENTS.length && g.t >= EVENTS[this.nextEvent].at) {
      this.runEvent(g, EVENTS[this.nextEvent]);
      this.nextEvent += 1;
    }

    // 화면이 좁으면 상한도 소환량도 같은 비율로 줄인다(밀도를 맞춘다)
    const area = areaScale();
    if (g.enemies.length >= MAX_ENEMIES * area) return;
    this.cd -= 1;
    if (this.cd > 0) return;
    this.cd = this.phase.every;
    const burst = Math.max(1, Math.round(this.phase.burst * area));
    for (let i = 0; i < burst; i += 1) {
      g.spawn(this.pick(g), this.edgePoint(g));
    }
  }

  pick(g) {
    const kinds = this.phase.kinds;
    let total = 0;
    for (const [, wgt] of kinds) total += wgt;
    let r = g.rnd() * total;
    for (const [kind, wgt] of kinds) {
      r -= wgt;
      if (r <= 0) return kind;
    }
    return kinds[0][0];
  }

  // 화면 밖 테두리 한 점 — 어느 변에서 들어올지는 둘레 길이에 비례해 고른다.
  // 다만 **가는 쪽에 더 많이** 세운다. 그러지 않으면 한 방향으로 계속 달아나는 것만으로
  // 무한히 안전해진다(적이 뒤로 늘어서기만 한다).
  edgePoint(g) {
    const m = 26;
    const halfW = view.w / 2 + m;
    const halfH = view.h / 2 + m;
    const per = (halfW + halfH) * 2;
    let r = g.rnd() * per;
    let dx;
    let dy;
    if (r < halfW * 2) { dx = r - halfW; dy = g.rnd() < 0.5 ? -halfH : halfH; } else {
      r -= halfW * 2;
      dy = r - halfH;
      dx = g.rnd() < 0.5 ? -halfW : halfW;
    }
    const mx = g.inx || 0;
    const my = g.iny || 0;
    if ((mx || my) && g.rnd() < 0.6) {
      // 진행 방향과 반대쪽에 걸렸으면 그 축을 뒤집어 앞쪽으로 옮긴다
      if (mx && Math.sign(dx) !== Math.sign(mx) && Math.abs(dx) > halfW * 0.4) dx = -dx;
      if (my && Math.sign(dy) !== Math.sign(my) && Math.abs(dy) > halfH * 0.4) dy = -dy;
    }
    return { x: g.px + dx, y: g.py + dy };
  }

  runEvent(g, ev) {
    if (ev.type === 'boss') {
      const p = this.edgePoint(g);
      g.spawn(ev.kind, p);
      g.banner('보스 등장', 150);
      g.shake = Math.max(g.shake, 8);
      return;
    }
    if (ev.type === 'elite') {
      for (let i = 0; i < ev.n; i += 1) g.spawn(ev.kind, this.edgePoint(g));
      g.banner('엘리트 출현', 100);
      return;
    }
    if (ev.type === 'ring') {
      const rad = Math.max(view.w, view.h) * 0.62;
      const n = Math.max(6, Math.round(ev.n * Math.sqrt(areaScale())));
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2;
        g.spawn(ev.kind, { x: g.px + Math.cos(a) * rad, y: g.py + Math.sin(a) * rad });
      }
      g.banner('포위', 90);
      return;
    }
    if (ev.type === 'line') {
      // 한 변에서 줄지어 밀려온다
      const side = g.rnd() < 0.5 ? -1 : 1;
      const vertical = g.rnd() < 0.5;
      const n = Math.max(6, Math.round(ev.n * Math.sqrt(areaScale())));
      for (let i = 0; i < n; i += 1) {
        const off = (i - n / 2) * 16;
        const p = vertical
          ? { x: g.px + off, y: g.py + side * (view.h / 2 + 30 + (i % 3) * 14) }
          : { x: g.px + side * (view.w / 2 + 30 + (i % 3) * 14), y: g.py + off };
        g.spawn(ev.kind, p);
      }
      g.banner('무리', 90);
    }
  }
}
