// 코만도의 스킬 셋 — 원작 수치를 그대로 옮겼다. **레벨업은 없다.**
// 위력은 스킬 계수 × 캐릭터 공격력이고, 공격력은 레벨과 아이템으로만 오른다.
//
//   기본공격(좌클릭)  2연사        두 발 · 발당 100% · 쿨타임이 공격 속도에 비례
//   특수공격(우클릭)  위상조정탄   300% 관통 · 관통할 때마다 피해 +40% · 3초
//   특수공격2(R)      제압사격     탄당 100% · 공격 속도만큼 발사 수가 는다 · 9초
//   회피(Shift)       구르기       쏘는 게 아니라 SKILLS 밖에 둔다(아래 DODGE)

import { PLAYER } from './config.js';

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
    speed: 15.0,
    r: 6,
    fire(g, dir) {
      g.shoot(dir, {
        coef: this.coef, speed: this.speed, r: this.r, pierce: 99,
        spr: 'phase', grow: 0.4, life: 130, trail: 800, trailColor: '#6fc8ff',
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

// 회피는 SKILLS에 넣지 않는다 — 쏘는 게 아니라 fire()가 없고, tickSkills의 발사
// 분기를 타면 안 된다. 다만 **쿨타임이 있다**는 점은 같으므로 트레이와 머리 위
// 알림에는 나머지와 똑같이 나와야 한다. 그 표시용 정의만 여기 둔다.
export const DODGE = {
  name: '회피',
  key: 'Shift',
  icon: 'skill.dive',
  desc: '굴러서 빠져나간다 · 구르는 동안 무적',
  cd: PLAYER.dodgeCd,
};

// 쿨타임을 보여 주는 것 전부 — 트레이에 늘어놓는 순서
export const TRAY_IDS = [...SKILL_IDS, 'dodge'];
export const TRAY = { ...SKILLS, dodge: DODGE };

// 머리 위 "쿨타임 돌아옴" 알림 대상 — **기본공격은 뺀다.**
// 쿨타임이 0.5초짜리라 누르고 있으면 초당 두 번씩 아이콘이 뜬다. 알림이 계속
// 깜빡이면 정작 봐야 할 특수공격·회피 복귀가 그 안에 묻힌다.
export const READY_IDS = TRAY_IDS.filter((id) => id !== 'primary');
