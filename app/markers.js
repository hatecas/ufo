// ===== markers.js =====
// 사진의 카메라 시점에 맞춰 3D 집게를 원근 변환하여 표시
// "여기에 집게를 내려라" 만 보여줌

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
      const cam = parseCameraPerspective(analysisData.camera_perspective);
      const positions = resolvePositions(analysisData.steps, W, H);

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
        draw3DClaw(ctx, pos.x, pos.y, analysisData.steps[i], W, H, cam, false);
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
      const cam = parseCameraPerspective(analysisData.camera_perspective);
      const positions = resolvePositions(analysisData.steps, W, H);
      const results = [];

      for (let cur = 0; cur < analysisData.steps.length; cur++) {
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fillRect(0, 0, W, H);

        // 다른 스텝 — 흐리게
        for (let j = 0; j < analysisData.steps.length; j++) {
          if (j !== cur) {
            draw3DClaw(ctx, positions[j].x, positions[j].y, analysisData.steps[j], W, H, cam, false, 0.2);
          }
        }

        // 현재 스텝 — 크고 밝게
        draw3DClaw(ctx, positions[cur].x, positions[cur].y, analysisData.steps[cur], W, H, cam, true);

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

        zCtx.font = `bold ${actionFont}px sans-serif`;
        zCtx.fillStyle = '#FF3C50';
        zCtx.textAlign = 'left';
        zCtx.textBaseline = 'top';
        const stepLabel = `Step ${step.step}`;
        zCtx.fillText(stepLabel, 10, barY + 8);
        const labelW = zCtx.measureText(stepLabel).width;
        zCtx.fillStyle = '#FFF';
        zCtx.fillText(`  ${step.action || ''}`, 10 + labelW, barY + 8);

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

// ===== 카메라 시점 파싱 =====
function parseCameraPerspective(cam) {
  const h = cam?.horizontal_deg ?? 0;
  const v = cam?.vertical_deg ?? 45;
  // 값 범위 클램프
  return {
    h: Math.max(-80, Math.min(80, h)),
    v: Math.max(10, Math.min(80, v)),
  };
}

// ===== 핵심: 3D 집게 렌더링 (카메라 시점 반영) =====
function draw3DClaw(ctx, x, y, step, W, H, cam, isActive, overrideAlpha) {
  const s = getScale(W, H);
  const alpha = overrideAlpha ?? (isActive ? 1.0 : 0.7);
  const size = isActive ? 1.3 : 0.75;
  const u = Math.max(18, 28 * s) * size;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ===== 카메라 시점 기반 변환 행렬 =====
  // cam.h: 수평 각도 (양수=오른쪽에서, 음수=왼쪽에서)
  // cam.v: 수직 각도 (높을수록 위에서 내려다봄)
  const hRad = (cam.h * Math.PI) / 180;
  const vRad = (cam.v * Math.PI) / 180;

  // 수직 압축 — 위에서 볼수록 집게가 Y방향으로 납작해짐
  const scaleY = Math.cos(vRad) * 0.6 + 0.4; // 0.4~1.0 범위
  // 수평 기울기 — 옆에서 보면 집게가 기울어짐
  const skewX = Math.sin(hRad) * 0.5;         // -0.5~+0.5
  // 위에서 볼수록 팔이 더 벌어져 보임
  const armOpenFactor = 1.0 + Math.sin(vRad) * 0.5; // 1.0~1.5

  // 변환 적용 (중심점 기준)
  ctx.translate(x, y);
  ctx.transform(1, 0, skewX, scaleY, 0, 0);
  ctx.translate(-x, -y);

  // === 그림자 (타겟 위치) ===
  const shadowRx = u * 1.1 * armOpenFactor;
  const shadowRy = u * 0.35;
  ctx.fillStyle = isActive ? 'rgba(255, 60, 80, 0.25)' : 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.3, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // 타겟 십자선 (활성 스텝만)
  if (isActive) {
    ctx.strokeStyle = 'rgba(255, 60, 80, 0.5)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.3, shadowRx * 1.3, shadowRy * 1.3, 0, 0, Math.PI * 2);
    ctx.stroke();

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

  // ---- 수직 샤프트 ----
  const shaftTop = y - u * 2.8;
  const shaftBot = y - u * 0.8;
  const shaftW = u * 0.15;

  ctx.fillStyle = metalColor;
  ctx.fillRect(x - shaftW, shaftTop, shaftW * 2, shaftBot - shaftTop);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x - shaftW * 0.3, shaftTop, shaftW * 0.6, shaftBot - shaftTop);
  ctx.strokeStyle = darkMetal;
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(x - shaftW, shaftTop, shaftW * 2, shaftBot - shaftTop);

  // ---- 본체 바 (3D 박스) ----
  const bodyW = u * 0.7;
  const bodyH = u * 0.25;
  const bodyD = u * 0.15;
  const bodyY = shaftBot;

  ctx.fillStyle = metalColor;
  ctx.fillRect(x - bodyW, bodyY, bodyW * 2, bodyH);
  ctx.strokeStyle = darkMetal;
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(x - bodyW, bodyY, bodyW * 2, bodyH);

  // 윗면
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

  // ---- 팔 (armOpenFactor로 벌림 조절) ----
  const armBot = y + u * 0.2;
  const armSpread = u * 0.85 * armOpenFactor;
  const tipIn = u * 0.3;
  const armW = u * 0.08;

  // 왼쪽 팔
  drawArm3D(ctx, x - bodyW * 0.7, bodyY + bodyH, x - armSpread, armBot, tipIn, armW, s, metalColor, darkMetal);
  // 오른쪽 팔
  drawArm3D(ctx, x + bodyW * 0.7, bodyY + bodyH, x + armSpread, armBot, -tipIn, armW, s, metalColor, darkMetal);

  // ---- 접촉 팔 강조 ----
  if (isActive && step.direction && step.direction !== 'center') {
    ctx.lineWidth = Math.max(3, 4.5 * s);
    ctx.strokeStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 6 * s;

    if (step.direction === 'right' || step.direction === 'forward') {
      drawArmLine(ctx, x - bodyW * 0.7, bodyY + bodyH, x - armSpread, armBot, tipIn);
    }
    if (step.direction === 'left' || step.direction === 'back') {
      drawArmLine(ctx, x + bodyW * 0.7, bodyY + bodyH, x + armSpread, armBot, -tipIn);
    }
    ctx.shadowBlur = 0;
  }

  // ---- 스텝 번호 뱃지 ----
  // 뱃지는 변환 밖에서 그려야 읽기 쉬움 → 변환 해제 후 다시 그림
  ctx.restore(); // 변환 해제

  ctx.save();
  ctx.globalAlpha = alpha;

  const badgeR = Math.max(10, (isActive ? 16 : 11) * s);
  // 뱃지 위치: 변환된 샤프트 상단 계산
  const transformedShaftTopY = y + (shaftTop - y) * scaleY + (shaftTop - y) * 0; // 대략적 위치
  const badgeRealY = y + (shaftTop - y) * scaleY - badgeR - 3 * s;
  const badgeRealX = x + (shaftTop - y) * skewX * scaleY;

  ctx.beginPath();
  ctx.arc(badgeRealX, badgeRealY, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? '#FF3C50' : 'rgba(0, 0, 0, 0.75)';
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = (isActive ? 2.5 : 1.5) * s;
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.max(9, (isActive ? 14 : 10) * s)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${step.step}`, badgeRealX, badgeRealY);

  // ---- 밀기 방향 화살표 (변환 밖에서 — 읽기 쉽게) ----
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

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = Math.max(3, 4 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

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

// ===== 3D 팔 그리기 =====
function drawArm3D(ctx, topX, topY, botX, botY, tipOffsetX, armW, s, metalColor, darkMetal) {
  const dx = botX - topX;
  const dy = botY - topY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * armW;
  const ny = dx / len * armW;

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

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.moveTo(topX - nx * 0.3, topY - ny * 0.3);
  ctx.lineTo(topX + nx * 0.3, topY + ny * 0.3);
  ctx.lineTo(botX + nx * 0.3, botY + ny * 0.3);
  ctx.lineTo(botX - nx * 0.3, botY - ny * 0.3);
  ctx.closePath();
  ctx.fill();

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

// ===== 팔 라인 (강조용) =====
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
