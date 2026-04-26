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
| `CLAUDE_API_KEY` | 직무 추천 / 방학 플랜 5종 생성 | https://console.anthropic.com/ |
| `SERPER_API_KEY` | 실시간 공고 검색 (Google) | https://serper.dev/ |

```
CLAUDE_API_KEY=sk-ant-api03-...
SERPER_API_KEY=...
```

키를 수정한 뒤에는 dev server를 **재시작**해야 반영됩니다 (Vite는 부팅 시점에만 `.env`를 읽습니다).

키는 클라이언트 번들에 포함되지 않습니다. `vite.config.js`의 proxy `configure` 훅에서 서버 측에서 헤더로 주입되며, 브라우저에서는 `/api/anthropic`, `/api/serper` 경로로만 호출합니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 프레임워크 | **React 18** (npm — Vite 6 빌드/HMR) |
| 스타일링 | **Tailwind CSS 3** + Pretendard 웹폰트 |
| AI 추천 | **Claude API** (`claude-sonnet-4-6`) — 직무 3개 추천, 방학 플랜 5종 생성 |
| 공고 검색 | **Serper API** — 서포터즈 / 공모전 / 인턴 키워드 동시 검색, 캐싱 (sessionStorage) |
| 보조 도구 | Tweaks Panel (호스트 프로토콜 기반 라이브 튜닝) |

## 안전장치

- **요청 횟수 제한**: 하루 20회 (`localStorage` 기반, 자정 리셋). 초과 시 토스트 메시지.
- **입력값 sanitize**: 직무 입력란에서 `< > { } [ ] \ \` $ | ;` 등 특수문자 제거, 최대 50자 제한 — 프롬프트 인젝션 방지.
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
