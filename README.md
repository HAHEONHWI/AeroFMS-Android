# AeroFMS Android — FMC & MCDU Simulator

AeroFMS의 Android 앱입니다(Expo SDK 57 / React Native, Expo Router). FMS 상태 엔진·기종 어댑터·훈련 로직은 **AeroFMS-Web** 저장소의 공유 패키지를 그대로 사용하므로 웹과 동작이 같습니다.

> 교육·시뮬레이션 전용입니다. 실제 항공기 운항에 사용하지 마십시오. 내장 항법 데이터는 데모용입니다.

- 패키지 이름: `dev.heonhwi.areofms`
- minSdk 29 / targetSdk 36, R8 축소·리소스 축소 활성화
- 오프라인 우선: 모든 세션은 기기의 SQLite(expo-sqlite)에 저장되며 네트워크 없이 동작합니다.

## 구조

```
src/app/          Expo Router 화면 ((tabs): 홈·에뮬레이터·Academy·시나리오·프로필, 그 외 리플레이·지도·설정 등)
src/components/   CDU(디스플레이/키패드), 지도(SVG), 에뮬레이터 패널, 훈련 오버레이, 공통 UI
src/platform/     SQLite 드라이버, Firebase, 네이티브 모듈(조건부), 광고, Google 로그인
src/services/     부트스트랩, 런타임 서비스, Analytics
src/stores/       Zustand 스토어(설정, FMS 세션, 인증, 동기화, 훈련, Remote Config)
packages/         AeroFMS-Web에서 복사한 공유 패키지 (직접 수정 금지)
plugins/          Expo config plugin (릴리스 서명)
docs/play-store/  Play Console 제출 자료 템플릿
```

## 공유 패키지 동기화

`packages/*`는 AeroFMS-Web의 `packages/*`를 복사한 것입니다. 두 저장소를 같은 상위 폴더에 두고(`AreoFMS/Web`, `AreoFMS/Android`) 다음을 실행합니다.

```bash
npm run sync:shared
```

CI에서는 `npm run check:shared`로 복사본이 최신인지 확인할 수 있습니다. 경로가 다르면 `node scripts/sync-shared.mjs --web <Web 저장소 경로>`로 위치를 지정합니다.

## 개발

요구 사항: Node 22, JDK 17, Android SDK(플랫폼 36, NDK 27).

```bash
npm install
```

```bash
npm run android
```

`expo run:android`가 네이티브 프로젝트(`android/`, Git에 포함하지 않음)를 생성하고 개발 빌드를 설치합니다.

검사:

```bash
npm run typecheck
```

```bash
npm run lint
```

i18n 키 검사는 Web 저장소에서 `EXTRA_I18N_SRC=<Android>/src pnpm check:i18n`으로 함께 실행합니다.

## 환경 변수

`.env.example`을 `.env`로 복사합니다. 모두 선택 사항이며, 비워 두면 클라우드 기능만 꺼집니다.

| 변수 | 설명 |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase JS SDK 설정(Auth·Firestore). 프로젝트 `aerofms-app` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google 로그인(Credential Manager)용 웹 OAuth 클라이언트 ID |
| `AEROFMS_ENABLE_ADS` | `true`일 때만 Google Mobile Ads SDK를 링크(기본 `false`) |
| `AEROFMS_ADMOB_*` | AdMob 앱/광고 단위 ID(미지정 시 Google 테스트 ID) |
| `AEROFMS_VERSION_CODE` | Play 업로드용 versionCode |

`google-services.json`을 프로젝트 루트에 두면 React Native Firebase(Crashlytics, 네이티브 Analytics)가 자동으로 활성화됩니다. 파일이 없으면 해당 네이티브 모듈은 링크되지 않습니다(`react-native.config.js`).

## 릴리스 빌드 (AAB)

업로드 키를 환경 변수 또는 `~/.gradle/gradle.properties`에 지정합니다.

```
AEROFMS_UPLOAD_STORE_FILE=/path/to/upload-keystore.jks
AEROFMS_UPLOAD_STORE_PASSWORD=...
AEROFMS_UPLOAD_KEY_ALIAS=upload
AEROFMS_UPLOAD_KEY_PASSWORD=...
```

```bash
npx expo prebuild --platform android --clean
```

```bash
cd android && ./gradlew bundleRelease
```

결과물: `android/app/build/outputs/bundle/release/app-release.aab`. 업로드 키가 없으면 debug 키로 서명되며(로컬 테스트용) Play Console에 업로드할 수 없습니다. EAS를 사용할 경우 `eas build -p android --profile production`.

## 수익화(AdMob) 확장

광고는 기본적으로 **빌드에서 제외**되어 있습니다. 활성화하려면:

1. `AEROFMS_ENABLE_ADS=true`와 `AEROFMS_ADMOB_APP_ID`, 광고 단위 ID를 지정하고 prebuild합니다(AD_ID 권한과 SDK가 이때만 포함됨).
2. Firebase Remote Config의 `ads_enabled`를 `true`로 바꿉니다(기본 `false`).
3. Play Console의 광고 포함 여부, 데이터 보안 양식(광고 ID), 콘텐츠 등급을 갱신합니다.

정책(`decideAd`)상 에뮬레이터 조작·훈련·리플레이·온보딩·법적 고지 화면에서는 광고가 표시되지 않으며, 동의(UMP)를 얻은 경우에만 요청합니다.

## Play Store 자료

[docs/play-store](docs/play-store) 참고: 짧은/전체 설명(ko/en), 개인정보·데이터 보안 체크리스트, 출시 체크리스트, 스크린샷 계획.

## 라이선스 및 고지

- 소스 코드 라이선스: 아직 지정되지 않았습니다(별도 고지 전까지 모든 권리 보유).
- 글꼴: IBM Plex Mono(SIL OFL, `assets/fonts/OFL.txt`). 해안선 데이터: Natural Earth(퍼블릭 도메인).
- Boeing, Airbus 및 각 기종명은 해당 소유자의 상표이며 AeroFMS는 이들과 관련이 없습니다.
