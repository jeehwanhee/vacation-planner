/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect */
const { useState, useEffect, useMemo } = React;

// ───────────────────────────────────────────────────────
// Tweakable defaults (persisted via host)
// ───────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardLayout": "grid",
  "accentStyle": "filled",
  "showEmoji": true,
  "cornerRadius": "rounded",
  "demoStep": "auto"
}/*EDITMODE-END*/;

// ───────────────────────────────────────────────────────
// 5개 방향성 축 (골격) — 카드의 카피·구체 내용은 AI가 매번 생성
// ───────────────────────────────────────────────────────
const PLAN_AXES = {
  real:       { emoji: "🔥", name: "실전파",  tone: "from-rose-50 to-orange-50",   pill: "bg-rose-100 text-rose-700" },
  basic:      { emoji: "📚", name: "기초파",  tone: "from-sky-50 to-indigo-50",    pill: "bg-sky-100 text-sky-700" },
  experience: { emoji: "🌍", name: "경험파",  tone: "from-emerald-50 to-teal-50",  pill: "bg-emerald-100 text-emerald-700" },
  spec:       { emoji: "💼", name: "스펙파",  tone: "from-amber-50 to-yellow-50",  pill: "bg-amber-100 text-amber-800" },
  explore:    { emoji: "🛠️", name: "탐색파",  tone: "from-violet-50 to-fuchsia-50", pill: "bg-violet-100 text-violet-700" },
};
const AXIS_ORDER = ["real", "basic", "experience", "spec", "explore"];

// 더미 추천 결과 — 학년별로 다른 카피 셋 (AI 응답 시뮬레이션)
// 실제로는 form 입력값을 Claude에 보내고 받은 JSON이 들어갈 자리
const PLAN_VARIANTS_BY_GRADE = {
  "1학년": {
    real: {
      title: "첫 팀플 만들기",
      tagline: "작은 사이드 프로젝트로\n첫 결과물 만들기",
      desc: "처음이니까 부담 없이 — 학과 친구들과 4주짜리 미니 앱이나 캠페인부터.",
      actions: ["교내 동아리 합류", "4주 미니 프로젝트", "친구 2명과 토이 앱"],
    },
    basic: {
      title: "기본기 쌓기",
      tagline: "전공 너머\n새 분야 입문 강의",
      desc: "1학년의 가장 큰 무기는 시간. CS·디자인·마케팅 중 하나 골라 입문서.",
      actions: ["인프런 입문 강의", "원서 1권 정독", "코드잇 무료 코스"],
    },
    experience: {
      title: "넓게 경험하기",
      tagline: "다양한 모임·활동에서\n시야 넓히기",
      desc: "사람·환경·관점을 폭넓게 만나보기 좋은 시기예요.",
      actions: ["연합 동아리 가입", "단기 봉사", "독서 모임"],
    },
    spec: {
      title: "기초 자격 따기",
      tagline: "컴활·한국사 같은\n기본 자격증 정리",
      desc: "취업까지 시간 있으니 부담 없는 기초 자격부터 차근차근.",
      actions: ["컴활 1급", "한국사 2급", "토익 1차 응시"],
    },
    explore: {
      title: "관심사 탐색",
      tagline: "여러 직무를\n가볍게 맛보기",
      desc: "아직 진로 흐릿한 게 자연스러운 시기. 5개 직무 1주씩 체험.",
      actions: ["직무 워크숍", "현직자 커피챗 3명", "MBTI 진로 매칭"],
    },
  },
  "2학년": {
    real: {
      title: "교내 공모전 도전",
      tagline: "팀 짜서\n공모전·해커톤 한 번",
      desc: "한 학기 정도 굴려본 지금이 첫 외부 도전 적기예요.",
      actions: ["교내 해커톤 참가", "팀 프로젝트 1건", "공모전 1회 출품"],
    },
    basic: {
      title: "직무 기본기",
      tagline: "관심 직무의\n기초 도구 익히기",
      desc: "직무가 살짝 보이는 시기 — 그쪽 기본기를 단단히.",
      actions: ["Figma 입문", "SQL 기초", "GA4 입문 강의"],
    },
    experience: {
      title: "서포터즈 활동",
      tagline: "기업 서포터즈로\n첫 외부 경험",
      desc: "회사라는 환경을 미리 느껴보는 좋은 채널.",
      actions: ["여름 서포터즈 모집", "대외활동 2개", "단기 인턴 탐색"],
    },
    spec: {
      title: "어학 점수",
      tagline: "토익·오픽으로\n어학 베이스 만들기",
      desc: "3학년 되기 전에 어학을 끝내두면 마음이 편해져요.",
      actions: ["토익 850+", "오픽 IM2+", "한국사 2급"],
    },
    explore: {
      title: "방향 좁히기",
      tagline: "관심 분야 2~3개\n비교해보기",
      desc: "1학년보다는 좁게, 3학년보다는 열린 채로.",
      actions: ["직무 인터뷰 5명", "분야별 사이드 1주씩", "현직자 멘토링"],
    },
  },
  "3학년": {
    real: {
      title: "포트폴리오용 프로젝트",
      tagline: "인턴 지원에 쓸\n실전 프로젝트",
      desc: "방학 끝나고 바로 포트폴리오에 올릴 작품 1개를 끝내요.",
      actions: ["MVP 프로젝트 4주", "외부 공모전 결선", "사이드 매칭"],
    },
    basic: {
      title: "실무 도구 숙련",
      tagline: "현업이 쓰는\n도구·스택 깊게",
      desc: "이젠 입문이 아니라 숙련. 면접에서 쓸 수 있을 만큼.",
      actions: ["Figma 실무 마스터", "SQL 중급", "GA·믹스패널"],
    },
    experience: {
      title: "현장 경험",
      tagline: "단기 인턴·\n장기 서포터즈로",
      desc: "이력서에 들어갈 한 줄을 만들 시기.",
      actions: ["여름 인턴 지원", "8주 서포터즈", "유관 동아리"],
    },
    spec: {
      title: "스펙 마무리",
      tagline: "어학·자격을\n취업용으로 정리",
      desc: "정량 스펙을 마지막으로 한 번에 끝내두기.",
      actions: ["토익 950+", "오픽 IH", "SQLD/ADsP"],
    },
    explore: {
      title: "직무 좁히기",
      tagline: "마지막으로 직무\n2개로 좁히기",
      desc: "아직 헷갈리면 이번 방학에 둘 중 하나로 결정.",
      actions: ["직무 비교 시트", "현직자 5명 인터뷰", "체험형 인턴 1주"],
    },
  },
  "4학년": {
    real: {
      title: "킥 프로젝트",
      tagline: "면접에서 말할\n임팩트 1개 끝내기",
      desc: "이미 있는 것보다, '말할 수 있는 한 방'이 더 중요해요.",
      actions: ["주제 1개 깊게 4주", "리드미·발표자료", "면접 스토리화"],
    },
    basic: {
      title: "면접 대비 보강",
      tagline: "직무 기본기\n다시 한번 점검",
      desc: "지원 직무 기준으로 빈 곳만 빠르게 메꾸기.",
      actions: ["CS 면접 대비", "직무 케이스 인강", "코딩 테스트"],
    },
    experience: {
      title: "최종 인턴",
      tagline: "전환형 인턴으로\n실전에서 마무리",
      desc: "졸업 직전, 회사에서의 진짜 경험을 한 번 더.",
      actions: ["전환형 인턴 지원", "현직자 레퍼체크", "실무 프로젝트"],
    },
    spec: {
      title: "마지막 정리",
      tagline: "지원서에 들어갈\n스펙 마지막 다듬기",
      desc: "부족한 점수만 골라 끝내고, 지원서에 집중.",
      actions: ["부족 점수 재시험", "자격증 1개", "포트폴리오 마감"],
    },
    explore: {
      title: "지원 전략",
      tagline: "여러 회사·직무\n지원 포트폴리오 짜기",
      desc: "방향이 살짝 흐려도 괜찮음 — 지원지로 좁히는 시기.",
      actions: ["JD 분석 10건", "분기별 지원 플랜", "면접 스터디"],
    },
  },
};

