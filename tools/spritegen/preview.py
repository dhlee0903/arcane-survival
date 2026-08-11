"""생성한 픽셀맵을 팔레트로 칠해 PNG 대조표로 뽑는다."""
from PIL import Image, ImageDraw

BG = (26, 21, 48)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def render(items, path, zoom=6, cols=6, pad=10, label_h=12, bg=BG):
    """items: [(name, palette_dict, rows, art)]"""
    cells = []
    for name, pal, rows, art in items:
        z = zoom / (art or 1) * 2
        w = int(len(rows[0]) * z)
        h = int(len(rows) * z)
        img = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
        px = img.load()
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch == '.':
                    continue
                col = pal.get(ch)
                if col is None:
                    col = '#ff00ff'
                r, g, b = hexrgb(col)
                for dy in range(int(z)):
                    for dx in range(int(z)):
                        xx, yy = int(x * z) + dx, int(y * z) + dy
                        if 0 <= xx < img.width and 0 <= yy < img.height:
                            px[xx, yy] = (r, g, b, 255)
        cells.append((name, img))

    cw = max(c[1].width for c in cells) + pad * 2
    ch = max(c[1].height for c in cells) + pad * 2 + label_h
    rows_n = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cw * cols, ch * rows_n), bg)
    d = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(cells):
        cx = (i % cols) * cw
        cy = (i // cols) * ch
        ox = cx + (cw - img.width) // 2
        oy = cy + pad + (ch - label_h - pad - img.height)
        sheet.paste(img, (ox, oy), img)
        d.text((cx + 4, cy + ch - label_h), name, fill=(160, 170, 195))
    sheet.save(path)
    return path
