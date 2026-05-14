async function drawCard(story, template, tone) {
  const canvas = elements.cardCanvas;
  const context = canvas.getContext("2d");
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const image = story.imageData ? await loadImage(story.imageData) : null;

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (template.id === "report") drawReportDraft(context, story, template, image, tone);
  if (template.id === "magazine") drawMagazineDraft(context, story, template, image, tone);
  if (template.id === "metric") drawMetricDraft(context, story, template, image, tone);
  if (template.id === "timeline") drawTimelineDraft(context, story, template, image, tone);
  if (template.id === "quote") drawQuoteDraft(context, story, template, image, tone);
}

function getStorySections(story) {
  return [
    { label: "활동 기간", value: story.period },
    { label: "참여", value: story.participants },
    { label: "핵심 이야기", value: story.summary },
    { label: "정량적 성과", value: story.impactMetric },
    { label: "근거/에피소드", value: story.evidence },
    { label: "고객/직원의 한마디", value: story.quote },
  ].filter((section) => section.value);
}

function getCanvasTitleFont(template) {
  return template.titleFont || CANVAS_TITLE_FONT;
}

function getCanvasBodyFont(template) {
  return template.bodyFont || CANVAS_BODY_FONT;
}

function setCanvasFont(context, weight, size, family) {
  context.font = `${weight} ${size}px ${family}`;
}

function drawReportDraft(context, story, template, image) {
  const [dark, gold, cream, moss] = template.palette;
  const titleFont = getCanvasTitleFont(template);
  const bodyFont = getCanvasBodyFont(template);
  drawGradient(context, dark, "#2f6b4d");
  drawCircle(context, 895, 140, 220, "rgba(246, 190, 69, 0.55)");
  drawCircle(context, 120, 960, 260, "rgba(141, 175, 99, 0.25)");
  drawRoundedRect(context, 70, 72, 940, 930, 46, "rgba(255, 247, 228, 0.94)");
  drawImagePanel(context, image, 740, 120, 220, 190, 34);

  drawDivisionHeader(context, story, 112, 118, cream, dark, gold, bodyFont);
  drawPillText(context, story.reportMonth, 112, 190, dark, gold, bodyFont);
  drawHeadline(context, story.title, 112, 280, 570, dark, 44, 3, titleFont);

  drawRoundedRect(context, 112, 448, 850, 114, 28, "rgba(246, 190, 69, 0.22)");
  context.fillStyle = dark;
  setCanvasFont(context, 900, 31, bodyFont);
  wrapText(context, story.desiredMessage, 146, 510, 780, 38, 2);

  drawRoundedRect(context, 112, 610, 850, 280, 30, "rgba(255, 255, 255, 0.74)");
  drawSectionRows(context, getStorySections(story).slice(0, 4), 150, 664, 770, {
    labelColor: dark,
    textColor: "#37443b",
    rowGap: 58,
    maxLines: 1,
    labelWidth: 170,
    bodyFont,
  });
  drawFooter(context, `${story.division} · ${story.reportMonth}`, moss, dark, bodyFont);
}

function drawMagazineDraft(context, story, template, image) {
  const [paper, coral, forest, gold] = template.palette;
  const titleFont = getCanvasTitleFont(template);
  const bodyFont = getCanvasBodyFont(template);
  drawGradient(context, "#fff7e4", paper);
  drawRoundedRect(context, 44, 44, 992, 992, 52, coral);
  drawRoundedRect(context, 70, 70, 940, 940, 44, "#fffaf0");
  drawPolaroid(context, image, 106, 118, 510, 560, coral, bodyFont);

  drawDivisionHeader(context, story, 656, 120, "#fff7e4", forest, gold, bodyFont);
  drawPillText(context, story.reportMonth, 656, 192, forest, gold, bodyFont);
  drawHeadline(context, story.title, 656, 282, 310, forest, 42, 4, titleFont);
  context.fillStyle = coral;
  setCanvasFont(context, 900, 29, bodyFont);
  wrapText(context, story.desiredMessage, 656, 540, 310, 36, 3);

  drawRoundedRect(context, 106, 724, 870, 196, 34, "rgba(33, 76, 54, 0.08)");
  context.fillStyle = forest;
  setCanvasFont(context, 900, 27, bodyFont);
  context.fillText("현장의 이야기", 146, 780);
  context.fillStyle = "#506259";
  setCanvasFont(context, 700, 25, bodyFont);
  wrapText(context, story.summary, 146, 832, 790, 32, 3);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, gold, forest, bodyFont);
}

