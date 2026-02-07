// ===== 공략 테크닉 =====
export const TECHNIQUES = {
  hashiwatashi: {
    jp: "橋渡し",
    kr: "하시와타시",
    desc: "두 봉 사이에 놓인 상품을 돌리거나 밀어서 떨어뜨리기",
    icon: "🌉",
  },
  tatehame: {
    jp: "縦ハメ",
    kr: "타테하메",
    desc: "박스를 세로로 세워 봉 사이로 빠지게 하기",
    icon: "📐",
    detail: "봉 간격이 좁을 때 유효. 3~5회 소요. 집게력 중간 요구.",
  },
  yokohame: {
    jp: "横ハメ",
    kr: "요코하메",
    desc: "박스를 가로로 눕혀 봉 사이로 빠지게 하기",
    icon: "📏",
    detail: "봉 간격이 넓을 때 유효. 5~8회 소요. 집게력 높음 요구.",
  },
  yose: {
    jp: "寄せ",
    kr: "요세",
    desc: "집게 한쪽 발로 상품을 끌어오기",
    icon: "🤏",
  },
  zurashi: {
    jp: "ずらし",
    kr: "즈라시",
    desc: "상품을 조금씩 밀어 이동시키기",
    icon: "👉",
  },
  kururinpa: {
    jp: "くるりんぱ",
    kr: "쿠루린파",
    desc: "상품 끝을 눌러 반동으로 넘기기",
    icon: "🔄",
  },
  takoyaki: {
    jp: "たこ焼き",
    kr: "타코야끼",
    desc: "공을 구멍에 넣는 확률형 방식",
    icon: "🎱",
  },
  tomekake: {
    jp: "止め掛け",
    kr: "토메카케",
    desc: "한쪽 발로 누르고 다른 발로 들어올리기",
    icon: "⚖️",
  },
  chabudai: {
    jp: "ちゃぶ台",
    kr: "차부다이",
    desc: "뒤집기 기술 — 박스를 뒤집어서 떨어뜨리기",
    icon: "🔃",
  },
  slide: {
    jp: "スライド",
    kr: "슬라이드",
    desc: "높은 봉 위에서 경품을 밀어올리기",
    icon: "➡️",
  },
  maeotoshi: {
    jp: "前落とし",
    kr: "마에오토시",
    desc: "뒷부분을 번갈아 당겨 앞으로 떨어뜨리기",
    icon: "⬇️",
  },
};

// ===== 상품 종류 =====
export const PRIZE_TYPES = [
  { id: "figure_box", label: "피규어 박스", weight: "200~450g", icon: "📦" },
  { id: "plush_large", label: "대형 인형", weight: "500g~1kg+", icon: "🧸" },
  { id: "plush_small", label: "소형 마스코트", weight: "50~100g", icon: "🎀" },
  { id: "blanket", label: "담요/쿠션", weight: "~300g", icon: "🛏️" },
  { id: "snack", label: "과자/식품", weight: "~200g", icon: "🍫" },
  { id: "other", label: "기타", weight: "다양", icon: "🎁" },
];

// ===== 기계 종류 =====
export const MACHINE_TYPES = [
  { id: "sega", label: "SEGA UFO CATCHER", color: "#0066FF" },
  { id: "namco", label: "Bandai Namco CLENA", color: "#FF6600" },
  { id: "taito", label: "TAITO CAPRICCIO", color: "#CC0033" },
  { id: "round1", label: "Round1 기계", color: "#00CC66" },
  { id: "unknown", label: "모르겠음 / 기타", color: "#888888" },
];

// ===== 집게(크로우) 타입 =====
export const CLAW_TYPES = [
  {
    id: "two_arm",
    label: "2발 크레인",
    jp: "Two-Arm Claw",
    icon: "✌️",
    desc: "평행한 2개의 집게발. 회전 없이 개폐만 가능. 직선적 움직임 예측 용이.",
    difficulty: 4,
    tip: "피규어 박스, 상자형 경품에 적합",
  },
  {
    id: "three_arm",
    label: "3발 크레인 (확률기)",
    jp: "Three-Arm Claw",
    icon: "🤟",
    desc: "삼각형 배치 3개 발. 거의 100% 확률기. 태그나 틈새 활용 필수.",
    difficulty: 5,
    tip: "Stop 기능 활용 (하강 중 버튼 재클릭)",
  },
  {
    id: "pincer",
    label: "핀서 타입",
    jp: "Pincer Type",
    icon: "🫳",
    desc: "집게발이 아닌 판 형태. 작은 인형, 과자용.",
    difficulty: 3,
    tip: "비교적 쉬움 — 초보자 연습용으로 적합",
  },
];

