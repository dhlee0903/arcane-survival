"""도트 스프라이트 저작 도구 — 형태를 3D처럼 음영 처리해 문자열 픽셀맵으로 뽑는다.

빛은 항상 왼쪽 위(-0.55, -0.72, 0.42)에서 온다. 모든 스프라이트가 같은 광원을
쓰기 때문에 아틀라스 전체가 한 세트처럼 보인다.
"""
import math

LIGHT = (-0.52, -0.74, 0.42)
_n = math.sqrt(sum(c * c for c in LIGHT))
LIGHT = tuple(c / _n for c in LIGHT)


class Cv:
    def __init__(self, w, h, empty='.'):
        self.w, self.h, self.empty = w, h, empty
        self.g = [[empty] * w for _ in range(h)]

    def put(self, x, y, ch):
        if ch is None:
            return
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.g[y][x]
        return self.empty

    # ---- 형태 ----
    def sphere(self, cx, cy, rx, ry, ramp, rim=None, rimramp=None, squash=1.0,
               clip=None, amb=0.18, gamma=1.0, flatten=None):
        """구(공) 음영. ramp는 어두운→밝은 문자 목록."""
        for y in range(self.h):
            for x in range(self.w):
                nx = (x + 0.5 - cx) / rx
                ny = (y + 0.5 - cy) / ry
                d2 = nx * nx + ny * ny
                if d2 > 1.0:
                    continue
                if clip and not clip(x, y):
                    continue
                nz = math.sqrt(max(0.0, 1.0 - d2)) * squash
                ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
                lam = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / ln
                v = max(0.0, lam) * (1 - amb) + amb
                if flatten:
                    v = v * (1 - flatten) + flatten * 0.6
                v = v ** gamma
                ch = ramp[min(len(ramp) - 1, int(v * len(ramp)))]
                if rim is not None and d2 > rim and lam < 0.12:
                    # 반사광 — 그림자 쪽 가장자리를 한 단계 띄운다
                    ch = (rimramp or ramp)[1 if len(ramp) > 2 else 0]
                self.put(x, y, ch)

    # ---- 셀 셰이딩 ----
    # 부드러운 계조(5~6단)는 90년대 에어브러시처럼 보인다. 요즘 도트는 면을 몇 개로
    # 딱 끊어 칠한다 — 밝은 면 / 기본 면 / 그늘 한 단, 경계는 칼같이.
    def celsphere(self, cx, cy, rx, ry, tones, lo=0.34, hi=0.70, clip=None, boost=0.0):
        """tones = [그늘, 기본, 밝음] (필요하면 4번째로 반사광)."""
        for y in range(self.h):
            for x in range(self.w):
                nx = (x + 0.5 - cx) / rx
                ny = (y + 0.5 - cy) / ry
                d2 = nx * nx + ny * ny
                if d2 > 1.0:
                    continue
                if clip and not clip(x, y):
                    continue
                nz = math.sqrt(max(0.0, 1.0 - d2))
                lam = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + boost
                self.put(x, y, tones[2] if lam > hi else (tones[1] if lam > lo else tones[0]))

    def celtaper(self, cx, y0, y1, w0, w1, tones, lo=0.34, hi=0.72, curve=1.0,
                 clipfn=None, boost=0.0):
        """원기둥꼴 몸통을 면 세 개로 끊어 칠한다."""
        for y in range(int(y0), int(y1) + 1):
            t = (y - y0) / max(1e-6, y1 - y0)
            half = w0 + (w1 - w0) * (t ** curve)
            for x in range(int(round(cx - half)), int(round(cx + half)) + 1):
                if clipfn and not clipfn(x, y):
                    continue
                nx = (x + 0.5 - cx) / max(1e-6, half)
                nz = math.sqrt(max(0.0, 1 - min(1.0, nx * nx)))
                lam = nx * LIGHT[0] + nz * LIGHT[2] * 1.15 + boost
                self.put(x, y, tones[2] if lam > hi else (tones[1] if lam > lo else tones[0]))

    def ao(self, dark, of, depth=1):
        """아래쪽 안쪽 가장자리를 한 단 어둡게 — 바닥에 닿은 느낌."""
        for _ in range(depth):
            hit = []
            for y in range(self.h):
                for x in range(self.w):
                    if self.g[y][x] in of and self.get(x, y + 1) in (self.empty, 'k', dark):
                        hit.append((x, y))
            for x, y in hit:
                self.put(x, y, dark)

    def eyes(self, positions, dark, glint, w=2, h=3):
        """큼직한 눈 — 요즘 도트 캐릭터는 눈이 크고 흰 점이 박혀 있다."""
        for ex, ey in positions:
            self.rect(ex, ey, ex + w - 1, ey + h - 1, dark)
            self.put(ex, ey, glint)

    def blob(self, cx, cy, rx, ry, ramp, border='k', amb=0.2, gamma=1.25, grow=1.0):
        """부위마다 어두운 테를 두른 구 — 팔·다리가 몸통에 묻히지 않는다."""
        self.sphere(cx, cy, rx + grow, ry + grow, [border])
        self.sphere(cx, cy, rx, ry, ramp, amb=amb, gamma=gamma)

    def cyl(self, x0, y0, x1, y1, ramp, vert=True, amb=0.2):
        """원기둥(팔·다리·기둥). 축을 따라 좌우로만 음영이 진다."""
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                t = (x - x0) / max(1e-6, (x1 - x0))
                nx = t * 2 - 1
                nz = math.sqrt(max(0.0, 1 - nx * nx))
                lam = nx * LIGHT[0] + nz * LIGHT[2] * 1.1
                v = max(0.0, lam) * (1 - amb) + amb
                self.put(x, y, ramp[min(len(ramp) - 1, int(v * len(ramp)))])

    def taper(self, cx, y0, y1, w0, w1, ramp, edge=None, topglow=0.12, amb=0.16,
              curve=1.0, clipfn=None):
        """위아래 폭이 다른 원기둥 — 몸통·로브·기둥에 쓴다."""
        for y in range(int(y0), int(y1) + 1):
            t = (y - y0) / max(1e-6, y1 - y0)
            half = w0 + (w1 - w0) * (t ** curve)
            for x in range(int(cx - half), int(cx + half) + 1):
                if clipfn and not clipfn(x, y):
                    continue
                nx = (x + 0.5 - cx) / max(1e-6, half)
                nz = math.sqrt(max(0.0, 1 - nx * nx))
                lam = nx * -0.52 + nz * 0.62 + (1 - t) * topglow
                v = max(0.0, min(0.999, lam * 0.92 + amb))
                self.put(x, y, ramp[int(v * len(ramp))])
            if edge:
                self.put(int(cx - half), y, edge)
                self.put(int(cx + half), y, edge)

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                self.put(x, y, ch)

    def blockshade(self, x0, y0, x1, y1, ramp, bevel=1):
        """육면체 블록 — 위/왼쪽 면이 밝고 아래/오른쪽이 어둡다."""
        lo, mid, hi = ramp[0], ramp[len(ramp) // 2], ramp[-1]
        self.rect(x0, y0, x1, y1, mid)
        for i in range(bevel):
            for x in range(int(x0) + i, int(x1) - i + 1):
                self.put(x, y0 + i, hi)
                self.put(x, y1 - i, lo)
            for y in range(int(y0) + i, int(y1) - i + 1):
                self.put(x0 + i, y, ramp[min(len(ramp) - 1, len(ramp) // 2 + 1)])
                self.put(x1 - i, y, lo)

    def tri(self, p0, p1, p2, ch, shade=None):
        """채워진 삼각형 — 화살촉·깃 같은 곧은 조각에 쓴다."""
        xs = [p0[0], p1[0], p2[0]]
        ys = [p0[1], p1[1], p2[1]]

        def sign(ax, ay, bx, by, cx, cy):
            return (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)

        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                d1 = sign(x, y, p0[0], p0[1], p1[0], p1[1])
                d2 = sign(x, y, p1[0], p1[1], p2[0], p2[1])
                d3 = sign(x, y, p2[0], p2[1], p0[0], p0[1])
                neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
                pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
                if not (neg and pos):
                    self.put(x, y, shade(x, y) if shade else ch)

    def line(self, x0, y0, x1, y1, ch):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(1, n - 1)
            self.put(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), ch)

    # ---- 마감 ----
    def outline(self, ch='k', diag=False):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] != self.empty:
                    continue
                nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                if diag:
                    nb += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
                for dx, dy in nb:
                    c = self.get(x + dx, y + dy)
                    if c != self.empty and c != ch:
                        add.append((x, y))
                        break
        for x, y in add:
            self.put(x, y, ch)

    def rimlight(self, ch, of=None, dirs=((1, 0), (0, 1), (1, 1))):
        """그림자 쪽(오른쪽 아래) 실루엣 가장자리를 한 겹 띄운다 — 반사광."""
        hit = []
        for y in range(self.h):
            for x in range(self.w):
                cur = self.g[y][x]
                if cur == self.empty or cur == 'k':
                    continue
                if of and cur not in of:
                    continue
                for dx, dy in dirs:
                    if self.get(x + dx, y + dy) in (self.empty, 'k'):
                        hit.append((x, y))
                        break
        for x, y in hit:
            self.put(x, y, ch)

    def shadowline(self, dark, of):
        """아래쪽 안쪽 테두리를 한 단계 어둡게 — 접지 그림자."""
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] in of and self.get(x, y + 1) in ('.', 'k'):
                    self.put(x, y, dark)

    def trim(self):
        rows = [''.join(r) for r in self.g]
        while rows and set(rows[0]) <= {self.empty}:
            rows.pop(0)
        while rows and set(rows[-1]) <= {self.empty}:
            rows.pop()
        lo = min((len(r) - len(r.lstrip(self.empty))) for r in rows)
        hi = max(len(r.rstrip(self.empty)) for r in rows)
        return [r[lo:hi] for r in rows]

    def rows(self, trim=True):
        return self.trim() if trim else [''.join(r) for r in self.g]


def emit(rows, indent=6):
    pad = ' ' * indent
    return '\n'.join(f"{pad}'{r}'," for r in rows)


def show(rows):
    for r in rows:
        print(r)
    print(f'-- {len(rows[0])}x{len(rows)}')
