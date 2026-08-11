// 코만도의 스킬 셋 — 원작 수치를 그대로 옮겼다. **레벨업은 없다.**
// 위력은 스킬 계수 × 캐릭터 공격력이고, 공격력은 레벨과 아이템으로만 오른다.
//
//   기본공격(좌클릭)  2연사        두 발 · 발당 100% · 쿨타임이 공격 속도에 비례
//   특수공격(우클릭)  위상조정탄   300% 관통 · 관통할 때마다 피해 +40% · 3초
//   특수공격2(R)      제압사격     탄당 100% · 공격 속도만큼 발사 수가 는다 · 9초

export const SKILLS = {
  primary: {
    name: '2연사',
    key: '좌클릭',
    icon: 'skill.tap',
    desc: '적 하나를 빠르게 쏘아 100% 피해',
    coef: 1.0,
    cd: 34,              // 스텝. 공격 속도로 나눈다
    speed: 7.2,
    r: 4,
    fire(g, dir) {
      // 이름 그대로 **두 발**이 나간다. 한꺼번에가 아니라 네 스텝 간격으로 끊어 쏜다
      for (let i = 0; i < 2; i += 1) {
        g.queueShot(i * 4, (gg) => {
          gg.shoot(gg.aimDir(), { coef: this.coef, speed: this.speed, r: this.r, pierce: 0, spread: 0.05 });
        });
      }
    },
  },
  special: {
    name: '위상조정탄',
    key: '우클릭',
    icon: 'skill.phase',
    desc: '관통탄 300% · 적을 뚫을 때마다 피해 +40%',
    coef: 3.0,
    cd: 180,             // 3초
    speed: 9.0,
    r: 6,
    fire(g, dir) {
      g.shoot(dir, {
        coef: this.coef, speed: this.speed, r: this.r, pierce: 99,
        spr: 'phase', grow: 0.4, life: 130, trail: 14, trailColor: '#6fc8ff',
      });
    },
  },
  special2: {
    name: '제압사격',
    key: 'R',
    icon: 'skill.suppress',
    desc: '연속 사격 · 탄당 100% · 공격 속도만큼 발사 수 증가',
    coef: 1.0,
    cd: 540,             // 9초
    speed: 6.4,
    r: 4,
    fire(g, dir) {
      // 원작처럼 공격 속도가 오를수록 더 많이 쏟아진다
      const shots = Math.round(6 + 6 * g.atkSpeed());
      for (let i = 0; i < shots; i += 1) {
        g.queueShot(i * 4, (gg) => {
          gg.shoot(gg.aimDir(), {
            coef: this.coef, speed: this.speed, r: this.r, pierce: 0,
            spread: 0.16, stagger: 12, spr: 'bullet.orange',
          });
        });
      }
    },
  },
};

export const SKILL_IDS = ['primary', 'special', 'special2'];
