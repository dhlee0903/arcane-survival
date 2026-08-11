# 스프라이트 생성기

`src/sprites.js`의 픽셀맵을 만들어 내는 개발용 도구다. **게임은 이 도구를 쓰지 않는다** —
게임이 읽는 것은 `src/sprites.js` 한 파일뿐이고, 그 파일은 손으로 고쳐도 된다.

도트를 한 칸씩 손으로 찍으면 그림자 방향이나 계조가 스프라이트마다 어긋난다.
형태를 도형으로 잡고 같은 광원·같은 계조 규칙으로 칠하면 아틀라스 전체가 한 세트처럼 보인다.

```bash
cd tools/spritegen
python3 sprites.py          # gen2.png 로 미리보기 대조표를 뽑는다
python3 build.py            # ../../src/sprites.js 를 다시 굽는다
```

- `shapes.py` — 도형과 셀 셰이딩(구 · 원기둥 · 삼각형 · 외곽선 · 접지 그늘)
- `sprites.py` — 스프라이트마다 형태와 팔레트를 정의한다
- `preview.py` — 만든 픽셀맵을 PNG 대조표로 뽑는다(Pillow 필요, 개발용)
- `build.py` — `src/sprites.js`를 통째로 다시 쓴다(마법사 · MAPS · 팔레트)