// 입력값에 따라 5개 플랜 카드를 '생성'하는 더미 (실제론 Claude API 응답)
// level: -2(아주 가볍게) ~ +2(아주 빡세게)
const LEVEL_LABELS = ["아주 가볍게", "가볍게", "보통", "빡세게", "아주 빡세게"];
const LEVEL_PREFIXES = {
  "-2": "최소 부담으로 ",
  "-1": "가볍게 ",
  "0":  "",
  "1":  "조금 빡세게 ",
  "2":  "풀로 몰입해서 ",
};
const LEVEL_DESC_SUFFIX = {
  "-2": " (가장 부담 없는 수준으로 조정)",
  "-1": " (살짝 가볍게 조정)",
  "0":  "",
  "1":  " (실전 강도로 조정)",
  "2":  " (집중 몰입형으로 조정)",
};

function generatePlansForUser(form, level = 0) {
  const grade = form.grade || "2학년";
  const variants = PLAN_VARIANTS_BY_GRADE[grade] || PLAN_VARIANTS_BY_GRADE["2학년"];
  const seasonHint = form.season === "겨울방학" ? "겨울 한정 — " : "";
  const jobHint = form.job ? `${form.job} 지망 ` : "";
  const lvKey = String(level);

  return AXIS_ORDER.map((axisId) => {
    const axis = PLAN_AXES[axisId];
    const v = variants[axisId];
    return {
      id: axisId,
      ...axis,
      title: (LEVEL_PREFIXES[lvKey] || "") + v.title,
      tagline: v.tagline,
      desc: v.desc + (LEVEL_DESC_SUFFIX[lvKey] || ""),
      actions: v.actions,
      contextLine: `${jobHint}${grade} ${seasonHint}맞춤`.trim(),
    };
  });
}

const GRADES = ["1학년", "2학년", "3학년", "4학년"];
const SEASONS = ["여름방학", "겨울방학"];

// 관심사 / 성향 칩 (다중 선택)
const INTEREST_CHIPS = [
  "사람 만나는 거", "혼자 집중", "창의적인 작업", "논리·분석",
  "숫자·데이터", "디자인", "글쓰기", "코딩",
  "기획", "마케팅·광고", "사진·영상", "창업",
  "가르치기", "리더 역할", "외국어", "여행",
];

// 관심사 → 추천 직무 더미 매핑 (실제론 Claude가 생성)
const JOB_SUGGESTIONS_BY_KEY = {
  default: [
    {
      title: "UX 기획자",
      emoji: "🧩",
      reason: "사람 관찰과 논리적 구조화를 좋아하는 성향에 잘 맞아요.",
      skills: ["리서치", "와이어프레임", "데이터 해석"],
    },
    {
      title: "콘텐츠 마케터",
      emoji: "✍️",
      reason: "창의적 표현과 사람 반응을 보는 걸 좋아하는 분께 추천.",
      skills: ["카피라이팅", "SNS 운영", "퍼포먼스"],
    },
    {
      title: "데이터 분석가",
      emoji: "📊",
      reason: "숫자·논리·패턴 찾기를 즐긴다면 강점을 살릴 수 있어요.",
      skills: ["SQL", "통계", "시각화"],
    },
  ],
};

