"""아케인 서바이벌 스프라이트 — 엔터 더 건전 · 던그리드 계열 규칙으로 다시 짠다.

세 가지가 그 계열의 뼈대다.
  1) **머리가 큰 2등신**. 몸을 줄이고 머리·모자를 키운다. 실루엣이 멀리서도 읽힌다.
  2) **면을 몇 개로 끊은 셀 셰이딩**. 계조를 부드럽게 깔면 90년대 에어브러시가 된다.
     밝은 면 / 기본 면 / 그늘, 셋이면 충분하고 경계는 칼같이 끊는다.
  3) **검은 외곽선 + 진한 접지 그늘**. 배경이 어두워도 형태가 배경에서 떨어져 나온다.

색은 재질마다 세 단(그늘 d · 기본 m · 밝음 l)만 쓴다. 그늘은 보라·남색 쪽으로,
밝은 면은 노랑 쪽으로 색을 튼다.
"""
import math
import sys

from shapes import Cv
from preview import render

K = '#000000'
PAL = {}
SPR = {}


def sprite(name, pal, art=2):
    def deco(fn):
        SPR[name] = (pal, fn, art)
        return fn
    return deco


# ============================ 마법사(주인공) ============================
PAL['wizard'] = {
    'k': K,
    'd': '#3a1e7a', 'm': '#5a34c4', 'l': '#8a63f5',       # 로브 · 모자
    'D': '#241350',                                       # 접지 그늘
    'c': '#d9a01f', 'C': '#ffd23f',                       # 금
    'x': '#c9825a', 's': '#f5c69c', 'S': '#ffe6c8',       # 살갗
    'a': '#b8c2d8', 'b': '#e8eefc', 'w': '#ffffff',       # 수염
    'n': '#6b4423', 'N': '#a97840',                       # 나무
    'i': '#1a6ea8', 'o': '#3fc4ff', 'O': '#c8f4ff',       # 구슬
    'e': '#1b1030',
}
WROBE = ['d', 'm', 'l']
WSKIN = ['x', 's', 'S']


def _wiz(pose):
    """2등신 — 모자와 머리가 키의 절반을 넘는다."""
    c = Cv(32, 36)
    cx = 13.0
    step = {'stand': 0, 'stepA': 1, 'stepB': -1}[pose]

    # 지팡이 — 몸보다 먼저 그려 뒤로 물린다
    sx = 23.0
    c.rect(sx - 1, 11, sx, 33, 'N')
    c.rect(sx - 1, 11, sx - 1, 33, 'n')
    c.celsphere(sx - 0.5, 7.0, 3.2, 3.2, ['i', 'o', 'O'])

    # 발 — 로브 아래로 코만 내민다
    for side, lead in ((-1, step > 0), (1, step < 0)):
        fx = cx + side * 2.8 + (side * 1.2 if lead else 0)
        c.rect(fx - 1.8, 33, fx + 1.8, 34, 'D')

    # 몸통 — 작고 뭉툭하게. 로브 단은 금색 한 줄
    c.celtaper(cx + step * 0.8, 22, 33, 5.0, 7.6, WROBE, curve=0.8)
    for x in range(int(cx - 9), int(cx + 10)):
        if c.get(x, 32) in 'dml':
            c.put(x, 32, 'C' if x < cx else 'c')
    # 소매와 손
    c.celtaper(18.6, 24, 28, 2.4, 1.8, WROBE)
    c.celsphere(20.4, 29.4, 2.2, 2.0, WSKIN)

    # 머리 — 크게. 챙과 눈 사이를 띄워야 얼굴이 보인다
    c.celsphere(cx, 18.4, 6.2, 6.0, WSKIN)
    c.eyes([(cx - 3.2, 16.4), (cx + 1.6, 16.4)], 'e', 'w', w=2, h=2)
    c.put(cx - 0.5, 19, 'x')                      # 코
    for y in range(20, 27):                       # 수염 — 짧고 뾰족하게
        t = (y - 20) / 6
        half = 4.8 - t * t * 3.2
        for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
            nx = (x + 0.5 - cx) / max(1.0, half)
            c.put(x, y, 'w' if nx < -0.4 else ('b' if nx < 0.35 else 'a'))

    # 고깔모자 — 크고 뒤로 젖혀졌다. 챙이 두꺼워야 마법사로 읽힌다
    for y in range(0, 12):
        t = y / 11
        half = 0.8 + t * 5.6
        ccx = cx - 5.6 + t * 5.2
        c.celtaper(ccx, y, y, half, half, WROBE)
    c.celsphere(cx - 0.4, 11.6, 8.6, 2.4, WROBE, lo=0.30, hi=0.74)
    c.rect(cx - 7, 9, cx + 6, 9, 'c')             # 금색 띠
    c.rect(cx - 7, 9, cx - 2, 9, 'C')
    for dx, dy in ((0, 0), (-1, 1), (1, 1), (0, 2)):
        c.put(cx - 6 + dx, 4 + dy, 'C')
    c.put(cx - 6, 5, 'w')                         # 모자에 박힌 별
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows(trim=False)


for _n, _p in (('wizard.stand', 'stand'), ('wizard.stepA', 'stepA'), ('wizard.stepB', 'stepB')):
    sprite(_n, 'wizard')(lambda p=_p: _wiz(p))


# ============================ 슬라임 ============================
PAL['slime'] = {
    'k': K, 'D': '#0b3d1c', 'd': '#158a3a', 'm': '#2fd45e', 'l': '#8bff9e',
    'e': '#06210f', 'w': '#ffffff',
}


def _slime(sq):
    c = Cv(26, 20)
    cy = 12.0 + sq
    c.celsphere(13.0, cy, 12.0 + sq, 8.4 - sq, ['d', 'm', 'l'], lo=0.30, hi=0.76)
    c.ao('D', 'dm')
    c.eyes([(8, cy - 3), (15, cy - 3)], 'e', 'w', w=3, h=4)
    c.rect(11, cy + 3, 14, cy + 3, 'e')           # 입
    c.put(10, cy + 2, 'e')
    c.put(15, cy + 2, 'e')
    c.rect(5, cy - 5, 7, cy - 4, 'l')             # 젤리 반사
    c.outline('k')
    return c.rows()


