function drawChecklistDraft(context, story, template, image) {
  const [blue, mint, cream, gold] = template.palette;
  drawGradient(context, "#f9f2df", "#eaf0df");
  drawRoundedRect(context, 60, 60, 960, 960, 56, "rgba(255,250,240,0.92)");
  drawCircle(context, 900, 100, 150, "rgba(246,190,69,0.34)");
  drawDivisionHeader(context, story, 104, 100, cream, blue, gold);
  drawHeadline(context, story.title, 104, 206, 780, blue, 44);

  const items = [
    ["무엇을 했나요?", story.summary],
    ["누가 함께했나요?", story.participants],
    ["어떤 성과가 있었나요?", story.impactMetric],
    ["어떤 근거가 있나요?", story.evidence],
    ["강조 문구", story.desiredMessage],
  ];

  items.forEach(([label, value], index) => {
    const y = 392 + index * 104;
    drawRoundedRect(context, 104, y, 872, 82, 24, index % 2 ? "rgba(128,208,177,0.22)" : "rgba(246,190,69,0.22)");
    drawCircle(context, 146, y + 41, 18, index % 2 ? mint : gold);
    context.fillStyle = blue;
    context.font = `900 23px ${CANVAS_BODY_FONT}`;
    context.fillText(label, 184, y + 35);
    context.fillStyle = "#34443b";
    context.font = `700 23px ${CANVAS_BODY_FONT}`;
    wrapText(context, value, 184, y + 66, 750, 28, 1);
  });

  drawFooter(context, `${story.division} · ${story.reportMonth}`, mint, blue);
}

function drawGradient(context, start, end) {
  const gradient = context.createLinearGradient(0, 0, 1080, 1080);
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, end);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1080);
}

function drawPillText(context, text, x, y, textColor, fillColor) {
  context.save();
  context.font = `900 24px ${CANVAS_BODY_FONT}`;
  const metrics = context.measureText(text);
  const width = metrics.width + 42;
  drawRoundedRect(context, x, y, width, 48, 24, fillColor);
  context.fillStyle = textColor;
  context.fillText(text, x + 21, y + 32);
  context.restore();
}

function drawHeadline(context, text, x, y, maxWidth, color, size) {
  context.fillStyle = color;
  context.font = `900 ${size}px ${CANVAS_TITLE_FONT}`;
  wrapText(context, text, x, y, maxWidth, size * 1.18, 5);
}

function drawMetricBlock(context, text, x, y, background, color) {
  drawRoundedRect(context, x, y, 830, 116, 30, background);
  context.fillStyle = color;
  context.font = `900 34px ${CANVAS_BODY_FONT}`;
  wrapText(context, text, x + 34, y + 46, 760, 42, 2);
}

function drawSectionRows(context, sections, x, y, width, options) {
  const { labelColor, textColor, rowGap, maxLines } = options;

  sections.forEach((section, index) => {
    const rowY = y + index * rowGap;
    context.fillStyle = labelColor;
    context.font = `900 22px ${CANVAS_BODY_FONT}`;
    context.fillText(section.label, x, rowY);
    context.fillStyle = textColor;
    context.font = `700 24px ${CANVAS_BODY_FONT}`;
    wrapText(context, section.value, x + 160, rowY, width - 160, 29, maxLines);
  });
}

function drawDivisionHeader(context, story, x, y, textColor, fillColor, accentColor) {
  context.save();
  const label = `본부/실 · ${story.division}`;
  context.font = `900 30px ${CANVAS_BODY_FONT}`;
  const width = Math.min(430, context.measureText(label).width + 52);
  drawRoundedRect(context, x, y, width, 58, 26, fillColor);
  drawRoundedRect(context, x + 14, y + 17, 24, 24, 12, accentColor);
  context.fillStyle = textColor;
  context.fillText(label, x + 50, y + 38);
  context.restore();
}

function drawFooter(context, text, accent, color) {
  drawRoundedRect(context, 74, 984, 932, 4, 2, accent);
  context.fillStyle = color;
  context.font = `800 22px ${CANVAS_BODY_FONT}`;
  context.fillText(text, 74, 950);
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

function drawPolaroid(context, image, x, y, width, height, accent) {
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
  context.font = `900 26px ${CANVAS_BODY_FONT}`;
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