// 더미 결과 데이터 (플랜별)
const DUMMY_RESULTS = {
  real: {
    lectures: [
      { name: "Figma 실무 마스터", desc: "UI 설계부터 인터랙션까지 한 번에", icon: "🎨" },
      { name: "데이터 분석 부트캠프", desc: "프로젝트 기반으로 SQL·파이썬", icon: "📊" },
    ],
    certs: [
      { name: "GAIQ", desc: "구글 애널리틱스 공식 자격", icon: "📈" },
    ],
    projects: [
      { name: "사이드 프로젝트 매칭", desc: "팀원 모아서 4주 MVP 출시", icon: "🚀" },
      { name: "교내 창업 동아리", desc: "아이디어 → 시제품까지", icon: "💡" },
    ],
  },
  basic: {
    lectures: [
      { name: "CS50 한국어판", desc: "컴공 기초, 무료로 단단하게", icon: "💻" },
      { name: "마케팅 입문 강의", desc: "퍼널·STP 기본기부터", icon: "📚" },
    ],
    certs: [
      { name: "컴활 1급", desc: "엑셀·DB 기본 자격", icon: "📑" },
      { name: "ADsP", desc: "데이터 분석 준전문가", icon: "🧮" },
    ],
    projects: [
      { name: "노션 학습 트래커", desc: "30일 루틴 만들기", icon: "✏️" },
    ],
  },
  experience: {
    lectures: [
      { name: "퍼블릭 스피킹 클래스", desc: "발표력·자기소개 훈련", icon: "🎤" },
    ],
    certs: [
      { name: "한국사능력검정 2급", desc: "공공기관 가산점", icon: "🏛️" },
    ],
    projects: [
      { name: "대학생 서포터즈 모음", desc: "기업·기관 활동 큐레이션", icon: "🌱" },
      { name: "해외 봉사 프로그램", desc: "단기 파견 기회 정리", icon: "🌏" },
    ],
  },
  spec: {
    lectures: [
      { name: "토익 950+ 단기 완성", desc: "RC·LC 패턴 분석", icon: "📝" },
    ],
    certs: [
      { name: "오픽 IH 패스반", desc: "스피킹 템플릿 제공", icon: "🗣️" },
      { name: "SQLD", desc: "데이터 자격 입문 끝판왕", icon: "🗄️" },
    ],
    projects: [
      { name: "스펙업 체크리스트", desc: "방학 8주 플래너", icon: "✅" },
    ],
  },
  explore: {
    lectures: [
      { name: "직무 탐색 워크숍", desc: "10개 직무 1시간씩 맛보기", icon: "🧭" },
      { name: "MBTI 진로 매칭", desc: "성향 기반 직무 추천", icon: "🔍" },
    ],
    certs: [],
    projects: [
      { name: "주간 챌린지", desc: "매주 다른 분야 미니 과제", icon: "🎯" },
      { name: "현직자 커피챗", desc: "5개 직무 인터뷰 매칭", icon: "☕" },
    ],
  },
};

const DUMMY_JOBS = [
  { org: "(주)카카오스타일", title: "UX 리서치 인턴", deadline: "D-12", tag: "인턴" },
  { org: "토스", title: "주니어 프로덕트 디자이너 챌린지", deadline: "D-7", tag: "공모전" },
  { org: "대학생 마케팅 연합", title: "여름 서포터즈 8기 모집", deadline: "D-3", tag: "서포터즈" },
];

