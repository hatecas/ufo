// ===== markers.js =====
// 집게를 내려야 할 위치만 3D로 명확하게 표시
// 복잡한 화살표/궤적 전부 제거 — 오직 "여기에 집게를 내려라" 만 보여줌

// ===== 전체 오버뷰 이미지 =====
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

      // 배경
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, W, H);

      // 순서 연결선 (얇은 점선)
      const s = getScale(W, H);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5 * s;
      ctx.setLineDash([4 * s, 4 * s]);
      for (let i = 1; i < positions.length; i++) {
        ctx.beginPath();
        ctx.moveTo(positions[i - 1].x, positions[i - 1].y);
        ctx.lineTo(positions[i].x, positions[i].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 각 스텝에 3D 집게 그리기
      positions.forEach((pos, i) => {
        draw3DClaw(ctx, pos.x, pos.y, analysisData.steps[i], W, H, false);
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

// ===== 스텝별 개별 이미지 =====
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

      for (let cur = 0; cur < analysisData.steps.length; cur++) {
        // 배경
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, W, H);

        // 다른 스텝 — 작고 흐리게
        for (let j = 0; j < analysisData.steps.length; j++) {
          if (j !== cur) {
            draw3DClaw(ctx, positions[j].x, positions[j].y, analysisData.steps[j], W, H, false, 0.2);
          }
        }

        // 현재 스텝 — 크고 밝게
        draw3DClaw(ctx, positions[cur].x, positions[cur].y, analysisData.steps[cur], W, H, true);

        // 확대 크롭
        const cropDim = Math.round(Math.min(W, H) * 0.55);
        let cx = Math.round(positions[cur].x - cropDim / 2);
        let cy = Math.round(positions[cur].y - cropDim / 2);
        cx = Math.max(0, Math.min(W - cropDim, cx));
        cy = Math.max(0, Math.min(H - cropDim, cy));

        const zoomCanvas = document.createElement('canvas');
        zoomCanvas.width = cropDim;
        zoomCanvas.height = cropDim;
        const zCtx = zoomCanvas.getContext('2d');
        zCtx.drawImage(canvas, cx, cy, cropDim, cropDim, 0, 0, cropDim, cropDim);

        // 하단 설명 바
        const zs = cropDim / 400;
        const step = analysisData.steps[cur];
        const barH = Math.max(50, 60 * zs);
        const barY = cropDim - barH;

        zCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        zCtx.fillRect(0, barY, cropDim, barH);

        const actionFont = Math.max(13, 16 * zs);
        const whereFont = Math.max(11, 13 * zs);

        // Step 라벨 + action
        zCtx.font = `bold ${actionFont}px sans-serif`;
        zCtx.fillStyle = '#FF3C50';
        zCtx.textAlign = 'left';
        zCtx.textBaseline = 'top';
        const stepLabel = `Step ${step.step}`;
        zCtx.fillText(stepLabel, 10, barY + 8);
        const labelW = zCtx.measureText(stepLabel).width;
        zCtx.fillStyle = '#FFF';
        zCtx.fillText(`  ${step.action || ''}`, 10 + labelW, barY + 8);

        // where 텍스트
        if (step.where) {
          zCtx.font = `${whereFont}px sans-serif`;
          zCtx.fillStyle = '#81C784';
          zCtx.fillText(`📍 ${step.where}`, 10, barY + 8 + actionFont + 6, cropDim - 20);
        }

        results.push(zoomCanvas.toDataURL("image/jpeg", 0.9));
      }
      resolve(results);
    };
    img.onerror = () => resolve([]);
    img.src = imageSrc;
  });
}

