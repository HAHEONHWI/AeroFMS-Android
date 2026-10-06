# Play Console 제출 정보 — AeroFMS 1.0.0 (versionCode 1)

이 문서는 **현재 빌드**(`AeroFMS-1.0.0-vc1.aab`) 기준입니다. 이 빌드는 Firebase 프로젝트 `aerofms-app`(Authentication, Firestore)에 연결되어 있고, 광고 SDK·Analytics·Crashlytics는 포함되어 있지 않습니다. 로그인하지 않으면 앱은 개발자에게 어떤 데이터도 보내지 않습니다.

---

## 0. 업로드 전에 필요한 것

| 항목 | 상태 | 위치 / 비고 |
| --- | --- | --- |
| AAB | 준비됨 | `release/AeroFMS-1.0.0-vc1.aab` (업로드 키 `yj-upload`로 서명) |
| 앱 아이콘 512×512 | 준비됨 | `release/store-listing/icon-512.png` |
| 피처 그래픽 1024×500 | 준비됨 | `release/store-listing/feature-graphic-ko.png`, `-en.png` |
| 휴대전화 스크린샷 8장 | 준비됨 | `release/store-listing/ko/`, `release/store-listing/en/` |
| 개인정보처리방침 URL | 준비됨 | `https://aerofms.netlify.app/privacy` |
| 비공개 테스트 참여자 | **필요** | 신규 개인 개발자 계정: 테스터 12명 이상, 14일 연속 참여 후 프로덕션 신청 가능 |

---

## 1. 앱 만들기

| 필드 | 값 |
| --- | --- |
| 앱 이름 | `AeroFMS - FMC & MCDU Simulator` (30자) |
| 기본 언어 | 한국어(ko-KR) |
| 앱 또는 게임 | 앱 |
| 무료 또는 유료 | 무료 |
| 선언 | 개발자 프로그램 정책 동의, 미국 수출법 동의 체크 |

패키지 이름은 AAB에서 자동으로 정해집니다: `dev.heonhwi.areofms` (한 번 올리면 변경 불가).

---

## 2. 스토어 설정

| 필드 | 값 |
| --- | --- |
| 앱 카테고리 | 교육 (Education) |
| 태그 (최대 5개) | 교육, 시뮬레이션, 항공, 학습 도구, 참고 자료 — 콘솔 목록에 있는 항목 중에서 선택 |
| 이메일 주소 | `admin@heonhwi.dev` |
| 웹사이트 | `https://aerofms.netlify.app` |
| 전화번호 | 비워 둠(선택) |
| 외부 마케팅 | 허용(기본값) |

---

## 3. 기본 스토어 등록정보

### 한국어 (ko-KR, 기본)

**앱 이름**
```
AeroFMS - FMC & MCDU 시뮬레이터
```

**간단한 설명** (80자 이내)
```
보잉·에어버스 8개 기종의 FMC와 MCDU를 배우고 조작하는 비행 시뮬레이션 교육 앱
```

**자세한 설명**: `release/store-listing/full-description.ko.txt` 전체를 붙여넣기 (991자)

### English (en-US, 번역 추가)

"번역 관리 → 자체 번역 추가 → 영어(미국)"에서 추가합니다.

**App name**
```
AeroFMS - FMC & MCDU Simulator
```

**Short description**
```
Learn and operate Boeing FMC and Airbus MCDU systems across 8 aircraft types.
```

**Full description**: `release/store-listing/full-description.en.txt` 전체를 붙여넣기 (1,748자)

### 그래픽

| 항목 | 한국어 | English |
| --- | --- | --- |
| 앱 아이콘 | `icon-512.png` | 동일 |
| 피처 그래픽 | `feature-graphic-ko.png` | `feature-graphic-en.png` |
| 휴대전화 스크린샷 | `ko/01-home.png` ~ `ko/08-modern-view.png` (순서대로) | `en/01` ~ `en/08` |
| 태블릿 스크린샷 | 선택 (없으면 태블릿 추천 노출이 제한됨) | |
| 동영상 | 선택 | |

---

## 4. 앱 콘텐츠 (정책 선언)

