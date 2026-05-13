async function drawCard(story, template, tone) {
  const canvas = elements.cardCanvas;
  const context = canvas.getContext("2d");
  const image = story.imageData ? await loadImage(story.imageData) : null;

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (template.id === "report") drawReportDraft(context, story, template, image, tone);
  if (template.id === "magazine") drawMagazineDraft(context, story, template, image, tone);
  if (template.id === "metric") drawMetricDraft(context, story, template, image, tone);
  if (template.id === "timeline") drawTimelineDraft(context, story, template, image, tone);
  if (template.id === "quote") drawQuoteDraft(context, story, template, image, tone);
  if (template.id === "compare") drawCompareDraft(context, story, template, image, tone);
  if (template.id === "checklist") drawChecklistDraft(context, story, template, image, tone);
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

function drawReportDraft(context, story, template, image) {
  const [dark, gold, cream, moss] = template.palette;
  drawGradient(context, dark, "#2d684a");
  drawCircle(context, 890, 120, 230, "rgba(246, 190, 69, 0.62)");
  drawCircle(context, 160, 930, 250, "rgba(141, 175, 99, 0.24)");
  drawImagePanel(context, image, 694, 110, 300, 300, 44);

  drawDivisionHeader(context, story, 74, 72, cream, "rgba(255,255,255,0.16)", gold);
  drawPillText(context, story.reportMonth, 74, 142, dark, gold);
  drawHeadline(context, story.title, 74, 180, 590, cream, 52);

  context.fillStyle = gold;
  context.font = `900 34px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.desiredMessage, 74, 390, 560, 44, 2);

  drawRoundedRect(context, 74, 492, 932, 408, 34, "rgba(255, 247, 228, 0.92)");
  drawSectionRows(context, getStorySections(story), 110, 548, 860, {
    labelColor: dark,
    textColor: "#37443b",
    rowGap: 54,
    maxLines: 2,
  });
  drawFooter(context, `${story.division} · ${story.reportMonth}`, moss, cream);
}

function drawMagazineDraft(context, story, template, image) {
  const [paper, coral, forest, gold] = template.palette;
  drawGradient(context, "#fff7e4", paper);
  drawCircle(context, 130, 120, 110, "rgba(239, 115, 92, 0.22)");
  drawCircle(context, 940, 940, 210, "rgba(246, 190, 69, 0.34)");
  drawPolaroid(context, image, 70, 70, 465, 500, coral);

  drawDivisionHeader(context, story, 590, 88, "#fff7e4", forest, gold);
  drawPillText(context, story.reportMonth, 590, 156, forest, gold);
  drawHeadline(context, story.title, 590, 180, 410, forest, 42);
  context.fillStyle = coral;
  context.font = `900 30px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.desiredMessage, 590, 390, 390, 38, 3);

  drawRoundedRect(context, 70, 620, 940, 302, 32, "rgba(255, 250, 240, 0.88)");
  drawSectionRows(context, getStorySections(story), 106, 674, 850, {
    labelColor: forest,
    textColor: "#506259",
    rowGap: 39,
    maxLines: 1,
  });
  drawFooter(context, `${story.division} · ${story.reportMonth}`, gold, forest);
}

