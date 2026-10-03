# 스크린샷 계획

Play 요구 사항: 휴대전화 스크린샷 2~8장(16:9 또는 9:16, 짧은 변 1080px 이상 권장), 7인치·10인치 태블릿 스크린샷(선택이지만 태블릿 노출에 필요), 피처 그래픽 1024×500.

모든 스크린샷은 실제 앱 화면을 사용하고(목업 금지), 데모 항법 데이터의 공항·경로만 사용합니다. ko/en 각각 촬영합니다.

| # | 화면 | 상태 준비 | 캡션(ko) | Caption (en) |
| --- | --- | --- | --- | --- |
| 1 | 737-800 RTE 페이지 | RKSI → RKPK 경로 입력, MOD 상태(EXEC 점등) | 실제처럼 입력하는 보잉 FMC | Program a Boeing FMC for real |
| 2 | A320neo F-PLN | 측면 수정 TMPY 상태 | 에어버스 MCDU 임시 비행계획 | Airbus MCDU temporary flight plans |
| 3 | 에뮬레이터 + 지도 패널(가로/태블릿) | 경로·TOC/TOD 표시 | 지도로 바로 확인하는 비행계획 | See your flight plan on the map |
| 4 | Academy 레슨 진행 | 단계 안내 + 강조된 키 | 단계별 가이드 레슨 | Step-by-step guided lessons |
| 5 | 실수 분석 | INVALID ENTRY 후 안내 카드 | 실수의 원인과 해결 방법 | Learn from every mistake |
| 6 | 시나리오 결과 | 점수와 목표 달성 목록 | 목표와 점수가 있는 시나리오 | Scenarios with objectives and scores |
| 7 | 내장 시뮬레이션 | 상승 중, 비행 데이터 패널 | 비행계획대로 날아 보기 | Fly your flight plan |
| 8 | Modern 뷰 | 같은 세션의 폼 화면 | Classic과 Modern 두 가지 화면 | Classic and Modern views |

## 촬영 방법

```bash
adb exec-out screencap -p > screenshot.png
```

- 상태 표시줄 정리: 개발자 옵션의 데모 모드(시간 12:00, 배터리 100%, 알림 없음)
- 폰: Pixel 계열 1080×2400, 태블릿: 1600×2560(10인치), 1200×1920(7인치)
- 피처 그래픽: 앱 아이콘 + "AeroFMS — FMC & MCDU Simulator" 문구, 실제 CDU 화면 일부