// ===== 핵심: 3D 집게 렌더링 =====
// 집게를 내릴 위치(x, y)에 입체적인 3D 클로를 그린다
function draw3DClaw(ctx, x, y, step, W, H, isActive, overrideAlpha) {
  const s = getScale(W, H);
  const alpha = overrideAlpha ?? (isActive ? 1.0 : 0.7);
  const size = isActive ? 1.3 : 0.75;
  const u = Math.max(18, 28 * s) * size;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ===== 3D 집게 형태 =====
  // 아래에서 보는 시점 — 집게가 내려오는 느낌

  // 그림자 (지면 원)
  const shadowRx = u * 1.1;
  const shadowRy = u * 0.35;
  ctx.fillStyle = isActive ? 'rgba(255, 60, 80, 0.25)' : 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.3, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // 타겟 링 (집게 내릴 정확한 위치)
  if (isActive) {
    // 펄스 링
    ctx.strokeStyle = 'rgba(255, 60, 80, 0.5)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.3, shadowRx * 1.3, shadowRy * 1.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 십자선
    const crossLen = u * 0.4;
    ctx.strokeStyle = 'rgba(255, 60, 80, 0.6)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - crossLen, y + u * 0.3);
    ctx.lineTo(x + crossLen, y + u * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + u * 0.3 - crossLen * 0.5);
    ctx.lineTo(x, y + u * 0.3 + crossLen * 0.5);
    ctx.stroke();
  }

  // 색상
  const mainColor = isActive ? '#FF3C50' : 'rgba(255, 200, 60, 0.85)';
  const metalColor = isActive ? '#E8E8E8' : '#CCCCCC';
  const darkMetal = isActive ? '#999999' : '#888888';
  const lineW = Math.max(2, (isActive ? 3 : 2) * s);

  // ---- 수직 샤프트 (위에서 내려오는 봉) ----
  const shaftTop = y - u * 2.8;
  const shaftBot = y - u * 0.8;

  // 샤프트 3D 효과 (두께감)
  const shaftW = u * 0.15;
  ctx.fillStyle = metalColor;
  ctx.fillRect(x - shaftW, shaftTop, shaftW * 2, shaftBot - shaftTop);
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x - shaftW * 0.3, shaftTop, shaftW * 0.6, shaftBot - shaftTop);
  // 외곽
  ctx.strokeStyle = darkMetal;
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(x - shaftW, shaftTop, shaftW * 2, shaftBot - shaftTop);

  // ---- 본체 (수평 바 — 3D 박스) ----
  const bodyW = u * 0.7;
  const bodyH = u * 0.25;
  const bodyD = u * 0.15; // 깊이
  const bodyY = shaftBot;

  // 정면
  ctx.fillStyle = metalColor;
  ctx.fillRect(x - bodyW, bodyY, bodyW * 2, bodyH);
  ctx.strokeStyle = darkMetal;
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(x - bodyW, bodyY, bodyW * 2, bodyH);

  // 윗면 (3D 깊이)
  ctx.fillStyle = '#D8D8D8';
  ctx.beginPath();
  ctx.moveTo(x - bodyW, bodyY);
  ctx.lineTo(x - bodyW + bodyD, bodyY - bodyD);
  ctx.lineTo(x + bodyW + bodyD, bodyY - bodyD);
  ctx.lineTo(x + bodyW, bodyY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 오른쪽면
  ctx.fillStyle = '#B8B8B8';
  ctx.beginPath();
  ctx.moveTo(x + bodyW, bodyY);
  ctx.lineTo(x + bodyW + bodyD, bodyY - bodyD);
  ctx.lineTo(x + bodyW + bodyD, bodyY + bodyH - bodyD);
  ctx.lineTo(x + bodyW, bodyY + bodyH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ---- 왼쪽 팔 (3D) ----
  const armBot = y + u * 0.2;
  const armSpread = u * 0.85;
  const tipIn = u * 0.3;
  const armW = u * 0.08;

  drawArm3D(ctx, x - bodyW * 0.7, bodyY + bodyH, x - armSpread, armBot, tipIn, armW, s, metalColor, darkMetal);

  // ---- 오른쪽 팔 (3D) ----
  drawArm3D(ctx, x + bodyW * 0.7, bodyY + bodyH, x + armSpread, armBot, -tipIn, armW, s, metalColor, darkMetal);

  // ---- 접촉하는 팔 강조 ----
  if (isActive && step.direction && step.direction !== 'center') {
    ctx.lineWidth = Math.max(3, 4.5 * s);
    ctx.strokeStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 6 * s;

    if (step.direction === 'right' || step.direction === 'forward') {
      // 왼쪽 팔 강조 (오른쪽으로 밀 때)
      drawArmLine(ctx, x - bodyW * 0.7, bodyY + bodyH, x - armSpread, armBot, tipIn);
    }
    if (step.direction === 'left' || step.direction === 'back') {
      // 오른쪽 팔 강조
      drawArmLine(ctx, x + bodyW * 0.7, bodyY + bodyH, x + armSpread, armBot, -tipIn);
    }
    ctx.shadowBlur = 0;
  }

  // ---- 스텝 번호 뱃지 (샤프트 위) ----
  const badgeR = Math.max(10, (isActive ? 16 : 11) * s);
  const badgeY = shaftTop - badgeR - 3 * s;

  // 뱃지 배경
  ctx.beginPath();
  ctx.arc(x, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? '#FF3C50' : 'rgba(0, 0, 0, 0.75)';
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = (isActive ? 2.5 : 1.5) * s;
  ctx.stroke();

  // 번호
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.max(9, (isActive ? 14 : 10) * s)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${step.step}`, x, badgeY);

  // ---- 밀기 방향 표시 (작은 화살표 하나만) ----
  if (isActive && step.direction && step.direction !== 'center') {
    const arrowLen = u * 1.2;
    let ax = 0, ay = 0;
    if (step.direction === 'left') ax = -arrowLen;
    else if (step.direction === 'right') ax = arrowLen;
    else if (step.direction === 'forward') ay = -arrowLen * 0.6;
    else if (step.direction === 'back') ay = arrowLen * 0.6;

    const startX = x + ax * 0.15;
    const startY = y + u * 0.3 + ay * 0.15;
    const endX = x + ax;
    const endY = y + u * 0.3 + ay;

    // 화살표 본체
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = Math.max(3, 4 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // 화살촉
    const angle = Math.atan2(endY - startY, endX - startX);
    const headSize = 10 * s;
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headSize * Math.cos(angle - 0.4), endY - headSize * Math.sin(angle - 0.4));
    ctx.lineTo(endX - headSize * Math.cos(angle + 0.4), endY - headSize * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ===== 3D 팔 그리기 (두께 있는 팔) =====
function drawArm3D(ctx, topX, topY, botX, botY, tipOffsetX, armW, s, metalColor, darkMetal) {
  // 팔의 방향 벡터
  const dx = botX - topX;
  const dy = botY - topY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * armW; // 법선 (수직 방향)
  const ny = dx / len * armW;

  // 팔 면 (사다리꼴)
  ctx.fillStyle = metalColor;
  ctx.beginPath();
  ctx.moveTo(topX - nx, topY - ny);
  ctx.lineTo(topX + nx, topY + ny);
  ctx.lineTo(botX + nx, botY + ny);
  ctx.lineTo(botX - nx, botY - ny);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = darkMetal;
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(topX - nx * 0.3, topY - ny * 0.3);
  ctx.lineTo(topX + nx * 0.3, topY + ny * 0.3);
  ctx.lineTo(botX + nx * 0.3, botY + ny * 0.3);
  ctx.lineTo(botX - nx * 0.3, botY - ny * 0.3);
  ctx.closePath();
  ctx.fill();

  // 팁 (안쪽으로 굽은 부분)
  const tipX = botX + tipOffsetX;
  const tipY = botY + armW * 0.5;
  ctx.fillStyle = metalColor;
  ctx.beginPath();
  ctx.moveTo(botX - nx, botY - ny);
  ctx.lineTo(botX + nx, botY + ny);
  ctx.lineTo(tipX + nx * 0.5, tipY + ny * 0.5);
  ctx.lineTo(tipX - nx * 0.5, tipY - ny * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ===== 팔 라인만 (강조용) =====
function drawArmLine(ctx, topX, topY, botX, botY, tipOffsetX) {
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botX, botY);
  ctx.lineTo(botX + tipOffsetX, botY + 3);
  ctx.stroke();
}

// ===== 위치 해석 (겹침 방지) =====
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

function getScale(W, H) { return Math.min(W, H) / 500; }