sprite('slime.0', 'slime')(lambda: _slime(0))
sprite('slime.1', 'slime')(lambda: _slime(1))


# ============================ 유령 ============================
PAL['ghost'] = {
    'k': K, 'D': '#3f4a8c', 'd': '#6b7ac4', 'm': '#a8b8ee', 'l': '#eef4ff',
    'e': '#161038', 'q': '#4fe0ff', 'w': '#ffffff',
}


def _ghost(ph):
    c = Cv(24, 26)
    cx = 11.5
    # 머리 — 크고 둥글게
    c.celsphere(cx, 11.0, 10.6, 10.4, ['d', 'm', 'l'], lo=0.30, hi=0.74)
    # 몸통 — 아래로 이어지다 세 갈래 물결로 끝난다
    for y in range(11, 26):
        half = 10.6 - (y - 11) * 0.15
        w = math.cos((y * 0 + 1) * 0)  # 자리 표시
        for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
            d = (x + 0.5 - cx) / 11.0
            bottom = 23.5 + math.cos(d * math.pi * 3 + ph * math.pi) * 2.0 - d * d * 2.4
            if y > bottom:
                continue
            nx = d / max(0.2, half / 11.0)
            lam = nx * -0.62 + math.sqrt(max(0.0, 1 - min(1.0, nx * nx))) * 0.62
            c.put(x, y, 'l' if lam > 0.72 else ('m' if lam > 0.34 else 'd'))
    c.ao('D', 'dm')
    c.eyes([(cx - 5, 8), (cx + 1.5, 8)], 'e', 'q', w=3, h=4)
    c.rect(cx - 1.5, 14, cx + 1.5, 15, 'e')       # 벌린 입
    c.outline('k')
    return c.rows()


sprite('ghost.0', 'ghost')(lambda: _ghost(0))
sprite('ghost.1', 'ghost')(lambda: _ghost(1))


# ============================ 박쥐 ============================
PAL['bat'] = {
    'k': K, 'D': '#2a1a52', 'd': '#4a2f9c', 'm': '#7a52e0', 'l': '#b79cff',
    'n': '#3a2a5c', 'N': '#5e4a86',
    'e': '#ff3b52', 'w': '#ffffff', 'F': '#ffffff',
}


def _bat(up):
    c = Cv(32, 20)
    cx, cy = 16.0, 11.0
    # 날개 — 위 모서리는 곧고 아래는 세 갈래로 파인다
    for side in (-1, 1):
        for i in range(13):
            t = i / 12
            x = cx + side * (4.5 + i)
            top = cy - 3.0 - (5.4 * t if up else -2.6 * t)
            depth = (7.0 - 4.6 * t) * (0.62 + 0.38 * math.cos(t * 3 * math.pi))
            for y in range(int(round(top)), int(round(top + depth)) + 1):
                u = (y - top) / max(1e-6, depth)
                c.put(x, y, 'd' if (side > 0 or u > 0.6) else 'm')
            c.put(x, top, 'l' if side < 0 else 'm')       # 날개 앞머리
    # 머리 — 몸의 대부분
    c.celsphere(cx, cy, 7.0, 6.4, ['d', 'm', 'l'], lo=0.32, hi=0.74)
    for side in (-1, 1):                          # 귀 — 짧은 삼각
        for i in range(4):
            for j in range(4 - i):
                c.put(cx + side * (2.4 + i * 0.8) + side * j, cy - 6 - i,
                      'l' if side < 0 else 'm')
    c.ao('D', 'dm')
    c.eyes([(cx - 4, cy - 2), (cx + 1, cy - 2)], 'e', 'w', w=3, h=3)
    c.put(cx - 1, cy + 3, 'F')                    # 송곳니
    c.put(cx + 1, cy + 3, 'F')
    c.outline('k')
    return c.rows()


sprite('bat.0', 'bat')(lambda: _bat(True))
sprite('bat.1', 'bat')(lambda: _bat(False))


# ============================ 해골 ============================
PAL['bone'] = {
    'k': K, 'D': '#6b6350', 'd': '#a89c7c', 'm': '#ded3b0', 'l': '#fdf8e4',
    'e': '#120c1e', 'q': '#ff7a1a', 'Q': '#ffd23f',
}


