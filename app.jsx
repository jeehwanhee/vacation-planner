/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect */
const { useState, useEffect, useMemo } = React;

// ───────────────────────────────────────────────────────
// Tweakable defaults (persisted via host)
// ───────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardLayout": "grid",
  "showEmoji": true,
  "cornerRadius": "rounded",
  "demoStep": "auto"
}/*EDITMODE-END*/;

// ───────────────────────────────────────────────────────
// 5개 활동 카드 — AI가 생성, 아래는 API 실패 시 폴백용
// ───────────────────────────────────────────────────────
const ACTIVITY_COLORS = [
  { tone: "from-rose-50 to-orange-50",    pill: "bg-rose-100 text-rose-700" },
  { tone: "from-sky-50 to-indigo-50",     pill: "bg-sky-100 text-sky-700" },
  { tone: "from-emerald-50 to-teal-50",   pill: "bg-emerald-100 text-emerald-700" },
  { tone: "from-amber-50 to-yellow-50",   pill: "bg-amber-100 text-amber-800" },
  { tone: "from-violet-50 to-fuchsia-50", pill: "bg-violet-100 text-violet-700" },
];

const FALLBACK_ACTIVITIES = [
  { id: "a1", emoji: "🎨", title: "포트폴리오 프로젝트 제작", tagline: "기획부터\n완성까지", desc: "실무 감각을 키우면서 포트폴리오에 바로 쓸 결과물을 만들어요.", duration: "6-8주" },
  { id: "a2", emoji: "📝", title: "어학 점수 취득", tagline: "토익·오픽으로\n어학 베이스", desc: "취업 필수 스펙인 어학 점수를 방학 내 집중적으로 끝내요.", duration: "6-8주" },
  { id: "a3", emoji: "💻", title: "실무 도구 스킬업", tagline: "현업이 쓰는\n도구 깊게 파기", desc: "지원 직무에서 쓰는 핵심 툴을 마스터해 면접 당장 써먹어요.", duration: "4-6주" },
  { id: "a4", emoji: "🌍", title: "대외 활동·인턴 경험", tagline: "실전 경험으로\n이력서 한 줄", desc: "서포터즈·인턴으로 회사 환경을 미리 체험하고 인맥도 쌓아요.", duration: "8-12주" },
  { id: "a5", emoji: "🏅", title: "자격증 취득", tagline: "취업 가산점\n자격증 완성", desc: "직무와 관련된 자격증을 방학 기간 안에 집중해서 취득해요.", duration: "8-12주" },
];

const GRADES = ["1학년", "2학년", "3학년", "4학년"];
const SEASONS = ["여름방학", "겨울방학"];

// ───────────────────────────────────────────────────────
// 요청 횟수 제한 (localStorage, 하루 20회, 자정 리셋)
// ───────────────────────────────────────────────────────
const REQUEST_LIMIT = 20;
const QUOTA_COUNT_KEY = "vaca_req_count";
const QUOTA_DATE_KEY = "vaca_req_date";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function checkAndIncrementQuota() {
  try {
    const today = todayStr();
    const storedDate = localStorage.getItem(QUOTA_DATE_KEY);
    let count = parseInt(localStorage.getItem(QUOTA_COUNT_KEY) || "0", 10);
    if (storedDate !== today) {
      count = 0;
      localStorage.setItem(QUOTA_DATE_KEY, today);
    }
    if (count >= REQUEST_LIMIT) return false;
    localStorage.setItem(QUOTA_COUNT_KEY, String(count + 1));
    return true;
  } catch (_) {
    return true;
  }
}