function drawMetricDraft(context, story, template, image) {
  const [dark, gold, cream, coral] = template.palette;
  const titleFont = getCanvasTitleFont(template);
  const bodyFont = getCanvasBodyFont(template);
  drawGradient(context, dark, "#101914");
  drawCircle(context, 170, 210, 220, "rgba(246, 190, 69, 0.32)");
  drawCircle(context, 970, 200, 170, "rgba(239, 115, 92, 0.24)");
  drawImagePanel(context, image, 760, 84, 220, 220, 38);
  drawDivisionHeader(context, story, 74, 72, cream, "rgba(255,255,255,0.14)", gold, bodyFont);

  context.fillStyle = gold;
  setCanvasFont(context, 900, getAdaptiveFontSize(context, story.impactMetric, 680, 76, 46, titleFont, 900, 3), titleFont);
  wrapText(context, story.impactMetric, 74, 260, 670, 82, 3);

  drawRoundedRect(context, 74, 508, 932, 176, 34, "rgba(255,247,228,0.94)");
  context.fillStyle = dark;
  setCanvasFont(context, 900, 36, bodyFont);
  wrapText(context, story.desiredMessage, 112, 582, 840, 44, 2);

  const cards = [
    ["무엇을", story.summary],
    ["누가", story.participants],
    ["근거", story.evidence],
  ];
  cards.forEach(([label, value], index) => {
    const x = 74 + index * 318;
    drawRoundedRect(context, x, 730, 292, 164, 28, index === 1 ? "rgba(246,190,69,0.18)" : "rgba(255,255,255,0.12)");
    context.fillStyle = gold;
    setCanvasFont(context, 900, 24, bodyFont);
    context.fillText(label, x + 28, 786);
    context.fillStyle = cream;
    setCanvasFont(context, 700, 22, bodyFont);
    wrapText(context, value, x + 28, 832, 236, 28, 2);
  });
  drawFooter(context, `${story.division} · ${story.reportMonth}`, coral, cream, bodyFont);
}

function drawTimelineDraft(context, story, template, image) {
  const [blue, mint, cream, gold] = template.palette;
  const titleFont = getCanvasTitleFont(template);
  const bodyFont = getCanvasBodyFont(template);
  drawGradient(context, blue, "#13264d");
  drawRoundedRect(context, 60, 60, 960, 960, 56, "rgba(255, 247, 228, 0.96)");
  drawDivisionHeader(context, story, 104, 102, cream, blue, gold, bodyFont);
  drawHeadline(context, story.title, 104, 214, 720, blue, 42, 3, titleFont);
  drawImagePanel(context, image, 808, 104, 150, 150, 30);

  const steps = [
    ["1. 기간", story.period],
    ["2. 참여", story.participants],
    ["3. 시도", story.summary],
    ["4. 결과", story.impactMetric || story.desiredMessage],
  ];

  context.strokeStyle = mint;
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(164, 405);
  context.lineTo(164, 838);
  context.stroke();

  steps.forEach(([label, value], index) => {
    const y = 410 + index * 112;
    drawCircle(context, 164, y - 8, 22, index % 2 ? gold : mint);
    context.fillStyle = blue;
    setCanvasFont(context, 900, 25, bodyFont);
    context.fillText(label, 214, y);
    context.fillStyle = "#38443d";
    setCanvasFont(context, 700, 25, bodyFont);
    wrapText(context, value, 214, y + 42, 720, 31, 2);
  });

  drawRoundedRect(context, 104, 884, 872, 54, 24, "rgba(128,208,177,0.26)");
  context.fillStyle = blue;
  setCanvasFont(context, 900, 25, bodyFont);
  wrapText(context, story.desiredMessage, 136, 920, 810, 30, 1);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, mint, blue, bodyFont);
}

function drawQuoteDraft(context, story, template, image) {
  const [black, cream, coral, gold] = template.palette;
  const titleFont = getCanvasTitleFont(template);
  const bodyFont = getCanvasBodyFont(template);
  drawGradient(context, black, "#303030");
  if (image) {
    context.globalAlpha = 0.24;
    drawCroppedImage(context, image, 0, 0, 1080, 1080);
    context.globalAlpha = 1;
    context.fillStyle = "rgba(0,0,0,0.52)";
    context.fillRect(0, 0, 1080, 1080);
  }
  drawDivisionHeader(context, story, 78, 78, black, gold, coral, bodyFont);
  drawHeadline(context, story.title, 78, 184, 880, cream, 42, 3, titleFont);

  context.fillStyle = coral;
  setCanvasFont(context, 900, 92, titleFont);
  context.fillText("“", 76, 390);
  context.fillStyle = cream;
  setCanvasFont(context, 800, 48, titleFont);
  wrapText(context, story.quote || story.desiredMessage, 142, 395, 820, 60, 4);

  drawRoundedRect(context, 92, 704, 896, 172, 30, "rgba(255,243,211,0.15)");
  context.fillStyle = gold;
  setCanvasFont(context, 900, 26, bodyFont);
  context.fillText("강조 메시지", 128, 758);
  context.fillStyle = "rgba(255,243,211,0.88)";
  setCanvasFont(context, 700, 25, bodyFont);
  wrapText(context, story.desiredMessage || story.summary, 128, 808, 820, 32, 2);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, gold, cream, bodyFont);
}

