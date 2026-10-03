# 출시 체크리스트

## 빌드 전

- [ ] Web 저장소: `pnpm verify` 통과
- [ ] `npm run sync:shared` 후 `npm run check:shared`, `npm run typecheck`, `npm run lint` 통과
- [ ] `app.config.ts`의 `VERSION` 갱신, `AEROFMS_VERSION_CODE` 증가
- [ ] `.env`에 프로덕션 Firebase 설정, `EXPO_PUBLIC_ENABLE_DEBUG_TOOLS=false`
- [ ] 광고 정책 결정: 기본 `AEROFMS_ENABLE_ADS=false` (켜는 경우 privacy/data-safety 갱신)
- [ ] `google-services.json` 포함 여부 확인(Crashlytics·네이티브 Analytics)
- [ ] Firebase: 규칙·인덱스·Functions 배포, App Check(Play Integrity) 적용, Remote Config 템플릿 게시

## 빌드

- [ ] `npx expo prebuild --platform android --clean`
- [ ] 업로드 키(AEROFMS_UPLOAD_*) 설정 후 `cd android && ./gradlew bundleRelease`
- [ ] AAB 서명 확인: `jarsigner -verify -verbose android/app/build/outputs/bundle/release/app-release.aab`
- [ ] 매니페스트 권한 확인: INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, VIBRATE, MODIFY_AUDIO_SETTINGS 외 없음(위치·저장소·마이크·FOREGROUND_SERVICE·AD_ID 제거됨)

## 기기 테스트 (내부 테스트 트랙)

- [ ] 첫 실행 온보딩 → 홈 → 기종 선택
- [ ] 737: POS INIT → RTE 입력 → ACTIVATE → EXEC, LEGS 수정 후 EXEC
- [ ] A320: INIT A → F-PLN 측면 수정(TMPY) → INSERT
- [ ] 기종 전환 대화상자(저장 후 전환/저장하지 않고 전환/취소)
- [ ] 앱 종료 후 재실행 시 세션 복원
- [ ] 레슨 1개 완료, 시나리오 1개 완료 및 점수, 리플레이 재생
- [ ] 시나리오 빌더 저장 → 상세 화면
- [ ] 내장 시뮬레이션 시작·일시정지·배속
- [ ] Connector 연결(같은 Wi-Fi의 PC, 데모 비행)
- [ ] 로그인/로그아웃, 동기화, 계정 삭제
- [ ] 한국어/영어 전환, 다크 테마, 폰 세로·가로, 태블릿 레이아웃
- [ ] 비행기 모드에서 전체 기능 동작

## Play Console

- [ ] 스토어 등록정보: 짧은/전체 설명(ko/en), 스크린샷(screenshots-plan.md), 피처 그래픽 1024×500, 아이콘 512×512
- [ ] 앱 콘텐츠: 개인정보처리방침 URL, 데이터 보안, 광고 여부, 콘텐츠 등급 설문, 대상 연령, 뉴스 앱 아님
- [ ] 카테고리: 교육(또는 시뮬레이션), 연락처 이메일 admin@heonhwi.dev
- [ ] 내부 테스트 → 비공개 테스트(신규 개인 개발자 계정은 12명 이상 14일 테스트 요건 확인) → 프로덕션
