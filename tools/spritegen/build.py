"""gen.py가 만든 픽셀맵을 src/sprites.js로 굽는다."""
import io
import os
import sprites as gen

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'src', 'sprites.js')
old = open(SRC).read()


tail = old[old.index('// ---- 5×7 비트맵 글꼴'):]

HEADER = '''// 도트 스프라이트 — 한 글자가 한 도트다.
// 여기서 정의한 모든 그림은 시작할 때 **하나의 스프라이트시트(아틀라스)**로 구워지고,
// 이후 렌더러는 아틀라스에서 잘라 쓰기만 한다(drawImage의 9인자 형태).
//
//   '.'  투명       'k'  외곽선(어느 팔레트든 검정 한 색이다)
//   나머지 글자의 뜻은 팔레트(PAL)마다 다르다.
//
// 그림의 규칙은 셋이다.
//
//   1) **머리가 큰 2등신.** 몸을 줄이고 머리·모자를 키운다. 화면에서 실제로 보이는 크기는
//      한 뼘 남짓이라, 사람 비례로 그리면 얼굴이 뭉개져 무엇인지 알 수 없다.
//   2) **면을 몇 개로 끊은 셀 셰이딩.** 재질마다 그늘 · 기본 · 밝음 세 단만 쓰고 경계를
//      칼같이 끊는다. 계조를 부드럽게 깔면 90년대 에어브러시처럼 보인다.
//   3) **검은 외곽선 + 진한 접지 그늘(D).** 배경이 어두워도 형태가 배경에서 떨어져 나온다.
//
// 빛은 왼쪽 위 한 곳에서만 온다. 모든 그림이 같은 광원을 쓰기 때문에 아틀라스 전체가
// 한 세트처럼 보인다. 그래서 좌우 대칭은 쓰지 않는다 — 대칭인 그림은 빛의 방향을 담지 못한다.
//
// 프레임마다 lift(0/1)를 줄 수 있다 — 굽는 캔버스가 한 줄 더 높고, 1이면 한 줄 떠 있다.
// 발밑(bottom-center) 기준으로 그리므로 lift를 번갈아 주면 걷는 동안 몸이 통통 튄다.
//
// art: 한 월드 단위를 몇 도트로 찍었는지(기본 1). art:2면 같은 크기를 네 배 촘촘하게
// 그린 것이라, 화면에서는 절반 크기로 그려 결과적으로 크기는 그대로 두고 밀도만 올린다.
// 덕분에 그림을 다시 찍어도 이동 속도·판정 반지름 같은 게임 수치는 손대지 않는다.

'''

# 팔레트 — 마법사는 예전 그대로 두고 나머지는 새로 찍은 것으로 갈아 끼운다


PAL_COMMENT = {
    'wizard': '  // 마법사 — 로브/모자 3단 + 접지 그늘 D. 수염 · 살갗 · 지팡이 구슬',
    'slime': '  // 슬라임 — 젤리 한 덩이. 속이 비쳐 보이도록 밝은 단을 넉넉히 뒀다',
    'ghost': '  // 유령 — 차가운 흰빛 천. 아래로 갈수록 어두워진다',
    'bat': '  // 박쥐 — 날개막(w~V)과 털(n~M)을 따로 나눴다',
    'bone': '  // 해골 — 뼈 4단 + 눈구멍에서 타는 불',
    'stone': '  // 골렘 — 돌 6단, 이끼, 갈라진 틈의 용암',
    'lich': '  // 리치 — 로브 5단 + 뼈 4단 + 왕관의 금',
    'chest': '  // 상자 — 나무 · 쇠띠 · 금자물쇠',
    'pot': '  // 항아리 — 구운 흙에 푸른 무늬',
    'ground': '  // 바닥 타일 — 다섯 단이 서로 가깝다. 벌어지면 칸 경계가 드러난다',
    'item': '  // 아이템 아이콘 — 공격·패시브가 같은 팔레트를 나눠 쓴다',
}

buf = io.StringIO()
buf.write(HEADER)
buf.write('// ---- 팔레트 ----\nexport const PAL = {\n')
for name, pal in gen.PAL.items():
    if name == 'wizard':
        buf.write('  // 마법사 — 로브 5단 · 수염 3단 · 살갗 3단 · 지팡이 구슬\n')
    if name in PAL_COMMENT:
        buf.write(PAL_COMMENT[name] + '\n')
    entries = ', '.join(f"{k if k.isalpha() else repr(k)}: '{v}'" for k, v in pal.items())
    line = f'  {name}: {{ {entries} }},\n'
    if len(line) > 118:                      # 길면 두 줄로 접는다
        items = list(pal.items())
        half = (len(items) + 1) // 2
        a = ', '.join(f"{k}: '{v}'" for k, v in items[:half])
        b = ', '.join(f"{k}: '{v}'" for k, v in items[half:])
        line = f'  {name}: {{\n    {a},\n    {b},\n  }},\n'
    buf.write(line)
buf.write('};\n\n')
# 마법사 — 서 있는 자세와 두 걸음. 여섯 프레임이 이 셋을 나눠 쓴다
buf.write('// ---- 마법사 ----\n')
buf.write('// 서 있는 자세 하나와 걸음 둘. lift를 번갈아 주면 걷는 동안 몸이 통통 튄다.\n')
buf.write('const WIZ = {\n')
for pose in ('stand', 'stepA', 'stepB'):
    buf.write(f"  {pose}: [\n")
    for r in gen.SPR[f'wizard.{pose}'][1]():
        buf.write(f"    '{r}',\n")
    buf.write('  ],\n')