function drawMetricDraft(context, story, template, image) {
  const [dark, gold, cream, coral] = template.palette;
  drawGradient(context, dark, "#183c2c");
  drawCircle(context, 220, 240, 220, "rgba(246, 190, 69, 0.30)");
  drawImagePanel(context, image, 720, 90, 260, 260, 42);
  drawDivisionHeader(context, story, 74, 72, cream, "rgba(255,255,255,0.16)", gold);

  context.fillStyle = gold;
  context.font = `900 58px ${CANVAS_TITLE_FONT}`;
  wrapText(context, story.impactMetric, 74, 245, 610, 68, 3);
  drawRoundedRect(context, 74, 500, 932, 220, 36, "rgba(255,247,228,0.92)");
  context.fillStyle = dark;
  context.font = `900 34px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.desiredMessage, 112, 570, 840, 44, 2);
  context.fillStyle = "#465349";
  context.font = `700 27px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.summary, 112, 676, 840, 36, 2);
  drawRoundedRect(context, 74, 760, 932, 138, 30, "rgba(239,115,92,0.20)");
  context.fillStyle = cream;
  context.font = `900 24px ${CANVAS_BODY_FONT}`;
  drawPillText(context, "근거/에피소드", 112, 790, dark, gold);
  context.fillStyle = cream;
  context.font = `700 25px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.evidence, 112, 870, 840, 32, 1);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, coral, cream);
}

function drawTimelineDraft(context, story, template, image) {
  const [blue, mint, cream, gold] = template.palette;
  drawGradient(context, blue, "#13264d");
  drawRoundedRect(context, 60, 60, 960, 960, 56, "rgba(255, 247, 228, 0.94)");
  drawDivisionHeader(context, story, 104, 102, cream, blue, gold);
  drawHeadline(context, story.title, 104, 210, 780, blue, 46);
  drawImagePanel(context, image, 774, 92, 170, 170, 34);

  const steps = [
    ["기간", story.period],
    ["참여", story.participants],
    ["시도", story.summary],
    ["결과", story.impactMetric],
    ["근거", story.evidence],
  ];

  context.strokeStyle = mint;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(154, 388);
  context.lineTo(154, 865);
  context.stroke();

  steps.forEach(([label, value], index) => {
    const y = 390 + index * 98;
    drawCircle(context, 154, y - 8, 20, index % 2 ? gold : mint);
    context.fillStyle = blue;
    context.font = `900 26px ${CANVAS_BODY_FONT}`;
    context.fillText(label, 204, y);
    context.fillStyle = "#38443d";
    context.font = `700 25px ${CANVAS_BODY_FONT}`;
    wrapText(context, value, 304, y, 620, 31, 2);
  });

  drawFooter(context, `${story.division} · ${story.reportMonth}`, mint, blue);
}

function drawQuoteDraft(context, story, template, image) {
  const [black, cream, coral, gold] = template.palette;
  drawGradient(context, black, "#303030");
  if (image) {
    context.globalAlpha = 0.24;
    drawCroppedImage(context, image, 0, 0, 1080, 1080);
    context.globalAlpha = 1;
    context.fillStyle = "rgba(0,0,0,0.52)";
    context.fillRect(0, 0, 1080, 1080);
  }
  drawDivisionHeader(context, story, 78, 78, black, gold, coral);
  drawHeadline(context, story.title, 78, 185, 880, cream, 46);

  context.fillStyle = coral;
  context.font = `900 92px ${CANVAS_TITLE_FONT}`;
  context.fillText("“", 76, 390);
  context.fillStyle = cream;
  context.font = `800 50px ${CANVAS_TITLE_FONT}`;
  wrapText(context, story.quote, 142, 395, 820, 62, 4);

  drawRoundedRect(context, 92, 712, 896, 154, 30, "rgba(255,243,211,0.15)");
  context.fillStyle = gold;
  context.font = `900 26px ${CANVAS_BODY_FONT}`;
  context.fillText("사례 요약", 128, 765);
  context.fillStyle = "rgba(255,243,211,0.88)";
  context.font = `700 25px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.summary, 128, 810, 820, 32, 2);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, gold, cream);
}

function drawCompareDraft(context, story, template, image) {
  const [paper, forest, blue, gold] = template.palette;
  drawGradient(context, paper, "#f8f2e6");
  drawDivisionHeader(context, story, 74, 74, "#fff7e4", forest, gold);
  drawHeadline(context, story.desiredMessage, 74, 176, 820, forest, 48);
  drawImagePanel(context, image, 802, 72, 190, 190, 34);

  drawRoundedRect(context, 74, 390, 440, 368, 34, "rgba(33, 76, 54, 0.1)");
  drawRoundedRect(context, 566, 390, 440, 368, 34, "rgba(63, 112, 214, 0.12)");
  drawPillText(context, "문제와 시도", 112, 430, "#fff7e4", forest);
  drawPillText(context, "성과와 근거", 604, 430, "#fff7e4", blue);

  context.fillStyle = forest;
  context.font = `800 30px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.summary, 112, 535, 330, 42, 4);
  context.fillStyle = blue;
  wrapText(context, `${story.impactMetric} ${story.evidence}`, 604, 535, 330, 42, 4);

  drawRoundedRect(context, 74, 802, 932, 118, 28, gold);
  context.fillStyle = forest;
  context.font = `900 30px ${CANVAS_BODY_FONT}`;
  wrapText(context, story.participants, 112, 870, 840, 36, 1);
  drawFooter(context, `${story.division} · ${story.reportMonth}`, gold, forest);
}