### 개인정보처리방침
```
https://aerofms.netlify.app/privacy
```
웹 앱의 `/privacy` 페이지(ko/en)이며 앱 안 `프로필 → 개인정보처리방침`과 같은 내용입니다.

### 앱 액세스 권한
- **일부 기능이 제한됨** 선택 → 안내 문구 예시:
  ```
  에뮬레이터, 학습, 시나리오, 리플레이, 시뮬레이션은 로그인 없이 모두 사용할 수 있습니다. 클라우드 동기화·시나리오 공유·클라우드 리플레이만 로그인이 필요합니다. 아래 테스트 계정으로 프로필 → 계정에서 이메일 로그인하세요.
  ```
- 심사용 테스트 계정(이메일/비밀번호)을 콘솔에서 Authentication 사용 설정 후 직접 만들어 입력하세요. (로그인 없이 볼 수 있는 기능만으로 충분하다고 판단되면 "모든 기능 사용 가능"을 선택해도 되지만, 로그인 화면이 있으므로 계정을 제공하는 편이 반려 위험이 낮습니다.)

### 광고
- **아니요, 앱에 광고가 없습니다**

### 콘텐츠 등급 (IARC 설문)
- 이메일: `admin@heonhwi.dev`
- 카테고리: **기타 모든 앱 유형** (참고 자료, 뉴스, 교육 포함)
- 질문 답변: 폭력, 성적 콘텐츠, 언어, 규제 약물, 도박, 공포 요소 — 모두 **아니요**
- 사용자 간 상호작용/콘텐츠 공유: **예** (사용자가 만든 시나리오를 공유 코드나 전체 공개로 다른 사용자와 공유 가능, 채팅·메시지 기능은 없음)
- 사용자 위치 공유: **아니요**
- 디지털 상품 구매: **아니요**
- 예상 결과: 전체이용가 / PEGI 3 / ESRB Everyone

### 타겟층 및 콘텐츠
- 타겟 연령: **13~15세, 16~17세, 18세 이상** 선택 (13세 미만을 포함하면 가족 정책 심사 대상이 됨)
- 앱이 아동의 관심을 끌 수 있나요: **아니요**

### 뉴스 앱
- **아니요**

### 데이터 보안
- 사용자 데이터를 수집하거나 공유하나요: **예 (수집함, 공유 안 함)**
- 전송 중 암호화: **예**
- 사용자가 데이터 삭제를 요청할 수 있나요: **예**
- 계정 생성 방식: 사용자 이름(이메일)과 비밀번호, Google 로그인
- 계정 삭제 URL: `https://aerofms.netlify.app/account` (로그인 후 "계정 삭제") — 앱 안에서도 프로필 → 계정 → 계정 삭제

| 데이터 유형 | 수집 | 공유 | 필수 여부 | 목적 |
| --- | --- | --- | --- | --- |
| 개인 정보 → 이메일 주소 | 예 | 아니요 | 선택(로그인 시) | 계정 관리 |
| 개인 정보 → 이름(표시 이름) | 예 | 아니요 | 선택 | 계정 관리, 앱 기능(시나리오 작성자 표시) |
| 개인 정보 → 사용자 ID | 예 | 아니요 | 선택 | 계정 관리, 앱 기능 |
| 앱 활동 → 기타 사용자 생성 콘텐츠(시나리오·세션·리플레이·학습 기록) | 예 | 아니요 | 선택(동기화 시) | 앱 기능 |

- 위치, 연락처, 사진, 파일, 금융·건강 정보, 기기 ID, 앱 상호작용(분석), 비정상 종료 로그는 **수집하지 않음** (이 빌드에 Analytics·Crashlytics 없음)
- Google Firebase는 서비스 제공업체이므로 "공유"에 해당하지 않습니다.
- Connector는 사용자가 입력한 같은 네트워크의 사용자 PC로만 연결하며 개발자 서버로 보내지 않습니다.

### 정부 앱 / 금융 기능 / 건강
- 정부 앱: **아니요**
- 금융 기능: **해당 없음**
- 건강 앱: **아니요**

### 광고 ID
- 앱이 광고 ID를 사용하나요: **아니요** (매니페스트에서 `AD_ID` 권한 제거됨)