def _skele(step):
    c = Cv(22, 30)
    cx = 10.5
    # 두개골 — 크게
    c.celsphere(cx, 8.0, 8.4, 7.6, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    c.rect(cx - 4, 13, cx + 4, 15, 'm')            # 턱
    c.rect(cx - 4, 15, cx + 4, 15, 'd')
    for x in range(int(cx) - 3, int(cx) + 4, 2):   # 이빨
        c.put(x, 14, 'e')
    c.eyes([(cx - 5, 5), (cx + 1, 5)], 'e', 'q', w=4, h=4)
    c.put(cx - 5, 5, 'Q')
    c.put(cx + 1, 5, 'Q')
    c.put(cx - 0.5, 10, 'e')                       # 코
    # 갈비뼈 — 사이가 비어야 갈비로 읽힌다
    for i, y in enumerate((18, 20, 22)):
        w = 4.4 - i * 0.6
        c.rect(cx - w, y, cx + w, y, 'm')
        c.rect(cx - w, y, cx - w + 1, y, 'l')
        c.rect(cx + w - 1, y, cx + w, y, 'd')
    c.rect(cx - 0.5, 17, cx + 0.5, 23, 'm')        # 척추
    c.rect(cx - 3, 24, cx + 3, 25, 'm')            # 골반
    c.rect(cx - 3, 25, cx + 3, 25, 'd')
    # 팔 · 다리
    for side in (-1, 1):
        c.rect(cx + side * 5.5, 17, cx + side * 5.5, 22, 'm')
        c.put(cx + side * 5.5, 23, 'l' if side < 0 else 'd')
        lead = (side > 0) == bool(step)
        lx = cx + side * (2.6 if lead else 1.8)
        c.rect(lx - 0.5, 26, lx + 0.5, 28, 'm')
        c.rect(lx - 1.5 + side * 0.5, 29, lx + 1.5 + side * 0.5, 29, 'd')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('skeleton.0', 'bone')(lambda: _skele(0))
sprite('skeleton.1', 'bone')(lambda: _skele(1))


# ============================ 골렘(엘리트) ============================
PAL['stone'] = {
    'k': K, 'D': '#1e2f2a', 'd': '#3d5c52', 'm': '#628578', 'l': '#93b8a2',
    'g': '#2f7a33', 'G': '#4fb04a',
    'q': '#8f2a00', 'e': '#ff7a1a', 'E': '#ffd23f',
}
ST = ['d', 'm', 'l']


def _golem(step):
    """어깨가 넓고 다리가 짧은 2등신. 머리는 몸통에 파묻힌 작은 바위다."""
    c = Cv(38, 36)
    cx = 19.0
    sway = 0.6 if step else -0.6
    # 다리
    for side in (-1, 1):
        lead = 1.0 if (side > 0) == bool(step) else 0.0
        c.celtaper(cx + side * 5.4, 28, 35 - lead, 3.8, 3.4, ST)
    # 팔
    for side in (-1, 1):
        ax = cx + side * 13.6
        c.celsphere(ax, 18.0 + side * sway, 4.6, 7.0, ST)
        c.celsphere(ax + side * 0.6, 25.0 + side * sway, 5.0, 4.4, ST)
    # 몸통
    c.celtaper(cx + sway * 0.5, 11, 29, 10.6, 7.0, ST, curve=0.85)
    # 어깨
    for side in (-1, 1):
        c.celsphere(cx + side * 9.6, 12.0 + side * sway, 5.6, 4.4, ST)
    # 머리 — 어깨 사이에 낀 작은 바위
    c.celsphere(cx, 6.6, 6.4, 6.0, ST)
    c.rect(cx - 4, 11, cx + 4, 11, 'D')            # 목 그늘
    c.rect(cx - 4.6, 5, cx - 1.6, 7, 'q')          # 눈 — 갈라진 틈에서 새는 빛
    c.rect(cx + 1.6, 5, cx + 4.6, 7, 'q')
    c.rect(cx - 4.6, 5, cx - 2.6, 6, 'e')
    c.rect(cx + 1.6, 5, cx + 3.6, 6, 'e')
    c.put(cx - 4.6, 5, 'E')
    c.put(cx + 1.6, 5, 'E')
    # 균열과 용암 — 가슴에서 옆구리로 비스듬히
    c.line(cx - 5, 15, cx - 1, 21, 'q')
    c.line(cx - 1, 21, cx + 3, 24, 'q')
    c.line(cx - 4, 16, cx - 1, 20, 'e')
    # 이끼 — 윗면에만
    for mx, my, rx, ry in ((cx - 9.6, 9.4, 4.0, 1.8), (cx + 9, 9.0, 3.4, 1.6),
                           (cx - 1, 1.8, 3.6, 1.6)):
        c.celsphere(mx, my, rx, ry, ['g', 'G', 'G'], clip=lambda x, y: c.get(x, y) in 'ml')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('golem.0', 'stone')(lambda: _golem(0))
sprite('golem.1', 'stone')(lambda: _golem(1))


# ============================ 리치(보스) ============================
PAL['lich'] = {
    'k': K, 'D': '#20114a', 'd': '#3a1f8c', 'm': '#5c36cc', 'l': '#9068ff',
    'a': '#b8b09a', 'b': '#e8e2cc', 'w': '#fffdf2',
    'e': '#14092e', 'q': '#3fe6ff', 'Q': '#e8ffff',
    'c': '#d9a01f', 'C': '#ffd23f',
}
LR = ['d', 'm', 'l']
LB = ['a', 'b', 'w']


def _lich(ph):
    """왕관 쓴 커다란 해골 + 짧은 로브. 머리가 몸보다 크다."""
    c = Cv(42, 44)
    cx = 20.5
    # 로브 — 짧고 넓게. 아랫단이 너덜너덜하다
    def hem(x):
        d = (x + 0.5 - cx) / 16.0
        return 40.0 + math.cos(d * math.pi * 4 + ph * math.pi) * 2.2 - d * d * 4.0
    c.celtaper(cx, 24, 42, 8.0, 16.0, LR, curve=0.85, clipfn=lambda x, y: y <= hem(x))
    # 어깨 갑주
    for side in (-1, 1):
        c.celsphere(cx + side * 10.6, 25.0, 6.0, 4.0, LR)
        c.celsphere(cx + side * 12.0, 31.0, 3.6, 5.0, LR)
        c.celsphere(cx + side * 12.4, 35.4, 2.6, 2.4, LB)   # 해골 손
    # 두건과 해골
    c.celsphere(cx, 15.0, 11.0, 11.4, LR)
    c.celsphere(cx, 16.0, 8.4, 9.0, ['e', 'e', 'e'])
    c.celsphere(cx, 15.0, 7.4, 7.6, LB, lo=0.32, hi=0.72)
    c.rect(cx - 4, 21, cx + 4, 23, 'b')                     # 턱
    for x in range(int(cx) - 3, int(cx) + 4, 2):
        c.put(x, 22, 'e')
    c.eyes([(cx - 4.6, 12), (cx + 1.6, 12)], 'e', 'q', w=4, h=4)
    c.put(cx - 4.6, 12, 'Q')
    c.put(cx + 1.6, 12, 'Q')
    # 왕관
    for dx in (-7, -3.5, 0, 3.5, 7):
        h = 4 if dx == 0 else 3
        for j in range(h):
            c.put(cx + dx, 4 - j + (0 if dx == 0 else 1), 'C' if j < h - 1 else 'c')
    c.rect(cx - 8, 5, cx + 8, 6, 'c')
    c.rect(cx - 8, 5, cx + 1, 5, 'C')
    # 가슴의 마력 핵
    rr = 3.0 + ph * 0.8
    c.celsphere(cx, 29.0, rr + 1.2, rr + 1.2, ['q', 'q', 'q'])
    c.celsphere(cx, 29.0, rr, rr, ['Q', 'Q', 'Q'])
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('lich.0', 'lich')(lambda: _lich(0))
sprite('lich.1', 'lich')(lambda: _lich(1))


# ============================ 주워 먹는 것 ============================
for _n, _c in (('gemBlue', ('#0f3a7a', '#2b8de0', '#8fd8ff')),
               ('gemGreen', ('#0e5c2c', '#2fae55', '#8fefaa')),
               ('gemRed', ('#7a1230', '#e04357', '#ff9eb0'))):
    PAL[_n] = {'k': K, 'd': _c[0], 'm': _c[1], 'l': _c[2], 'w': '#ffffff'}


def _gem():
    """팔면체 결정 — 면 세 개로 끊어 칠한다."""
    c = Cv(14, 16)
    cx, mid = 6.5, 6.0
    for y in range(16):
        half = 1.0 + y / mid * 5.4 if y <= mid else 6.4 - (y - mid) / 9 * 5.8
        for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
            nx = (x + 0.5 - cx) / max(1.0, half)
            up = y <= mid
            c.put(x, y, ('l' if nx < -0.2 else 'm') if up else ('m' if nx < -0.1 else 'd'))
    c.rect(cx, 0, cx, 15, 'l')
    c.rect(3, 3, 4, 3, 'w')
    c.put(3, 4, 'w')
    c.outline('k')
    return c.rows()


for _n, _p in (('gem.blue', 'gemBlue'), ('gem.green', 'gemGreen'), ('gem.red', 'gemRed')):
    sprite(_n, _p)(_gem)


PAL['heart'] = {'k': K, 'd': '#8e1230', 'm': '#e8394f', 'l': '#ff8a9c', 'w': '#ffffff'}


def _heart():
    c = Cv(16, 14)
    for side, tone in ((-1, 'l'), (1, 'm')):
        c.celsphere(7.5 + side * 3.4, 4.6, 4.4, 4.2, ['d', 'm', 'l'], lo=0.30, hi=0.66)
    for y in range(5, 14):
        t = (y - 5) / 8
        half = 7.4 * (1 - t) ** 0.85
        for x in range(int(round(7.5 - half)), int(round(7.5 + half)) + 1):
            nx = (x + 0.5 - 7.5) / max(1.0, half)
            c.put(x, y, 'l' if nx < -0.55 else ('m' if nx < 0.45 else 'd'))
    c.rect(4, 3, 5, 4, 'w')
    c.outline('k')
    return c.rows()


sprite('heart', 'heart')(_heart)


PAL['magnet'] = {'k': K, 'd': '#3a4457', 'm': '#7d8ba3', 'l': '#dbe4f2',
                 'r': '#8e1230', 'R': '#e8394f', 'p': '#ff9eb0'}


def _magnet():
    c = Cv(16, 15)
    cx, cy = 7.5, 6.5
    for y in range(15):
        for x in range(16):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if dy <= 0:
                r = math.hypot(dx, dy)
                inside, t = 3.2 <= r <= 6.8, (r - 3.2) / 3.6
            else:
                a = abs(dx)
                inside, t = (3.2 <= a <= 6.8 and y <= 13), (a - 3.2) / 3.6
            if not inside:
                continue
            ch = 'l' if t < 0.34 else ('m' if t < 0.72 else 'd')
            if dx > 1 and dy < 0:
                ch = 'm' if t < 0.5 else 'd'
            if y >= 11:
                ch = 'p' if t < 0.34 else ('R' if t < 0.72 else 'r')
            c.put(x, y, ch)
    c.outline('k')
    return c.rows()


sprite('magnet', 'magnet')(_magnet)


PAL['coin'] = {'k': K, 'd': '#8a5c10', 'm': '#f0bb2c', 'l': '#ffe98a', 'w': '#ffffff'}


def _coin():
    c = Cv(13, 13)
    c.celsphere(6.0, 6.0, 6.2, 6.2, ['d', 'm', 'l'], lo=0.30, hi=0.72)
    c.celsphere(6.0, 6.0, 4.0, 4.0, ['m', 'l', 'l'], lo=0.30, hi=0.72)
    for dx, dy in ((0, -2), (0, 2), (-2, 0), (2, 0), (0, 0)):
        c.put(6 + dx, 6 + dy, 'd')
    c.put(3, 2, 'w')
    c.outline('k')
    return c.rows()


sprite('coin', 'coin')(_coin)


# ============================ 부술 수 있는 물건 ============================
PAL['pot'] = {'k': K, 'D': '#4a2410', 'd': '#8a4f22', 'm': '#c47b3c', 'l': '#eeae6f',
              'b': '#2f6fe0', 'B': '#8fc4ff'}


def _pot():
    c = Cv(20, 20)
    c.celsphere(9.5, 12.5, 8.6, 7.4, ['d', 'm', 'l'], lo=0.32, hi=0.74)
    c.celtaper(9.5, 5, 9, 4.6, 6.4, ['d', 'm', 'l'])
    c.celsphere(9.5, 4.0, 6.2, 2.2, ['d', 'm', 'l'], lo=0.28, hi=0.70)
    c.celsphere(9.5, 3.6, 4.0, 1.2, ['k', 'k', 'k'])
    c.rect(4, 6, 15, 6, 'D')
    for x in range(2, 18):                        # 푸른 무늬 띠
        if c.get(x, 12) in 'dml':
            c.put(x, 12, 'B' if x < 9 else 'b')
        if c.get(x, 13) in 'dml':
            c.put(x, 13, 'b')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('pot', 'pot')(_pot)


PAL['chest'] = {'k': K, 'D': '#2e1a06', 'd': '#5f380f', 'm': '#9c6026', 'l': '#d99a5a',
                'i': '#2f3742', 'I': '#7d8b9e', 'c': '#d9a01f', 'C': '#ffd23f'}


def _chest():
    c = Cv(22, 20)
    c.celsphere(11.0, 9.0, 9.6, 7.0, ['d', 'm', 'l'], lo=0.32, hi=0.74,
                clip=lambda x, y: y <= 9)
    c.rect(1, 10, 20, 10, 'D')
    c.celtaper(11.0, 11, 18, 9.8, 9.2, ['d', 'm', 'l'])
    for bx in (4, 16):                            # 쇠띠
        for y in range(2, 19):
            if c.get(bx, y) in 'dml':
                c.put(bx, y, 'I')
            if c.get(bx + 1, y) in 'dml':
                c.put(bx + 1, y, 'i')
    c.rect(10, 8, 12, 14, 'c')                    # 자물쇠
    c.rect(10, 8, 10, 14, 'C')
    c.rect(10, 8, 12, 8, 'C')
    c.put(11, 11, 'k')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('chest', 'chest')(_chest)


# ============================ 배경 장식 ============================
PAL['rock'] = {'k': K, 'D': '#1c2620', 'd': '#3c4c42', 'm': '#63776a', 'l': '#95a894',
               'g': '#2f7a33', 'G': '#4fb04a'}


def _rock():
    c = Cv(15, 11)
    c.celsphere(7.0, 8.0, 7.0, 6.0, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    c.celsphere(11.0, 4.8, 2.6, 1.4, ['g', 'G', 'G'], clip=lambda x, y: c.get(x, y) in 'ml')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('rock', 'rock')(_rock)


PAL['tuft'] = {'k': K, 'd': '#1f5423', 'm': '#357a30', 'l': '#5aa84a'}


def _tuft():
    c = Cv(14, 9)
    for i, (bx, h, lean) in enumerate(((2, 5, -1.4), (5, 7, -0.4), (7, 8, 0.4), (10, 6, 1.4))):
        for t in range(h):
            u = t / max(1, h - 1)
            c.put(bx + lean * u * u * 2.0, 8 - t, 'l' if i < 2 else 'm')
            if t < 2:
                c.put(bx + lean * u * u * 2.0 + 1, 8 - t, 'd')
    c.outline('k')
    return c.rows()


sprite('tuft', 'tuft')(_tuft)


PAL['fungus'] = {'k': K, 'D': '#5c1220', 'd': '#a8203a', 'm': '#e8394f', 'l': '#ff9eb0',
                 's': '#a89a80', 'S': '#e8ddc4'}


def _mushroom():
    c = Cv(13, 13)
    c.celtaper(6.0, 6, 12, 1.8, 2.6, ['s', 'S', 'S'])
    c.celsphere(6.0, 6.0, 6.2, 4.8, ['d', 'm', 'l'], lo=0.32, hi=0.74, clip=lambda x, y: y <= 7)
    c.rect(0, 7, 12, 7, 'D')
    for dx, dy in ((-3, 2), (2, 1), (0, 4), (3, 3)):
        c.put(6 + dx, 3 + dy, 'l')
    c.outline('k')
    return c.rows()


sprite('mushroom', 'fungus')(_mushroom)


PAL['flower'] = {'k': K, 'd': '#a8791a', 'm': '#ffd23f', 'l': '#fff2b8',
                 'g': '#2f7a33', 'G': '#4fb04a'}


def _flower():
    c = Cv(11, 12)
    c.rect(5, 6, 5, 11, 'g')
    c.put(6, 8, 'G')
    c.put(3, 9, 'G')
    for dx, dy in ((0, -3), (-2, -2), (2, -2), (-3, 0), (3, 0), (-2, 2), (2, 2), (0, 3)):
        c.put(5 + dx, 4 + dy, 'm' if dx > 0 else 'l')
    c.celsphere(5.0, 4.0, 2.4, 2.4, ['d', 'm', 'l'], lo=0.30, hi=0.70)
    c.outline('k')
    return c.rows()


sprite('flower', 'flower')(_flower)


PAL['bones'] = {'k': K, 'd': '#5c5748', 'm': '#8f8a76', 'l': '#c2bda8'}


def _bones():
    c = Cv(16, 11)
    for x0, y0, x1, y1 in ((2, 2, 13, 8), (2, 8, 13, 2)):
        c.line(x0, y0, x1, y1, 'm')
        c.line(x0, y0 + 1, x1, y1 + 1, 'd')
    for px_, py_ in ((2, 2), (13, 8), (2, 8), (13, 2)):
        c.celsphere(px_, py_ + 0.5, 2.0, 1.8, ['d', 'm', 'l'], lo=0.30, hi=0.70)
    c.outline('k')
    return c.rows()


sprite('bones', 'bones')(_bones)


PAL['stump'] = {'k': K, 'D': '#2a1a08', 'd': '#4d3010', 'm': '#8a5423', 'l': '#c19a6b',
                'g': '#2f7a33', 'G': '#4fb04a'}


def _stump():
    c = Cv(16, 14)
    c.celtaper(7.5, 4, 13, 6.4, 5.8, ['d', 'm', 'l'])
    c.celsphere(7.5, 4.2, 6.6, 3.0, ['l', 'l', 'l'])
    c.celsphere(7.5, 4.2, 4.4, 1.9, ['m', 'm', 'm'])
    c.celsphere(7.5, 4.2, 2.0, 0.9, ['l', 'l', 'l'])
    c.rect(1, 7, 14, 7, 'D')
    c.celsphere(3.0, 9.5, 2.4, 1.8, ['g', 'G', 'G'], clip=lambda x, y: c.get(x, y) in 'dml')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('stump', 'stump')(_stump)


PAL['grave'] = {'k': K, 'D': '#1a2028', 'd': '#3b4551', 'm': '#697585', 'l': '#a3b0bf',
                'g': '#2f7a33', 'G': '#4fb04a'}


def _grave():
    c = Cv(15, 17)
    c.celsphere(7.0, 15.0, 7.0, 2.4, ['D', 'D', 'd'])
    c.celtaper(7.0, 5, 15, 4.6, 5.2, ['d', 'm', 'l'])
    c.celsphere(7.0, 5.0, 4.6, 4.4, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    c.rect(6, 4, 7, 11, 'D')                      # 새긴 십자
    c.rect(4, 6, 10, 7, 'D')
    c.celsphere(3.0, 12.0, 2.4, 1.6, ['g', 'G', 'G'], clip=lambda x, y: c.get(x, y) in 'dml')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('grave', 'grave')(_grave)


# ============================ 투사체 ============================
PAL['arcane'] = {'k': K, 'd': '#4a2ba8', 'm': '#8a5cf0', 'l': '#d9c8ff', 'w': '#ffffff'}


def _bolt(step):
    c = Cv(14, 14)
    r = 4.6 + step * 0.6
    c.celsphere(6.5, 6.5, r, r, ['d', 'm', 'l'], lo=0.34, hi=0.70)
    c.rect(5, 5, 6, 6, 'w')
    for d in range(1, 6 - step):
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
            if c.get(6 + dx, 6 + dy) == '.':
                c.put(6 + dx, 6 + dy, 'm' if d < 4 else 'd')
    c.outline('k')
    return c.rows()


sprite('bolt.0', 'arcane')(lambda: _bolt(0))
sprite('bolt.1', 'arcane')(lambda: _bolt(1))


PAL['frost'] = {'k': K, 'd': '#1c5a8c', 'm': '#4fb6e8', 'l': '#c8f0ff', 'w': '#ffffff'}


def _shard():
    c = Cv(19, 11)
    for x in range(19):
        half = min(x, 18 - x) * 0.52
        if half < 0.4:
            continue
        for y in range(int(round(5 - half)), int(round(5 + half)) + 1):
            f = (y - 5) + (x - 9) * 0.22
            c.put(x, y, 'w' if f < -1.6 else ('l' if f < 0.2 else ('m' if f < 1.8 else 'd')))
    c.outline('k')
    return c.rows()


sprite('shard', 'frost')(_shard)


PAL['rune'] = {'k': K, 'd': '#a8791a', 'm': '#ffd23f', 'l': '#fff2b8', 'w': '#ffffff'}


def _rune(step):
    c = Cv(14, 14)
    c.celsphere(6.5, 6.5, 6.2, 6.2, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    if step:
        c.rect(6, 2, 7, 11, 'd')
        c.rect(2, 6, 11, 7, 'd')
    else:
        for d in range(-4, 5):
            c.put(6 + d, 6 + d, 'd')
            c.put(6 + d, 6 - d, 'd')
    c.put(4, 3, 'w')
    c.outline('k')
    return c.rows()


sprite('rune.0', 'rune')(lambda: _rune(0))
sprite('rune.1', 'rune')(lambda: _rune(1))


PAL['fire'] = {'k': K, 'd': '#a82a00', 'm': '#ff7a1a', 'l': '#ffd23f', 'w': '#fff2b8'}


def _flame(step):
    c = Cv(13, 18)
    sway = (step - 1) * 0.9
    for y in range(18):
        t = 1 - y / 17
        half = 4.6 * math.sin(t * 2.2) ** 0.8 if t > 0 else 0
        if t > 0.72:
            half *= (1 - (t - 0.72) / 0.28) * 1.1
        cxx = 6.0 + sway * t * 2.2
        for x in range(int(round(cxx - half)), int(round(cxx + half)) + 1):
            nx = (x + 0.5 - cxx) / max(1.0, half)
            ch = 'm' if nx < 0.45 else 'd'
            if abs(nx) < 0.5 and y > 7:
                ch = 'l'
            if abs(nx) < 0.3 and y > 11:
                ch = 'w'
            c.put(x, y, ch)
    c.outline('k')
    return c.rows()


for _i in range(3):
    sprite(f'flame.{_i}', 'fire')(lambda i=_i: _flame(i))


PAL['zap'] = {'k': K, 'd': '#2b4fb8', 'm': '#5f9fff', 'l': '#cfe6ff', 'w': '#ffffff'}


def _zap(step):
    c = Cv(16, 28)
    pts = [(9, 0), (6, 8), (11, 13), (7, 21), (9, 27)] if step == 0 else \
          [(7, 0), (11, 7), (6, 14), (10, 22), (7, 27)]
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        c.line(x0, y0, x1, y1, 'w')
        c.line(x0 - 1, y0, x1 - 1, y1, 'l')
        c.line(x0 + 1, y0, x1 + 1, y1, 'm')
        c.line(x0 + 2, y0, x1 + 2, y1, 'd')
    c.outline('k')
    return c.rows()


sprite('zap.0', 'zap')(lambda: _zap(0))
sprite('zap.1', 'zap')(lambda: _zap(1))


# ============================ 바닥 타일 ============================
# 배경은 어두워야 캐릭터가 앞으로 나온다. 명도를 낮추고 덩어리로 결을 넣는다.
PAL['ground'] = {'a': '#22331c', 'b': '#283c21', 'c': '#2f4726', 'd': '#1a2916', 'e': '#3a5a2e'}
PAL['moss'] = {'a': '#1f2f1a', 'b': '#25381e', 'c': '#2c4323', 'd': '#182514', 'e': '#355428'}
PAL['path'] = {'a': '#332a1e', 'b': '#3c3224', 'c': '#463a2a', 'd': '#281f16', 'e': '#54452f',
               'g': '#22331c', 'G': '#283c21', 'h': '#1a2916'}


class _Rnd:
    def __init__(self, seed):
        self.s = seed & 0xffffffff

    def __call__(self):
        self.s = (self.s * 1664525 + 1013904223) & 0xffffffff
        return self.s / 4294967296


def _tile(seed, blobs=14, blades=24, pebbles=0, fringe=False):
    N = 32
    c = Cv(N, N)
    r = _Rnd(seed)
    c.rect(0, 0, N - 1, N - 1, 'a')

    def wput(x, y, ch):
        c.put(int(x) % N, int(y) % N, ch)

    for _ in range(blobs):
        bx, by = r() * N, r() * N
        rx, ry = 2.0 + r() * 3.5, 1.6 + r() * 2.6
        ch = 'b' if r() < 0.62 else ('c' if r() < 0.7 else 'd')
        for y in range(int(-ry - 1), int(ry + 2)):
            for x in range(int(-rx - 1), int(rx + 2)):
                if (x / rx) ** 2 + (y / ry) ** 2 <= 1:
                    wput(bx + x, by + y, ch)
    for _ in range(blades):
        bx, by = r() * N, r() * N
        ch = 'e' if r() < 0.5 else 'd'
        for i in range(2 + int(r() * 2)):
            wput(bx + (i // 2), by - i, ch)
    for _ in range(pebbles):
        bx, by = r() * N, r() * N
        wput(bx, by, 'e')
        wput(bx + 1, by, 'e')
        wput(bx, by + 1, 'd')
        wput(bx + 1, by + 1, 'd')
    if fringe:
        for y in range(N):
            for x in range(N):
                d = min(x, y, N - 1 - x, N - 1 - y)
                if d <= 3 and r() < 0.80 - d * 0.26:
                    c.put(x, y, ('g', 'G', 'h')[(x * 7 + y * 3) % 3])
    return c.rows(trim=False)


sprite('tile.grass0', 'ground', art=2)(lambda: _tile(20260810))
sprite('tile.grass1', 'ground', art=2)(lambda: _tile(77712))
sprite('tile.moss0', 'moss', art=2)(lambda: _tile(51423, blobs=16, blades=28))
sprite('tile.moss1', 'moss', art=2)(lambda: _tile(90210, blobs=16, blades=28))
sprite('tile.path', 'path', art=2)(lambda: _tile(31337, blobs=12, blades=6, pebbles=10, fringe=True))


# ============================ 아이템 아이콘 ============================
# HUD 칸(11도트)에 나란히 서므로 규격을 맞춘다. 형태는 굵게, 색은 세 단.
PAL['item'] = {
    'k': K,
    'r': '#8e1230', 'R': '#e8394f', 'p': '#ff9eb0',
    'g': '#146b32', 'G': '#33b558', 'j': '#7fe89b',
    'b': '#1f4e9c', 'B': '#3f8ae8', 'C': '#a8dcff',
    'y': '#a8791a', 'Y': '#ffd23f', 'c': '#fff2b8',
    'd': '#a82a00', 'o': '#ff7a1a', 'O': '#ffd23f',
    'a': '#3a4457', 'w': '#8d99ad', 'W': '#e8eef8',
    'm': '#4d3010', 'M': '#96683a', 'n': '#c19a6b',
    'v': '#4a2ba8', 'V': '#8a5cf0', 'X': '#d9c8ff',
}


def _potion(tone):
    d, m, l = tone
    c = Cv(16, 20)
    c.celsphere(7.5, 13.0, 6.6, 6.6, [d, m, l], lo=0.32, hi=0.74)
    c.celtaper(7.5, 4, 8, 2.4, 4.4, [d, m, l])
    c.rect(4, 2, 11, 4, 'M')
    c.rect(4, 2, 11, 2, 'n')
    c.rect(3, 5, 12, 5, 'W')
    c.rect(4, 10, 5, 12, 'W')
    c.outline('k')
    return c.rows()


sprite('item.vigor', 'item')(lambda: _potion(('r', 'R', 'p')))
sprite('item.regen', 'item')(lambda: _potion(('g', 'G', 'j')))


def _icon_bolt():
    c = Cv(20, 20)
    for w in range(2):
        c.line(4 + w, 17, 11 + w, 10, 'v' if w else 'V')
    c.tri((18, 2), (9, 8), (15, 13), 'V')
    c.tri((18, 2), (10, 7), (13, 8), 'X')
    c.tri((6, 19), (3, 16), (9, 15), 'v')
    c.rect(15, 3, 16, 4, 'X')
    c.outline('k')
    return c.rows()


sprite('item.bolt', 'item')(_icon_bolt)


def _icon_shard():
    c = Cv(20, 14)
    for x in range(20):
        half = min(x, 19 - x) * 0.72
        if half < 0.4:
            continue
        for y in range(int(round(7 - half)), int(round(7 + half)) + 1):
            f = (y - 7) + (x - 10) * 0.22
            c.put(x, y, 'W' if f < -2.2 else ('C' if f < 0.2 else ('B' if f < 2.4 else 'b')))
    c.outline('k')
    return c.rows()


sprite('item.shard', 'item')(_icon_shard)


def _icon_rune():
    c = Cv(18, 18)
    c.celsphere(8.5, 8.5, 8.4, 8.4, ['y', 'Y', 'c'], lo=0.32, hi=0.72)
    c.rect(8, 2, 9, 14, 'm')                 # 새긴 인장 — 어두워야 보인다
    c.rect(2, 8, 15, 9, 'm')
    for d in range(-4, 5):
        c.put(8 + d, 8 + d, 'm')
    c.rect(4, 3, 5, 4, 'c')
    c.outline('k')
    return c.rows()


sprite('item.rune', 'item')(_icon_rune)


def _icon_aura():
    c = Cv(20, 20)
    for a in range(0, 360, 3):
        rad = math.radians(a)
        for rr, ch in ((6.2, 'O'), (7.4, 'o'), (8.6, 'd')):
            c.put(9.5 + math.cos(rad) * rr, 9.5 + math.sin(rad) * rr * 0.94, ch)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        for t in range(2):
            c.put(9.5 + math.cos(rad) * (9.4 + t), 9.5 + math.sin(rad) * (9 + t), 'o' if t == 0 else 'd')
    c.celsphere(9.5, 9.5, 3.0, 3.0, ['d', 'o', 'O'], lo=0.32, hi=0.7)
    c.outline('k')
    return c.rows()


sprite('item.aura', 'item')(_icon_aura)


def _icon_zap():
    c = Cv(16, 20)
    pts = [(10, 0), (5, 9), (9, 9), (4, 19), (12, 7), (8, 7), (12, 0)]
    for i in range(len(pts) - 1):
        c.line(*pts[i], *pts[i + 1], 'C')
    for y in range(20):
        xs = [x for x in range(16) if c.get(x, y) == 'C']
        if len(xs) >= 2:
            for x in range(min(xs), max(xs) + 1):
                c.put(x, y, 'B')
        for x in xs[:2]:
            c.put(x, y, 'W')
    c.outline('k')
    return c.rows()


sprite('item.zap', 'item')(_icon_zap)


def _icon_brand():
    c = Cv(16, 20)
    c.celtaper(7.5, 10, 19, 1.8, 1.4, ['m', 'M', 'n'])
    c.rect(4, 10, 11, 11, 'M')
    c.rect(4, 10, 11, 10, 'n')
    for y in range(0, 11):
        t = 1 - y / 10
        half = 4.6 * math.sin(t * 2.1) ** 0.7 if t > 0 else 0
        for x in range(int(round(7.5 - half)), int(round(7.5 + half)) + 1):
            nx = (x + 0.5 - 7.5) / max(1.0, half)
            ch = 'o' if nx < 0.45 else 'd'
            if abs(nx) < 0.4 and y > 4:
                ch = 'O'
            c.put(x, y, ch)
    c.outline('k')
    return c.rows()


sprite('item.brand', 'item')(_icon_brand)


def _icon_might():
    c = Cv(18, 18)
    c.celsphere(8.5, 9.0, 8.4, 8.4, ['v', 'V', 'X'], lo=0.32, hi=0.72)
    c.rect(4, 4, 5, 5, 'W')
    c.put(12, 12, 'X')
    c.put(6, 13, 'X')
    c.outline('k')
    return c.rows()


sprite('item.might', 'item')(_icon_might)


def _icon_swift():
    c = Cv(18, 20)
    for t in range(120):
        u = t / 119
        x = 4 + u * 10
        y = 18 - u * 16
        wdt = 5.0 * math.sin(u * math.pi) ** 0.75
        for j in range(int(wdt) + 1):
            c.put(x - j * 0.9, y - j * 0.45, 'W' if j < wdt * 0.5 else 'w')
            c.put(x + j * 0.55, y + j * 0.35, 'w' if j < wdt * 0.45 else 'a')
    for t in range(20):
        u = t / 19
        c.put(4 + u * 11, 18 - u * 17, 'a')
    c.outline('k')
    return c.rows()


sprite('item.swift', 'item')(_icon_swift)


def _icon_focus():
    c = Cv(16, 20)
    c.rect(2, 0, 13, 2, 'M')
    c.rect(2, 0, 13, 0, 'n')
    c.rect(2, 17, 13, 19, 'M')
    c.rect(2, 17, 13, 17, 'n')
    for y in range(3, 17):
        t = abs(y - 10.0) / 7.0
        half = 1.2 + t * 4.8
        for x in range(int(round(7.5 - half)), int(round(7.5 + half)) + 1):
            c.put(x, y, 'W' if abs(x - 7.5) > half - 1.4 else 'k')
    for y in range(4, 10):
        half = abs(y - 10.0) / 7.0 * 4.6
        c.rect(7.5 - half, y, 7.5 + half, y, 'Y')
    for y in range(13, 17):
        half = abs(y - 10.0) / 7.0 * 4.2
        c.rect(7.5 - half, y, 7.5 + half, y, 'Y')
    c.rect(7, 10, 7, 12, 'c')
    c.outline('k')
    return c.rows()


sprite('item.focus', 'item')(_icon_focus)


def _icon_area():
    c = Cv(20, 18)
    c.celsphere(9.5, 8.5, 9.4, 8.4, ['b', 'B', 'C'], lo=0.32, hi=0.72)
    c.celsphere(9.5, 8.5, 5.0, 4.0, ['.', '.', '.'])
    c.rect(4, 3, 5, 4, 'W')
    c.outline('k')
    return c.rows()


sprite('item.area', 'item')(_icon_area)


def _icon_wisdom():
    """지혜의 서 — 펼친 책. 가운데가 V로 파여야 책으로 읽힌다."""
    c = Cv(20, 16)
    c.rect(1, 9, 18, 14, 'v')                    # 표지
    c.rect(1, 9, 18, 9, 'V')
    for side in (-1, 1):                          # 두 쪽
        for j in range(8):
            x = 9.5 + side * (1.2 + j)
            top = 3 + j * 0.7
            for y in range(int(top), 13):
                c.put(x, y, 'W' if side < 0 else 'w')
            c.put(x, int(top), 'W')
    c.rect(9, 3, 10, 13, 'V')                     # 책등
    for y, x0, x1 in ((7, 4, 7), (9, 3, 7), (7, 12, 15), (9, 12, 16)):
        c.rect(x0, y, x1, y, 'a')
    c.outline('k')
    return c.rows()


sprite('item.wisdom', 'item')(_icon_wisdom)


if __name__ == '__main__':
    pick = sys.argv[1] if len(sys.argv) > 1 else ''
    items = []
    for name, (pal, fn, art) in SPR.items():
        if pick and not name.startswith(pick):
            continue
        rows = fn()
        items.append((name, PAL[pal], rows, art))
        print(f'{name}: {len(rows[0])}x{len(rows)}')
    render(items, 'gen2.png', zoom=8, cols=6, bg=(22, 18, 30))
