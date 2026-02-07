// ===== 기술별 가이드 다이어그램 이미지 생성 (Canvas 2D) =====
const W = 380;
const H = 260;

// 색상 팔레트
const COL = {
  bg: '#0d0d18',
  bar: '#777', barCap: '#aaa',
  box: '#FF8C42', boxLine: '#FFB070', boxText: 'rgba(255,255,255,0.4)',
  claw: '#4FC3F7', clawGold: '#FFD700',
  green: '#00FF9D', red: '#FF3C50', orange: '#FF8C42',
  gold: '#FFD700', white: '#fff', dim: '#666',
};

// 봉 위치 상수
const PL = 130, PR = 250, PT = 130;

export function generateTechniqueDiagrams(techniqueId, canvas) {
  if (!canvas) return [];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const gen = GENERATORS[techniqueId];
  return gen ? gen(ctx, canvas) : [];
}

// ===== 헬퍼 함수들 =====

function bg(ctx) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let x = 20; x < W; x += 20) ctx.fillRect(x, 0, 1, H);
  for (let y = 20; y < H; y += 20) ctx.fillRect(0, y, W, 1);
}

function drawPoles(ctx, lx = PL, rx = PR, ty = PT) {
  const pw = 14, bh = H - ty;
  // 그림자
  ctx.fillStyle = 'rgba(80,80,80,0.25)';
  ctx.fillRect(lx - pw / 2 + 3, ty + 3, pw, bh);
  ctx.fillRect(rx - pw / 2 + 3, ty + 3, pw, bh);
  // 봉 몸체 (그라디언트)
  const g = ctx.createLinearGradient(0, 0, pw, 0);
  g.addColorStop(0, '#555'); g.addColorStop(0.4, '#999'); g.addColorStop(0.6, '#999'); g.addColorStop(1, '#555');
  [lx, rx].forEach(x => {
    ctx.save(); ctx.translate(x - pw / 2, 0);
    ctx.fillStyle = g; ctx.fillRect(0, ty, pw, bh);
    ctx.restore();
    ctx.fillStyle = COL.barCap; ctx.fillRect(x - pw / 2, ty, pw, 3);
  });
}

function drawBox(ctx, cx, cy, w, h, angle = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(angle * Math.PI / 180);
  ctx.shadowColor = 'rgba(255,140,66,0.3)'; ctx.shadowBlur = 10;
  ctx.fillStyle = COL.box; ctx.strokeStyle = COL.boxLine; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // 테이프 선
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0);
  ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 4);
  ctx.stroke();
  ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = COL.boxText;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('상품', 0, 0);
  ctx.restore();
}

function drawClaw(ctx, cx, cy, sz = 26, active = null) {
  // 축 (점선)
  ctx.strokeStyle = COL.claw; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, cy - sz * 1.3); ctx.lineTo(cx, cy - sz * 0.3); ctx.stroke();
  ctx.setLineDash([]);
  // 바디 바
  ctx.strokeStyle = COL.claw; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - sz * 0.5, cy - sz * 0.3); ctx.lineTo(cx + sz * 0.5, cy - sz * 0.3); ctx.stroke();
  // 중심 조인트
  ctx.fillStyle = COL.claw; ctx.beginPath(); ctx.arc(cx, cy - sz * 0.3, 3, 0, Math.PI * 2); ctx.fill();
  // 팔 그리기
  ['left', 'right'].forEach(side => {
    const dir = side === 'left' ? -1 : 1;
    const isActive = active === side;
    ctx.strokeStyle = isActive ? COL.clawGold : COL.claw;
    ctx.lineWidth = isActive ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + dir * sz * 0.5, cy - sz * 0.3);
    ctx.quadraticCurveTo(cx + dir * sz * 0.5, cy + sz * 0.2, cx + dir * sz * 0.3, cy + sz * 0.55);
    ctx.stroke();
    ctx.fillStyle = isActive ? COL.clawGold : COL.claw;
    ctx.beginPath(); ctx.arc(cx + dir * sz * 0.3, cy + sz * 0.55, 2.5, 0, Math.PI * 2); ctx.fill();
  });
}