### 권한
현재 AAB의 권한: `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE`, `WAKE_LOCK`, `MODIFY_AUDIO_SETTINGS`, `USE_BIOMETRIC`, `USE_FINGERPRINT`(라이브러리 포함분). 모두 일반 권한이라 별도 권한 선언 양식이 필요 없습니다. 위치·저장소·마이크·포그라운드 서비스 권한은 없습니다.

---

## 5. 앱 서명

- **Play 앱 서명 사용**(기본값). 첫 AAB 업로드 시 Google이 앱 서명 키를 생성·관리하고, 업로드한 키는 업로드 키로 등록됩니다.
- 업로드 키 인증서(`yj-upload`, CN=Ha HeonHwi)
  - SHA-1: `54:DD:A0:8C:98:36:C7:1A:CC:EA:CF:42:7E:7C:16:EE:F6:1F:0B:F7`
  - SHA-256: `34:90:9A:4F:D9:D6:D1:16:FB:59:1C:D2:5D:D7:4A:8C:3D:5E:3E:E6:C1:F7:7C:6E:D3:3E:2C:94:70:AE:58:89`
- 나중에 Google 로그인/Firebase를 켤 때는 Play Console → 앱 무결성 → **앱 서명 키 인증서**의 SHA-1·SHA-256을 Firebase 프로젝트의 Android 앱에 등록해야 합니다(업로드 키 지문만으로는 Play 배포본에서 로그인이 실패합니다).
- 업로드 키(`~/.android-keys/yj-upload.jks`)는 백업해 두세요. 분실 시 Play Console에서 업로드 키 재설정 요청이 필요합니다.

---

## 6. 테스트 및 출시

### 권장 순서
1. **내부 테스트**: AAB 업로드 → 본인 계정으로 설치 확인
2. **비공개 테스트**(신규 개인 계정 필수): 테스터 12명 이상이 14일 연속 참여
3. **프로덕션 액세스 신청** → 심사 → 출시

### 출시 정보
| 필드 | 값 |
| --- | --- |
| App Bundle | `AeroFMS-1.0.0-vc1.aab` |
| 출시 이름 | `1.0.0 (1)` |
| 국가/지역 | 대한민국 (+ 원하면 전체 국가) |

**출시 노트**
```
<ko-KR>
AeroFMS 첫 출시
- 보잉·에어버스 8개 기종의 FMC/MCDU 에뮬레이터
- 단계별 학습, 시나리오, 리플레이
- 내장 비행 시뮬레이션과 지도
</ko-KR>
<en-US>
First release of AeroFMS
- FMC/MCDU emulator for 8 Boeing and Airbus aircraft
- Guided lessons, scenarios and replay
- Built-in flight simulation and map
</en-US>
```

---

## 7. 다음 업데이트를 올릴 때

versionCode는 올릴 때마다 1씩 증가해야 합니다.

```bash
cd android && AEROFMS_VERSION_CODE=2 ./gradlew bundleRelease
```

업로드 키는 `~/.gradle/gradle.properties`의 `YJ_UPLOAD_*` 값을 `AEROFMS_UPLOAD_*` 환경 변수로 넘겨 서명합니다(README의 "릴리스 빌드" 참고). 버전 이름은 `app.config.ts`의 `VERSION`에서 바꿉니다.

---

## 8. 심사 리스크와 대응

- **로그인 기능**: Authentication 제공업체(이메일/비밀번호, Google)를 콘솔에서 켜기 전에는 로그인이 실패합니다. 심사 제출 전에 반드시 켜고 테스트 계정으로 확인하세요.
- **상표**: 설명에 Boeing·Airbus·기종명이 나옵니다. 기종 식별용(지명적 사용)이며 설명 끝에 "제휴 관계 없음" 고지가 있습니다. 앱 이름·아이콘에는 상표를 쓰지 않았습니다. 지식재산권 사유로 반려되면 설명의 회사명을 "보잉/에어버스 계열 FMS"처럼 줄이는 방향으로 수정합니다.
- **오해 소지**: "실제 운항에 사용 불가" 고지가 온보딩·설명·앱 내 문서에 모두 있습니다.
- **기능 최소 요건**: 로그인 없이 전체 기능이 동작하므로 심사자용 테스트 계정이 필요 없습니다.
