export function drawMarkers(canvas, analysisData, imageSrc) {
  return new Promise((resolve) => {
    if (!canvas || !analysisData?.steps) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      const scale = Math.min(W, H) / 500;
      const markerR = Math.max(14, 20 * scale);
      const numR = Math.max(10, 14 * scale);
      const fontSize = Math.max(10, 13 * scale);
      const labelFontSize = Math.max(9, 11 * scale);
      const arrowLen = Math.max(25, 35 * scale);

      ctx.drawImage(img, 0, 0);

      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, W, H);

      const positions = analysisData.steps.map((step) => ({
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

      positions.forEach((pos, i) => {
        if (i > 0) {
          const prev = positions[i - 1];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = "rgba(0, 255, 157, 0.5)";
          ctx.lineWidth = 2 * scale;
          ctx.setLineDash([6 * scale, 4 * scale]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      positions.forEach((pos, i) => {
        const step = analysisData.steps[i];
        const { x, y } = pos;
        const dir = step.direction;

        let ax = x, ay = y;
        if (dir === "left") ax -= arrowLen;
        else if (dir === "right") ax += arrowLen;
        else if (dir === "forward") ay -= arrowLen;
        else if (dir === "back") ay += arrowLen;

        if (dir && dir !== "center") {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(ax, ay);
          ctx.strokeStyle = "rgba(0, 255, 157, 0.3)";
          ctx.lineWidth = 6 * scale;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(ax, ay);
          ctx.strokeStyle = "#00FF9D";
          ctx.lineWidth = 2.5 * scale;
          ctx.stroke();

          const angle = Math.atan2(ay - y, ax - x);
          const headSize = 8 * scale;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - headSize * Math.cos(angle - 0.5), ay - headSize * Math.sin(angle - 0.5));
          ctx.lineTo(ax - headSize * Math.cos(angle + 0.5), ay - headSize * Math.sin(angle + 0.5));
          ctx.closePath();
          ctx.fillStyle = "#00FF9D";
          ctx.fill();
        }
      });

      positions.forEach((pos, i) => {
        const step = analysisData.steps[i];
        const { x, y } = pos;

        const glow = ctx.createRadialGradient(x, y, numR, x, y, markerR * 1.5);
        glow.addColorStop(0, "rgba(255, 60, 80, 0.6)");
        glow.addColorStop(1, "rgba(255, 60, 80, 0)");
        ctx.beginPath();
        ctx.arc(x, y, markerR * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, numR + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#FF3C50";
        ctx.fill();
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();

        ctx.fillStyle = "#FFF";
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${step.step}`, x, y);

        const label = step.marker_label || `Step ${step.step}`;
        ctx.font = `bold ${labelFontSize}px sans-serif`;
        const labelWidth = ctx.measureText(label).width + 12 * scale;
        const labelHeight = 18 * scale;

        let labelY = y + numR + 8 * scale;
        if (labelY + labelHeight > H - 10) {
          labelY = y - numR - labelHeight - 4 * scale;
        }

        const labelX = x - labelWidth / 2;
        const radius = 4 * scale;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
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
      });

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}