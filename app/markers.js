// ===== markers.js =====
// 사진에서 실제 집게를 크롭 → 타겟 위치에 투명 오버레이
// "여기에 집게를 놓아라" 를 실제 집게 이미지로 보여줌

// ===== 메인: 다음 수 이미지 생성 =====
export function drawNextMove(canvas, analysis, imageSrc) {
  return new Promise((resolve) => {
    if (!canvas || !analysis?.next_move) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      const s = getScale(W, H);
      const move = analysis.next_move;
      const bbox = analysis.claw_bbox;
      const tx = (move.target_x_percent / 100) * W;
      const ty = (move.target_y_percent / 100) * H;

      // 1) 배경 이미지 + 살짝 어둡게
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, W, H);

      // 2) 타겟 위치에 집게 오버레이
      if (bbox && bbox.w_percent > 0 && bbox.h_percent > 0) {
        // 실제 집게 크롭 → 타겟에 반투명 오버레이
        const sx = (bbox.x_percent / 100) * W;
        const sy = (bbox.y_percent / 100) * H;
        const sw = (bbox.w_percent / 100) * W;
        const sh = (bbox.h_percent / 100) * H;

        // 현재 위치 집게 — 원래 위치에 약간 밝게 표시
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 * s;
        ctx.setLineDash([6 * s, 4 * s]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
        ctx.restore();

        // 타겟 위치에 집게 이미지 오버레이
        ctx.save();
        ctx.globalAlpha = 0.55;
        const destX = tx - sw / 2;
        const destY = ty - sh * 0.6; // 집게 팁이 타겟에 오도록
        ctx.drawImage(img, sx, sy, sw, sh, destX, destY, sw, sh);
        ctx.restore();

        // 타겟 집게 테두리 강조
        ctx.save();
        ctx.strokeStyle = '#FF3C50';
        ctx.lineWidth = 3 * s;
        ctx.shadowColor = '#FF3C50';
        ctx.shadowBlur = 8 * s;
        ctx.strokeRect(tx - sw / 2, ty - sh * 0.6, sw, sh);
        ctx.shadowBlur = 0;
        ctx.restore();

        // 이동 화살표 (현재 → 타겟)
        const fromX = sx + sw / 2;
        const fromY = sy + sh / 2;
        drawMoveArrow(ctx, fromX, fromY, tx, ty, s);
      } else {
        // 집게 bbox 없으면 타겟 십자선만
        drawTargetCrosshair(ctx, tx, ty, s);
      }

      // 3) 타겟 포인트 마커
      drawTargetDot(ctx, tx, ty, s);

      // 4) 수 번호 뱃지 (좌상단)
      const moveNum = analysis.move_number || 1;
      const badgePad = 10 * s;
      const badgeH = 32 * s;
      const badgeText = `${moveNum}번째 수`;
      ctx.font = `bold ${16 * s}px sans-serif`;
      const badgeW = ctx.measureText(badgeText).width + badgePad * 3;

      ctx.fillStyle = '#FF3C50';
      roundRect(ctx, 12 * s, 12 * s, badgeW, badgeH, 6 * s);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, 12 * s + badgePad, 12 * s + badgeH / 2);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

// ===== 타겟 십자선 (집게 bbox 없을 때) =====
function drawTargetCrosshair(ctx, x, y, s) {
  const size = 40 * s;

  // 외부 원
  ctx.strokeStyle = 'rgba(255, 60, 80, 0.6)';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();

  // 내부 원
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // 십자선
  ctx.strokeStyle = 'rgba(255, 60, 80, 0.8)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - size * 1.3, y);
  ctx.lineTo(x + size * 1.3, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.3);
  ctx.lineTo(x, y + size * 1.3);
  ctx.stroke();
}

// ===== 타겟 포인트 (빨간 점) =====
function drawTargetDot(ctx, x, y, s) {
  // 글로우
  ctx.save();
  ctx.shadowColor = '#FF3C50';
  ctx.shadowBlur = 12 * s;
  ctx.fillStyle = '#FF3C50';
  ctx.beginPath();
  ctx.arc(x, y, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 흰색 테두리
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x, y, 6 * s, 0, Math.PI * 2);
  ctx.stroke();
}

// ===== 이동 화살표 (현재위치 → 타겟) =====
function drawMoveArrow(ctx, fromX, fromY, toX, toY, s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 60, 80, 0.7)';
  ctx.lineWidth = 3 * s;
  ctx.setLineDash([8 * s, 6 * s]);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 화살촉
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headSize = 12 * s;
  ctx.fillStyle = 'rgba(255, 60, 80, 0.8)';
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headSize * Math.cos(angle - 0.4), toY - headSize * Math.sin(angle - 0.4));
  ctx.lineTo(toX - headSize * Math.cos(angle + 0.4), toY - headSize * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ===== 유틸 =====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getScale(W, H) { return Math.min(W, H) / 500; }