// ===== 세팅 유형 =====
export const SETUP_TYPES = [
  {
    id: "hashiwatashi",
    label: "하시와타시 (橋渡し)",
    desc: "2개 평행 봉 위에 경품 배치 — 일본에서 가장 흔함",
    difficulty: 3,
    icon: "🌉",
    diagram: "═══[상품]═══",
    techniques: ["tatehame", "yokohame", "tomekake", "chabudai", "slide"],
    analysisPoints: [
      "봉 간격 vs 경품 크기 비율",
      "경품 기울기 각도",
      "무게중심 위치",
      "봉과 접촉점 수",
    ],
  },
  {
    id: "suehirogari",
    label: "스에히로가리 (末広がり)",
    desc: "점점 벌어지는 봉 — 특정 지점에서만 통과 가능",
    difficulty: 5,
    icon: "📐",
    diagram: "╲  [상품]  ╱",
    techniques: ["zurashi"],
    analysisPoints: ["통과 가능 지점 탐색"],
    warning: "비추천 — 난이도 극악",
  },
  {
    id: "maeotoshi",
    label: "마에오토시 (前落とし)",
    desc: "경품이 앞으로 기울어진 상태에서 떨어뜨리기",
    difficulty: 3,
    icon: "⬇️",
    diagram: "  [상품]→\n    ↓출구",
    techniques: ["maeotoshi", "zurashi"],
    analysisPoints: [
      "뒷부분 한쪽씩 번갈아 당기기",
      "무게중심이 앞으로 넘어가는 시점",
    ],
  },
  {
    id: "rubber_shovel",
    label: "러버 쇼벨",
    desc: "집게 끝 고무 스톱퍼로 상자를 밀어 떨어뜨림 (Round1에서 흔함)",
    difficulty: 3,
    icon: "🧲",
    diagram: "[상품] → 출구",
    techniques: ["zurashi"],
    analysisPoints: ["상자 모서리 공략", "연속 밀기 가능 여부"],
  },
  {
    id: "ring",
    label: "링 타입 (C링/D링)",
    desc: "고리에 집게 걸어서 당기기 — 정확도가 생명",
    difficulty: 4,
    icon: "💍",
    diagram: "○─[상품]",
    techniques: ["yose"],
    analysisPoints: ["고리 크기", "고리-경품 연결 상태", "회전축 위치"],
  },
  {
    id: "corner_balance",
    label: "코너 밸런스 (直置き)",
    desc: "L자 선반 위에 경품 — 무게중심 이동시켜 떨어뜨리기",
    difficulty: 3,
    icon: "📐",
    diagram: "┌─[상품]\n└───출구",
    techniques: ["zurashi", "kururinpa"],
    analysisPoints: ["가장 가느다란 부분 잡아 회전", "무게중심 이동 경로"],
  },
  {
    id: "probability",
    label: "확률기 (봉 밀기/드릴/루렛)",
    desc: "일정 금액 투입 전까지 미묘하게 빗나가는 구조",
    difficulty: 5,
    icon: "🎰",
    diagram: "??→[구멍]",
    techniques: [],
    analysisPoints: ["확률 미달 상태 판별", "1~2회 테스트 후 포기 여부 결정"],
    warning: "확률기는 공략이 제한적 — 소액 테스트 후 판단 권장",
  },
];

// ===== 무게중심 유형 =====
export const WEIGHT_CENTER_TYPES = [
  { id: "head_heavy", label: "머리가 무거운 캐릭터", icon: "🗿", desc: "무게중심이 위쪽 — 뒤집기 쉬움" },
  { id: "balanced", label: "균형잡힌 형태", icon: "⚖️", desc: "무게중심이 중앙 — 표준 공략 적용" },
  { id: "bottom_heavy", label: "하체가 무거운 형태", icon: "🏋️", desc: "무게중심이 아래쪽 — 밀기 중심 공략" },
];

// ===== 기계 선택 가이드 =====
export const MACHINE_GUIDE = {
  recommended: [
    "남이 하다 포기한 기계 (진행도 50% 이상)",
    "집게 테스트 시 물건이 약간이라도 움직이는 것",
    "직원이 '쉬운 세팅'으로 표시한 것",
    "100엔 작은 인형 기계 (연습용)",
  ],
  avoid: [
    "바리데카 (대형 3발 크레인) — 확률기",
    "스에히로가리 (벌어지는 봉)",
    "집게 테스트 시 물건이 전혀 안 움직이는 것",
    "신상품/인기 캐릭터 (고의로 어렵게 세팅)",
  ],
};

// ===== 직원 찬스 타이밍 =====
export const STAFF_CHANCE_TIPS = [
  "1,000~1,500엔 사용 후 요청",
  "명확히 진척이 없을 때",
  "오전 일찍 (직원들이 여유로움)",
  "정중하게 「すみません、取れそうにないんですが…」",
];

// ===== 공통 원칙 =====
export const CORE_PRINCIPLES = [
  {
    icon: "🔍",
    title: "먹히는 판 판별",
    desc: "1~2판 안에 움직임 체크. 전혀 안 움직이면 포기.",
  },
  {
    icon: "👉",
    title: "밀기 > 들기",
    desc: "들어올리기보다 밀기·구르기·기울이기가 효과적",
  },
  {
    icon: "⚖️",
    title: "무게중심 집중",
    desc: "항상 무게중심과 지지점의 관계에 집중",
  },
  {
    icon: "🔁",
    title: "한쪽만 누적 공략",
    desc: "한쪽만 계속 노려서 움직임을 누적시키기",
  },
];