// ───────────────────────────────────────────────────────
// Small UI primitives
// ───────────────────────────────────────────────────────
const Pill = ({ children, color = "indigo" }) => {
  const map = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border rounded-full ${map[color]}`}>
      {children}
    </span>
  );
};

const STEP_ORDER = ["input", "jobSuggest", "direction", "result"];
const Header = ({ step, hasJobSuggest }) => {
  // jobSuggest 단계가 없으면 4개 도트 중 3개만 표시
  const dots = hasJobSuggest ? STEP_ORDER : STEP_ORDER.filter((s) => s !== "jobSuggest");
  const currentIdx = dots.indexOf(step);
  return (
    <header className="w-full max-w-[640px] mx-auto px-5 pt-6 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold"
             style={{ background: "linear-gradient(135deg,#5B6EF5,#7C8DF8)" }}>
          ☀
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight text-slate-900">방학 뭐하지?</div>
          <div className="text-[11px] text-slate-500 -mt-0.5">대학생 방학 플랜 추천</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {dots.map((s, i) => (
          <div key={s}
               className={`h-1.5 rounded-full transition-all ${
                 i === currentIdx ? "w-6 bg-[#5B6EF5]" :
                 i < currentIdx   ? "w-3 bg-[#5B6EF5]/60" :
                                    "w-3 bg-slate-200"
               }`} />
        ))}
      </div>
    </header>
  );
};

// ───────────────────────────────────────────────────────
// Step 1 — 입력
// ───────────────────────────────────────────────────────
function StepInput({ form, setForm, onNext, tweaks }) {
  const radius = tweaks.cornerRadius === "rounded" ? "rounded-2xl" : "rounded-md";
  const canNext = (form.job.trim() || form.unknownJob) && form.grade && form.season;

  const handleUnknown = (v) => {
    setForm({ ...form, unknownJob: v, job: v ? "" : form.job });
  };

  return (
    <section data-screen-label="01 입력" className="w-full max-w-[640px] mx-auto px-5 pb-32">
      <div className="mt-2 mb-7">
        <h1 className="text-[26px] leading-[1.25] font-extrabold text-slate-900 tracking-tight">
          이번 방학,<br />
          <span className="text-[#5B6EF5]">뭐 하면 좋을까?</span>
        </h1>
        <p className="mt-2 text-[14px] text-slate-500">
          3가지만 알려주면, AI가 5가지 방향성을 골라줄게요.
        </p>
      </div>

      {/* 직무 */}
      <div className="space-y-2.5 mb-6">
        <label className="block text-[13px] font-semibold text-slate-700">
          희망 직무 <span className="text-slate-400 font-normal">(선택)</span>
        </label>
        <input
          type="text"
          value={form.job}
          disabled={form.unknownJob}
          onChange={(e) => setForm({ ...form, job: e.target.value })}
          placeholder="예: UX 기획자, 마케터 / 없으면 비워두세요"
          className={`w-full px-4 py-3.5 text-[14px] bg-white border-2 ${radius}
                      border-slate-200 focus:border-[#5B6EF5] focus:outline-none
                      placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400`}
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.unknownJob}
            onChange={(e) => handleUnknown(e.target.checked)}
            className="w-4 h-4 accent-[#5B6EF5]"
          />
          <span className="text-[13px] text-slate-600">직무를 모르겠어요</span>
        </label>
      </div>

      {/* 학년 */}
      <div className="space-y-2.5 mb-6">
        <label className="block text-[13px] font-semibold text-slate-700">학년</label>
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => {
            const active = form.grade === g;
            return (
              <button key={g}
                onClick={() => setForm({ ...form, grade: g })}
                className={`py-3 text-[14px] font-medium border-2 transition-all ${radius} ${
                  active
                    ? "border-[#5B6EF5] bg-[#5B6EF5]/8 text-[#5B6EF5]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                style={active ? { backgroundColor: "rgba(91,110,245,0.08)" } : {}}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* 시즌 */}
      <div className="space-y-2.5 mb-10">
        <label className="block text-[13px] font-semibold text-slate-700">방학 시즌</label>
        <div className="grid grid-cols-2 gap-2">
          {SEASONS.map((s) => {
            const active = form.season === s;
            return (
              <button key={s}
                onClick={() => setForm({ ...form, season: s })}
                className={`py-3.5 text-[14px] font-semibold border-2 transition-all ${radius} ${
                  active
                    ? "border-[#5B6EF5] text-[#5B6EF5]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                style={active ? { backgroundColor: "rgba(91,110,245,0.08)" } : {}}>
                <span className="mr-1.5">{s === "여름방학" ? "🏖" : "❄"}</span>{s}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        disabled={!canNext}
        onClick={onNext}
        className={`w-full py-4 text-[15px] font-bold transition-all ${radius} ${
          canNext
            ? "text-white shadow-lg shadow-indigo-200 active:scale-[0.99]"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        }`}
        style={canNext ? { backgroundColor: "#5B6EF5" } : {}}>
        {canNext ? "다음 단계로 →" : "정보를 입력해주세요"}
      </button>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Step 1.5 — 직무 모르겠으면 관심사·성향 → AI 직무 제안
// ───────────────────────────────────────────────────────
function StepJobSuggest({ form, setForm, onNext, onBack, tweaks }) {
  const radius = tweaks.cornerRadius === "rounded" ? "rounded-2xl" : "rounded-md";
  const [interests, setInterests] = useState(form.interests || []);
  const [freeText, setFreeText] = useState(form.freeText || "");
  const [phase, setPhase] = useState("input"); // input | loading | suggested
  const [suggestions, setSuggestions] = useState([]);
  const [chosen, setChosen] = useState(null);

  const toggleInterest = (chip) => {
    setInterests((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const canSubmit = interests.length > 0 || freeText.trim().length > 0;

  const requestSuggestions = async () => {
    setPhase("loading");

    const interestsText = interests.length > 0 ? interests.join(", ") : "(없음)";
    const freeTextSafe = freeText.trim() || "(없음)";
    const grade = form.grade || "미지정";
    const season = form.season || "미지정";

    const userPrompt =
      `관심사: ${interestsText}\n` +
      `추가 설명: ${freeTextSafe}\n` +
      `학년: ${grade}, 방학: ${season}\n` +
      `아래 형식으로 직무 3개를 추천해줘.\n` +
      `{\n` +
      `  "jobs": [\n` +
      `    {\n` +
      `      "title": "직무명",\n` +
      `      "emoji": "이모지",\n` +
      `      "reason": "추천 이유 한 문장",\n` +
      `      "skills": ["스킬1", "스킬2", "스킬3"]\n` +
      `    }\n` +
      `  ]\n` +
      `}`;

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system:
            "당신은 대학생 진로 컨설턴트입니다.\n" +
            "학생의 관심사와 성향을 보고 잘 맞는 직무 3개를 추천해주세요.\n" +
            "반드시 JSON만 반환하고 다른 텍스트는 절대 포함하지 마세요.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.content?.[0]?.text || "";
      const parsed = JSON.parse(text);
      const jobs = parsed?.jobs;
      if (!Array.isArray(jobs) || jobs.length === 0) throw new Error("invalid jobs payload");
      setSuggestions(jobs);
      setPhase("suggested");
    } catch (err) {
      console.warn("[Claude API] 직무 추천 호출 실패 — 더미 데이터로 폴백:", err);
      setSuggestions(JOB_SUGGESTIONS_BY_KEY.default);
      setPhase("suggested");
    }
  };

  const handleConfirm = () => {
    if (!chosen) return;
    setForm({
      ...form,
      interests,
      freeText,
      job: chosen.title,
      jobFromAI: true,
    });
    onNext();
  };

  return (
    <section data-screen-label="01b 직무 제안" className="w-full max-w-[640px] mx-auto px-5 pb-32">
      <button onClick={onBack}
              className="text-[13px] text-slate-500 mb-3 inline-flex items-center gap-1 hover:text-slate-800">
        ← 뒤로
      </button>

      {phase !== "suggested" && (
        <>
          <div className="mb-6">
            <h2 className="text-[22px] leading-tight font-extrabold text-slate-900 tracking-tight">
              괜찮아요,<br />
              <span className="text-[#5B6EF5]">관심사만 알려주세요.</span>
            </h2>
            <p className="mt-2 text-[14px] text-slate-500">
              AI가 잘 맞을 거 같은 직무 3개를 골라줄게요.
            </p>
          </div>

          {/* 관심사 칩 */}
          <div className="mb-6">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2.5">
              이런 게 좋아요 <span className="text-slate-400 font-normal">(여러 개 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_CHIPS.map((c) => {
                const active = interests.includes(c);
                return (
                  <button key={c}
                    onClick={() => toggleInterest(c)}
                    className={`px-3.5 py-2 text-[13px] font-medium border-2 rounded-full transition-all ${
                      active
                        ? "border-[#5B6EF5] text-[#5B6EF5]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                    style={active ? { backgroundColor: "rgba(91,110,245,0.08)" } : {}}>
                    {active && <span className="mr-1">✓</span>}{c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 자유 입력 */}
          <div className="mb-8">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2.5">
              성향·주제를 자유롭게 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              placeholder="예: 내향적이고 서비스 기획에 관심, 그림 그리고 음악 듣는 거 좋아해요"
              className={`w-full px-4 py-3 text-[14px] bg-white border-2 ${radius}
                          border-slate-200 focus:border-[#5B6EF5] focus:outline-none
                          placeholder:text-slate-400 resize-none`}
            />
          </div>

          <button
            disabled={!canSubmit || phase === "loading"}
            onClick={requestSuggestions}
            className={`w-full py-4 text-[15px] font-bold transition-all ${radius} ${
              canSubmit && phase !== "loading"
                ? "text-white shadow-lg shadow-indigo-200 active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            style={canSubmit && phase !== "loading" ? { backgroundColor: "#5B6EF5" } : {}}>
            {phase === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                AI가 직무를 고르는 중…
              </span>
            ) : "추천 직무 보기 →"}
          </button>
        </>
      )}

      {phase === "suggested" && (
        <>
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
                 style={{ backgroundColor: "#FFD166" }}>
              <span className="text-[11px] font-bold text-amber-900">✨ AI 추천</span>
            </div>
            <h2 className="text-[22px] leading-tight font-extrabold text-slate-900 tracking-tight">
              이 중 끌리는<br />직무가 있어요?
            </h2>
            <p className="mt-2 text-[13px] text-slate-500">
              하나를 고르면 그 방향으로 플랜을 짜드릴게요.
            </p>
          </div>

          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const active = chosen?.title === s.title;
              return (
                <button key={i}
                  onClick={() => setChosen(s)}
                  className={`w-full text-left p-4 border-2 transition-all ${radius} ${
                    active
                      ? "border-[#5B6EF5] shadow-md shadow-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={active ? { backgroundColor: "rgba(91,110,245,0.06)" } : {}}>
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 shrink-0 ${radius} bg-slate-50 flex items-center justify-center text-2xl`}>
                      {s.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[15px] font-extrabold text-slate-900">{s.title}</div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-[#5B6EF5] text-white flex items-center justify-center text-[11px] font-bold">✓</div>
                        )}
                      </div>
                      <div className="text-[12.5px] text-slate-600 mt-1 leading-snug">{s.reason}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.skills.map((k) => (
                          <span key={k} className="px-2 py-0.5 text-[10.5px] font-medium bg-slate-100 text-slate-600 rounded-full">
                            #{k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={() => { setPhase("input"); setChosen(null); }}
                    className={`px-4 py-3.5 text-[13px] font-semibold border-2 border-slate-200 bg-white text-slate-700 ${radius}`}>
              다시 고르기
            </button>
            <button
              disabled={!chosen}
              onClick={handleConfirm}
              className={`flex-1 py-3.5 text-[14px] font-bold transition-all ${radius} ${
                chosen
                  ? "text-white shadow-lg shadow-indigo-200 active:scale-[0.99]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
              style={chosen ? { backgroundColor: "#5B6EF5" } : {}}>
              {chosen ? `${chosen.title}(으)로 진행 →` : "직무를 선택해주세요"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Step 2 — 5개 플랜 카드
// ───────────────────────────────────────────────────────
function StepDirection({ form, plans, loading, level, onAdjustLevel, selected, setSelected, onNext, onBack, tweaks }) {
  const radius = tweaks.cornerRadius === "rounded" ? "rounded-2xl" : "rounded-md";
  const layoutClass =
    tweaks.cardLayout === "list"
      ? "flex flex-col gap-3"
      : tweaks.cardLayout === "stack"
      ? "flex flex-col gap-3"
      : "grid grid-cols-2 gap-3";

  return (
    <section data-screen-label="02 플랜 선택" className="w-full max-w-[640px] mx-auto px-5 pb-32">
      <button onClick={onBack}
              className="text-[13px] text-slate-500 mb-3 inline-flex items-center gap-1 hover:text-slate-800">
        ← 뒤로
      </button>
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
             style={{ backgroundColor: "#FFD166" }}>
          <span className="text-[11px] font-bold text-amber-900">✨ AI 추천</span>
        </div>
        <h2 className="text-[22px] leading-tight font-extrabold text-slate-900 tracking-tight">
          {form.grade} {form.season}<br />
          <span className="text-[#5B6EF5]">너에게 맞는 5가지 플랜</span>
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {form.job && <Pill>{form.jobFromAI ? "✨ " : ""}{form.job}</Pill>}
          {form.grade && <Pill color="slate">{form.grade}</Pill>}
          {form.season && <Pill color="yellow">{form.season}</Pill>}
        </div>
      </div>

      {loading && (
        <div className={`p-8 ${radius} border border-slate-200 bg-white flex flex-col items-center gap-3 my-6`}>
          <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-[#5B6EF5] animate-spin" />
          <div className="text-[13px] font-semibold text-slate-700">너에게 맞는 플랜을 짜는 중…</div>
          <div className="text-[12px] text-slate-500">{form.grade} · {form.season}{form.job ? ` · ${form.job}` : ""}</div>
        </div>
      )}

      {!loading && (
        <>
          <div className={layoutClass}>
            {plans.map((p, i) => {
              const active = selected === p.id;
              const isLast = i === plans.length - 1;
              const wide = tweaks.cardLayout === "grid" && isLast ? "col-span-2" : "";
              return (
                <button key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`relative text-left p-4 border-2 transition-all overflow-hidden
                              ${radius} ${wide}
                              ${active
                                ? "border-[#5B6EF5] shadow-md shadow-indigo-100"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
                  style={active ? { backgroundColor: "rgba(91,110,245,0.06)" } : {}}>
                  {active && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#5B6EF5] text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  {tweaks.showEmoji && (
                    <div className={`w-10 h-10 ${radius} flex items-center justify-center text-xl mb-3
                                    bg-gradient-to-br ${p.tone}`}>
                      {p.emoji}
                    </div>
                  )}
                  <div className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-1.5 ${p.pill}`}>
                    {p.name}
                  </div>
                  <div className="text-[15px] font-extrabold text-slate-900 leading-tight mb-1">
                    {p.title}
                  </div>
                  <div className="text-[12.5px] font-semibold text-slate-700 leading-snug whitespace-pre-line">
                    {p.tagline}
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-1.5 leading-snug">
                    {p.desc}
                  </div>
                  {p.actions && p.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {p.actions.slice(0, 3).map((a, j) => (
                        <span key={j} className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* 수준 조절 — 좌우 버튼 */}
          {(() => {
            const min = level <= -2;
            const max = level >= 2;
            const idx = (level ?? 0) + 2; // 0~4
            return (
              <div className="mt-4 flex items-stretch gap-2">
                <button onClick={() => onAdjustLevel(-1)} disabled={min}
                  className={`flex-1 py-3 text-[12.5px] font-bold border-2 transition-all ${radius}
                              ${min
                                ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                                : "border-slate-200 bg-white text-slate-700 hover:border-[#5B6EF5] hover:text-[#5B6EF5]"}`}>
                  ← 수준 낮추기
                  <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">더 가병게</div>
                </button>
                <div className={`px-3 flex flex-col items-center justify-center min-w-[110px] border-2 border-slate-200 bg-white ${radius}`}>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider">CURRENT</div>
                  <div className="text-[12.5px] font-extrabold text-slate-900 mt-0.5">{LEVEL_LABELS[idx]}</div>
                  <div className="flex gap-0.5 mt-1.5">
                    {[0,1,2,3,4].map((d) => (
                      <div key={d}
                           className="w-1.5 h-1.5 rounded-full"
                           style={{ backgroundColor: d === idx ? "#5B6EF5" : "#E2E8F0" }} />
                    ))}
                  </div>
                </div>
                <button onClick={() => onAdjustLevel(1)} disabled={max}
                  className={`flex-1 py-3 text-[12.5px] font-bold border-2 transition-all ${radius}
                              ${max
                                ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                                : "border-slate-200 bg-white text-slate-700 hover:border-[#5B6EF5] hover:text-[#5B6EF5]"}`}>
                  수준 높이기 →
                  <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">더 빡세게</div>
                </button>
              </div>
            );
          })()}
        </>
      )}

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-gradient-to-t from-white via-white/95 to-white/0 pointer-events-none">
        <div className="max-w-[640px] mx-auto pointer-events-auto">
          <button
            disabled={!selected || loading}
            onClick={onNext}
            className={`w-full py-4 text-[15px] font-bold transition-all ${radius} ${
              selected && !loading
                ? "text-white shadow-lg shadow-indigo-200 active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            style={selected && !loading ? { backgroundColor: "#5B6EF5" } : {}}>
            {selected ? "이 플랜으로 시작하기 →" : "플랜을 선택해주세요"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Step 3 — 결과
// ───────────────────────────────────────────────────────
function ItemCard({ item, radius, accent }) {
  return (
    <div className={`relative p-3 ${radius} bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col h-full`}>
      <div className={`w-8 h-8 ${radius} flex items-center justify-center text-base mb-2`}
           style={{ backgroundColor: accent }}>
        {item.icon}
      </div>
      <div className="text-[12.5px] font-extrabold text-slate-900 leading-tight line-clamp-2">{item.name}</div>
      <div className="text-[11px] text-slate-500 mt-1 leading-snug flex-1 line-clamp-2">{item.desc}</div>
      <button className="mt-2 self-start text-[11px] font-semibold text-[#5B6EF5] hover:underline">
        보기 →
      </button>
    </div>
  );
}

function JobSection({ radius }) {
  const [state, setState] = useState("loading"); // loading | success | error

  useEffect(() => {
    // TODO: Serper API 호출 — 실제 공고 데이터 fetch
    // fetch("/api/serper", { method:"POST", body: JSON.stringify({ q: ... }) })
    const t = setTimeout(() => {
      setState(Math.random() < 0.85 ? "success" : "error");
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-extrabold text-slate-900">📢 모집 중인 공고</h3>
        {state === "error" && (
          <button onClick={() => setState("loading")}
                  className="text-[12px] text-[#5B6EF5] font-semibold">다시 시도</button>
        )}
      </div>
      {state === "loading" && (
        <div className={`p-6 ${radius} border border-slate-200 bg-white flex flex-col items-center gap-3`}>
          <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-[#5B6EF5] animate-spin" />
          <div className="text-[12px] text-slate-500">실시간 공고를 가져오는 중…</div>
        </div>
      )}
      {state === "success" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DUMMY_JOBS.map((j, i) => (
            <div key={i} className={`p-4 ${radius} border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Pill color="yellow">{j.tag}</Pill>
                <span className="text-[11px] text-rose-600 font-bold">{j.deadline}</span>
              </div>
              <div className="text-[14px] font-extrabold text-slate-900 leading-tight">{j.title}</div>
              <div className="text-[12px] text-slate-500 mt-1 flex-1">{j.org}</div>
              <button className="mt-3 self-start px-3 py-1.5 text-[11.5px] font-semibold rounded-full text-white"
                      style={{ backgroundColor: "#5B6EF5" }}>
                지원하기 →
              </button>
            </div>
          ))}
        </div>
      )}
      {state === "error" && (
        <div className={`p-6 ${radius} border border-dashed border-slate-300 bg-slate-50 text-center`}>
          <div className="text-[14px] font-semibold text-slate-700">현재 공고를 불러오지 못했어요 🥲</div>
          <div className="text-[12px] text-slate-500 mt-1">잠시 후 다시 시도해주세요.</div>
        </div>
      )}
    </div>
  );
}

function StepResult({ form, plan, onRestart, tweaks }) {
  const radius = tweaks.cornerRadius === "rounded" ? "rounded-2xl" : "rounded-md";
  const data = DUMMY_RESULTS[plan.id] || DUMMY_RESULTS.real;
  const sections = [
    { key: "lectures", label: "추천 강의", icon: "🎓" },
    { key: "certs",    label: "자격증",   icon: "🏅" },
    { key: "projects", label: "프로젝트", icon: "🛠" },
  ];

  // TODO: Claude API 호출 — 실제 추천 콘텐츠 생성
  // const recs = await anthropic.messages.create({ model:"claude-...", messages:[...] })

  return (
    <section data-screen-label="03 결과" className="w-full max-w-[640px] mx-auto px-5 pb-24">
      {/* 헤로 카드 */}
      <div className={`p-5 ${radius} mb-6 text-white relative overflow-hidden`}
           style={{ background: "linear-gradient(135deg,#5B6EF5 0%,#7B6FE8 100%)" }}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20"
             style={{ backgroundColor: "#FFD166" }} />
        <div className="absolute right-10 bottom-2 text-5xl opacity-30">{plan.emoji}</div>
        <div className="relative">
          <div className="text-[11px] font-semibold opacity-80 mb-1">너의 방학 플랜</div>
          <div className="text-[22px] font-extrabold leading-tight">
            {plan.emoji} {plan.title || plan.name}
          </div>
          <div className="text-[13px] opacity-90 mt-1 whitespace-pre-line">
            {(plan.tagline || "").replace("\n", " ")}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {form.job && (
              <span className="px-2.5 py-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full inline-flex items-center gap-1">
                {form.jobFromAI && <span>✨</span>}
                {form.job}
              </span>
            )}
            <span className="px-2.5 py-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full">
              {form.grade}
            </span>
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full"
                  style={{ backgroundColor: "#FFD166", color: "#5a4500" }}>
              {form.season}
            </span>
          </div>
        </div>
      </div>

      {/* 섹션 1: 강의 / 자격증 / 프로젝트 — 키워드별 행으로 배치 */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-extrabold text-slate-900">✨ 너에게 딱 맞는 추천</h3>
          <span className="text-[11px] text-slate-400">AI 큐레이션</span>
        </div>
        <div className="flex flex-col gap-4">
          {sections.map((s) => {
            const items = data[s.key] || [];
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-extrabold text-slate-700">{s.label}</div>
                  <span className="text-[10.5px] text-slate-400">{items.length}개</span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {items.map((it, i) => (
                    <div key={i}
                         className={`p-3 ${radius} bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all`}>
                      <div className="text-[12.5px] font-extrabold text-slate-900 leading-tight">{it.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-snug">{it.desc}</div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className={`col-span-4 p-3 ${radius} border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400 text-center`}>
                      추천 항목 없음
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 2: 공고 (로딩) */}
      <div className="mb-8">
        <JobSection radius={radius} />
      </div>

      {/* 다시 선택 */}
      <button onClick={onRestart}
        className={`w-full py-3.5 text-[14px] font-semibold border-2 border-slate-200 bg-white text-slate-700 ${radius} hover:border-slate-300`}>
        ↻ 다시 선택하기
      </button>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// App
// ───────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [step, setStep] = useState("input");
  const [form, setForm] = useState({
    job: "", unknownJob: false, grade: "", season: "",
    interests: [], freeText: "", jobFromAI: false,
  });
  const [selectedPlan, setSelectedPlan] = useState(null);

  // 입력 → 다음: 직무 모르면 jobSuggest, 알면 direction
  const goAfterInput = () => {
    setStep(form.unknownJob ? "jobSuggest" : "direction");
  };

  // 결과까지 본 후 입력 단계로 되돌리되 직무 정보는 유지하고 싶다면 여기서 제어
  const goBackFromDirection = () => {
    setStep(form.jobFromAI ? "jobSuggest" : "input");
  };

  // 추천 플랜 5개 (AI 생성 시뮬레이션)
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [level, setLevel] = useState(0); // -2 ~ +2

  // direction 단계 진입 시 더미 AI 호출
  const generatePlans = (formSnapshot, lv = 0) => {
    setPlansLoading(true);
    setPlans([]);
    setSelectedPlan(null);
    // TODO: Claude API 호출 — 입력값 + 수준(level)을 바탕으로 5개 플랜 카드 생성
    setTimeout(() => {
      setPlans(generatePlansForUser(formSnapshot, lv));
      setPlansLoading(false);
    }, 900);
  };

  const goToDirection = () => {
    setLevel(0);
    setStep("direction");
    generatePlans(form, 0);
  };

  const adjustLevel = (delta) => {
    const next = Math.max(-2, Math.min(2, level + delta));
    if (next === level) return;
    setLevel(next);
    generatePlans(form, next);
  };

  const goAfterInputV2 = () => {
    if (form.unknownJob) setStep("jobSuggest");
    else goToDirection();
  };

  // demo 모드: tweaks.demoStep로 바로 점프
  useEffect(() => {
    if (tweaks.demoStep === "auto") return;
    if (tweaks.demoStep === "1") setStep("input");
    if (tweaks.demoStep === "1b") {
      setForm((f) => ({ ...f, unknownJob: true, grade: "2학년", season: "여름방학" }));
      setStep("jobSuggest");
    }
    if (tweaks.demoStep === "2") {
      const next = { ...form, job: "UX 기획자", unknownJob: false, grade: "3학년", season: "여름방학" };
      setForm(next);
      setLevel(0);
      setStep("direction");
      generatePlans(next, 0);
    }
    if (tweaks.demoStep === "3") {
      const next = { ...form, job: "UX 기획자", unknownJob: false, grade: "3학년", season: "여름방학" };
      setForm(next);
      const generated = generatePlansForUser(next);
      setPlans(generated);
      setSelectedPlan("real");
      setStep("result");
    }
  }, [tweaks.demoStep]);

  const plan = useMemo(
    () => plans.find((p) => p.id === selectedPlan),
    [selectedPlan, plans]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAFB" }}>
      <Header step={step} hasJobSuggest={form.unknownJob} />

      {step === "input" && (
        <StepInput form={form} setForm={setForm} tweaks={tweaks}
                   onNext={goAfterInputV2} />
      )}
      {step === "jobSuggest" && (
        <StepJobSuggest form={form} setForm={setForm} tweaks={tweaks}
                        onNext={goToDirection}
                        onBack={() => setStep("input")} />
      )}
      {step === "direction" && (
        <StepDirection form={form} plans={plans} loading={plansLoading}
                       level={level} onAdjustLevel={adjustLevel}
                       selected={selectedPlan} setSelected={setSelectedPlan}
                       tweaks={tweaks}
                       onNext={() => setStep("result")} onBack={goBackFromDirection} />
      )}
      {step === "result" && plan && (
        <StepResult form={form} plan={plan} tweaks={tweaks}
                    onRestart={() => { setStep("input"); setSelectedPlan(null); }} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="레이아웃">
          <TweakRadio
            label="플랜 카드 배치"
            value={tweaks.cardLayout}
            onChange={(v) => setTweak("cardLayout", v)}
            options={[
              { value: "grid", label: "그리드 (2-2-1)" },
              { value: "list", label: "리스트" },
            ]}
          />
          <TweakRadio
            label="모서리"
            value={tweaks.cornerRadius}
            onChange={(v) => setTweak("cornerRadius", v)}
            options={[
              { value: "rounded", label: "둥글게" },
              { value: "sharp", label: "각지게" },
            ]}
          />
          <TweakToggle
            label="이모지 아이콘"
            value={tweaks.showEmoji}
            onChange={(v) => setTweak("showEmoji", v)}
          />
        </TweakSection>
        <TweakSection title="데모 점프">
          <TweakSelect
            label="현재 단계"
            value={tweaks.demoStep}
            onChange={(v) => setTweak("demoStep", v)}
            options={[
              { value: "auto", label: "자동 (사용자 흐름)" },
              { value: "1", label: "1. 입력 화면" },
              { value: "1b", label: "1.5 직무 제안 (AI)" },
              { value: "2", label: "2. 플랜 선택" },
              { value: "3", label: "3. 결과 화면" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