// 직무 입력 sanitize: 인젝션·프롬프트 우회 방지
function sanitizeJob(s) {
  return (s || "").replace(/[<>{}[\]\\`$|;]/g, "").slice(0, 50);
}

// 관심사 칩 — 카테고리별 구조
const INTEREST_CATEGORIES = [
  {
    label: "💻 IT · 개발",
    chips: ["개발·프로그래밍", "데이터 분석", "AI·머신러닝", "클라우드·인프라"],
  },
  {
    label: "🎨 디자인 · 미디어",
    chips: ["UI/UX 디자인", "그래픽·브랜딩", "영상·모션", "제품 기획"],
  },
  {
    label: "📊 경영 · 마케팅",
    chips: ["마케팅·광고", "브랜드·콘텐츠", "경영·전략", "창업·스타트업"],
  },
  {
    label: "💰 금융 · 법무",
    chips: ["금융·투자", "회계·재무", "법률·행정", "공공·정책"],
  },
  {
    label: "📚 인문 · 사회",
    chips: ["교육·강의", "언론·저널리즘", "심리·상담", "사회복지"],
  },
  {
    label: "⚙️ 이공계 · 기타",
    chips: ["기계·전기", "화학·바이오", "건축·인테리어", "의료·보건"],
  },
];
const INTEREST_CHIPS = INTEREST_CATEGORIES.flatMap((c) => c.chips);

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

const LEVEL_LABELS = ["아주 가볍게", "가볍게", "보통", "빡세게", "아주 빡세게"];

// Claude API 실패 시 주차별 일정 폴백
const FALLBACK_SCHEDULE = [
  { week: 1, label: "준비 & 기초 학습", tasks: ["목표 구체화 및 계획 수립", "필요한 도구·자료 세팅", "기초 개념 및 레퍼런스 수집"] },
  { week: 2, label: "본격 실행 시작", tasks: ["첫 번째 핵심 과제 착수", "데일리 루틴 확립", "중간 점검 기준 정하기"] },
  { week: 3, label: "집중 실행", tasks: ["핵심 과제 중반부 진행", "막히는 부분 보완 학습", "진행 상황 기록"] },
  { week: 4, label: "마무리 & 정리", tasks: ["최종 결과물 완성", "회고 및 다음 단계 계획", "포트폴리오·이력서 업데이트"] },
];

function detectTag(text) {
  if (/서포터즈/.test(text)) return "서포터즈";
  if (/공모전|챌린지|해커톤/.test(text)) return "공모전";
  if (/인턴/.test(text)) return "인턴";
  if (/채용|신입/.test(text)) return "채용";
  return "모집";
}

// Serper가 반환하는 상대/절대 날짜 문자열을 Date 객체로 변환
function parseSerperDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date();

  // 영어: "3 days ago", "2 weeks ago", "1 month ago"
  const en = dateStr.match(/(\d+)\s*(hour|day|week|month|year)s?\s*ago/i);
  if (en) {
    const n = parseInt(en[1]);
    const d = new Date(now);
    const u = en[2].toLowerCase();
    if (u === "hour")  d.setHours(d.getHours() - n);
    else if (u === "day")   d.setDate(d.getDate() - n);
    else if (u === "week")  d.setDate(d.getDate() - n * 7);
    else if (u === "month") d.setMonth(d.getMonth() - n);
    else if (u === "year")  d.setFullYear(d.getFullYear() - n);
    return d;
  }

  // 한국어: "3일 전", "2주 전", "1개월 전"
  const kr = dateStr.match(/(\d+)\s*(시간|일|주|개월|년)\s*전/);
  if (kr) {
    const n = parseInt(kr[1]);
    const d = new Date(now);
    if (kr[2] === "시간") d.setHours(d.getHours() - n);
    else if (kr[2] === "일")   d.setDate(d.getDate() - n);
    else if (kr[2] === "주")   d.setDate(d.getDate() - n * 7);
    else if (kr[2] === "개월") d.setMonth(d.getMonth() - n);
    else if (kr[2] === "년")   d.setFullYear(d.getFullYear() - n);
    return d;
  }

  // 절대 날짜 시도
  const abs = new Date(dateStr);
  return isNaN(abs) ? null : abs;
}

// 제목+스니펫에서 마감일을 추출 (링커리어·올포유·씽크컨테스트 공통 패턴)
function parseDeadline(text) {
  if (!text) return null;

  // 범위 패턴: YYYY.MM.DD ~ YYYY.MM.DD → 끝 날짜가 마감일
  const range = text.match(/\d{4}[.\-\/년]\s*\d{1,2}[.\-\/월]\s*\d{1,2}[일]?\s*[~\-]\s*(\d{4})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);
  if (range) {
    const d = new Date(parseInt(range[1]), parseInt(range[2]) - 1, parseInt(range[3]));
    if (!isNaN(d)) return d;
  }

  // ~ 뒤에 오는 날짜 단독: ~2025.07.31
  const tilde = text.match(/~\s*(\d{4})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/);
  if (tilde) {
    const d = new Date(parseInt(tilde[1]), parseInt(tilde[2]) - 1, parseInt(tilde[3]));
    if (!isNaN(d)) return d;
  }

  // 마감·deadline 키워드 뒤 날짜
  const kw = text.match(/(?:마감|접수\s*마감|신청\s*마감)[^\d]*(\d{4})[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})/i);
  if (kw) {
    const d = new Date(parseInt(kw[1]), parseInt(kw[2]) - 1, parseInt(kw[3]));
    if (!isNaN(d)) return d;
  }

  return null;
}

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
          onChange={(e) => setForm({ ...form, job: sanitizeJob(e.target.value) })}
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
function StepJobSuggest({ form, setForm, onNext, onBack, tweaks, onQuotaExceeded }) {
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
    if (!checkAndIncrementQuota()) {
      onQuotaExceeded?.();
      return;
    }
    setPhase("loading");

    const interestsText = interests.length > 0 ? interests.join(", ") : "(없음)";
    const freeTextSafe = freeText.trim() || "(없음)";
    const grade = form.grade || "미지정";
    const season = form.season || "미지정";

    const userPrompt =
      `대학생 진로 컨설턴트로서 아래 학생에게 맞는 직무 3개를 추천해줘.\n` +
      `학년: ${grade}, 방학: ${season}\n` +
      `관심사: ${interestsText}\n` +
      `추가 설명: ${freeTextSafe}\n\n` +
      `반드시 아래 JSON 형식으로만 답변해. 다른 텍스트는 절대 포함하지 마.\n` +
      `{"jobs":[{"title":"직무명","emoji":"이모지","reason":"추천 이유 한 문장","skills":["스킬1","스킬2","스킬3"]}]}`;

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "You are a Korean career consultant for university students. Always respond with only valid JSON, no markdown, no explanation.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      const raw = data?.content?.[0]?.text || "";
      console.log("[Claude API] raw response:", raw);

      // 어떤 포맷으로 오든 첫 번째 {...} 블록 추출
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no JSON object in response");
      const parsed = JSON.parse(jsonMatch[0]);
      const jobs = parsed?.jobs;
      if (!Array.isArray(jobs) || jobs.length === 0) throw new Error("invalid jobs array");

      setSuggestions(jobs);
      setPhase("suggested");
    } catch (err) {
      console.error("[Claude API] 직무 추천 실패:", err);
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
            <label className="block text-[13px] font-semibold text-slate-700 mb-3">
              관심 분야 <span className="text-slate-400 font-normal">(여러 개 선택 가능)</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {INTEREST_CATEGORIES.map((cat) => (
                <div key={cat.label} className="flex items-center gap-2.5">
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400 w-[84px] text-right leading-tight">
                    {cat.label}
                  </span>
                  <div className="w-px self-stretch bg-slate-200 shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {cat.chips.map((c) => {
                      const active = interests.includes(c);
                      return (
                        <button key={c}
                          onClick={() => toggleInterest(c)}
                          className={`px-3 py-1.5 text-[12px] font-medium border-2 rounded-full transition-all ${
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
              ))}
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

  return (
    <section data-screen-label="02 플랜 선택" className="w-full max-w-[640px] mx-auto px-5 pb-44">
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
          <span className="text-[#5B6EF5]">너에게 맞는 5가지 활동</span>
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {form.job && <Pill>{form.jobFromAI ? "✨ " : ""}{form.job}</Pill>}
          {form.grade && <Pill color="slate">{form.grade}</Pill>}
          {form.season && <Pill color="yellow">{form.season}</Pill>}
        </div>
      </div>

      {loading ? (
        <div className={`p-8 ${radius} border border-slate-200 bg-white flex flex-col items-center gap-3 my-6`}>
          <div className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-[#5B6EF5] animate-spin" />
          <div className="text-[13px] font-semibold text-slate-700">너에게 맞는 활동을 고르는 중…</div>
          <div className="text-[12px] text-slate-500">{form.grade} · {form.season}{form.job ? ` · ${form.job}` : ""}</div>
        </div>
      ) : (
        <>
          {/* 1열 활동 카드 목록 */}
          <div className="flex flex-col gap-2.5">
            {plans.map((p) => {
              const active = selected === p.id;
              return (
                <button key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left p-3.5 border-2 transition-all flex items-center gap-3 ${radius} ${
                    active
                      ? "border-[#5B6EF5] shadow-md shadow-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                  style={active ? { backgroundColor: "rgba(91,110,245,0.06)" } : {}}>
                  {tweaks.showEmoji && (
                    <div className={`w-10 h-10 shrink-0 ${radius} flex items-center justify-center text-xl bg-gradient-to-br ${p.tone}`}>
                      {p.emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[14px] font-extrabold text-slate-900 leading-tight">{p.title}</div>
                      {active && (
                        <div className="w-5 h-5 rounded-full bg-[#5B6EF5] text-white flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[11.5px] text-slate-500 leading-snug flex-1 line-clamp-1">{p.desc}</div>
                      {p.duration && (
                        <div className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full whitespace-nowrap">
                          📅 {p.duration}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 수준 조절 */}
          <div className="mt-4 flex items-stretch gap-2">
            <button onClick={() => onAdjustLevel(-1)} disabled={level <= -2}
              className={`flex-1 py-3 text-[12.5px] font-bold border-2 transition-all text-center ${radius} ${
                level <= -2
                  ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#5B6EF5] hover:text-[#5B6EF5]"
              }`}>
              ← 더 가볍게
              <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">수준 낮추기</div>
            </button>
            <div className={`px-3 flex flex-col items-center justify-center min-w-[100px] border-2 border-slate-200 bg-white ${radius}`}>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">LEVEL</div>
              <div className="text-[12px] font-extrabold text-slate-900 mt-0.5">{LEVEL_LABELS[level + 2]}</div>
              <div className="flex gap-0.5 mt-1.5">
                {[0,1,2,3,4].map((d) => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full"
                       style={{ backgroundColor: d === level + 2 ? "#5B6EF5" : "#E2E8F0" }} />
                ))}
              </div>
            </div>
            <button onClick={() => onAdjustLevel(1)} disabled={level >= 2}
              className={`flex-1 py-3 text-[12.5px] font-bold border-2 transition-all text-center ${radius} ${
                level >= 2
                  ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#5B6EF5] hover:text-[#5B6EF5]"
              }`}>
              더 빡세게 →
              <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">수준 높이기</div>
            </button>
          </div>
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
            {selected ? "이 활동으로 시작하기 →" : "활동을 선택해주세요"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────
// Step 3 — 결과
// ───────────────────────────────────────────────────────
function JobSection({ radius, job, season }) {
  const [state, setState] = useState("loading"); // loading | success | error
  const [jobs, setJobs] = useState([]);

  const fetchJobs = async () => {
    setState("loading");
    setJobs([]);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let targetYear, monthRange, seasonKw;
    if (season === "여름방학") {
      targetYear = currentMonth > 8 ? currentYear + 1 : currentYear;
      monthRange = "7월 8월";
      seasonKw = "여름";
    } else {
      targetYear = currentMonth > 2 ? currentYear + 1 : currentYear;
      monthRange = "1월 2월";
      seasonKw = "겨울";
    }

    // 방학 3개월 전 ~ 방학 마지막날 윈도우
    // 검색 기간: 지금 ~ 방학 마지막날
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vacationEnd = season === "여름방학"
      ? new Date(targetYear, 7, 31)  // 8월 31일
      : new Date(targetYear, 1, 28); // 2월 28일

    const pad = (n) => String(n).padStart(2, "0");
    const tbs = [
      "cdr:1",
      `cd_min:${pad(today.getMonth() + 1)}/${pad(today.getDate())}/${today.getFullYear()}`,
      `cd_max:${pad(vacationEnd.getMonth() + 1)}/${pad(vacationEnd.getDate())}/${vacationEnd.getFullYear()}`,
    ].join(",");

    // 지정된 플랫폼에서만 검색
    const sites = [
      "site:linkareer.com",
      "site:allforyoung.com",
      "site:thinkcontest.com",
    ].join(" OR ");
    const jobKw = job || "대학생";
    const query = `(${sites}) ${jobKw} ${seasonKw}방학 ${monthRange} ${targetYear}`;

    try {
      const res = await fetch("/api/serper/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, gl: "kr", hl: "ko", num: 10, tbs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const organic = data?.organic || [];

      // 날짜 파싱 + 기간 필터
      const withMeta = organic.map((r) => {
        const postedDate = parseSerperDate(r.date);
        const deadlineDate = parseDeadline(r.title + " " + (r.snippet || ""));
        let orgName = "";
        try { orgName = new URL(r.link).hostname.replace(/^www\./, ""); } catch (_) {}
        return {
          title: r.title,
          org: orgName,
          link: r.link,
          snippet: r.snippet || "",
          date: r.date || null,
          postedDate,
          deadlineDate,
          tag: detectTag(r.title + " " + (r.snippet || "")),
        };
      }).filter((r) => {
        // 마감일이 파싱됐고 오늘보다 이전이면 제거
        if (r.deadlineDate && r.deadlineDate < today) return false;
        // 게시일이 방학 마감 이후면 제거
        if (r.postedDate && r.postedDate > vacationEnd) return false;
        return true;
      });

      // 중복 제거: 제목 앞 15자(특수문자 제거) 기준
      const seen = new Set();
      const deduped = withMeta.filter((r) => {
        const key = r.title.toLowerCase().replace(/[^가-힣a-z0-9]/g, "").slice(0, 15);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setJobs(deduped.slice(0, 6));
      setState(deduped.length === 0 ? "empty" : "success");
    } catch (err) {
      console.error("[Serper] 공고 조회 실패:", err);
      setState("error");
    }
  };

  useEffect(() => { fetchJobs(); }, [job, season]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-extrabold text-slate-900">📢 모집 중인 공고</h3>
      </div>

      {state === "loading" && (
        <div className={`p-6 ${radius} border border-slate-200 bg-white flex flex-col items-center gap-3`}>
          <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-[#5B6EF5] animate-spin" />
          <div className="text-[12px] text-slate-500">
            {job ? `"${job}" ${season} 공고를 검색하는 중…` : `${season} 공고를 가져오는 중…`}
          </div>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col gap-2.5">
          {jobs.map((j, i) => {
            // 마감까지 남은 일수 계산
            const today = new Date(); today.setHours(0,0,0,0);
            const daysLeft = j.deadlineDate
              ? Math.ceil((j.deadlineDate - today) / (1000 * 60 * 60 * 24))
              : null;
            const fmtDeadline = j.deadlineDate
              ? `${j.deadlineDate.getFullYear()}.${String(j.deadlineDate.getMonth()+1).padStart(2,"0")}.${String(j.deadlineDate.getDate()).padStart(2,"0")}`
              : null;
            return (
            <a key={i} href={j.link} target="_blank" rel="noreferrer"
               className={`block p-4 ${radius} border border-slate-200 bg-white hover:border-[#5B6EF5] hover:shadow-sm transition-all`}>
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Pill color="yellow">{j.tag}</Pill>
                {daysLeft !== null && daysLeft <= 7 && (
                  <span className="text-[11px] font-bold text-rose-500">D-{daysLeft}</span>
                )}
                {daysLeft !== null && daysLeft > 7 && (
                  <span className="text-[11px] font-semibold text-emerald-600">모집 중</span>
                )}
                {fmtDeadline && (
                  <span className="text-[11px] text-slate-400 ml-auto">마감 {fmtDeadline}</span>
                )}
              </div>
              <div className="text-[13.5px] font-extrabold text-slate-900 leading-snug mb-1">
                {j.title}
              </div>
              <div className="text-[11.5px] text-slate-500 line-clamp-2 leading-snug mb-2">
                {j.snippet}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{j.org}</span>
                <span className="text-[11.5px] font-semibold text-[#5B6EF5]">바로가기 →</span>
              </div>
            </a>
            );
          })}
        </div>
      )}

      {state === "empty" && (
        <div className={`p-6 ${radius} border border-dashed border-slate-200 bg-slate-50 text-center`}>
          <div className="text-2xl mb-2">📭</div>
          <div className="text-[14px] font-semibold text-slate-700">
            아직 {season} 기간에 해당하는 공고가 없어요
          </div>
        </div>
      )}

      {state === "error" && (
        <div className={`p-6 ${radius} border border-dashed border-slate-300 bg-slate-50 text-center`}>
          <div className="text-[14px] font-semibold text-slate-700">공고를 불러오지 못했어요 🥲</div>
          <div className="text-[12px] text-slate-500 mt-1">잠시 후 다시 시도해주세요.</div>
        </div>
      )}
    </div>
  );
}

function StepResult({ form, plan, onBack, onRestart, tweaks }) {
  const radius = tweaks.cornerRadius === "rounded" ? "rounded-2xl" : "rounded-md";
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const handleExportPDF = () => {
    if (!schedule) return;
    const weeksHtml = schedule.map((w) => `
      <div class="week">
        <div class="week-header">
          <span class="badge">Week ${w.week}</span>
          <span class="label">${w.label}</span>
        </div>
        <ul>${(w.tasks || []).map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>`).join("");
    const meta = [form.grade, form.season, form.job, plan.duration].filter(Boolean).join(" · ");
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <title>${plan.title} 방학 플랜</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Pretendard',-apple-system,sans-serif;padding:40px;color:#1e293b;background:#fff}
        .header{border-bottom:2px solid #5B6EF5;padding-bottom:14px;margin-bottom:24px}
        .header h1{font-size:22px;font-weight:800}
        .header .meta{font-size:12px;color:#64748b;margin-top:5px}
        .week{border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:10px;page-break-inside:avoid}
        .week-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .badge{background:#5B6EF5;color:#fff;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:800}
        .label{font-size:14px;font-weight:800}
        ul{list-style:none;padding:0}
        li{font-size:12.5px;color:#475569;padding-left:14px;position:relative;line-height:1.7}
        li::before{content:"•";position:absolute;left:0;color:#cbd5e1}
        @media print{body{padding:24px}}
      </style></head><body>
      <div class="header">
        <h1>${plan.emoji} ${plan.title}</h1>
        <div class="meta">${meta}</div>
      </div>
      ${weeksHtml}
    </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      setScheduleLoading(true);
      const jobLine = form.job ? `희망 직무: ${form.job}` : "희망 직무: 미정";
      const certLine = plan.isCert
        ? `\n이 활동은 자격증·어학 시험 준비야. 한국의 실제 시험 접수·응시 일정을 기준으로 시험일에서 역산해서 주차별 준비 일정을 만들어줘. 예시 구성: 개념 학습 → 문제풀이 → 기출 모의고사 → 최종 점검 순서로.\n`
        : "";
      const prompt =
        `${form.grade} 학생의 ${form.season} 방학, 선택한 활동: "${plan.title}" (예상 기간: ${plan.duration || "미정"}).\n` +
        `${jobLine}${certLine}\n` +
        `이 활동을 실천하는 방학 주차별 일정을 만들어줘.\n` +
        `- 활동 특성에 맞는 주 수를 자유롭게 정해 (무조건 8주 채우지 말 것)\n` +
        `- 자격증·어학처럼 방학을 넘기는 경우 솔직하게 주 수를 늘려도 됨\n` +
        `- 각 주차마다 label(주제)과 tasks(3개 내외 구체적 할 일)를 써줘\n` +
        `JSON 형식으로만 답변:\n` +
        `{"weeks":[{"week":1,"label":"주제","tasks":["할 일1","할 일2","할 일3"]}]}`;

      try {
        const res = await fetch("/api/anthropic/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: "You are a Korean university vacation planning expert. Respond with only valid JSON, no markdown, no extra text.",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw = data?.content?.[0]?.text || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no JSON");
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed?.weeks) || parsed.weeks.length === 0) throw new Error("invalid weeks");
        setSchedule(parsed.weeks);
      } catch (err) {
        console.error("[Claude API] 일정 생성 실패:", err);
        setSchedule(FALLBACK_SCHEDULE);
      } finally {
        setScheduleLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  return (
    <section data-screen-label="03 결과" className="w-full max-w-[640px] mx-auto px-5 pb-24">

      {/* 뒤로가기 */}
      <button onClick={onBack}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4 -ml-1">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        활동 다시 고르기
      </button>

      {/* 히어로 카드 */}
      <div className={`p-5 ${radius} mb-6 text-white relative overflow-hidden`}
           style={{ background: "linear-gradient(135deg,#5B6EF5 0%,#7B6FE8 100%)" }}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-20"
             style={{ backgroundColor: "#FFD166" }} />
        <div className="absolute right-10 bottom-2 text-5xl opacity-30">{plan.emoji}</div>
        <div className="relative">
          <div className="text-[11px] font-semibold opacity-80 mb-1">선택한 활동</div>
          <div className="text-[22px] font-extrabold leading-tight">
            {plan.emoji} {plan.title}
          </div>
          <div className="text-[13px] opacity-90 mt-1 whitespace-pre-line">
            {(plan.tagline || "").replace("\n", " ")}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {plan.duration && (
              <span className="px-2.5 py-1 text-[11px] font-medium rounded-full"
                    style={{ backgroundColor: "#FFD166", color: "#5a4500" }}>
                📅 {plan.duration}
              </span>
            )}
            {form.job && (
              <span className="px-2.5 py-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full inline-flex items-center gap-1">
                {form.jobFromAI && <span>✨</span>}
                {form.job}
              </span>
            )}
            <span className="px-2.5 py-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full">
              {form.grade}
            </span>
            <span className="px-2.5 py-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full">
              {form.season}
            </span>
          </div>
        </div>
      </div>

      {/* 주차별 일정 */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-extrabold text-slate-900">📅 주차별 방학 일정</h3>
          <button
            onClick={handleExportPDF}
            disabled={scheduleLoading || !schedule}
            className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all ${
              schedule && !scheduleLoading
                ? "bg-[#5B6EF5] text-white hover:opacity-90 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}>
            ↓ PDF 저장
          </button>
        </div>

        {scheduleLoading ? (
          <div className={`p-8 ${radius} border border-slate-200 bg-white flex flex-col items-center gap-3`}>
            <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 border-t-[#5B6EF5] animate-spin" />
            <div className="text-[13px] font-semibold text-slate-700">방학 일정을 짜는 중…</div>
            <div className="text-[11px] text-slate-500">{form.grade} · {plan.title} 맞춤 플랜</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(schedule || []).map((w) => (
              <div key={w.week}
                   className={`p-4 ${radius} bg-white border border-slate-200 hover:border-slate-300 transition-all`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-white"
                        style={{ backgroundColor: "#5B6EF5" }}>
                    Week {w.week}
                  </span>
                  <div className="text-[13.5px] font-extrabold text-slate-900">{w.label}</div>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {(w.tasks || []).map((task, ti) => (
                    <li key={ti} className="flex items-start gap-2 text-[12.5px] text-slate-600 leading-snug">
                      <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 공고 섹션 */}
      <div className="mb-8">
        <JobSection radius={radius} job={form.job} season={form.season} />
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
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  const onQuotaExceeded = () => showToast("오늘 사용 가능한 횟수를 초과했어요");
  const [form, setForm] = useState({
    job: "", unknownJob: false, grade: "", season: "",
    interests: [], freeText: "", jobFromAI: false,
  });
  const [selectedPlan, setSelectedPlan] = useState(null);

  // 결과까지 본 후 입력 단계로 되돌리되 직무 정보는 유지하고 싶다면 여기서 제어
  const goBackFromDirection = () => {
    setStep(form.jobFromAI ? "jobSuggest" : "input");
  };

  // 추천 활동 5개 (AI 생성)
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [level, setLevel] = useState(0); // -2 ~ +2

  const LEVEL_INTENSITY = [
    "부담이 전혀 없고 아주 여유로운",
    "가볍고 부담 없는",
    "적당한 수준의",
    "도전적이고 실전 강도의",
    "집중 몰입형 고강도의",
  ];

  const generatePlans = async (formSnapshot, lv = 0) => {
    setPlansLoading(true);
    setPlans([]);
    setSelectedPlan(null);

    const jobLine = formSnapshot.job ? `희망 직무: ${formSnapshot.job}` : "희망 직무: 미정";
    const intensity = LEVEL_INTENSITY[lv + 2];
    const vacationMonths = formSnapshot.season === "여름방학" ? "7월~8월" : "1월~2월";
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    const prompt =
      `대학생 진로 컨설턴트로서 아래 학생에게 이번 방학에 도전할 구체적인 활동 5가지를 추천해줘.\n` +
      `학년: ${formSnapshot.grade}, 방학: ${formSnapshot.season} (${vacationMonths}), ${jobLine}\n` +
      `오늘 날짜: ${todayStr}\n` +
      `활동 강도: ${intensity} 수준\n\n` +
      `- 각 활동은 "토익 950점 달성", "Figma 포트폴리오 3개 제작"처럼 구체적이고 실천 가능해야 해\n` +
      `- title은 짧고 명확하게, tagline은 2줄로 (\\n 구분), desc는 한 문장\n` +
      `- duration은 현실적인 예상 기간 (예: "6-8주", "8-12주")\n` +
      `- isCert는 자격증·어학 시험 준비 활동이면 true, 아니면 false\n` +
      `- 자격증 활동의 경우: 한국의 실제 시험 일정 기준으로 방학 기간(${vacationMonths}) 내에 응시 가능하고 최소 4주 이상 준비할 수 있는 경우만 포함해. 준비 기간이 부족하면 해당 자격증은 제외하고 다른 활동으로 대체해.\n` +
      `반드시 아래 JSON 형식으로만 답변해. 다른 텍스트 절대 포함하지 마.\n` +
      `{"activities":[{"id":"a1","emoji":"이모지","title":"활동명","tagline":"첫줄\\n둘째줄","desc":"설명 한 문장","duration":"예상 기간","isCert":false}]}`;

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1536,
          system: "You are a Korean career consultant for university students. Always respond with only valid JSON, no markdown, no explanation.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data?.content?.[0]?.text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      const activities = parsed?.activities;
      if (!Array.isArray(activities) || activities.length === 0) throw new Error("invalid activities");
      setPlans(activities.map((a, i) => ({ ...a, ...ACTIVITY_COLORS[i % ACTIVITY_COLORS.length] })));
    } catch (err) {
      console.error("[Claude API] 활동 생성 실패:", err);
      setPlans(FALLBACK_ACTIVITIES.map((a, i) => ({ ...a, ...ACTIVITY_COLORS[i] })));
    } finally {
      setPlansLoading(false);
    }
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
      const fallback = FALLBACK_ACTIVITIES.map((a, i) => ({ ...a, ...ACTIVITY_COLORS[i] }));
      setPlans(fallback);
      setSelectedPlan("a1");
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
                        onBack={() => setStep("input")}
                        onQuotaExceeded={onQuotaExceeded} />
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
                    onBack={() => setStep("direction")}
                    onRestart={() => { setStep("input"); setSelectedPlan(null); }} />
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2147483647] px-4 py-2.5 bg-slate-900 text-white text-[13px] font-semibold rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="레이아웃">
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
        <TweakSection label="데모 점프">
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
