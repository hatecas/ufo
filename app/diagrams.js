// ===== 3D 아이소메트릭 기술 다이어그램 =====
const W = 440, H = 320;

// 색상
const C = {
  bg: '#0a0a14', grid: 'rgba(255,255,255,0.03)',
  barTop: '#aaa', barRight: '#777', barFront: '#555',
  boxTop: '#FFB060', boxRight: '#E88030', boxFront: '#CC6620',
  boxLine: 'rgba(0,0,0,0.25)',
  ghost: 0.25,
  claw: '#4FC3F7', clawGold: '#FFD700',
  green: '#00FF9D', red: '#FF3C50', orange: '#FF8C42',
  gold: '#FFD700', white: '#fff', dim: '#888',
  exitFill: 'rgba(0,255,157,0.06)', exitLine: 'rgba(0,255,157,0.3)',
  dimLine: 'rgba(255,215,0,0.5)', dimText: '#FFD700',
};

// 아이소메트릭 투영
const COS30 = Math.cos(Math.PI / 6), SIN30 = 0.5;
const S = 2.0; // 스케일
const OX = W / 2, OY = H * 0.56;

function iso(x, y, z) {
  return [OX + (x - z) * COS30 * S, OY - y * S + (x + z) * SIN30 * S];
}

// 3D 회전 (각도는 degree)
function rot(p, rx, ry, rz) {
  let [x, y, z] = p;
  if (rx) { const r = rx * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (ry) { const r = ry * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); [x, z] = [x * c + z * s, -x * s + z * c]; }
  if (rz) { const r = rz * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); [x, y] = [x * c - y * s, x * s + y * c]; }
  return [x, y, z];
}

export function generateTechniqueDiagrams(id, canvas) {
  if (!canvas) return [];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  return (GEN[id] || (() => []))(ctx, canvas);
}

// ===== 그리기 헬퍼 =====

function clear(ctx) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // 바닥 그리드
  ctx.strokeStyle = C.grid; ctx.lineWidth = 0.5;
  for (let i = -80; i <= 80; i += 20) {
    const [ax, ay] = iso(i, 0, -60), [bx, by] = iso(i, 0, 60);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const [cx, cy] = iso(-80, 0, i), [dx, dy] = iso(80, 0, i);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
  }
}

// 3D 면 그리기 (4개 꼭짓점 2D좌표, 색상)
function face(ctx, pts, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.strokeStyle = C.boxLine; ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// 3D 박스 (cx,cy,cz=중심, sx,sy,sz=크기, rx,ry,rz=회전, colors, alpha)
function box3d(ctx, cx, cy, cz, sx, sy, sz, rx = 0, ry = 0, rz = 0, colors = null, alpha = 1) {
  const hw = sx / 2, hh = sy / 2, hd = sz / 2;
  const col = colors || { top: C.boxTop, right: C.boxRight, front: C.boxFront };
  // 8개 꼭짓점
  let v = [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd], // 바닥 0-3
    [-hw, hh, -hd],  [hw, hh, -hd],  [hw, hh, hd],  [-hw, hh, hd],  // 윗면 4-7
  ];
  if (rx || ry || rz) v = v.map(p => rot(p, rx, ry, rz));
  const pts = v.map(([x, y, z]) => iso(cx + x, cy + y, cz + z));

  // 6개 면 정의 + 법선
  const faces = [
    { vi: [3, 2, 6, 7], n: [0, 0, 1], c: col.front },   // 뒷면 z+
    { vi: [0, 1, 5, 4], n: [0, 0, -1], c: col.front },   // 앞면 z-
    { vi: [0, 3, 7, 4], n: [-1, 0, 0], c: col.right },   // 왼면
    { vi: [1, 2, 6, 5], n: [1, 0, 0], c: col.right },    // 오른면 x+
    { vi: [4, 5, 6, 7], n: [0, 1, 0], c: col.top },      // 윗면 y+
    { vi: [0, 1, 2, 3], n: [0, -1, 0], c: col.top },     // 바닥면
  ];

  // 카메라 방향 (1,1,-1) — 법선 회전 후 visible 판단
  const camDir = [1, 1, -1];
  const visible = faces.filter(f => {
    const rn = (rx || ry || rz) ? rot(f.n, rx, ry, rz) : f.n;
    return rn[0] * camDir[0] + rn[1] * camDir[1] + rn[2] * camDir[2] > 0;
  });

  // 깊이 정렬 (멀리 있는 면부터 그리기)
  visible.sort((a, b) => {
    const avgA = a.vi.reduce((s, i) => s + v[i][0] + v[i][2], 0);
    const avgB = b.vi.reduce((s, i) => s + v[i][0] + v[i][2], 0);
    return avgA - avgB;
  });

  visible.forEach(f => face(ctx, f.vi.map(i => pts[i]), f.c, alpha));

  // 테이프 십자 (윗면에)
  const topFace = faces[4];
  const tn = (rx || ry || rz) ? rot(topFace.n, rx, ry, rz) : topFace.n;
  if (tn[0] * camDir[0] + tn[1] * camDir[1] + tn[2] * camDir[2] > 0) {
    const tp = topFace.vi.map(i => pts[i]);
    const mx1 = (tp[0][0] + tp[1][0]) / 2, my1 = (tp[0][1] + tp[1][1]) / 2;
    const mx2 = (tp[2][0] + tp[3][0]) / 2, my2 = (tp[2][1] + tp[3][1]) / 2;
    const mx3 = (tp[0][0] + tp[3][0]) / 2, my3 = (tp[0][1] + tp[3][1]) / 2;
    const mx4 = (tp[1][0] + tp[2][0]) / 2, my4 = (tp[1][1] + tp[2][1]) / 2;
    ctx.save(); ctx.globalAlpha = alpha * 0.2;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx3, my3); ctx.lineTo(mx4, my4); ctx.stroke();
    ctx.restore();
  }
}

