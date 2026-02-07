// 전체 마커 오버뷰 이미지 (집게 오버레이)
export function drawMarkers(canvas, analysisData, imageSrc) {
  return new Promise((resolve) => {
    if (!canvas || !analysisData?.steps) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      const positions = resolvePositions(analysisData.steps, W, H);
      drawBaseImage(ctx, img, W, H);
      drawConnectors(ctx, positions, W, H);
      positions.forEach((pos, i) => {
        drawArrow(ctx, pos, analysisData.steps[i], W, H, 1.0);
      });
      positions.forEach((pos, i) => {
        drawClawOverlay(ctx, pos, analysisData.steps[i], W, H, 0.85, false);
      });
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

// 스텝별 개별 이미지 생성 — 현재 스텝은 집게 강조, 나머지 흐리게
export function drawStepImages(canvas, analysisData, imageSrc) {
  return new Promise((resolve) => {
    if (!canvas || !analysisData?.steps) { resolve([]); return; }
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      const positions = resolvePositions(analysisData.steps, W, H);
      const results = [];

      for (let current = 0; current < analysisData.steps.length; current++) {
        drawBaseImage(ctx, img, W, H);

        // 이전 스텝들 — 흐리게 (완료된 스텝)
        for (let j = 0; j < current; j++) {
          drawClawOverlay(ctx, positions[j], analysisData.steps[j], W, H, 0.2, false);
        }

        // 이전 → 현재 연결선
        if (current > 0) {
          drawSingleConnector(ctx, positions[current - 1], positions[current], W, H, 0.6);
        }

        // 현재 스텝 — 크고 밝게 강조 (집게 + 이동궤적 + 화살표)
        drawMovementArc(ctx, positions[current], analysisData.steps[current], W, H, 0.9);
        drawArrow(ctx, positions[current], analysisData.steps[current], W, H, 1.0);
        drawClawOverlay(ctx, positions[current], analysisData.steps[current], W, H, 1.0, true);

        // 다음 스텝들 — 아주 흐리게 (예정)
        for (let j = current + 1; j < analysisData.steps.length; j++) {
          drawClawOverlay(ctx, positions[j], analysisData.steps[j], W, H, 0.12, false);
        }

        // === 확대 크롭 — 현재 스텝 위치 중심으로 줌 ===
        const cropDim = Math.round(Math.min(W, H) * 0.55);
        let cx = Math.round(positions[current].x - cropDim / 2);
        let cy = Math.round(positions[current].y - cropDim / 2);
        cx = Math.max(0, Math.min(W - cropDim, cx));
        cy = Math.max(0, Math.min(H - cropDim, cy));

        const zoomCanvas = document.createElement('canvas');
        zoomCanvas.width = cropDim;
        zoomCanvas.height = cropDim;
        const zoomCtx = zoomCanvas.getContext('2d');
        zoomCtx.drawImage(canvas, cx, cy, cropDim, cropDim, 0, 0, cropDim, cropDim);

        // 상단 스텝 라벨
        const zs = cropDim / 400;
        const zFontSize = Math.max(11, 13 * zs);
        zoomCtx.font = `bold ${zFontSize}px sans-serif`;
        const zLabel = `🔍 Step ${analysisData.steps[current].step}`;
        const zLabelW = zoomCtx.measureText(zLabel).width + 14;
        const zLabelH = zFontSize + 10;
        zoomCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        zoomCtx.beginPath();
        zoomCtx.roundRect(cropDim - zLabelW - 8, 6, zLabelW, zLabelH, 4);
        zoomCtx.fill();
        zoomCtx.fillStyle = '#FFF';
        zoomCtx.textAlign = 'right';
        zoomCtx.textBaseline = 'top';
        zoomCtx.fillText(zLabel, cropDim - 14, 10);

        // === 하단 텍스트 오버레이 — 핵심 설명을 이미지 위에 직접 표시 ===
        const step = analysisData.steps[current];
        const txtPad = Math.max(8, 10 * zs);
        const actionFontSize = Math.max(13, 16 * zs);
        const resultFontSize = Math.max(11, 13 * zs);
        const lineGap = 4 * zs;

        // 텍스트 줄 준비
        const actionText = step.action || '';
        const resultText = step.expected_result ? `→ ${step.expected_result}` : '';

        // 바 높이 계산
        const barH = txtPad * 2 + actionFontSize + (resultText ? resultFontSize + lineGap : 0);
        const barY = cropDim - barH;

        // 반투명 배경 바
        zoomCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        zoomCtx.fillRect(0, barY, cropDim, barH);

        // action 텍스트 (흰색, 굵게)
        zoomCtx.font = `bold ${actionFontSize}px sans-serif`;
        zoomCtx.fillStyle = '#FFF';
        zoomCtx.textAlign = 'left';
        zoomCtx.textBaseline = 'top';
        zoomCtx.fillText(actionText, txtPad, barY + txtPad, cropDim - txtPad * 2);

        // expected_result 텍스트 (초록색)
        if (resultText) {
          zoomCtx.font = `bold ${resultFontSize}px sans-serif`;
          zoomCtx.fillStyle = '#81C784';
          zoomCtx.fillText(resultText, txtPad, barY + txtPad + actionFontSize + lineGap, cropDim - txtPad * 2);
        }

        results.push(zoomCanvas.toDataURL("image/jpeg", 0.9));
      }

      resolve(results);
    };
    img.onerror = () => resolve([]);
    img.src = imageSrc;
  });
}

// ===== 내부 헬퍼 함수들 =====

function getScale(W, H) { return Math.min(W, H) / 500; }

function resolvePositions(steps, W, H) {
  const scale = getScale(W, H);
  const minDist = Math.max(30, 40 * scale);
  const positions = steps.map((step) => ({
    x: (step.marker_x_percent / 100) * W,
    y: (step.marker_y_percent / 100) * H,
  }));
  for (let i = 1; i < positions.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        const angle = Math.atan2(dy, dx) || Math.PI / 4;
        const push = (minDist - dist) / 2 + 5;
        positions[i].x += Math.cos(angle) * push;
        positions[i].y += Math.sin(angle) * push;
        positions[i].x = Math.max(20, Math.min(W - 20, positions[i].x));
        positions[i].y = Math.max(20, Math.min(H - 20, positions[i].y));
      }
    }
  }
  return positions;
}

