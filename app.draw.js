function drawGradient(context, start, end) {
  const gradient = context.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1080);
}

function drawPillText(context, text, x, y, textColor, fillColor, fontFamily = CANVAS_BODY_FONT) {
  context.save();
  setCanvasFont(context, 900, 24, fontFamily);
  const metrics = context.measureText(text);
  const width = Math.min(360, metrics.width + 42);
  drawRoundedRect(context, x, y, width, 48, 24, fillColor);
  context.fillStyle = textColor;
  drawEllipsizedText(context, text, x + 21, y + 32, width - 42);
  context.restore();
}

function drawHeadline(context, text, x, y, maxWidth, color, size, maxLines = 4, fontFamily = CANVAS_TITLE_FONT) {
  context.fillStyle = color;
  const adjustedSize = getAdaptiveFontSize(context, text, maxWidth, size, 28, fontFamily, 900, maxLines);
  setCanvasFont(context, 900, adjustedSize, fontFamily);
  wrapText(context, text, x, y, maxWidth, adjustedSize * 1.18, maxLines);
}

function drawMetricBlock(context, text, x, y, background, color) {
  drawRoundedRect(context, x, y, 830, 116, 30, background);
  context.fillStyle = color;
  context.font = `900 34px ${CANVAS_BODY_FONT}`;
  wrapText(context, text, x + 34, y + 46, 760, 42, 2);
}

function drawSectionRows(context, sections, x, y, width, options) {
  const { labelColor, textColor, rowGap, maxLines, labelWidth = 160, bodyFont = CANVAS_BODY_FONT } = options;

  sections.forEach((section, index) => {
    const rowY = y + index * rowGap;
    context.fillStyle = labelColor;
    setCanvasFont(context, 900, 22, bodyFont);
    drawEllipsizedText(context, section.label, x, rowY, labelWidth - 18);
    context.fillStyle = textColor;
    setCanvasFont(context, 700, 24, bodyFont);
    wrapText(context, section.value, x + labelWidth, rowY, width - labelWidth, 29, maxLines);
  });
}

function drawDivisionHeader(context, story, x, y, textColor, fillColor, accentColor, fontFamily = CANVAS_BODY_FONT) {
  context.save();
  const label = `본부/실 · ${story.division}`;
  setCanvasFont(context, 900, 30, fontFamily);
  const width = Math.min(430, context.measureText(label).width + 52);
  drawRoundedRect(context, x, y, width, 58, 26, fillColor);
  drawRoundedRect(context, x + 14, y + 17, 24, 24, 12, accentColor);
  context.fillStyle = textColor;
  drawEllipsizedText(context, label, x + 50, y + 38, width - 66);
  context.restore();
}

function drawFooter(context, text, accent, color, fontFamily = CANVAS_BODY_FONT) {
  drawRoundedRect(context, 74, 984, 932, 4, 2, accent);
  context.fillStyle = color;
  setCanvasFont(context, 800, 22, fontFamily);
  drawEllipsizedText(context, text, 74, 950, 560);
  context.textAlign = "right";
  context.fillText("Monthly Card News", 1006, 950);
  context.textAlign = "left";
}

function drawImagePanel(context, image, x, y, width, height, radius) {
  context.save();
  drawRoundedRect(context, x - 10, y - 10, width + 20, height + 20, radius + 8, "rgba(255,255,255,0.22)");
  clipRoundedRect(context, x, y, width, height, radius);

  if (image) {
    drawCroppedImage(context, image, x, y, width, height);
  } else {
    drawAbstractImage(context, x, y, width, height);
  }

  context.restore();
}

function drawPolaroid(context, image, x, y, width, height, accent, fontFamily = CANVAS_BODY_FONT) {
  drawRoundedRect(context, x, y, width, height, 34, "#fffaf0");
  drawRoundedRect(context, x + 28, y + 28, width - 56, height - 96, 24, "#e7eadf");
  context.save();
  clipRoundedRect(context, x + 28, y + 28, width - 56, height - 96, 24);

  if (image) {
    drawCroppedImage(context, image, x + 28, y + 28, width - 56, height - 96);
  } else {
    drawAbstractImage(context, x + 28, y + 28, width - 56, height - 96);
  }

  context.restore();
  context.fillStyle = accent;
  setCanvasFont(context, 900, 26, fontFamily);
  context.fillText("moment captured", x + 44, y + height - 34);
}

function drawAbstractImage(context, x, y, width, height) {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "#8daf63");
  gradient.addColorStop(0.5, "#f6be45");
  gradient.addColorStop(1, "#3f70d6");
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  drawCircle(context, x + width * 0.72, y + height * 0.26, width * 0.28, "rgba(255,255,255,0.24)");
  drawCircle(context, x + width * 0.24, y + height * 0.78, width * 0.34, "rgba(23,33,27,0.18)");
}

function drawCroppedImage(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (imageRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }

  context.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawCircle(context, x, y, radius, fillStyle) {
  context.save();
  context.fillStyle = fillStyle;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawRoundedRect(context, x, y, width, height, radius, fillStyle) {
  context.save();
  context.fillStyle = fillStyle;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
  context.restore();
}

function clipRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
}