buf.write('};\n\n')
buf.write("const wiz = (pose, lift) => ({ pal: 'wizard', art: 2, lift, rows: WIZ[pose] });\n")

# ---- MAPS ----
ORDER = [
    ('// ---- 적 ----', ['bat.0', 'bat.1', 'slime.0', 'slime.1', 'skeleton.0', 'skeleton.1',
                        'ghost.0', 'ghost.1', 'golem.0', 'golem.1', 'lich.0', 'lich.1']),
    ('// ---- 주워 먹는 것 ----', ['gem.blue', 'gem.green', 'gem.red', 'heart', 'magnet', 'coin']),
    ('// ---- 부술 수 있는 물건 ----', ['chest', 'pot']),
    ('// ---- 배경 장식 ----', ['rock', 'tuft', 'mushroom', 'flower', 'bones', 'stump', 'grave']),
    ('// ---- 바닥 타일 ----', ['tile.grass0', 'tile.grass1', 'tile.moss0', 'tile.moss1', 'tile.path']),
    ('// ---- 투사체 ----', ['bolt.0', 'bolt.1', 'shard', 'rune.0', 'rune.1',
                          'flame.0', 'flame.1', 'flame.2', 'zap.0', 'zap.1']),
    ('// ---- 아이템 아이콘 ----', ['item.bolt', 'item.shard', 'item.rune', 'item.aura', 'item.zap',
                              'item.brand', 'item.might', 'item.swift', 'item.vigor',
                              'item.regen', 'item.focus', 'item.area', 'item.wisdom']),
]
LIFT = {'bat.0': 1, 'bat.1': 0, 'skeleton.0': 0, 'skeleton.1': 1, 'ghost.0': 0, 'ghost.1': 1,
        'golem.0': 0, 'golem.1': 1, 'lich.0': 0, 'lich.1': 1}
NOTE = {
    'bat.0': '  // 박쥐 — 날개를 올린 프레임과 내린 프레임',
    'slime.0': '  // 슬라임 — 통통 튈 때 몸이 눌린다',
    'skeleton.0': '  // 해골 — 다리가 번갈아 나간다',
    'ghost.0': '  // 유령 — 자락의 물결이 프레임마다 어긋난다',
    'golem.0': '  // 골렘(엘리트) — 이끼 낀 바위 덩어리. 가슴의 균열에서 용암이 샌다',
    'lich.0': '  // 리치(보스) — 왕관 쓴 해골. 가슴의 마력 핵이 프레임마다 부푼다',
    'gem.blue': '  // 경험치 보석 — 같은 형태에 팔레트만 갈아 끼운다',
    'chest': '  // 상자 — 엘리트와 보스가 떨군다',
    'pot': '  // 항아리 — 부수면 금화 · 회복 · 자석이 나온다',
    'tile.grass0': '  // 잡티를 칸마다 흩뿌리면 노이즈로 보인다. 덩어리로 뭉치고 결을 넣어야 풀밭이 된다.\n'
                   '  // 가장자리는 기본색만 남겨 이웃 타일과의 이음새를 감춘다.',
    'bolt.0': '  // 마력 화살 — 어느 방향으로 날아가도 같게 보이도록 둥근 핵으로 그렸다',
    'item.bolt': '  // HUD 칸(11도트)에 맞춰 규격을 통일한다. flat이라 아랫줄을 더 두지 않는다.',
}

buf.write('\n// ---- 프레임 목록 ----\n')
buf.write('// name → { pal, rows, art?, lift?, flat? }\n')
buf.write('export const MAPS = {\n')
buf.write("  'wizard.idle0': wiz('stand', 0),\n")
buf.write("  'wizard.idle1': wiz('stand', 1),\n")
buf.write("  'wizard.walk0': wiz('stepA', 1),\n")
buf.write("  'wizard.walk1': wiz('stand', 0),\n")
buf.write("  'wizard.walk2': wiz('stepB', 1),\n")
buf.write("  'wizard.walk3': wiz('stand', 0),\n")

used = {'wizard.stand', 'wizard.stepA', 'wizard.stepB'}
for title, names in ORDER:
    buf.write(f'\n  {title}\n')
    for n in names:
        pal, fn, art = gen.SPR[n]
        rows = fn()
        used.add(n)
        opts = [f"pal: '{pal}'", f'art: {art}']
        if n in LIFT:
            opts.append(f'lift: {LIFT[n]}')
        if n.startswith('tile.') or n.startswith('item.'):
            opts.append('flat: true')
        if n in NOTE:
            buf.write(NOTE[n] + '\n')
        buf.write(f"  '{n}': {{\n    {', '.join(opts)},\n    rows: [\n")
        for r in rows:
            buf.write(f"      '{r}',\n")
        buf.write('    ],\n  },\n')
buf.write('};\n\n')
buf.write(tail)

missing = set(gen.SPR) - used
if missing:
    raise SystemExit(f'빠진 프레임: {missing}')
open(SRC, 'w').write(buf.getvalue())
print('wrote', SRC, len(buf.getvalue().splitlines()), 'lines')
