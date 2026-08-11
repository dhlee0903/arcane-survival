"""리스크 오브 레인 2 · 먼 곳의 횃대 스프라이트 — 엔터 더 건전 계열 규칙으로 찍는다.

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


# ============================ 코만도(주인공) ============================
# RoR2 코만도 — 짙은 남색 코트, 목에 두른 천, 양손 권총. 2등신으로 줄였다.
PAL['commando'] = {
    'k': K,
    'd': '#7a5610', 'm': '#e8b220', 'l': '#ffdc5c',       # 노란 우주복
    'D': '#4a3205',                                       # 접지 그늘
    'r': '#c9a83a', 'R': '#ffe98a', 'p': '#fffbe0',       # 헬멧 — 통째로 노란 유리
    'x': '#b5764a', 's': '#e8a877', 'S': '#ffd2a8',       # 살갗
    'a': '#2a2f3d', 'w': '#5b6478', 'W': '#9aa4b8',       # 총 · 장비
    'q': '#8a6410', 'Q': '#b58a26',                       # 유리 너머로 비치는 머리
    'c': '#a8791a', 'C': '#ffd23f',
}
CCOAT = ['d', 'm', 'l']
CSKIN = ['x', 's', 'S']
CGEAR = ['a', 'w', 'W']


def _commando(pose):
    """노란 우주 헬멧(머리 전체를 덮는다)에 주황 우주복. 원작처럼 **쌍권총**을 든다."""
    c = Cv(32, 32)
    cx = 13.5
    step = {'stand': 0, 'stepA': 1, 'stepB': -1}[pose]

    # 다리
    for side, lead in ((-1, step > 0), (1, step < 0)):
        lx = cx + side * 2.8 + (side * 1.4 if lead else 0)
        c.rect(lx - 1.8, 26, lx + 1.8, 29, 'd')
        c.rect(lx - 2.2, 30, lx + 2.2, 31, 'D')
    # 몸통 — 가슴에서 **허리로 좁아졌다가** 골반에서 다시 벌어진다.
    # 한 번에 벌어지는 통 하나로 그리면 허리가 없어 자루처럼 보인다.
    # 허리는 **권총보다 아래**에 둔다 — 총 높이에 두면 총에 가려 라인이 안 보인다.
    bx = cx + step * 0.6
    # art:2라 화면에서는 절반 크기다. 잘록한 정도가 1도트면 반 픽셀이라 사라진다 —
    # 좌우로 2도트씩은 들어가야 게임 크기에서 허리로 읽힌다.
    c.celtaper(bx, 16, 22, 6.4, 4.4, CCOAT, curve=0.9)   # 가슴 → 허리
    c.celtaper(bx, 23, 28, 5.4, 7.0, CCOAT, curve=0.8)   # 골반 → 아래
    c.rect(bx - 4.6, 22, bx + 4.6, 23, 'a')              # 허리 벨트
    c.rect(cx - 2, 17, cx + 2, 19, 'a')                  # 가슴 장비
    c.rect(cx - 2, 17, cx + 2, 17, 'w')
    # 쌍권총 — 양손에 하나씩. 앞쪽 총이 조금 앞으로 나간다
    for side, fwd in ((-1, 0), (1, 3)):
        gx = cx + side * 6.6 + fwd
        gy = 20.0 - (1 if side > 0 else 0)
        c.celsphere(gx, gy + 1.6, 2.2, 2.0, CSKIN)       # 손
        c.rect(gx - 0.6, gy - 1.4, gx + 4.4, gy + 0.4, 'w')   # 총열
        c.rect(gx - 0.6, gy - 1.4, gx + 4.4, gy - 1.4, 'W')
        c.rect(gx + 4.4, gy - 1.8, gx + 5.4, gy + 0.8, 'a')   # 총구
        c.rect(gx - 1.6, gy - 1.4, gx - 0.6, gy + 2.2, 'a')   # 손잡이
    # 헬멧 — 껍데기에 창을 낸 게 아니라 **통째로 유리인 어항**이다.
    # 속은 비운다(비치는 것 없음). 테두리 한 줄과 왼쪽 위 반사만으로 유리를 읽힌다.
    c.celsphere(cx, 9.0, 8.0, 8.0, ['p', 'p', 'p'])                     # 유리 테두리 반사
    c.celsphere(cx, 9.2, 7.0, 7.0, ['r', 'R', 'p'], lo=0.30, hi=0.74)   # 유리 본체
    c.rect(cx - 4.4, 4.8, cx - 1.8, 5.6, 'p')            # 유리 반사 — 왼쪽 위
    c.rect(cx - 5.4, 6.4, cx - 4.0, 7.0, 'p')
    c.rect(cx - 7, 15.5, cx + 7, 16.5, 'D')              # 목 링(어항이 우주복에 물리는 자리)
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows(trim=False)


for _n, _p in (('commando.stand', 'stand'), ('commando.stepA', 'stepA'), ('commando.stepB', 'stepB')):
    sprite(_n, 'commando')(lambda p=_p: _commando(p))


# ============================ 레무리안 ============================
# 두 발로 서는 작은 주황 도마뱀. 물어뜯고 불덩이를 뱉는다.
PAL['lemurian'] = {
    'k': K, 'D': '#2c0f4a', 'd': '#5a2199', 'm': '#8b45d6', 'l': '#c08cff',
    'b': '#f4e4c8', 'B': '#cbb9a0', 'e': '#160c08', 'q': '#ffd23f', 'Q': '#fff6c0',
}
LEM = ['d', 'm', 'l']


def _lemurian(step):
    """날씬한 2족 도마뱀. 배는 희고 꼬리는 길다."""
    c = Cv(30, 26)
    cx = 15.0
    lean = 1 if step else 0
    # 꼬리 — 뒤로 길게 뻗어 살짝 처진다
    for i in range(14):
        t = i / 13
        x = cx - 5 - i
        y = 18 - int(t * 2) + int(t * t * 6) + lean
        c.put(x, y, 'm' if i < 7 else 'd')
        c.put(x, y + 1, 'd' if i < 9 else 'D')
    # 다리 — 무릎이 뒤로 꺾인 새 다리
    for side, ahead in ((-1, step), (1, 1 - step)):
        lx = cx + side * 2.0
        c.rect(lx - 1.2, 18, lx + 1.2, 20 - ahead, 'm')
        c.rect(lx - 1.2, 21 - ahead, lx + 1.2, 23 - ahead, 'd')
        c.rect(lx - 1.8, 24 - ahead, lx + 2.2, 25 - ahead, 'D')
    # 몸통 — 앞으로 기운 날씬한 통. 배가 희다
    c.celtaper(cx, 9, 19, 3.6, 4.4, LEM, curve=0.9)
    for y in range(11, 19):                              # 흰 배
        c.rect(cx + 1, y, cx + 3.4, y, 'b')
        c.put(cx + 3.4, y, 'B')
    # 목과 머리 — 주둥이가 짧고 갸름하다
    c.celtaper(cx + 2.5, 6, 10, 2.2, 3.0, LEM)
    c.celsphere(cx + 3.6, 5.0, 4.2, 3.4, LEM)
    c.rect(cx + 6, 5.4, cx + 8.4, 6.6, 'm')              # 짧은 주둥이
    c.rect(cx + 6, 5.4, cx + 8.4, 5.4, 'l')
    c.rect(cx + 6, 7.0, cx + 8.2, 7.0, 'b')              # 아래턱
    c.eyes([(cx + 3.4, 3.6)], 'e', 'q', w=2, h=2)
    for i in range(4):                                   # 등지느러미
        c.put(cx - 0.6 - i * 0.4, 8 + i * 1.6, 'd')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('lemurian.0', 'lemurian')(lambda: _lemurian(0))
sprite('lemurian.1', 'lemurian')(lambda: _lemurian(1))


# ============================ 레서 위습 ============================
# 쇠 테두리 안에서 타는 푸른 불꽃. 떠다니며 불덩이를 쏜다.
PAL['wisp'] = {
    'k': K, 'D': '#2a0604', 'd': '#5c0f08', 'm': '#a01a10', 'l': '#e0401c',
    'o': '#ff7a1a', 'y': '#ffc93f', 'w': '#fff2b8',
    'e': '#0a0402', 'q': '#ffd23f', 'Q': '#fff6c0',
}


def _wisp(ph):
    """레서 위습 — 둥글게 뭉친 불덩이. 위로만 혀가 솟고 아래로는 늘어지지 않는다."""
    import math as _m
    c = Cv(24, 24)
    cx, cy = 11.5, 14.5
    # 불덩이 — 아래는 둥글게 닫고 위로만 불꽃이 솟는다
    for y in range(0, 23):
        if y >= 7:
            t = (y - 7) / 15
            half = 8.0 * _m.sqrt(max(0.0, 1 - (t * 1.06 - 0.32) ** 2 / 0.62))
            wob = 0
        else:
            t = 1 - y / 7
            half = 5.2 * _m.sin((1 - t) * 1.9) ** 0.7
            wob = _m.sin(y * 0.8 + ph * 1.7) * 1.5 * t
        for x in range(int(round(cx + wob - half)), int(round(cx + wob + half)) + 1):
            d = abs((x + 0.5 - cx - wob) / max(1.0, half))
            ch = 'm' if d > 0.74 else ('o' if d > 0.44 else 'y')
            if d < 0.24 and y > 9:
                ch = 'w'
            c.put(x, y, ch)
    # 심지 — 가운데가 검붉게 뭉쳐 있다
    c.celsphere(cx, cy, 4.8, 4.8, ['D', 'd', 'm'], lo=0.30, hi=0.70)
    c.eyes([(cx - 3.8, cy - 2), (cx + 1.4, cy - 2)], 'o', 'w', w=3, h=3)
    c.outline('k')
    return c.rows()


sprite('wisp.0', 'wisp')(lambda: _wisp(0))
sprite('wisp.1', 'wisp')(lambda: _wisp(1))


# ============================ 해파리 ============================
# 둥실 떠다니다 몸을 부풀려 터진다. 촉수가 파랗게 빛난다.
PAL['jelly'] = {
    'k': K, 'D': '#0d3a5c', 'd': '#1f7fb8', 'm': '#4fc4e8', 'l': '#b8f0ff',
    'q': '#a8f4ff', 'Q': '#ffffff', 'e': '#0a2038',
}


def _jelly(ph):
    c = Cv(24, 26)
    cx = 11.5
    # 촉수 — 갓 아래로 흔들린다
    for i, tx in enumerate((-6, -2, 2, 6)):
        for t in range(7):
            x = cx + tx + math.sin((t + ph * 2) * 0.9 + i) * 1.6
            c.put(x, 14 + t, 'd' if t < 4 else 'q')
    # 갓 — 위가 부풀고 아래가 열린 종 모양
    c.celsphere(cx, 10.0, 10.4, 9.0, ['d', 'm', 'l'], lo=0.30, hi=0.72,
                clip=lambda x, y: y <= 13)
    c.rect(cx - 10, 13, cx + 10, 14, 'd')
    # 속에서 빛나는 핵
    c.celsphere(cx, 9.0, 3.4 + ph * 0.6, 3.0 + ph * 0.6, ['q', 'q', 'Q'])
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('jellyfish.0', 'jelly')(lambda: _jelly(0))
sprite('jellyfish.1', 'jelly')(lambda: _jelly(1))


# ============================ 비틀 ============================
# 납작한 등껍질을 이고 달려드는 벌레. 먼 곳의 횃대에 흔하다.
PAL['beetle'] = {
    'k': K, 'D': '#2a1c10', 'd': '#5c3d1c', 'm': '#96692e', 'l': '#c99a55',
    'e': '#160c08', 'q': '#ff8a1a', 'Q': '#ffd23f', 'a': '#3a2a18',
}


def _beetle(step):
    c = Cv(26, 20)
    cx, cy = 12.5, 11.0
    # 다리 — 여섯. 걸음마다 각도가 바뀐다
    for side in (-1, 1):
        for i, lx in enumerate((-5, 0, 5)):
            sw = 1 if (i % 2 == 0) == bool(step) else 0
            c.line(cx + lx, cy + 3, cx + lx + side * 4, cy + 6 + sw, 'a')
            c.put(cx + lx + side * 4, cy + 7 + sw, 'a')
    # 등껍질
    c.celsphere(cx, cy, 11.0, 7.4, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    c.rect(cx, cy - 7, cx, cy + 6, 'D')              # 등 가운데 이음선
    for dx in (-6, 6):                               # 껍질 무늬
        c.rect(cx + dx, cy - 4, cx + dx, cy + 3, 'd')
    # 머리 — 앞쪽에 붙은 작은 덩어리
    c.celsphere(cx + 9.5, cy + 1.0, 4.0, 3.4, ['d', 'm', 'l'])
    c.eyes([(cx + 9, cy - 1)], 'e', 'q', w=3, h=2)
    c.put(cx + 9, cy - 1, 'Q')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('beetle.0', 'beetle')(lambda: _beetle(0))
sprite('beetle.1', 'beetle')(lambda: _beetle(1))


# ============================ 비틀 가드(엘리트) ============================
PAL['guard'] = {
    'k': K, 'D': '#241a12', 'd': '#4a3a24', 'm': '#7d6640', 'l': '#b39a68',
    'i': '#2f3742', 'I': '#6b7789', 'e': '#160c08', 'q': '#ff8a1a', 'Q': '#ffd23f',
}
GD = ['d', 'm', 'l']


def _guard(step):
    c = Cv(38, 32)
    cx, cy = 19.0, 15.0
    # 네 다리 — 굵고 짧게
    for side in (-1, 1):
        for i, lx in enumerate((-7, 4)):
            sw = 1 if (i == 0) == bool(step) else 0
            c.celtaper(cx + lx + side * 9, cy + 6, cy + 14 - sw, 2.2, 1.8, GD)
            c.rect(cx + lx + side * 9 - 3, cy + 15 - sw, cx + lx + side * 9 + 3, cy + 16 - sw, 'D')
    # 몸통 — 두꺼운 갑각
    c.celsphere(cx, cy, 14.0, 9.4, GD, lo=0.32, hi=0.70)
    c.rect(cx, cy - 9, cx, cy + 8, 'D')
    for dx in (-8, 8):
        c.rect(cx + dx, cy - 6, cx + dx, cy + 5, 'd')
    # 어깨 갑판
    for side in (-1, 1):
        c.celsphere(cx + side * 10, cy - 6.0, 5.4, 3.4, ['i', 'I', 'I'])
    # 머리
    c.celsphere(cx + 12.5, cy + 2.0, 5.4, 4.4, GD)
    c.eyes([(cx + 11, cy)], 'e', 'q', w=4, h=3)
    c.put(cx + 11, cy, 'Q')
    for i in range(3):                               # 뿔
        c.put(cx + 16 + i, cy - 3 - i, 'I')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('guard.0', 'guard')(lambda: _guard(0))
sprite('guard.1', 'guard')(lambda: _guard(1))


# ============================ 스톤 타이탄(보스) ============================
PAL['titan'] = {
    'k': K, 'D': '#1a2028', 'd': '#3b4553', 'm': '#63707f', 'l': '#98a6b4',
    'g': '#2f6b4a', 'G': '#4fa870',
    'q': '#2f9fe8', 'Q': '#c8f0ff', 'w': '#ffffff',
}
TT = ['d', 'm', 'l']


def _titan(step):
    c = Cv(46, 48)
    cx = 23.0
    sway = 0.8 if step else -0.8
    # 다리
    for side in (-1, 1):
        lead = 1.0 if (side > 0) == bool(step) else 0.0
        c.celtaper(cx + side * 7.0, 34, 47 - lead, 5.4, 4.6, TT)
    # 팔 — 몸통 옆으로 늘어뜨린 바위 기둥
    for side in (-1, 1):
        ax = cx + side * 17.0
        c.celsphere(ax, 22.0 + side * sway, 5.4, 9.0, TT)
        c.celsphere(ax + side * 0.8, 32.0 + side * sway, 6.0, 5.0, TT)
    # 몸통
    c.celtaper(cx + sway * 0.5, 12, 36, 13.0, 9.0, TT, curve=0.85)
    for side in (-1, 1):                             # 어깨
        c.celsphere(cx + side * 12.0, 14.0 + side * sway, 7.0, 5.4, TT)
    # 머리 — 눈이 하나. 레이저를 쏜다
    c.celsphere(cx, 6.0, 7.4, 6.4, TT)
    c.celsphere(cx, 6.2, 4.0, 3.2, ['q', 'q', 'Q'])
    c.celsphere(cx - 0.6, 5.6, 1.8, 1.4, ['w', 'w', 'w'])
    c.rect(cx - 6, 12, cx + 6, 12, 'D')
    # 이끼 — 윗면에만
    for mx, my, rx, ry in ((cx - 12, 11.0, 4.6, 2.0), (cx + 11, 10.6, 4.0, 1.8),
                           (cx - 2, 0.6, 4.0, 1.6)):
        c.celsphere(mx, my, rx, ry, ['g', 'G', 'G'], clip=lambda x, y: c.get(x, y) in 'ml')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('titan.0', 'titan')(lambda: _titan(0))
sprite('titan.1', 'titan')(lambda: _titan(1))


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
PAL['barrel'] = {'k': K, 'D': '#3a1e0a', 'd': '#6b3d16', 'm': '#9c6028', 'l': '#c98f52'}


def _barrel():
    """갈색 작은 항아리 — 배가 부르고 목이 좁은 흔한 모양. 부수면 안에 든 게 나온다."""
    c = Cv(18, 20)
    cx = 8.5
    c.celsphere(cx, 12.0, 7.6, 6.8, ['d', 'm', 'l'], lo=0.32, hi=0.74)   # 배
    c.celtaper(cx, 5, 9, 3.6, 5.6, ['d', 'm', 'l'])                      # 목
    c.celsphere(cx, 4.0, 5.0, 1.8, ['d', 'm', 'l'], lo=0.28, hi=0.68)    # 아가리 테
    c.celsphere(cx, 3.6, 3.2, 1.0, ['k', 'k', 'k'])                      # 뚫린 속
    c.rect(4, 6, 13, 6, 'D')
    for x in range(1, 17):                                               # 굽는 자국
        if c.get(x, 13) in 'ml':
            c.put(x, 13, 'd')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


sprite('barrel', 'barrel')(_barrel)


PAL['chest'] = {'k': K, 'D': '#2e1a06', 'd': '#5f380f', 'm': '#9c6026', 'l': '#d99a5a',
                'i': '#2f3742', 'I': '#7d8b9e', 'c': '#a8791a', 'C': '#ffd23f', 'Y': '#fff2b8',
                'g': '#14561f', 'G': '#2f8f3a', 'j': '#5fc46a',
                'r': '#5c0f18', 'R': '#a8202f', 'p': '#e0505f'}


def _chest(tier='common', open_=False):
    """상자 — 등급마다 나무결과 장식이 다르다. 일반은 나무, 레어는 초록 칠에 놋쇠,
    전설은 붉은 옻칠에 금장. 바닥에 고정이고 열리면 뚜껑이 젖혀진다."""
    body = {'common': ('d', 'm', 'l'), 'rare': ('g', 'G', 'j'), 'legend': ('r', 'R', 'p')}[tier]
    trim = {'common': ('I', 'i'), 'rare': ('c', 'C'), 'legend': ('C', 'c')}[tier]
    c = Cv(22, 20)
    if open_:
        c.celtaper(11.0, 1, 5, 8.6, 9.6, body)
        c.rect(1, 6, 20, 6, 'D')
        c.celtaper(11.0, 8, 18, 9.8, 9.2, body)
        c.rect(2, 9, 19, 11, 'C')
        c.rect(2, 9, 19, 9, 'Y')
    else:
        c.celsphere(11.0, 9.0, 9.6, 7.0, body, lo=0.32, hi=0.74, clip=lambda x, y: y <= 9)
        c.rect(1, 10, 20, 10, 'D')
        c.celtaper(11.0, 11, 18, 9.8, 9.2, body)
        c.rect(10, 8, 12, 14, trim[0])                 # 자물쇠
        c.rect(10, 8, 10, 14, trim[1])
        c.rect(10, 8, 12, 8, trim[1])
        c.put(11, 11, 'k')
    for bx in (4, 16):                                 # 띠
        for y in range(1, 19):
            if c.get(bx, y) in body:
                c.put(bx, y, trim[1])
            if c.get(bx + 1, y) in body:
                c.put(bx + 1, y, trim[0])
    if tier == 'legend':                               # 전설 — 뚜껑에 박은 보석
        c.put(11, 4, 'Y')
        c.put(10, 5, 'C')
        c.put(12, 5, 'C')
    c.ao('D', 'dm')
    c.outline('k')
    return c.rows()


for _t in ('common', 'rare', 'legend'):
    sprite(f'chest.{_t}', 'chest')(lambda t=_t: _chest(t))
    sprite(f'chest.{_t}.open', 'chest')(lambda t=_t: _chest(t, True))


# ============================ 배경 장식 ============================
PAL['rock'] = {'k': K, 'D': '#1b2427', 'd': '#3a484c', 'm': '#5f7276', 'l': '#91a4a6',
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
PAL['arcane'] = {'k': K, 'd': '#a8791a', 'm': '#ffb03a', 'l': '#ffe07a', 'w': '#ffffff'}
PAL['bulletBlue'] = {'k': K, 'd': '#1f4e9c', 'm': '#3f8ae8', 'l': '#a8dcff', 'w': '#ffffff'}
PAL['bulletOrange'] = {'k': K, 'd': '#a83a00', 'm': '#ff7a1a', 'l': '#ffc93f', 'w': '#fff2b8'}


def _bullet(step):
    """더블 탭 탄 — 총알처럼 길쭉한 예광탄. 뒤로 꼬리가 끌린다."""
    c = Cv(14, 6)
    c.rect(8, 2, 12, 3, 'l')                  # 탄자
    c.rect(11, 2, 12, 3, 'w')
    c.rect(8, 2, 9, 2, 'w')
    for i in range(7 - step):                 # 예광 꼬리
        c.put(7 - i, 2 + (i % 2) * 0, 'm' if i < 3 else 'd')
        c.put(7 - i, 3, 'd' if i < 4 else 'd')
    c.outline('k')
    return c.rows()


sprite('bullet.0', 'arcane')(lambda: _bullet(0))
sprite('bullet.1', 'arcane')(lambda: _bullet(1))
sprite('bullet.orange', 'bulletOrange')(lambda: _bullet(0))




# ---- 적이 쏘는 것 · 수류탄 · 미사일 ----
PAL['ember'] = {'k': K, 'd': '#8a2a00', 'm': '#ff6a1a', 'l': '#ffc93f', 'w': '#fff2b8'}


def _ember():
    """레서 위습의 불덩이 — 적탄은 주황으로 통일해 아군 탄과 갈라 둔다."""
    c = Cv(11, 11)
    c.celsphere(5.0, 5.5, 4.6, 4.6, ['d', 'm', 'l'], lo=0.30, hi=0.68)
    c.put(3, 4, 'w')
    for dx, dy in ((5, -5), (-5, 4), (5, 5)):
        c.put(5 + dx, 5 + dy, 'm')
    c.outline('k')
    return c.rows()


sprite('ember', 'ember')(_ember)


def _spit():
    """레무리안이 뱉는 불덩이 — 앞이 뾰족하다."""
    c = Cv(14, 9)
    for x in range(13):
        half = min(x * 0.55, (13 - x) * 0.9, 3.6)
        if half < 0.4:
            continue
        for y in range(int(round(4 - half)), int(round(4 + half)) + 1):
            c.put(x, y, 'l' if y < 4 else ('m' if y < 6 else 'd'))
    c.put(11, 4, 'w')
    c.outline('k')
    return c.rows()


sprite('spit', 'ember')(_spit)


PAL['missile'] = {'k': K, 'd': '#2a3040', 'm': '#6b7789', 'l': '#dbe4f2',
                  'r': '#a82a00', 'o': '#ff7a1a', 'y': '#ffd23f'}


def _missile():
    """AtG 미사일 — 앞이 붉고 뒤로 화염이 뻗는다."""
    c = Cv(15, 8)
    c.rect(5, 3, 11, 5, 'm')
    c.rect(5, 3, 11, 3, 'l')
    c.rect(11, 3, 13, 5, 'r')                 # 탄두
    c.put(13, 4, 'o')
    c.rect(4, 2, 6, 2, 'd')                   # 날개
    c.rect(4, 6, 6, 6, 'd')
    for i in range(4):                        # 배기 화염
        c.put(4 - i, 4, 'y' if i < 2 else 'o')
    c.outline('k')
    return c.rows()


sprite('missile', 'missile')(_missile)


PAL['grenade'] = {'k': K, 'd': '#14400f', 'm': '#2f6b28', 'l': '#5aa84a',
                  'a': '#2a3040', 'w': '#8d99ad', 'y': '#ffd23f'}


def _grenade():
    c = Cv(11, 12)
    c.celsphere(5.0, 7.0, 4.6, 4.6, ['d', 'm', 'l'], lo=0.32, hi=0.72)
    c.rect(0, 5, 9, 5, 'd')
    c.rect(0, 9, 9, 9, 'd')
    c.rect(3, 1, 6, 3, 'a')                   # 뇌관
    c.rect(3, 1, 6, 1, 'w')
    c.put(7, 1, 'y')
    c.outline('k')
    return c.rows()


sprite('grenade', 'grenade')(_grenade)


PAL['frost'] = {'k': K, 'd': '#123f8c', 'm': '#3f8ae8', 'l': '#a8dcff', 'w': '#ffffff'}


def _shard():
    """위상조정탄 — 파랗고 길다. 궤적은 렌더러가 따로 그린다."""
    c = Cv(28, 7)
    c.rect(14, 2, 25, 4, 'm')
    c.rect(14, 2, 25, 2, 'l')
    c.rect(23, 2, 26, 4, 'w')
    c.put(27, 3, 'w')
    for i in range(14):
        c.put(13 - i, 3, 'l' if i < 4 else ('m' if i < 8 else 'd'))
    c.outline('k')
    return c.rows()


sprite('phase', 'frost')(_shard)


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
PAL['ground'] = {'a': '#2b3a3c', 'b': '#334345', 'c': '#3c4e4f', 'd': '#222e30', 'e': '#48605c'}
PAL['moss'] = {'a': '#293a33', 'b': '#2f4238', 'c': '#374d3f', 'd': '#212f2a', 'e': '#436049'}
PAL['path'] = {'a': '#2f3a38', 'b': '#374340', 'c': '#3f4d49', 'd': '#26302f', 'e': '#4a5a54',
               'g': '#2b3a3c', 'G': '#334345', 'h': '#222e30'}


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


# ============================ 스킬 · 아이템 아이콘 ============================
# HUD 칸(11도트)에 나란히 서므로 규격을 맞춘다. 형태는 굵게, 색은 세 단.
PAL['item'] = {
    'k': K,
    'r': '#8e1230', 'R': '#e8394f', 'p': '#ff9eb0',
    'g': '#146b32', 'G': '#33b558', 'j': '#7fe89b',
    'b': '#1f4e9c', 'B': '#3f8ae8', 'C': '#a8dcff',
    'y': '#a8791a', 'Y': '#ffd23f', 'c': '#fff2b8',
    'd': '#a82a00', 'o': '#ff7a1a', 'O': '#ffd23f',
    'a': '#2a3040', 'w': '#6b7789', 'W': '#dbe4f2',
    'm': '#4d3010', 'M': '#96683a', 'n': '#c19a6b',
    'v': '#4a2ba8', 'V': '#8a5cf0', 'X': '#d9c8ff',
    'q': '#1f8ad4', 'Q': '#7fe2ff',
}


def _skill_tap():
    """더블 탭 — 코만도의 기본 권총."""
    c = Cv(20, 16)
    c.rect(3, 5, 15, 8, 'w')                      # 총열 · 몸통
    c.rect(3, 5, 15, 5, 'W')
    c.rect(3, 9, 8, 13, 'a')                      # 손잡이
    c.rect(4, 9, 5, 13, 'w')
    c.rect(15, 6, 17, 7, 'a')                     # 총구
    c.rect(9, 9, 11, 10, 'a')                     # 방아쇠울
    c.put(17, 6, 'Y')
    c.outline('k')
    return c.rows()


sprite('skill.tap', 'item')(_skill_tap)


def _skill_phase():
    """페이즈 라운드 — 벽을 뚫고 나가는 관통탄."""
    c = Cv(20, 14)
    for x in range(4, 18):                        # 탄자
        t = (x - 4) / 13
        half = 3.4 * (1 - t * 0.5)
        for y in range(int(round(7 - half)), int(round(7 + half)) + 1):
            c.put(x, y, 'C' if y < 7 else 'B')
    c.rect(16, 5, 18, 8, 'W')                     # 뾰족한 끝
    c.rect(17, 6, 19, 7, 'W')
    for i in range(4):                            # 뒤로 끌리는 잔상
        c.rect(0 + i, 6 + (i % 2), 3, 7 + (i % 2), 'b')
    c.outline('k')
    return c.rows()


sprite('skill.phase', 'item')(_skill_phase)


def _skill_frag():
    """파편 수류탄 — 발밑에 굴려 터뜨린다."""
    c = Cv(16, 18)
    c.celsphere(7.5, 11.0, 6.0, 6.4, ['g', 'G', 'j'], lo=0.32, hi=0.72)
    for y in (7, 10, 13):                         # 파인 홈
        c.rect(2, y, 13, y, 'g')
    c.rect(5, 3, 9, 5, 'a')                       # 뇌관
    c.rect(5, 3, 9, 3, 'w')
    c.rect(9, 1, 13, 2, 'w')                      # 안전핀 고리
    c.rect(12, 1, 13, 4, 'w')
    c.outline('k')
    return c.rows()


sprite('skill.frag', 'item')(_skill_frag)


def _skill_suppress():
    """제압 사격 — 한 방향으로 퍼붓는 탄막."""
    c = Cv(20, 16)
    c.rect(1, 5, 9, 9, 'a')                   # 총몸
    c.rect(1, 5, 9, 5, 'w')
    c.rect(2, 10, 5, 13, 'a')                 # 손잡이
    c.rect(9, 6, 12, 8, 'w')                  # 총열
    c.rect(4, 3, 8, 5, 'w')                   # 탄창
    for i, y in enumerate((4, 7, 10)):        # 뿜어 나가는 탄
        for j in range(3):
            c.put(13 + j * 2, y, 'Y' if j == 0 else 'y')
    c.outline('k')
    return c.rows()


sprite('skill.suppress', 'item')(_skill_suppress)


def _skill_dive():
    """택티컬 다이브 — 구르는 자세와 먼지."""
    c = Cv(20, 16)
    c.celsphere(9.0, 8.0, 5.6, 5.6, ['b', 'B', 'C'], lo=0.32, hi=0.72)   # 웅크린 몸
    c.rect(5, 4, 9, 6, 'a')                   # 머리 · 고글
    c.rect(6, 5, 8, 5, 'C')
    for i in range(5):                        # 뒤로 이는 먼지
        c.put(17 - i, 11 + (i % 2), 'W' if i < 2 else 'w')
        c.put(16 - i, 13, 'w' if i < 3 else 'a')
    c.rect(2, 12, 12, 13, 'a')
    c.outline('k')
    return c.rows()


sprite('skill.dive', 'item')(_skill_dive)


def _item_bear():
    """곰 인형 — 피해를 통째로 막는다."""
    c = Cv(16, 16)
    for side in (-1, 1):                      # 귀
        c.celsphere(7.5 + side * 5.0, 3.0, 2.8, 2.8, ['m', 'M', 'n'])
    c.celsphere(7.5, 7.5, 6.4, 6.0, ['m', 'M', 'n'], lo=0.32, hi=0.72)
    c.celsphere(7.5, 10.0, 3.0, 2.4, ['n', 'n', 'n'])                     # 주둥이
    c.eyes([(5, 6), (9, 6)], 'k', 'W', w=2, h=2)
    c.rect(7, 9, 8, 10, 'k')
    c.outline('k')
    return c.rows()


sprite('item.bear', 'item')(_item_bear)


def _item_ukulele():
    """우쿨렐레 — 타격 시 번개가 튄다."""
    c = Cv(18, 18)
    c.celsphere(5.5, 12.5, 5.0, 5.0, ['m', 'M', 'n'], lo=0.32, hi=0.72)
    c.celsphere(5.5, 12.0, 1.8, 1.8, ['k', 'k', 'k'])
    for i in range(9):
        c.rect(6 + i * 0.7, 9 - i, 8 + i * 0.7, 10 - i, 'M')
        c.put(6 + i * 0.7, 9 - i, 'n')
    c.rect(12, 0, 15, 2, 'm')
    for i in range(8):
        c.put(7 + i * 0.7, 9.5 - i, 'W')
    for dx, dy, ch in ((14, 5, 'C'), (16, 7, 'C'), (13, 8, 'B'), (16, 10, 'C')):
        c.put(dx, dy, ch)
    c.outline('k')
    return c.rows()


sprite('item.ukulele', 'item')(_item_ukulele)


def _item_atg():
    """AtG 미사일 Mk.1 — 타격 시 유도 미사일."""
    c = Cv(16, 18)
    c.celtaper(7.5, 5, 16, 3.4, 3.4, ['a', 'w', 'W'])   # 탄체
    for i in range(5):                                   # 원뿔 탄두
        c.rect(7.5 - i * 0.7, 4 - i, 7.5 + i * 0.7, 4 - i, 'R' if i < 3 else 'p')
    c.rect(3, 13, 5, 17, 'a')                            # 날개
    c.rect(10, 13, 12, 17, 'a')
    c.rect(6, 8, 9, 10, 'Y')                             # 표식
    c.outline('k')
    return c.rows()


sprite('item.atg', 'item')(_item_atg)


def _item_tooth():
    """몬스터의 이빨 — 처치 시 회복 구슬."""
    c = Cv(14, 16)
    for i in range(11):                                  # 송곳니
        half = 5.0 * (1 - i / 10) ** 0.7
        for x in range(int(round(6.5 - half)), int(round(6.5 + half)) + 1):
            nx = (x - 6.5) / max(1.0, half)
            c.put(x, 14 - i, 'W' if nx < -0.2 else ('w' if nx < 0.5 else 'a'))
    c.rect(2, 13, 11, 15, 'p')                           # 잇몸
    c.rect(2, 13, 11, 13, 'R')
    c.outline('k')
    return c.rows()


sprite('item.tooth', 'item')(_item_tooth)


def _item_steak():
    """들소 스테이크 — 최대 체력."""
    c = Cv(16, 14)
    c.celsphere(7.5, 7.0, 7.0, 6.0, ['r', 'R', 'p'], lo=0.32, hi=0.72)
    c.rect(2, 9, 12, 12, 'W')                     # 붙은 지방
    c.rect(2, 9, 12, 9, 'w')
    c.rect(10, 2, 13, 4, 'W')                     # 뼈
    c.put(4, 4, 'p')
    c.outline('k')
    return c.rows()


sprite('item.steak', 'item')(_item_steak)


def _item_dagger():
    """삼각 단검 — 출혈."""
    c = Cv(16, 18)
    for i in range(11):                           # 삼각 날
        half = 4.0 * (1 - i / 10)
        for x in range(int(round(7.5 - half)), int(round(7.5 + half)) + 1):
            nx = (x - 7.5) / max(1.0, half)
            c.put(x, 2 + i, 'W' if nx < -0.2 else ('w' if nx < 0.5 else 'a'))
    c.rect(4, 13, 11, 14, 'a')                    # 코등이
    c.rect(6, 15, 9, 17, 'm')                     # 손잡이
    c.put(7, 3, 'R')                              # 날 끝에 묻은 피
    c.outline('k')
    return c.rows()


sprite('item.dagger', 'item')(_item_dagger)


def _item_rounds():
    """관통 탄환 — 보스에게 강하다."""
    c = Cv(18, 14)
    for i, x0 in enumerate((1, 7, 13)):
        h = 11 - i
        c.rect(x0, 13 - h, x0 + 3, 12, 'a')       # 탄피
        c.rect(x0, 13 - h, x0, 12, 'w')
        for j in range(3):                        # 탄두
            c.rect(x0 + j * 0.5, 12 - h - 3 + j, x0 + 3 - j * 0.5, 12 - h - 3 + j, 'Y')
    c.outline('k')
    return c.rows()


sprite('item.rounds', 'item')(_item_rounds)


def _item_gas():
    """휘발유 — 처치 시 주변을 태운다."""
    c = Cv(16, 18)
    c.celtaper(7.5, 4, 16, 5.6, 5.6, ['d', 'o', 'O'])
    c.rect(2, 4, 12, 4, 'O')
    c.rect(5, 1, 9, 3, 'a')
    c.rect(5, 1, 9, 1, 'w')
    c.rect(10, 3, 12, 4, 'a')
    c.rect(4, 8, 10, 12, 'k')
    c.rect(5, 9, 9, 11, 'Y')
    c.outline('k')
    return c.rows()


sprite('item.gas', 'item')(_item_gas)


def _item_crowbar():
    """크로우바 — 성한 적에게 더 큰 피해."""
    c = Cv(18, 18)
    for i in range(13):                           # 곧은 몸통
        c.put(3 + i, 14 - i, 'R')
        c.put(4 + i, 14 - i, 'r')
        c.put(3 + i, 13 - i, 'p')
    c.rect(1, 13, 4, 16, 'R')                     # 갈라진 발
    c.rect(1, 13, 2, 14, 'p')
    c.put(2, 16, 'k')
    c.rect(13, 1, 16, 3, 'R')                     # 꺾인 끝
    c.put(16, 1, 'p')
    c.outline('k')
    return c.rows()


sprite('item.crowbar', 'item')(_item_crowbar)


def _item_hoof():
    """폴의 염소 발굽 — 이동 속도."""
    c = Cv(14, 18)
    c.celtaper(7.0, 1, 9, 3.4, 4.6, ['m', 'M', 'n'])      # 털 붙은 다리
    for y in range(3, 9, 2):                              # 털결
        c.rect(3, y, 10, y, 'm')
    c.celtaper(7.0, 9, 16, 5.2, 6.0, ['a', 'w', 'W'])     # 굽
    c.rect(6, 12, 7, 17, 'k')                             # 갈라진 틈
    c.rect(1, 16, 12, 17, 'a')
    c.outline('k')
    return c.rows()


sprite('item.hoof', 'item')(_item_hoof)


def _item_syringe():
    """군인의 주사기 — 공격 속도."""
    c = Cv(18, 18)
    for i in range(9):                            # 몸통
        c.rect(4 + i, 12 - i, 6 + i, 14 - i, 'W')
        c.put(4 + i, 14 - i, 'w')
    c.rect(2, 12, 5, 15, 'a')                     # 밀대
    c.rect(1, 14, 4, 17, 'w')
    for i in range(4):                            # 바늘
        c.put(13 + i, 3 - i, 'W')
    c.rect(7, 9, 9, 11, 'Y')                      # 약액
    c.outline('k')
    return c.rows()


sprite('item.syringe', 'item')(_item_syringe)


def _item_glasses():
    """렌즈 제작자의 안경 — 치명타 확률."""
    c = Cv(20, 12)
    for side in (0, 1):
        x0 = 1 + side * 10
        c.rect(x0, 3, x0 + 7, 9, 'a')             # 테
        c.rect(x0 + 1, 4, x0 + 6, 8, 'C')         # 알
        c.rect(x0 + 1, 4, x0 + 3, 5, 'W')         # 반사
    c.rect(8, 5, 11, 6, 'a')                      # 코 다리
    c.outline('k')
    return c.rows()


sprite('item.glasses', 'item')(_item_glasses)


