export const TECHNIQUES = {
  hashiwatashi: { jp: "橋渡し", kr: "하시와타시", desc: "두 봉 사이에 놓인 상품을 돌리거나 밀어서 떨어뜨리기" },
  yose: { jp: "寄せ", kr: "요세", desc: "집게 한쪽 발로 상품을 끌어오기" },
  zurashi: { jp: "ずらし", kr: "즈라시", desc: "상품을 조금씩 밀어 이동시키기" },
  takoyaki: { jp: "たこ焼き", kr: "타코야끼", desc: "공을 구멍에 넣는 확률형 방식" },
  kururinpa: { jp: "くるりんぱ", kr: "쿠루린파", desc: "상품 끝을 눌러 반동으로 넘기기" },
};

export const PRIZE_TYPES = [
  { id: "figure_box", label: "피규어 박스", weight: "200~450g", icon: "📦" },
  { id: "plush_large", label: "대형 인형", weight: "500g~1kg+", icon: "🧸" },
  { id: "plush_small", label: "소형 마스코트", weight: "50~100g", icon: "🎀" },
  { id: "blanket", label: "담요/쿠션", weight: "~300g", icon: "🛏️" },
  { id: "other", label: "기타", weight: "다양", icon: "🎁" },
];

export const MACHINE_TYPES = [
  { id: "sega", label: "SEGA UFO CATCHER", color: "#0066FF" },
  { id: "namco", label: "Bandai Namco CLENA", color: "#FF6600" },
  { id: "taito", label: "TAITO CAPRICCIO", color: "#CC0033" },
  { id: "unknown", label: "모르겠음 / 기타", color: "#888888" },
];