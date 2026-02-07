// 전체 마커 오버뷰 이미지 (기존)
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
        drawMarker(ctx, pos, analysisData.steps[i], W, H, 1.0);
      });
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

// 스텝별 개별 이미지 생성 — 현재 스텝만 강조, 나머지 흐리게
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
          drawArrow(ctx, positions[j], analysisData.steps[j], W, H, 0.2);
          drawMarker(ctx, positions[j], analysisData.steps[j], W, H, 0.25);
        }

        // 이전 → 현재 연결선
        if (current > 0) {
          drawSingleConnector(ctx, positions[current - 1], positions[current], W, H, 0.6);
        }

        // 현재 스텝 — 크고 밝게 강조
        drawTargetZone(ctx, positions[current], W, H);
        drawArrow(ctx, positions[current], analysisData.steps[current], W, H, 1.0);
        drawMarker(ctx, positions[current], analysisData.steps[current], W, H, 1.0, true);

        // 다음 스텝들 — 아주 흐리게 (예정)
        for (let j = current + 1; j < analysisData.steps.length; j++) {
          drawMarker(ctx, positions[j], analysisData.steps[j], W, H, 0.12);
        }

        results.push(canvas.toDataURL("image/jpeg", 0.85));
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
  const markerR = Math.max(14, 20 * scale);
  const positions = steps.map((step) => ({
    x: (step.marker_x_percent / 100) * W,
    y: (step.marker_y_percent / 100) * H,
  }));
  const minDist = markerR * 3.5;
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
        positions[i].x = Math.max(markerR + 10, Math.min(W - markerR - 10, positions[i].x));
        positions[i].y = Math.max(markerR + 10, Math.min(H - markerR - 10, positions[i].y));
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

// 현재 스텝 타겟 존 — 십자선 + 펄스 원
function drawTargetZone(ctx, pos, W, H) {
  const scale = getScale(W, H);
  const { x, y } = pos;
  const zoneR = Math.max(30, 45 * scale);

  // 큰 펄스 원 (타겟 존)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, zoneR * 1.8);
  glow.addColorStop(0, "rgba(255, 60, 80, 0.25)");
  glow.addColorStop(0.5, "rgba(255, 60, 80, 0.08)");
  glow.addColorStop(1, "rgba(255, 60, 80, 0)");
  ctx.beginPath();
  ctx.arc(x, y, zoneR * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // 십자선
  const crossLen = zoneR * 1.2;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 60, 80, 0.4)";
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([4 * scale, 3 * scale]);
  // 가로
  ctx.beginPath();
  ctx.moveTo(x - crossLen, y);
  ctx.lineTo(x + crossLen, y);
  ctx.stroke();
  // 세로
  ctx.beginPath();
  ctx.moveTo(x, y - crossLen);
  ctx.lineTo(x, y + crossLen);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 타겟 원
  ctx.beginPath();
  ctx.arc(x, y, zoneR * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 60, 80, 0.35)";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
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

function drawMarker(ctx, pos, step, W, H, opacity, isHighlighted) {
  const scale = getScale(W, H);
  const baseR = Math.max(10, 14 * scale);
  const numR = isHighlighted ? baseR * 1.3 : baseR;
  const markerR = numR * 1.5;
  const fontSize = Math.max(10, (isHighlighted ? 16 : 13) * scale);
  const labelFontSize = Math.max(9, (isHighlighted ? 13 : 11) * scale);
  const { x, y } = pos;

  ctx.save();
  ctx.globalAlpha = opacity;

  // 글로우
  const glow = ctx.createRadialGradient(x, y, numR, x, y, markerR);
  glow.addColorStop(0, "rgba(255, 60, 80, 0.6)");
  glow.addColorStop(1, "rgba(255, 60, 80, 0)");
  ctx.beginPath();
  ctx.arc(x, y, markerR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // 마커 원
  ctx.beginPath();
  ctx.arc(x, y, numR + 2, 0, Math.PI * 2);
  ctx.fillStyle = isHighlighted ? "#FF3C50" : "#FF3C50";
  ctx.fill();
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = (isHighlighted ? 3 : 2.5) * scale;
  ctx.stroke();

  // 번호
  ctx.fillStyle = "#FFF";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${step.step}`, x, y);

  // 라벨
  const label = step.marker_label || `Step ${step.step}`;
  ctx.font = `bold ${labelFontSize}px sans-serif`;
  const labelWidth = ctx.measureText(label).width + 14 * scale;
  const labelHeight = (isHighlighted ? 22 : 18) * scale;

  let labelY = y + numR + 10 * scale;
  if (labelY + labelHeight > H - 10) {
    labelY = y - numR - labelHeight - 6 * scale;
  }

  const labelX = x - labelWidth / 2;
  const radius = 4 * scale;

  ctx.fillStyle = isHighlighted ? "rgba(255, 60, 80, 0.9)" : "rgba(0, 0, 0, 0.8)";
  ctx.beginPath();
  ctx.moveTo(labelX + radius, labelY);
  ctx.lineTo(labelX + labelWidth - radius, labelY);
  ctx.quadraticCurveTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + radius);
  ctx.lineTo(labelX + labelWidth, labelY + labelHeight - radius);
  ctx.quadraticCurveTo(labelX + labelWidth, labelY + labelHeight, labelX + labelWidth - radius, labelY + labelHeight);
  ctx.lineTo(labelX + radius, labelY + labelHeight);
  ctx.quadraticCurveTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - radius);
  ctx.lineTo(labelX, labelY + radius);
  ctx.quadraticCurveTo(labelX, labelY, labelX + radius, labelY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#FFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, labelY + labelHeight / 2);

  ctx.restore();
}