function drawBaseImage(ctx, img, W, H) {
  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, W, H);
}

function drawConnectors(ctx, positions, W, H) {
  const scale = getScale(W, H);
  positions.forEach((pos, i) => {
    if (i > 0) {
      drawSingleConnector(ctx, positions[i - 1], pos, W, H, 1.0);
    }
  });
}

function drawSingleConnector(ctx, from, to, W, H, opacity) {
  const scale = getScale(W, H);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = "rgba(0, 255, 157, 0.5)";
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ===== 집게(크로우) 점선 오버레이 — 핵심 시각화 =====
// (x, y) = 집게를 내려야 할 지점 (집게 중심)
// 집게 모양: 샤프트 → 본체 바 → 양쪽 팔(벌어진 상태) → 팁(안쪽으로 굽음)
function drawClawOverlay(ctx, pos, step, W, H, opacity, isCurrentStep) {
  const scale = getScale(W, H);
  const { x, y } = pos;

  // 크기 — 현재 스텝이면 더 크게
  const mul = isCurrentStep ? 1.3 : 0.85;
  const u = Math.max(16, 24 * scale) * mul;

  ctx.save();
  ctx.globalAlpha = opacity;

  const clawColor = isCurrentStep ? '#FF3C50' : 'rgba(255, 200, 60, 0.85)';
  const lineW = Math.max(2, (isCurrentStep ? 3.5 : 2.5) * scale);
  const dash = [5 * scale, 3 * scale];

  // ====== 집게 형태 그리기 ======

  // 기준점 계산
  const shaftTop = y - u * 2.0;        // 샤프트 꼭대기
  const bodyY = y - u * 0.4;           // 본체 바 Y위치
  const bodyHalfW = u * 0.55;          // 본체 바 반폭
  const armBottomY = y + u * 1.1;      // 팔 끝 Y위치
  const armSpreadX = u * 0.85;         // 팔 벌림 폭
  const tipInX = u * 0.25;             // 팁 안쪽 굽힘량
  const tipDownY = u * 0.12;           // 팁 아래쪽 굽힘량

  ctx.strokeStyle = clawColor;
  ctx.lineWidth = lineW;
  ctx.setLineDash(dash);

  // 1) 샤프트 (수직선)
  ctx.beginPath();
  ctx.moveTo(x, shaftTop);
  ctx.lineTo(x, bodyY);
  ctx.stroke();

  // 2) 본체 바 (가로선)
  ctx.beginPath();
  ctx.moveTo(x - bodyHalfW, bodyY);
  ctx.lineTo(x + bodyHalfW, bodyY);
  ctx.stroke();

  // 3) 왼쪽 팔 — 벌어진 형태 + 안쪽 팁
  ctx.beginPath();
  ctx.moveTo(x - bodyHalfW, bodyY);
  ctx.lineTo(x - armSpreadX, armBottomY);
  ctx.lineTo(x - armSpreadX + tipInX, armBottomY + tipDownY);
  ctx.stroke();

  // 4) 오른쪽 팔
  ctx.beginPath();
  ctx.moveTo(x + bodyHalfW, bodyY);
  ctx.lineTo(x + armSpreadX, armBottomY);
  ctx.lineTo(x + armSpreadX - tipInX, armBottomY + tipDownY);
  ctx.stroke();

  ctx.setLineDash([]);

  // 5) 현재 스텝 — 접촉하는 팔 강조 (실선 + 골드)
  //    밀기 방향과 반대쪽 팔이 경품에 접촉함
  //    right → 왼쪽 팔 접촉 / left → 오른쪽 팔 접촉
  if (isCurrentStep && step.direction && step.direction !== 'center') {
    ctx.lineWidth = Math.max(3, 5 * scale);
    ctx.strokeStyle = '#FFD700';
    ctx.setLineDash([]);
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 4 * scale;

    if (step.direction === 'right' || step.direction === 'forward') {
      // 오른쪽으로 밀 때 → 왼쪽 팔이 접촉
      ctx.beginPath();
      ctx.moveTo(x - bodyHalfW, bodyY);
      ctx.lineTo(x - armSpreadX, armBottomY);
      ctx.lineTo(x - armSpreadX + tipInX, armBottomY + tipDownY);
      ctx.stroke();
    }
    if (step.direction === 'left' || step.direction === 'back') {
      // 왼쪽으로 밀 때 → 오른쪽 팔이 접촉
      ctx.beginPath();
      ctx.moveTo(x + bodyHalfW, bodyY);
      ctx.lineTo(x + armSpreadX, armBottomY);
      ctx.lineTo(x + armSpreadX - tipInX, armBottomY + tipDownY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  // 6) 스텝 번호 뱃지 (샤프트 위)
  const numR = Math.max(9, (isCurrentStep ? 14 : 10) * scale);
  const badgeY = shaftTop - numR - 2 * scale;

  ctx.beginPath();
  ctx.arc(x, badgeY, numR, 0, Math.PI * 2);
  ctx.fillStyle = isCurrentStep ? '#FF3C50' : 'rgba(0, 0, 0, 0.75)';
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = (isCurrentStep ? 2.5 : 1.5) * scale;
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.max(8, (isCurrentStep ? 12 : 9) * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${step.step}`, x, badgeY);

  // 7) 라벨 (현재 스텝만 표시)
  if (isCurrentStep) {
    const label = step.marker_label || `Step ${step.step}`;
    const fontSize = Math.max(10, 12 * scale);
    ctx.font = `bold ${fontSize}px sans-serif`;
    const tw = ctx.measureText(label).width + 12 * scale;
    const th = fontSize + 8 * scale;
    const tx = x - tw / 2;
    const ty = armBottomY + tipDownY + 8 * scale;

    // 라벨이 이미지 밖으로 나가면 위에 표시
    const finalTy = (ty + th > H - 5) ? (shaftTop - numR * 2 - th - 6 * scale) : ty;

    const r = 3 * scale;
    ctx.fillStyle = 'rgba(255, 60, 80, 0.88)';
    ctx.beginPath();
    ctx.moveTo(tx + r, finalTy);
    ctx.lineTo(tx + tw - r, finalTy);
    ctx.quadraticCurveTo(tx + tw, finalTy, tx + tw, finalTy + r);
    ctx.lineTo(tx + tw, finalTy + th - r);
    ctx.quadraticCurveTo(tx + tw, finalTy + th, tx + tw - r, finalTy + th);
    ctx.lineTo(tx + r, finalTy + th);
    ctx.quadraticCurveTo(tx, finalTy + th, tx, finalTy + th - r);
    ctx.lineTo(tx, finalTy + r);
    ctx.quadraticCurveTo(tx, finalTy, tx + r, finalTy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, finalTy + th / 2);
  }

  ctx.restore();
}

// ===== 이동 궤적 곡선 화살표 — 주황색 점선 =====
// 상품이 어떻게 움직일지 큰 곡선 화살표로 표시 (영상 공략처럼)
function drawMovementArc(ctx, pos, step, W, H, opacity) {
  const scale = getScale(W, H);
  const { x, y } = pos;
  const moveType = step.movement_type || 'slide';
  const dir = step.direction || 'center';
  if (dir === 'center' && moveType === 'slide') return;

  const arcSize = Math.max(35, 55 * scale);
  const arcColor = '#FF6B35';

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = arcColor;
  ctx.fillStyle = arcColor;
  ctx.lineWidth = Math.max(3, 5 * scale);
  ctx.setLineDash([8 * scale, 5 * scale]);
  ctx.lineCap = 'round';

  if (moveType === 'rotation_cw' || moveType === 'rotation_ccw') {
    // 회전 궤적 — 큰 호(arc) 화살표
    const cw = moveType === 'rotation_cw';
    const r = arcSize * 1.3;
    // 호 중심을 집게 위치 아래쪽에
    const acx = x;
    const acy = y + arcSize * 0.5;
    const startA = cw ? -Math.PI * 0.7 : -Math.PI * 0.3;
    const endA = cw ? Math.PI * 0.15 : Math.PI * 0.7 + Math.PI;

    ctx.beginPath();
    ctx.arc(acx, acy, r, startA, endA, !cw);
    ctx.stroke();

    // 화살촉
    const tipX = acx + r * Math.cos(endA);
    const tipY = acy + r * Math.sin(endA);
    const tangent = endA + (cw ? Math.PI / 2 : -Math.PI / 2);
    ctx.setLineDash([]);
    drawArcHead(ctx, tipX, tipY, tangent, scale);

  } else if (moveType === 'fall') {
    // 낙하 궤적 — 아래로 커브
    const sx = x;
    const sy = y + arcSize * 0.2;
    const ex = x + (dir === 'left' ? -arcSize * 0.7 : dir === 'right' ? arcSize * 0.7 : 0);
    const ey = y + arcSize * 2.2;
    const cpx = (sx + ex) / 2 + (dir === 'left' ? -arcSize * 0.5 : dir === 'right' ? arcSize * 0.5 : -arcSize * 0.4);
    const cpy = sy + arcSize * 0.8;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();

    const angle = Math.atan2(ey - cpy, ex - cpx);
    ctx.setLineDash([]);
    drawArcHead(ctx, ex, ey, angle, scale);

  } else {
    // 슬라이드 — 방향으로 커브 화살표
    let dx = 0, dy = 0;
    if (dir === 'left') dx = -1;
    else if (dir === 'right') dx = 1;
    else if (dir === 'forward') dy = -1;
    else if (dir === 'back') dy = 1;

    const len = arcSize * 1.8;
    const sx = x + dx * arcSize * 0.3;
    const sy = y + dy * arcSize * 0.3;
    const ex = x + dx * len;
    const ey = y + dy * len;
    const cpx = (sx + ex) / 2 + dy * arcSize * 0.4;
    const cpy = (sy + ey) / 2 - dx * arcSize * 0.4;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();

    const angle = Math.atan2(ey - cpy, ex - cpx);
    ctx.setLineDash([]);
    drawArcHead(ctx, ex, ey, angle, scale);
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawArcHead(ctx, x, y, angle, scale) {
  const size = Math.max(10, 14 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawArrow(ctx, pos, step, W, H, opacity) {
  const scale = getScale(W, H);
  const arrowLen = Math.max(25, 35 * scale);
  const { x, y } = pos;
  const dir = step.direction;

  let ax = x, ay = y;
  if (dir === "left") ax -= arrowLen;
  else if (dir === "right") ax += arrowLen;
  else if (dir === "forward") ay -= arrowLen;
  else if (dir === "back") ay += arrowLen;

  if (dir && dir !== "center") {
    ctx.save();
    ctx.globalAlpha = opacity;
    // 그림자
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = "rgba(0, 255, 157, 0.3)";
    ctx.lineWidth = 6 * scale;
    ctx.stroke();
    // 메인 화살표
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = "#00FF9D";
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    // 화살촉
    const angle = Math.atan2(ay - y, ax - x);
    const headSize = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - headSize * Math.cos(angle - 0.5), ay - headSize * Math.sin(angle - 0.5));
    ctx.lineTo(ax - headSize * Math.cos(angle + 0.5), ay - headSize * Math.sin(angle + 0.5));
    ctx.closePath();
    ctx.fillStyle = "#00FF9D";
    ctx.fill();
    ctx.restore();
  }
}