// 3D 봉 (수평 — X방향으로 뻗음)
function bar3d(ctx, cx, cy, cz, length, radius = 5) {
  const col = { top: C.barTop, right: C.barRight, front: C.barFront };
  box3d(ctx, cx, cy, cz, length, radius, radius, 0, 0, 0, col, 1);
}

// 두 봉 그리기 (gap = 봉 사이 거리)
function bars(ctx, gap, barLen = 120, barY = 0) {
  bar3d(ctx, 0, barY, -gap / 2, barLen, 6);
  bar3d(ctx, 0, barY, gap / 2, barLen, 6);
}

// 출구 영역 (봉 아래 바닥)
function exitZone(ctx, gap, barLen = 120) {
  const corners = [
    iso(-barLen / 2, -30, -gap / 2), iso(barLen / 2, -30, -gap / 2),
    iso(barLen / 2, -30, gap / 2), iso(-barLen / 2, -30, gap / 2),
  ];
  ctx.fillStyle = C.exitFill;
  ctx.beginPath();
  corners.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.exitLine; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.stroke(); ctx.setLineDash([]);
  const cx = corners.reduce((s, p) => s + p[0], 0) / 4;
  const cy = corners.reduce((s, p) => s + p[1], 0) / 4;
  label(ctx, '↓ 출구', cx, cy, 'rgba(0,255,157,0.5)', 10);
}

// 집게 (2D 오버레이 — iso 좌표로 위치)
function claw3d(ctx, x3d, y3d, z3d, sz = 22, active = null) {
  const [cx, cy] = iso(x3d, y3d, z3d);
  ctx.strokeStyle = C.claw; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, cy - sz * 1.4); ctx.lineTo(cx, cy - sz * 0.3); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = C.claw; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - sz * 0.5, cy - sz * 0.3); ctx.lineTo(cx + sz * 0.5, cy - sz * 0.3); ctx.stroke();
  ctx.fillStyle = C.claw; ctx.beginPath(); ctx.arc(cx, cy - sz * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
  ['left', 'right'].forEach(side => {
    const d = side === 'left' ? -1 : 1, act = active === side;
    ctx.strokeStyle = act ? C.clawGold : C.claw; ctx.lineWidth = act ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + d * sz * 0.5, cy - sz * 0.3);
    ctx.quadraticCurveTo(cx + d * sz * 0.5, cy + sz * 0.15, cx + d * sz * 0.3, cy + sz * 0.5);
    ctx.stroke();
    ctx.fillStyle = act ? C.clawGold : C.claw;
    ctx.beginPath(); ctx.arc(cx + d * sz * 0.3, cy + sz * 0.5, 2, 0, Math.PI * 2); ctx.fill();
  });
}