function drawArrow(ctx, x1, y1, x2, y2, color = COL.green, dash = true) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
  if (dash) ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const a = Math.atan2(y2 - y1, x2 - x1), hl = 10;
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
  ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawCurveArrow(ctx, x1, y1, x2, y2, ox, oy, color = COL.green) {
  const cpx = (x1 + x2) / 2 + ox, cpy = (y1 + y2) / 2 + oy;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cpx, cpy, x2, y2); ctx.stroke(); ctx.setLineDash([]);
  const t = 0.95;
  const nx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cpx + t ** 2 * x2;
  const ny = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cpy + t ** 2 * y2;
  const a = Math.atan2(y2 - ny, x2 - nx), hl = 10;
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4));
  ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawLabel(ctx, text, x, y, color = COL.gold, size = 12) {
  ctx.font = `bold ${size}px 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawBadge(ctx, num, title) {
  ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
  const tw = ctx.measureText(`Step ${num}  ${title}`).width + 20;
  ctx.fillStyle = 'rgba(255,60,80,0.9)';
  ctx.beginPath(); ctx.roundRect(8, 8, tw, 26, 6); ctx.fill();
  ctx.fillStyle = COL.white; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`Step ${num}  ${title}`, 18, 21);
}

function drawExit(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,255,157,0.08)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,255,157,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
  drawLabel(ctx, '↓ 출구', x + w / 2, y + h / 2, 'rgba(0,255,157,0.6)', 11);
}

function snap(ctx, canvas) { return canvas.toDataURL(); }

// ===== 기술별 다이어그램 =====

const GENERATORS = {
  tatehame(ctx, c) {
    const imgs = [];
    // Step 1: 한쪽 끝 떨어뜨리기
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT - 28, 100, 48, 0);
    drawClaw(ctx, W / 2 + 28, PT - 80, 24, 'right');
    drawArrow(ctx, W / 2 + 38, PT - 5, W / 2 + 38, PT + 50, COL.green);
    drawLabel(ctx, '무게중심 쪽을 눌러 반대쪽 떨어뜨리기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '한쪽 끝 떨어뜨리기'); imgs.push(snap(ctx, c));

    // Step 2: 기울기 키우기
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2 + 8, PT + 8, 100, 48, -32);
    drawClaw(ctx, W / 2 - 18, PT - 72, 24, 'left');
    drawArrow(ctx, W / 2 - 18, PT - 30, W / 2 - 5, PT + 15, COL.green);
    drawCurveArrow(ctx, W / 2 + 40, PT - 20, W / 2 + 15, PT + 35, 30, 0, COL.orange);
    drawLabel(ctx, '위쪽을 밀어 기울기 30~45° 만들기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 2, '기울기 키우기'); imgs.push(snap(ctx, c));

    // Step 3: 세로 낙하
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT + 25, 48, 100, 0, 0.7);
    drawArrow(ctx, W / 2, PT + 80, W / 2, H - 42, COL.red);
    drawLabel(ctx, '짧은 면이 봉 사이 통과 → 낙하!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '세로 낙하 성공!'); imgs.push(snap(ctx, c));
    return imgs;
  },

  yokohame(ctx, c) {
    const imgs = [];
    // Step 1
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT - 28, 100, 48, 0);
    drawClaw(ctx, W / 2 + 28, PT - 80, 24);
    drawArrow(ctx, W / 2 + 38, PT - 5, W / 2 + 38, PT + 50, COL.green);
    drawLabel(ctx, '한쪽 모서리를 봉 사이로 떨어뜨리기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '모서리 떨어뜨리기'); imgs.push(snap(ctx, c));

    // Step 2: 회전
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT + 8, 100, 48, -42);
    drawClaw(ctx, W / 2 - 22, PT - 70, 24);
    drawCurveArrow(ctx, W / 2 + 35, PT - 18, W / 2 - 15, PT + 42, 45, -5, COL.orange);
    drawLabel(ctx, '긴 면이 봉과 평행하도록 회전시키기', W / 2, H - 48, COL.gold, 11);
    // 회전 각도 표시
    ctx.strokeStyle = 'rgba(255,140,66,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(W / 2 - 50, PT + 8); ctx.lineTo(W / 2 + 50, PT + 8); ctx.stroke();
    ctx.setLineDash([]);
    drawLabel(ctx, '~45°', W / 2 + 55, PT - 5, COL.orange, 11);
    drawBadge(ctx, 2, '회전시키기'); imgs.push(snap(ctx, c));

    // Step 3
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT + 20, 48, 100, 0, 0.7);
    drawArrow(ctx, W / 2, PT + 75, W / 2, H - 42, COL.red);
    drawLabel(ctx, '가로 자세로 봉 사이 통과 → 낙하!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '가로 낙하 성공!'); imgs.push(snap(ctx, c));
    return imgs;
  },

  hashiwatashi(ctx, c) {
    const imgs = [];
    // Step 1: 상태 파악
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2, PT - 28, 100, 48, 0);
    // 관찰 표시 (점선 원)
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(W / 2, PT - 28, 60, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    drawLabel(ctx, '🔍', W / 2 + 65, PT - 55, COL.white, 18);
    // 간격 표시
    drawArrow(ctx, PL + 7, PT + 18, PR - 7, PT + 18, 'rgba(255,215,0,0.5)', false);
    drawLabel(ctx, '봉 간격 확인', W / 2, PT + 32, COL.gold, 10);
    drawLabel(ctx, '봉 간격 vs 상품 크기 비교하기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '상태 파악'); imgs.push(snap(ctx, c));

    // Step 2: 한쪽 밀기
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2 + 15, PT - 25, 100, 48, -8);
    drawClaw(ctx, W / 2 - 30, PT - 78, 24, 'left');
    drawArrow(ctx, W / 2 - 30, PT - 30, W / 2 + 20, PT - 15, COL.green);
    drawLabel(ctx, '출구 반대쪽을 밀어 한쪽을 기울이기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 2, '한쪽 밀기'); imgs.push(snap(ctx, c));

    // Step 3: 누적 이동
    bg(ctx); drawExit(ctx, PL + 7, H - 38, PR - PL - 14, 38); drawPoles(ctx);
    drawBox(ctx, W / 2 + 10, PT + 5, 100, 48, -20, 0.7);
    drawArrow(ctx, W / 2 + 10, PT + 35, W / 2 + 10, H - 42, COL.red);
    // 반복 표시
    drawLabel(ctx, '×2~4회', W / 2 - 60, PT - 10, COL.orange, 11);
    drawCurveArrow(ctx, W / 2 - 70, PT - 5, W / 2 - 70, PT + 20, -20, 0, COL.orange);
    drawLabel(ctx, '무게중심이 틈 위로 → 자동 낙하!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '누적 이동 → 낙하'); imgs.push(snap(ctx, c));
    return imgs;
  },

  yose(ctx, c) {
    const imgs = [];
    const plateY = PT + 20;
    // Step 1: 걸릴 위치 찾기
    bg(ctx);
    // 플랫폼
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    drawLabel(ctx, '출구→', 310, plateY + 24, 'rgba(0,255,157,0.6)', 10);
    // 상품
    drawBox(ctx, 230, plateY - 26, 80, 44, 0);
    // 집게 오프셋
    drawClaw(ctx, 270, plateY - 80, 24);
    // 점선으로 집게와 상품 가장자리 연결
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(260, plateY - 50); ctx.lineTo(270, plateY - 30); ctx.stroke();
    ctx.setLineDash([]);
    drawLabel(ctx, '상품 끝에서 살짝 바깥쪽에 집게 맞추기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '걸릴 위치 찾기'); imgs.push(snap(ctx, c));

    // Step 2: 한쪽 발 걸기
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    drawBox(ctx, 230, plateY - 26, 80, 44, 0);
    drawClaw(ctx, 270, plateY - 60, 24, 'left');
    // 걸리는 부분 강조
    ctx.strokeStyle = COL.clawGold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(262, plateY - 35, 8, 0, Math.PI * 2); ctx.stroke();
    drawLabel(ctx, '한쪽 발만 걸기!', 262, plateY - 55, COL.clawGold, 11);
    drawLabel(ctx, '집게를 완벽히 잡을 필요 없음 — 걸리기만', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 2, '한쪽 발 걸기'); imgs.push(snap(ctx, c));

    // Step 3: 끌어오기
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    // 이동 후 상품 위치
    drawBox(ctx, 260, plateY - 26, 80, 44, 0, 0.4); // 원래 위치 (흐리게)
    drawBox(ctx, 290, plateY - 26, 80, 44, 0); // 이동 후
    drawCurveArrow(ctx, 245, plateY - 30, 290, plateY - 30, 0, -30, COL.green);
    drawArrow(ctx, 300, plateY + 5, 300, plateY + 50, COL.red);
    drawLabel(ctx, '1~2cm만 이동해도 큰 차이!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '끌어와서 낙하'); imgs.push(snap(ctx, c));
    return imgs;
  },

  zurashi(ctx, c) {
    const imgs = [];
    const plateY = PT + 20;
    // Step 1: 밀 방향 결정
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    drawBox(ctx, 180, plateY - 26, 80, 44, 0);
    // 큰 방향 화살표
    drawArrow(ctx, 225, plateY - 26, 300, plateY - 26, COL.green, true);
    drawLabel(ctx, '출구 방향', 310, plateY - 42, COL.green, 11);
    drawLabel(ctx, '출구가 어디인지 확인 → 방향 결정', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '밀 방향 결정'); imgs.push(snap(ctx, c));

    // Step 2: 가장자리에 집게
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    drawBox(ctx, 180, plateY - 26, 80, 44, 0);
    drawClaw(ctx, 150, plateY - 78, 24, 'right');
    drawArrow(ctx, 165, plateY - 35, 200, plateY - 26, COL.green);
    drawLabel(ctx, '밀려는 반대쪽 끝에 집게를 내려 밀기', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 2, '가장자리에 밀기'); imgs.push(snap(ctx, c));

    // Step 3: 반복
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(60, plateY, 260, 8);
    ctx.fillStyle = '#777'; ctx.fillRect(60, plateY, 260, 3);
    drawExit(ctx, 280, plateY + 8, 60, H - plateY - 8);
    drawBox(ctx, 200, plateY - 26, 80, 44, 0, 0.3);
    drawBox(ctx, 230, plateY - 26, 80, 44, 0, 0.5);
    drawBox(ctx, 270, plateY - 26, 80, 44, 0);
    drawArrow(ctx, 290, plateY + 5, 290, plateY + 50, COL.red);
    drawLabel(ctx, '×2~4', 130, plateY - 26, COL.orange, 13);
    drawCurveArrow(ctx, 140, plateY - 20, 140, plateY + 5, -20, 0, COL.orange);
    drawLabel(ctx, '같은 위치 반복 → 출구로 낙하!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '반복 밀기 → 낙하'); imgs.push(snap(ctx, c));
    return imgs;
  },

  kururinpa(ctx, c) {
    const imgs = [];
    // Step 1: 지렛대 포인트 확인
    bg(ctx);
    // 봉 하나 (지렛대 받침점)
    const poleX = 200, poleY = PT + 10;
    ctx.fillStyle = '#555'; ctx.fillRect(poleX - 7, poleY, 14, H - poleY);
    ctx.fillStyle = '#999'; ctx.fillRect(poleX - 7, poleY, 14, 3);
    drawExit(ctx, poleX + 30, H - 50, 120, 50);
    // 상품 걸쳐진 상태 (한쪽이 밖으로 나와있음)
    drawBox(ctx, poleX + 30, poleY - 24, 110, 44, 0);
    // 받침점 표시
    ctx.strokeStyle = COL.clawGold; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(poleX, poleY, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    drawLabel(ctx, '받침점', poleX, poleY + 25, COL.clawGold, 10);
    drawLabel(ctx, '안쪽', poleX - 30, poleY - 45, COL.dim, 10);
    drawLabel(ctx, '바깥쪽', poleX + 70, poleY - 45, COL.dim, 10);
    drawLabel(ctx, '봉에 닿는 접점이 지렛대 받침점', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 1, '지렛대 포인트 확인'); imgs.push(snap(ctx, c));

    // Step 2: 안쪽 누르기
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(poleX - 7, poleY, 14, H - poleY);
    ctx.fillStyle = '#999'; ctx.fillRect(poleX - 7, poleY, 14, 3);
    drawExit(ctx, poleX + 30, H - 50, 120, 50);
    // 기울어진 상품
    drawBox(ctx, poleX + 20, poleY - 15, 110, 44, 15);
    drawClaw(ctx, poleX - 30, poleY - 72, 24, 'right');
    // 누르기 화살표
    drawArrow(ctx, poleX - 25, poleY - 30, poleX - 15, poleY + 5, COL.green);
    // 반대쪽 올라감 화살표
    drawArrow(ctx, poleX + 65, poleY - 20, poleX + 65, poleY - 50, COL.orange);
    drawLabel(ctx, '↓누르기', poleX - 45, poleY - 40, COL.green, 10);
    drawLabel(ctx, '↑올라감', poleX + 85, poleY - 40, COL.orange, 10);
    drawLabel(ctx, '안쪽 끝을 세게 누르면 바깥쪽이 올라감', W / 2, H - 48, COL.gold, 11);
    drawBadge(ctx, 2, '안쪽 끝 누르기'); imgs.push(snap(ctx, c));

    // Step 3: 뒤집혀서 낙하
    bg(ctx);
    ctx.fillStyle = '#555'; ctx.fillRect(poleX - 7, poleY, 14, H - poleY);
    ctx.fillStyle = '#999'; ctx.fillRect(poleX - 7, poleY, 14, 3);
    drawExit(ctx, poleX + 30, H - 50, 120, 50);
    // 뒤집힌 상태
    drawBox(ctx, poleX + 50, poleY + 20, 110, 44, 60, 0.7);
    drawCurveArrow(ctx, poleX + 30, poleY - 30, poleX + 70, poleY + 50, 50, -20, COL.red);
    drawArrow(ctx, poleX + 60, poleY + 50, poleX + 60, H - 55, COL.red);
    drawLabel(ctx, '반동으로 뒤집혀서 낙하!', W / 2, H - 48, COL.green, 12);
    drawBadge(ctx, 3, '뒤집기 성공!'); imgs.push(snap(ctx, c));
    return imgs;
  },

  maeotoshi(ctx, c) {
    const imgs = [];
    // 탑뷰 스타일 (위에서 본 모습)
    const barsY1 = 100, barsY2 = 180; // 두 봉의 y위치
    const exitY = H - 30;

    function drawTopBars() {
      ctx.fillStyle = '#555';
      ctx.fillRect(80, barsY1, 220, 8); ctx.fillRect(80, barsY2, 220, 8);
      ctx.fillStyle = '#777';
      ctx.fillRect(80, barsY1, 220, 3); ctx.fillRect(80, barsY2, 220, 3);
      drawLabel(ctx, '봉', 60, barsY1 + 4, COL.dim, 10);
      drawLabel(ctx, '봉', 60, barsY2 + 4, COL.dim, 10);
    }

    // Step 1: 오른쪽 뒤 당기기
    bg(ctx);
    drawLabel(ctx, '[ 위에서 본 모습 ]', W / 2, 55, 'rgba(255,255,255,0.3)', 10);
    drawTopBars();
    drawExit(ctx, 130, exitY - 5, 120, 30);
    drawLabel(ctx, '↓ 출구 (앞쪽)', W / 2, exitY + 32, 'rgba(0,255,157,0.5)', 10);
    // 상품 (위에서 본 사각형)
    drawBox(ctx, W / 2, 140, 90, 70, 0);
    drawClaw(ctx, W / 2 + 35, 92, 20, 'right');
    drawArrow(ctx, W / 2 + 35, 107, W / 2 + 35, 80, COL.green);
    drawLabel(ctx, '뒤쪽 오른쪽을 당기기', W / 2, 70, COL.gold, 11);
    drawBadge(ctx, 1, '오른쪽 뒤 당기기'); imgs.push(snap(ctx, c));

    // Step 2: 왼쪽 뒤 당기기
    bg(ctx);
    drawLabel(ctx, '[ 위에서 본 모습 ]', W / 2, 55, 'rgba(255,255,255,0.3)', 10);
    drawTopBars();
    drawExit(ctx, 130, exitY - 5, 120, 30);
    drawBox(ctx, W / 2 + 3, 145, 90, 70, 5); // 살짝 이동/회전
    drawClaw(ctx, W / 2 - 35, 96, 20, 'left');
    drawArrow(ctx, W / 2 - 35, 111, W / 2 - 35, 84, COL.green);
    // 지그재그 경로 표시
    ctx.strokeStyle = 'rgba(255,140,66,0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(W / 2, 140); ctx.lineTo(W / 2 + 5, 150); ctx.lineTo(W / 2 - 3, 160); ctx.stroke();
    ctx.setLineDash([]);
    drawLabel(ctx, '이번엔 왼쪽 뒤를 당기기', W / 2, 70, COL.gold, 11);
    drawBadge(ctx, 2, '왼쪽 뒤 당기기'); imgs.push(snap(ctx, c));

    // Step 3: 반복 → 앞쪽 낙하
    bg(ctx);
    drawLabel(ctx, '[ 위에서 본 모습 ]', W / 2, 55, 'rgba(255,255,255,0.3)', 10);
    drawTopBars();
    drawExit(ctx, 130, exitY - 5, 120, 30);
    drawBox(ctx, W / 2, 140, 90, 70, 0, 0.3); // 원래 위치 (흐리게)
    drawBox(ctx, W / 2, 175, 90, 70, 0, 0.7); // 이동 후
    // 지그재그 화살표
    drawArrow(ctx, W / 2 + 10, 150, W / 2 - 10, 160, COL.orange, true);
    drawArrow(ctx, W / 2 - 10, 160, W / 2 + 10, 170, COL.orange, true);
    drawArrow(ctx, W / 2, 210, W / 2, exitY - 8, COL.red);
    drawLabel(ctx, '좌우 번갈아 2~3세트 → 앞쪽 낙하!', W / 2, 70, COL.green, 12);
    drawBadge(ctx, 3, '반복 → 앞쪽 낙하'); imgs.push(snap(ctx, c));
    return imgs;
  },
};
