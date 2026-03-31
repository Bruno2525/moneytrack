window.MoneyTrackCharts = (() => {
  const chartColors = [
    "#1f8f6a",
    "#c34c44",
    "#c77a34",
    "#284b63",
    "#7d5ba6",
    "#3b82f6",
  ];

  const getThemeColor = (name, fallback) => {
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
  };

  const clear = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawPieChart = (ctx, canvas, segments) => {
    const total =
      segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
    const radius = Math.min(canvas.width, canvas.height) * 0.28;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let start = -Math.PI / 2;

    segments.forEach((segment) => {
      const angle = (segment.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      start += angle;
    });

    ctx.beginPath();
    ctx.fillStyle = getThemeColor("--panel", "#ffffff");
    ctx.arc(centerX, centerY, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = getThemeColor("--text", "#111111");
    ctx.font = "700 20px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Resumo", centerX, centerY - 4);
    ctx.font = "500 14px Manrope, sans-serif";
    ctx.fillStyle = getThemeColor("--muted", "#666666");
    ctx.fillText(`${segments.length} grupos`, centerX, centerY + 18);
  };

  const drawBarChart = (ctx, canvas, segments) => {
    const maxValue = Math.max(...segments.map((segment) => segment.value), 1);
    const baseY = canvas.height - 56;
    const chartHeight = canvas.height - 112;
    const barWidth = Math.min(
      72,
      (canvas.width - 120) / Math.max(segments.length, 1),
    );

    ctx.strokeStyle = getThemeColor("--panel-border", "#dddddd");
    ctx.lineWidth = 1;

    for (let line = 0; line < 4; line += 1) {
      const y = 48 + (chartHeight / 3) * line;
      ctx.beginPath();
      ctx.moveTo(52, y);
      ctx.lineTo(canvas.width - 36, y);
      ctx.stroke();
    }

    segments.forEach((segment, index) => {
      const x = 68 + index * (barWidth + 24);
      const height = (segment.value / maxValue) * chartHeight;

      ctx.fillStyle = segment.color;
      ctx.fillRect(x, baseY - height, barWidth, height);

      ctx.fillStyle = getThemeColor("--text", "#111111");
      ctx.font = "600 13px Manrope, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(segment.label, x + barWidth / 2, baseY + 22);
    });
  };

  const drawLineChart = (ctx, canvas, segments) => {
    const maxValue = Math.max(...segments.map((segment) => segment.value), 1);
    const minValue = Math.min(...segments.map((segment) => segment.value), 0);
    const usableHeight = canvas.height - 120;
    const usableWidth = canvas.width - 100;
    const originX = 50;
    const originY = canvas.height - 56;

    ctx.strokeStyle = getThemeColor("--panel-border", "#dddddd");
    ctx.lineWidth = 1;

    for (let line = 0; line < 4; line += 1) {
      const y = 40 + (usableHeight / 3) * line;
      ctx.beginPath();
      ctx.moveTo(originX, y);
      ctx.lineTo(canvas.width - 26, y);
      ctx.stroke();
    }

    const points = segments.map((segment, index) => {
      const x =
        originX + (usableWidth / Math.max(segments.length - 1, 1)) * index;
      const normalized =
        (segment.value - minValue) / Math.max(maxValue - minValue, 1);
      const y = originY - normalized * usableHeight;
      return { x, y, segment };
    });

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.strokeStyle = getThemeColor("--accent", "#c77a34");
    ctx.lineWidth = 3;
    ctx.stroke();

    points.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = point.segment.color;
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = getThemeColor("--text", "#111111");
      ctx.font = "600 12px Manrope, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(point.segment.label, point.x, originY + 24);
    });
  };

  const render = ({ canvas, segments, type }) => {
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    clear(ctx, canvas);

    ctx.fillStyle = getThemeColor("--panel", "#ffffff");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!segments.length) {
      ctx.fillStyle = getThemeColor("--muted", "#666666");
      ctx.font = "600 18px Manrope, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "Adicione movimentacoes para visualizar o grafico.",
        canvas.width / 2,
        canvas.height / 2,
      );
      return;
    }

    if (type === "bar") {
      drawBarChart(ctx, canvas, segments);
      return;
    }

    if (type === "line") {
      drawLineChart(ctx, canvas, segments);
      return;
    }

    drawPieChart(ctx, canvas, segments);
  };

  const buildSegments = (summary, categoryTotals) => {
    const baseSegments = [
      { label: "Receitas", value: summary.income, color: chartColors[0] },
      { label: "Despesas", value: summary.expense, color: chartColors[1] },
      {
        label: "Saldo",
        value: Math.max(summary.balance, 0),
        color: chartColors[3],
      },
    ].filter((segment) => segment.value > 0);

    const categorySegments = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, value], index) => ({
        label,
        value,
        color: chartColors[(index + 2) % chartColors.length],
      }));

    return categorySegments.length >= 2 ? categorySegments : baseSegments;
  };

  return { render, buildSegments };
})();