// 3D 화살표 (iso 좌표)
function arrow3d(ctx, from, to, color = C.green, dash = true) {
  const [x1, y1] = iso(...from), [x2, y2] = iso(...to);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
  if (dash) ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1), hl = 10;
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
  ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// 곡선 화살표 (2D)
function curveArrow(ctx, x1, y1, x2, y2, ox, oy, color = C.green) {
  const cpx = (x1 + x2) / 2 + ox, cpy = (y1 + y2) / 2 + oy;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cpx, cpy, x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const t = 0.95;
  const nx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cpx + t ** 2 * x2;
  const ny = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cpy + t ** 2 * y2;
  const a = Math.atan2(y2 - ny, x2 - nx), hl = 9;
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
  ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// 치수선 (3D 좌표 2개 사이)
function dim(ctx, from, to, labelText, offset = 12) {
  const [x1, y1] = iso(...from), [x2, y2] = iso(...to);
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * offset, ny = dx / len * offset;
  ctx.save();
  ctx.strokeStyle = C.dimLine; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny); ctx.stroke();
  ctx.setLineDash([]);
  // 양쪽 끝 작은 선
  ctx.beginPath();
  ctx.moveTo(x1 + nx * 0.5, y1 + ny * 0.5); ctx.lineTo(x1 + nx * 1.5, y1 + ny * 1.5);
  ctx.moveTo(x2 + nx * 0.5, y2 + ny * 0.5); ctx.lineTo(x2 + nx * 1.5, y2 + ny * 1.5);
  ctx.stroke();
  const mx = (x1 + x2) / 2 + nx * 1.8, my = (y1 + y2) / 2 + ny * 1.8;
  label(ctx, labelText, mx, my, C.dimText, 10);
  ctx.restore();
}

