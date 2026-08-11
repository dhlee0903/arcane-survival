// 입력 — 원작처럼 **직접 쏜다**. 자동 공격은 없다.
//   PC   : WASD/방향키 이동 · 마우스로 조준 · 좌클릭 기본공격(누르고 있으면 계속)
//          우클릭 특수공격 · R 특수공격2 · Shift 회피 · Esc·P 일시정지
//   모바일: 왼쪽 절반을 끌면 이동 스틱, 오른쪽 절반을 끌면 조준 스틱(누르는 동안 발사).
//          특수공격 두 개는 화면 버튼으로 뺀다(main.js).
//
// 게임 쪽에는 "무엇을 눌렀는지"만 넘긴다 — 쿨타임과 발사는 game.js가 판단한다.

import { view } from './config.js';

const KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

const STICK_R = 30;      // 이 거리에서 최대 속도
const DEAD = 4;          // 손떨림 무시

export class InputController {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.held = new Set();
    this.moveId = null;
    this.aimId = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        game.setPaused(!game.paused);
        e.preventDefault();
        return;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { game.want.dodge = true; e.preventDefault(); return; }
      if (e.code === 'KeyR') { game.want.special2 = true; e.preventDefault(); return; }
      if (!KEYS[e.code]) return;
      this.held.add(e.code);
      this.sync();
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyR') { game.want.special2 = false; return; }
      if (!KEYS[e.code]) return;
      this.held.delete(e.code);
      this.sync();
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      game.want.primary = false;
      game.want.special = false;
      this.sync();
    });

    // ---- 마우스 ----
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', (e) => { game.aim = this.local(e); });
    canvas.addEventListener('mousedown', (e) => {
      game.aim = this.local(e);
      if (e.button === 0) game.want.primary = true;
      if (e.button === 2) game.want.special = true;
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) game.want.primary = false;
      if (e.button === 2) game.want.special = false;
    });

    // ---- 터치 ----
    // 왼쪽 절반은 이동, 오른쪽 절반은 조준 겸 발사. 스틱 두 개짜리 조작이다.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      const p = this.local(e);
      const left = p.x < view.w / 2;
      if (left && this.moveId === null) {
        this.moveId = e.pointerId;
        this.moveOrigin = p;
        game.stick = { x: p.x, y: p.y, dx: 0, dy: 0, on: true };
      } else if (!left && this.aimId === null) {
        this.aimId = e.pointerId;
        this.aimOrigin = p;
        game.aimStick = { x: p.x, y: p.y, dx: 0, dy: 0, on: true };
        game.want.primary = true;
      }
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return;
      const p = this.local(e);
      if (e.pointerId === this.moveId) {
        const s = this.drag(this.moveOrigin, p);
        this.moveOrigin = s.origin;
        game.stick = { x: s.origin.x, y: s.origin.y, dx: s.dx, dy: s.dy, on: true };
        this.sync();
      } else if (e.pointerId === this.aimId) {
        const s = this.drag(this.aimOrigin, p);
        this.aimOrigin = s.origin;
        game.aimStick = { x: s.origin.x, y: s.origin.y, dx: s.dx, dy: s.dy, on: true };
      }
      e.preventDefault();
    });
    const end = (e) => {
      if (e.pointerId === this.moveId) {
        this.moveId = null;
        game.stick = null;
        this.sync();
      } else if (e.pointerId === this.aimId) {
        this.aimId = null;
        game.aimStick = null;
        game.want.primary = false;
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  drag(origin, p) {
    let dx = p.x - origin.x;
    let dy = p.y - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      // 스틱 밖으로 끌면 원점을 따라 옮긴다 — 손가락이 멀리 가도 방향이 살아 있게
      origin = { x: p.x - (dx / d) * STICK_R, y: p.y - (dy / d) * STICK_R };
      dx = (dx / d) * STICK_R;
      dy = (dy / d) * STICK_R;
    }
    return { origin, dx, dy };
  }

  // CSS 크기와 무관하게 논리 좌표(view)로 바꾼다 — 스틱도 그 좌표계에 그린다
  local(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * view.w,
      y: ((e.clientY - r.top) / r.height) * view.h,
    };
  }

  sync() {
    let dx = 0;
    let dy = 0;
    for (const code of this.held) {
      dx += KEYS[code][0];
      dy += KEYS[code][1];
    }
    const s = this.game.stick;
    if (s && s.on) {
      const d = Math.hypot(s.dx, s.dy);
      if (d > DEAD) {
        dx += (s.dx / STICK_R);
        dy += (s.dy / STICK_R);
      }
    }
    this.game.setMove(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
  }
}
