# 방학에 뭐하지?

대학생을 위한 AI 기반 방학 플랜 추천 서비스.
직무·학년·시즌(과 관심사)을 입력하면 AI가 5가지 방향성의 방학 플랜을 짜주고, 실시간 공고까지 함께 보여줍니다.

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (아래 "환경변수" 참고)
cp .env.example .env
# .env 열어 두 키 채우기

# 3. 개발 서버 실행
npm run dev
```

`vite.config.js`의 `open: true` 설정으로 브라우저가 자동으로 `http://localhost:5173`을 엽니다.
종료는 터미널에서 `Ctrl+C`.

> **주의**: 이 프로젝트는 Vite dev server의 proxy 레이어에서 API 키를 헤더로 주입합니다. 따라서 `index.html`을 브라우저에서 직접 더블클릭으로 열면 API 호출이 동작하지 않습니다. 반드시 `npm run dev`로 실행하세요.

## 환경변수 설정

`.env.example`을 복사해 `.env`를 만들고, 아래 두 키를 채웁니다.

| 변수 | 용도 | 발급처 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 직무 추천 / 방학 플랜 5종 생성 / 주차별 일정 / 공고 키워드·관련성 판단 | https://console.anthropic.com/ |
| `SERPER_API_KEY` | 실시간 공고 검색 (Google) | https://serper.dev/ |

```
ANTHROPIC_API_KEY=sk-ant-api03-...
SERPER_API_KEY=...
```

키를 수정한 뒤에는 dev server를 **재시작**해야 반영됩니다 (Vite는 부팅 시점에만 `.env`를 읽습니다).

키는 클라이언트 번들에 포함되지 않습니다. `vite.config.js`의 proxy `configure` 훅에서 서버 측에서 헤더로 주입되며, 브라우저에서는 `/api/anthropic`, `/api/serper` 경로로만 호출합니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 프레임워크 | **React 18** (npm — Vite 6 빌드/HMR) |
| 스타일링 | **Tailwind CSS 3** + Pretendard 웹폰트 |
| AI 추천 (고품질) | **Claude Sonnet** (`claude-sonnet-4-6`) — 직무 3개 추천, 방학 플랜 5종 생성, 주차별 일정 생성 |
| AI 보조 (경량) | **Claude Haiku** (`claude-haiku-4-5-20251001`) — 공고 검색 키워드 생성, 공고 관련성 판단 |
| 공고 검색 | **Serper API** — 서포터즈 / 공모전 / 인턴 키워드 동시 검색 (일반 10페이지 + 상시모집 3페이지 병렬) |
| 보조 도구 | Tweaks Panel (호스트 프로토콜 기반 라이브 튜닝 + 데모 점프) |

## 사용자 흐름

```
[1단계] 정보 입력
  ├── 희망 직무 입력 → [2단계] 바로 이동
  └── "직무를 모르겠어요" 체크 → [1.5단계] 직무 AI 제안
        └── 관심 분야 칩 + 자유 텍스트 입력
            └── Claude가 직무 3개 추천 → 선택 후 [2단계] 이동

[2단계] 방학 활동 선택
  ├── Claude가 5가지 맞춤 활동 생성
  ├── 활동 강도 조절 (아주 가볍게 ↔ 아주 빡세게, 5단계)
  └── 활동 선택 후 [3단계] 이동

[3단계] 결과
  ├── 자격증·어학 활동인 경우: 방학 후반부 시험 일정 카드 표시
  ├── 주차별 방학 일정 (Claude 생성) + PDF 저장
  └── 실시간 모집 공고 (AI 관련성 필터링, D-Day / 상시모집 표시)
```

## 주요 기능

### AI 직무 제안 (Step 1.5)
직무를 모르는 사용자를 위한 보조 단계. 6개 분야 × 4개 관심사 칩과 자유 텍스트를 입력하면 Claude Sonnet이 직무 3개(emoji, 추천 이유, 주요 스킬 포함)를 제안합니다.

### 활동 강도 조절
방학 플랜 선택 화면에서 강도를 -2 ~ +2 단계로 조절할 수 있습니다. 강도를 바꾸면 Claude가 해당 강도에 맞는 새 활동 5개를 재생성합니다.

### 자격증 시험 일정 카드
`isCert: true`인 활동을 선택하면 방학 후반부(여름: 8월 초 ~ 말 / 겨울: 2월 초 ~ 말) 내에 응시 가능한 시험 일정을 표시합니다. 범위를 벗어난 시험은 카드를 숨기고 안내 메시지를 보여줍니다.

### 공고 검색 파이프라인
1. Claude Haiku로 관심 분야에 맞는 검색 키워드 4개 생성
2. linkareer / allforyoung / thinkcontest 대상으로 Serper 병렬 검색 (일반 10p + 상시모집 3p)
3. 제목·스니펫에서 마감일 파싱 → 만료 공고 제거 → 중복 제거
4. Claude Haiku가 후보 공고 관련성 판단 → 최종 목록 렌더링
5. 상시모집 공고는 날짜 필터 없이 우선 표시, D-7 이하 공고는 빨간 D-Day 배지 표시

### PDF 저장
주차별 일정이 생성된 후 "↓ PDF 저장" 버튼으로 인쇄 전용 HTML을 새 탭에 열어 브라우저 인쇄 다이얼로그를 트리거합니다.

## 안전장치

- **요청 횟수 제한**: 분당 최대 8회 (`localStorage` 슬라이딩 윈도우). 초과 시 토스트 메시지.
- **입력값 sanitize**: HTML 태그, 백틱·백슬래시, 중괄호(JSON 인젝션), 제어문자(0x00–0x1F) 제거, 최대 200자 제한 — 프롬프트 인젝션 방지.
- **단계 진입 검증**: 학년·시즌 미선택 시 진행 버튼 비활성화.
- **API 폴백**: Claude 호출 실패 시 더미 데이터로, Serper 호출 실패 시 에러 카드로 graceful degrade.

## 디렉터리

```
.
├── index.html              # Vite 진입점
├── app.jsx                 # 메인 앱 (단계별 화면 + AI 호출)
├── tweaks-panel.jsx        # 라이브 튜닝 패널 + 호스트 프로토콜
├── 방학 뭐하지.html         # 원본 단일 HTML 프로토타입 (참고용)
├── src/
│   ├── main.jsx            # Vite 부트스트랩 (글로벌 React 노출 + jsx import)
│   ├── setup-globals.js    # window.React / window.ReactDOM 주입
│   └── index.css           # Tailwind directives + 커스텀 스타일
├── vite.config.js          # React plugin + /api/anthropic, /api/serper proxy
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── package.json
```