function label(ctx, text, x, y, color = C.gold, size = 12) {
  ctx.font = `bold ${size}px 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function badge(ctx, num, title) {
  ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
  const tw = ctx.measureText(`Step ${num}  ${title}`).width + 18;
  ctx.fillStyle = 'rgba(255,60,80,0.9)';
  ctx.beginPath(); ctx.roundRect(8, 8, tw, 24, 6); ctx.fill();
  ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`Step ${num}  ${title}`, 16, 20);
}

function snap(ctx, canvas) { return canvas.toDataURL(); }

// ===== 공통 치수 =====
// 봉 간격: 32  /  상품 긴면(X): 55  /  상품 짧은면(Z): 40  /  높이(Y): 28
// 핵심: 상품 짧은면(40) > 봉 간격(32) → 안 빠짐!
//       상품 높이(28) < 봉 간격(32) → 세로로 세우면 빠짐!
const GAP = 32;
const BOX_X = 55, BOX_Y = 28, BOX_Z = 40;
const BAR_LEN = 110;
const BAR_Y = 0; // 봉 높이 (바닥 기준)

// ===== 기술별 생성기 =====
const GEN = {

tatehame(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2; // 봉 위에 상품

  // Step 1: 현재 상태 + 치수 표시
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  // 치수선
  dim(ctx, [0, BAR_Y, -GAP / 2], [0, BAR_Y, GAP / 2], `봉 간격`, -14);
  dim(ctx, [-BOX_X / 2, boxY + BOX_Y / 2, -BOX_Z / 2], [-BOX_X / 2, boxY + BOX_Y / 2, BOX_Z / 2], `상품 폭`, 14);
  dim(ctx, [-BOX_X / 2, boxY - BOX_Y / 2, BOX_Z / 2 + 2], [-BOX_X / 2, boxY + BOX_Y / 2, BOX_Z / 2 + 2], `높이`, 14);
  // 크기 비교 설명
  label(ctx, '상품 폭 > 봉 간격 → 안 빠짐', W / 2, 26, C.gold, 11);
  label(ctx, '상품 높이 < 봉 간격 → 세우면 빠짐!', W / 2, H - 14, C.green, 11);
  claw3d(ctx, 15, boxY + 30, 0, 20, 'right');
  arrow3d(ctx, [18, boxY + 10, -8], [18, boxY - 5, -8], C.green);
  badge(ctx, 1, '상품이 봉보다 넓어서 안 빠지는 상태');
  imgs.push(snap(ctx, c));

  // Step 2: 기울기 만들기
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 3, boxY + 2, 2, BOX_X, BOX_Y, BOX_Z, -30, 0, 0);
  claw3d(ctx, -10, boxY + 32, -8, 20, 'left');
  arrow3d(ctx, [-10, boxY + 18, -8], [-5, boxY + 3, 0], C.green);
  // 기울기 각도 표시
  const [ax, ay] = iso(25, boxY, 0), [bx, by] = iso(25, boxY + 18, 12);
  curveArrow(ctx, ax, ay, bx, by, 15, -5, C.orange);
  label(ctx, '30~45°', bx + 10, by - 5, C.orange, 10);
  label(ctx, '위쪽을 밀어 기울기 키우기', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '한쪽 끝을 밀어 기울기 만들기');
  imgs.push(snap(ctx, c));

  // Step 3: 세로 낙하
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  // 세운 상태: X축 회전 -90도 → 높이(28)가 Z방향이 됨 → 28 < GAP(32) → 통과!
  box3d(ctx, 0, boxY - 5, 0, BOX_X, BOX_Y, BOX_Z, -80, 0, 0, null, 0.75);
  arrow3d(ctx, [0, boxY - 20, 0], [0, -25, 0], C.red);
  // 통과 설명
  dim(ctx, [0, BAR_Y, -GAP / 2], [0, BAR_Y, GAP / 2], `간격 ${GAP}`, -14);
  label(ctx, `높이 ${BOX_Y} < 간격 ${GAP}`, W / 2, 26, C.green, 12);
  label(ctx, '세운 상태에서 높이가 봉 간격보다 좁아 통과!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '세로로 세워서 낙하 성공!');
  imgs.push(snap(ctx, c));
  return imgs;
},

yokohame(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;

  // Step 1: 현재 상태
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  dim(ctx, [0, BAR_Y, -GAP / 2], [0, BAR_Y, GAP / 2], `봉 간격`, -14);
  dim(ctx, [-BOX_X / 2, boxY + BOX_Y / 2, -BOX_Z / 2], [BOX_X / 2, boxY + BOX_Y / 2, -BOX_Z / 2], `긴 면`, 14);
  label(ctx, '상품 폭 > 봉 간격 → 그냥은 안 빠짐', W / 2, 26, C.gold, 11);
  label(ctx, '봉 간격이 넓을 때 → 가로로 눕혀서 통과시키기', W / 2, H - 14, C.gold, 11);
  claw3d(ctx, 15, boxY + 30, 0, 20);
  badge(ctx, 1, '가로끼우기 — 현재 상태 파악');
  imgs.push(snap(ctx, c));

  // Step 2: 회전 시키기
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 3, boxY + 3, 2, BOX_X, BOX_Y, BOX_Z, -25, 30, 0);
  claw3d(ctx, -15, boxY + 30, -5, 20);
  const [rx, ry] = iso(25, boxY + 5, 15), [rx2, ry2] = iso(10, boxY + 12, -10);
  curveArrow(ctx, rx, ry, rx2, ry2, 20, -15, C.orange);
  label(ctx, '회전', rx + 15, ry - 8, C.orange, 10);
  label(ctx, '10~15°씩 회전 — 긴 면을 봉과 평행하게', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '밀어서 회전시키기');
  imgs.push(snap(ctx, c));

  // Step 3: 가로 낙하
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  // Y축 90도 회전 → 긴면(55)이 X방향, 짧은면(40)이 Z방향은 그대로...
  // 실제로는 긴 면이 봉 방향(X)과 정렬되어야 함
  box3d(ctx, 0, boxY - 5, 0, BOX_X, BOX_Y, BOX_Z, -30, 60, 0, null, 0.75);
  arrow3d(ctx, [0, boxY - 18, 0], [0, -25, 0], C.red);
  label(ctx, '긴 면이 봉과 평행 → 좁은 면만 간격 통과', W / 2, 26, C.green, 12);
  label(ctx, '가로 자세로 봉 사이 낙하!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '가로 낙하 성공!');
  imgs.push(snap(ctx, c));
  return imgs;
},

hashiwatashi(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;

  // Step 1: 상태 파악
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  dim(ctx, [0, BAR_Y, -GAP / 2], [0, BAR_Y, GAP / 2], `봉 간격`, -14);
  dim(ctx, [-BOX_X / 2, boxY + BOX_Y / 2, -BOX_Z / 2], [-BOX_X / 2, boxY + BOX_Y / 2, BOX_Z / 2], `상품 폭`, 14);
  // 관찰 아이콘
  const [mx, my] = iso(0, boxY + 20, 0);
  label(ctx, '🔍', mx + 70, my - 20, C.white, 16);
  label(ctx, '봉 간격 vs 상품 치수 비교 → 타테/요코 결정', W / 2, H - 14, C.gold, 11);
  badge(ctx, 1, '봉 간격 vs 상품 크기 파악');
  imgs.push(snap(ctx, c));

  // Step 2: 한쪽 밀기
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 8, boxY, 3, BOX_X, BOX_Y, BOX_Z, 0, 0, -6);
  claw3d(ctx, -20, boxY + 30, -5, 20, 'left');
  arrow3d(ctx, [-18, boxY + 5, -5], [10, boxY, 3], C.green);
  label(ctx, '출구 반대쪽을 밀어 이동시키기', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '한쪽을 밀어서 이동');
  imgs.push(snap(ctx, c));

  // Step 3: 누적 이동
  clear(ctx); exitZone(ctx, GAP, BAR_LEN); bars(ctx, GAP, BAR_LEN, BAR_Y);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z, 0, 0, 0, null, C.ghost); // 원래
  box3d(ctx, 15, boxY - 3, 5, BOX_X, BOX_Y, BOX_Z, -12, 0, 0, null, 0.7);
  arrow3d(ctx, [15, boxY - 15, 5], [15, -25, 5], C.red);
  const [p1x, p1y] = iso(-5, boxY, 0), [p2x, p2y] = iso(15, boxY, 5);
  curveArrow(ctx, p1x, p1y, p2x, p2y, 10, -20, C.orange);
  label(ctx, '×2~4회 반복', p1x - 30, p1y - 10, C.orange, 10);
  label(ctx, '무게중심이 봉 사이로 넘어가면 자동 낙하!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '누적 이동 → 낙하');
  imgs.push(snap(ctx, c));
  return imgs;
},

yose(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;
  // 요세: 봉 가장자리에 있는 상품을 한쪽 발로 끌어오기
  // 플랫폼 느낌으로 봉 하나를 넓게 그리기
  const plateZ = 0;

  // Step 1: 상품이 봉 가장자리에
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, plateZ, BAR_LEN, 6);
  bar3d(ctx, 0, BAR_Y, plateZ + GAP, BAR_LEN, 6);
  exitZone(ctx, GAP + 20, BAR_LEN);
  // 상품이 한쪽 봉 가까이
  box3d(ctx, 10, boxY, plateZ + GAP / 2 + 8, BOX_X, BOX_Y, BOX_Z * 0.8);
  claw3d(ctx, 10, boxY + 32, plateZ + GAP / 2 + 15, 20);
  label(ctx, '집게를 상품 끝보다 살짝 바깥에 위치', W / 2, H - 14, C.gold, 11);
  badge(ctx, 1, '상품이 봉 가장자리에 위치');
  imgs.push(snap(ctx, c));

  // Step 2: 한쪽 발 걸기
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, plateZ, BAR_LEN, 6);
  bar3d(ctx, 0, BAR_Y, plateZ + GAP, BAR_LEN, 6);
  exitZone(ctx, GAP + 20, BAR_LEN);
  box3d(ctx, 10, boxY, plateZ + GAP / 2 + 8, BOX_X, BOX_Y, BOX_Z * 0.8);
  claw3d(ctx, 10, boxY + 22, plateZ + GAP / 2 + 12, 20, 'left');
  // 걸리는 포인트 강조
  const [hx, hy] = iso(10, boxY + 5, plateZ + GAP / 2 + 15);
  ctx.strokeStyle = C.clawGold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.stroke();
  label(ctx, '한쪽 발만!', hx + 25, hy - 8, C.clawGold, 10);
  label(ctx, '두 발 다 걸리면 X — 반드시 한쪽만', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '한쪽 발만 걸기');
  imgs.push(snap(ctx, c));

  // Step 3: 끌어오기
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, plateZ, BAR_LEN, 6);
  bar3d(ctx, 0, BAR_Y, plateZ + GAP, BAR_LEN, 6);
  exitZone(ctx, GAP + 20, BAR_LEN);
  box3d(ctx, 10, boxY, plateZ + GAP / 2 + 8, BOX_X, BOX_Y, BOX_Z * 0.8, 0, 0, 0, null, C.ghost);
  box3d(ctx, 10, boxY, plateZ + GAP / 2 - 5, BOX_X, BOX_Y, BOX_Z * 0.8);
  arrow3d(ctx, [10, boxY, plateZ + GAP / 2 + 6], [10, boxY, plateZ + GAP / 2 - 5], C.green);
  arrow3d(ctx, [10, boxY - 8, plateZ + GAP / 2 - 10], [10, -25, plateZ + GAP / 2 - 10], C.red);
  label(ctx, '1~2cm만 끌어와도 낙하!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '끌어와서 낙하');
  imgs.push(snap(ctx, c));
  return imgs;
},

zurashi(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;

  // Step 1: 밀 방향
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, -15, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  arrow3d(ctx, [10, boxY + 5, 0], [45, boxY + 5, 0], C.green);
  label(ctx, '출구 방향 →', W / 2 + 80, OY - 30, C.green, 11);
  label(ctx, '출구 위치 확인 → 밀 방향 결정', W / 2, H - 14, C.gold, 11);
  badge(ctx, 1, '밀 방향 결정');
  imgs.push(snap(ctx, c));

  // Step 2: 가장자리 밀기
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, -15, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  claw3d(ctx, -35, boxY + 30, 0, 20, 'right');
  arrow3d(ctx, [-30, boxY + 5, 0], [-10, boxY, 0], C.green);
  label(ctx, '반대쪽 끝에서 출구 방향으로 밀기', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '가장자리에서 밀기');
  imgs.push(snap(ctx, c));

  // Step 3: 반복 이동
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, -15, boxY, 0, BOX_X, BOX_Y, BOX_Z, 0, 0, 0, null, C.ghost);
  box3d(ctx, 5, boxY, 0, BOX_X, BOX_Y, BOX_Z, 0, 0, 0, null, 0.5);
  box3d(ctx, 25, boxY - 3, 0, BOX_X, BOX_Y, BOX_Z, 0, 0, -5, null, 0.8);
  arrow3d(ctx, [30, boxY - 15, 0], [30, -25, 0], C.red);
  const [ax, ay] = iso(-15, boxY + 15, -20), [bx, by] = iso(25, boxY + 15, -20);
  curveArrow(ctx, ax, ay, bx, by, 0, -15, C.orange);
  label(ctx, '×2~4회', ax - 15, ay - 5, C.orange, 10);
  label(ctx, '같은 위치 반복 밀기 → 출구로 낙하!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '반복 밀기 → 낙하');
  imgs.push(snap(ctx, c));
  return imgs;
},

kururinpa(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;
  // 봉 가장자리에 상품이 걸쳐있는 상태
  const barZ = -8;

  // Step 1: 지렛대 포인트
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, barZ, BAR_LEN, 6);
  exitZone(ctx, 50, BAR_LEN);
  // 상품이 봉에 걸쳐짐 (한쪽은 봉 위, 한쪽은 밖으로)
  box3d(ctx, 15, boxY, barZ + 10, BOX_X, BOX_Y, BOX_Z);
  // 받침점 표시
  const [fx, fy] = iso(0, BAR_Y + 5, barZ);
  ctx.strokeStyle = C.clawGold; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.arc(fx, fy, 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, '받침점', fx - 25, fy + 15, C.clawGold, 10);
  label(ctx, '← 안쪽', fx - 55, fy - 10, C.dim, 10);
  label(ctx, '바깥쪽 →', fx + 65, fy - 10, C.dim, 10);
  label(ctx, '봉에 닿는 접점 = 지렛대 받침점 (시소 원리)', W / 2, H - 14, C.gold, 11);
  badge(ctx, 1, '지렛대 받침점 확인');
  imgs.push(snap(ctx, c));

  // Step 2: 안쪽 누르기
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, barZ, BAR_LEN, 6);
  exitZone(ctx, 50, BAR_LEN);
  box3d(ctx, 15, boxY + 2, barZ + 10, BOX_X, BOX_Y, BOX_Z, 0, 0, 12);
  claw3d(ctx, -15, boxY + 28, barZ, 20, 'right');
  arrow3d(ctx, [-12, boxY + 12, barZ], [-8, boxY - 5, barZ + 3], C.green);
  arrow3d(ctx, [35, boxY + 5, barZ + 18], [35, boxY + 18, barZ + 18], C.orange);
  label(ctx, '↓누르기', W / 2 - 80, 80, C.green, 10);
  label(ctx, '↑올라감', W / 2 + 80, 80, C.orange, 10);
  label(ctx, '안쪽 끝을 세게 누르면 바깥쪽이 올라감!', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '안쪽 끝 눌러 뒤집기');
  imgs.push(snap(ctx, c));

  // Step 3: 뒤집혀서 낙하
  clear(ctx);
  bar3d(ctx, 0, BAR_Y, barZ, BAR_LEN, 6);
  exitZone(ctx, 50, BAR_LEN);
  box3d(ctx, 20, boxY - 5, barZ + 15, BOX_X, BOX_Y, BOX_Z, 0, 0, 50, null, 0.7);
  // 뒤집히는 궤적
  const [ra, rb] = iso(15, boxY + 10, barZ + 5);
  const [rc, rd] = iso(25, boxY - 10, barZ + 25);
  curveArrow(ctx, ra, rb, rc, rd, 30, -25, C.red);
  arrow3d(ctx, [22, boxY - 18, barZ + 20], [22, -25, barZ + 20], C.red);
  label(ctx, '반동으로 뒤집혀서 낙하!', W / 2, H - 14, C.green, 12);
  badge(ctx, 3, '뒤집기 성공!');
  imgs.push(snap(ctx, c));
  return imgs;
},

maeotoshi(ctx, c) {
  const imgs = [];
  const boxY = BAR_Y + 3 + BOX_Y / 2;

  // Step 1: 오른쪽 뒤 당기기
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z);
  claw3d(ctx, 18, boxY + 28, -GAP / 2 - 5, 18, 'right');
  arrow3d(ctx, [18, boxY + 5, -GAP / 2], [18, boxY + 5, -GAP / 2 - 12], C.green);
  // 출구 방향 표시
  const [ex, ey] = iso(BAR_LEN / 2 + 5, boxY, 0);
  label(ctx, '출구→', ex, ey - 5, 'rgba(0,255,157,0.5)', 10);
  label(ctx, '뒤쪽(봉 바깥) 오른쪽 모서리를 뒤로 당기기', W / 2, H - 14, C.gold, 11);
  badge(ctx, 1, '오른쪽 뒤를 당기기');
  imgs.push(snap(ctx, c));

  // Step 2: 왼쪽 뒤 당기기
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, 3, boxY, 1, BOX_X, BOX_Y, BOX_Z, 0, 5, 0);
  claw3d(ctx, -18, boxY + 28, GAP / 2 + 5, 18, 'left');
  arrow3d(ctx, [-18, boxY + 5, GAP / 2], [-18, boxY + 5, GAP / 2 + 12], C.green);
  // 지그재그 표시
  const [za, zb] = iso(0, boxY + 18, -10);
  const [zc, zd] = iso(5, boxY + 18, 5);
  curveArrow(ctx, za, zb, zc, zd, 15, -8, C.orange);
  label(ctx, '좌↔우', za - 20, zb - 5, C.orange, 10);
  label(ctx, '이번엔 왼쪽 뒤를 당기기 (번갈아!)', W / 2, H - 14, C.gold, 11);
  badge(ctx, 2, '왼쪽 뒤를 당기기');
  imgs.push(snap(ctx, c));

  // Step 3: 앞쪽 낙하
  clear(ctx); bars(ctx, GAP, BAR_LEN, BAR_Y); exitZone(ctx, GAP, BAR_LEN);
  box3d(ctx, 0, boxY, 0, BOX_X, BOX_Y, BOX_Z, 0, 0, 0, null, C.ghost);
  box3d(ctx, 18, boxY - 3, 0, BOX_X, BOX_Y, BOX_Z, -8, 0, 0, null, 0.75);
  arrow3d(ctx, [20, boxY - 12, 0], [45, -25, 0], C.red);
  // 이동 경로
  const [ma, mb] = iso(-3, boxY + 12, -10);
  const [mc, md] = iso(18, boxY + 12, -10);
  curveArrow(ctx, ma, mb, mc, md, 5, -10, C.orange);
  label(ctx, '좌우 번갈아 2~3세트', ma - 20, mb - 5, C.orange, 10);
  label(ctx, '앞쪽(출구)으로 지그재그 이동 → 낙하!', W / 2, H - 14, C.green, 11);
  badge(ctx, 3, '앞쪽 낙하 성공!');
  imgs.push(snap(ctx, c));
  return imgs;
},

};
