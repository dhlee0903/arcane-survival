// 최고 기록(생존 시간, 초) 저장. 홈 카드와 같은 키를 쓴다. 실패해도 조용히 넘어간다.

import { KEY_BEST, KEY_GOLD } from './config.js';

export function getBest() {
  try { return Number(localStorage.getItem(KEY_BEST)) || 0; } catch { return 0; }
}

// 기록을 넘으면 저장. 반환 { best, isNewBest }
export function submitScore(sec) {
  const best = getBest();
  if (sec > best) {
    try { localStorage.setItem(KEY_BEST, String(sec)); } catch { /* ignore */ }
    return { best: sec, isNewBest: true };
  }
  return { best, isNewBest: false };
}

// 판을 넘어 쌓이는 총 금화 — 지금은 기록용이다(다음에 영구 강화에 쓸 자리)
export function addGold(amount) {
  const total = totalGold() + Math.max(0, amount);
  try { localStorage.setItem(KEY_GOLD, String(total)); } catch { /* ignore */ }
  return total;
}

export function totalGold() {
  try { return Number(localStorage.getItem(KEY_GOLD)) || 0; } catch { return 0; }
}

export function mmss(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
