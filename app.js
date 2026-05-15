const STORAGE_KEYS = {
  stories: "cardNewsStudio.stories",
  cards: "cardNewsStudio.cards",
};

const appConfig = normalizeConfig(window.CARD_NEWS_STUDIO_CONFIG);
const sharedStorageEnabled = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let sharedStorageAvailable = sharedStorageEnabled;
const ADMIN_VIEW_KEY = "successlog";

const templates = [
  {
    id: "report",
    name: "성공로그 리포트",
    description: "성과와 근거를 한눈에 정리하는 공식 보고서형",
    palette: ["#173d2a", "#f6be45", "#fff7e4", "#8daf63"],
    titleFont: "Hahmlet, Noto Serif KR, Nanum Myeongjo, serif",
    bodyFont: "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif",
  },
  {
    id: "magazine",
    name: "현장 매거진",
    description: "사진과 이야기의 현장감을 크게 보여주는 매거진형",
    palette: ["#f7ead8", "#ef735c", "#214c36", "#f6be45"],
    titleFont: "Gowun Batang, Hahmlet, serif",
    bodyFont: "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif",
  },
  {
    id: "metric",
    name: "성과 숫자 스포트라이트",
    description: "정량 성과와 핵심 메시지를 강하게 밀어주는 포스터형",
    palette: ["#173d2a", "#f6be45", "#fff7e4", "#ef735c"],
    titleFont: "Black Han Sans, Hahmlet, sans-serif",
    bodyFont: "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif",
  },
  {
    id: "timeline",
    name: "진행 여정 타임라인",
    description: "기간, 참여, 시도, 결과를 흐름으로 보여주는 과정형",
    palette: ["#253b70", "#80d0b1", "#fff7e4", "#f6be45"],
    titleFont: "Song Myung, Hahmlet, serif",
    bodyFont: "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif",
  },
  {
    id: "quote",
    name: "한마디 포커스",
    description: "고객/직원의 한마디와 메시지를 감성적으로 강조하는 인용형",
    palette: ["#151515", "#fff3d3", "#ef735c", "#f6be45"],
    titleFont: "Song Myung, Hahmlet, serif",
    bodyFont: "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif",
  },
];

const toneCopy = {
  professional: "전문적이고 신뢰감 있는 톤",
  warm: "따뜻하고 사람 중심의 톤",
  bold: "대담하고 성과 중심의 톤",
  playful: "밝고 활기 있는 톤",
};

const CANVAS_TITLE_FONT = "Hahmlet, Noto Serif KR, Nanum Myeongjo, serif";
const CANVAS_BODY_FONT = "Gowun Dodum, Noto Sans KR, Malgun Gothic, sans-serif";

const CURRENT_DIVISIONS = ["경영기획실", "경영관리실", "eBiz본부", "점포사업본부", "IT지원실", "정보보안실"];
const LEGACY_DIVISION_MAP = {
  경영지원실: "경영관리실",
  "인사/조직문화실": "경영기획실",
  영업본부: "점포사업본부",
  마케팅본부: "eBiz본부",
  제품본부: "eBiz본부",
  개발본부: "IT지원실",
  고객경험실: "eBiz본부",
  재무실: "경영관리실",
  전략기획실: "경영기획실",
};
const TEAM_BY_DIVISION = {
  경영기획실: "인사지원팀",
  경영관리실: "경영관리팀",
  eBiz본부: "마케팅지원단",
  점포사업본부: "점포사업지원팀",
  IT지원실: "IT지원팀",
  정보보안실: "정보보안팀",
};

let stories = normalizeStories(loadFromStorage(STORAGE_KEYS.stories, []));
let cards = normalizeCards(loadFromStorage(STORAGE_KEYS.cards, []));
let selectedTemplateId = templates[0].id;
let currentCardDataUrl = "";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  form: $("#storyForm"),
  validationAlert: $("#validationAlert"),
  storyCount: $("#storyCount"),
  cardCount: $("#cardCount"),
  divisionCount: $("#divisionCount"),
  storyList: $("#storyList"),
  storySearch: $("#storySearch"),
  monthFilter: $("#monthFilter"),
  resetForm: $("#resetForm"),
  loadSample: $("#loadSample"),
  storySelect: $("#storySelect"),
  templateOptions: $("#templateOptions"),
  toneSelect: $("#toneSelect"),
  aiPrompt: $("#aiPrompt"),
  generateCard: $("#generateCard"),
  copyPrompt: $("#copyPrompt"),
  saveCard: $("#saveCard"),
  downloadCard: $("#downloadCard"),
  cardCanvas: $("#cardCanvas"),
  studioStatus: $("#studioStatus"),
  cardGallery: $("#cardGallery"),
};

document.addEventListener("DOMContentLoaded", async () => {
  saveToStorage(STORAGE_KEYS.stories, stories);
  saveToStorage(STORAGE_KEYS.cards, cards);
  setDefaultMonth();
  bindNavigation();
  bindForm();
  bindStudio();
  renderAll();
  drawPlaceholderCard();
  await hydrateSharedStorage();
});

function normalizeConfig(config = {}) {
  return {
    supabaseUrl: String(config.supabaseUrl || "").replace(/\/$/, ""),
    supabaseAnonKey: String(config.supabaseAnonKey || ""),
    storyBucket: String(config.storyBucket || "story-images"),
    cardBucket: String(config.cardBucket || "card-images"),
  };
}

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`${key} 저장 데이터를 읽지 못했습니다.`, error);
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStories(items) {
  return Array.isArray(items) ? items.map(normalizeStory) : [];
}

function normalizeCards(items) {
  return Array.isArray(items)
    ? items.map((card) => ({
        ...card,
        division: normalizeDivision(card.division),
      }))
    : [];
}

function normalizeStory(story) {
  const normalized = {
    ...story,
    reportMonth: story.reportMonth || story.report_month || "",
    division: normalizeDivision(story.division),
    owner: story.owner || "",
    email: story.email || "",
    impactMetric: story.impactMetric || story.impact_metric || "정량적 성과는 운영 후 집계 예정",
    evidence: story.evidence || "",
    cultureValue: story.cultureValue || story.culture_value || "",
    quote: story.quote || "관련된 한마디는 추후 공유 예정입니다.",
    desiredMessage: story.desiredMessage || story.desired_message || story.title || "",
    passwordHash: story.passwordHash || story.password_hash || "",
  };

  if (looksLikeEmail(normalized.email)) {
    const legacyPersonName = normalized.owner;
    normalized.email = legacyPersonName && !looksLikeEmail(legacyPersonName) ? legacyPersonName : "";
    normalized.owner = inferTeamName(story.division, normalized.division, story.title, story.summary);
  }

  if (!normalized.owner) {
    normalized.owner = inferTeamName(story.division, normalized.division, story.title, story.summary);
  }

  if (!normalized.email) {
    normalized.email = "이름 미입력";
  }

  normalized.cultureValue = normalized.evidence || normalized.cultureValue || normalized.summary || "";
  return normalized;
}

function normalizeDivision(division) {
  if (CURRENT_DIVISIONS.includes(division)) return division;
  return LEGACY_DIVISION_MAP[division] || "경영기획실";
}

function inferTeamName(originalDivision, normalizedDivision, title = "", summary = "") {
  const text = [originalDivision, title, summary].filter(Boolean).join(" ");

  if (text.includes("고객")) return "고객경험팀";
  if (text.includes("마케팅")) return "마케팅지원단";
  if (text.includes("점포") || text.includes("영업")) return "점포사업지원팀";
  if (text.includes("개발") || text.includes("IT") || text.includes("시스템")) return "IT지원팀";
  if (text.includes("보안")) return "정보보안팀";
  if (text.includes("재무") || text.includes("관리")) return "경영관리팀";
  if (text.includes("인사") || text.includes("조직문화") || text.includes("성공로그")) return "인사지원팀";

  return TEAM_BY_DIVISION[normalizedDivision] || "인사지원팀";
}

function looksLikeEmail(value = "") {
  return /\S+@\S+\.\S+/.test(value);
}

async function hashText(value) {
  if (!crypto.subtle) {
    return fallbackHash(value);
  }

  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fallbackHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16)}`;
}

async function hydrateSharedStorage() {
  if (!sharedStorageEnabled) return;

  try {
    const [remoteStories, remoteCards] = await Promise.all([fetchRemoteStories(), fetchRemoteCards()]);
    stories = normalizeStories(remoteStories);
    cards = normalizeCards(remoteCards);
    saveToStorage(STORAGE_KEYS.stories, stories);
    saveToStorage(STORAGE_KEYS.cards, cards);
    renderAll();
    drawPlaceholderCard();
  } catch (error) {
    console.warn("공용 저장소 연결에 실패했습니다. 로컬 모드로 계속 진행합니다.", error);
    sharedStorageAvailable = false;
  }
}

function setDefaultMonth() {
  const input = $("#reportMonth");
  if (!input || input.value) return;

  const now = new Date();
  input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function bindNavigation() {
  $$("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewLink));
  });

  const initialView = window.location.hash.replace("#", "") || "dashboard";
  showView(initialView, { skipHash: true });
}

function showView(viewId, options = {}) {
  if (!$(`#${viewId}`)) viewId = "dashboard";

  $$(".view").forEach((view) => view.classList.toggle("is-visible", view.id === viewId));
  $$(".nav-link").forEach((link) => link.classList.toggle("is-active", link.dataset.viewLink === viewId));

  if (!options.skipHash) {
    window.location.hash = viewId;
  }

  if (viewId === "studio") {
    populateStorySelect();
    updatePrompt();
  }
}

function bindForm() {
  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validation = validateStoryForm();

    if (!validation.isValid) {
      showValidationAlert(validation.missingLabels);
      validation.firstInvalid?.focus();
      return;
    }

    const formData = new FormData(elements.form);
    const file = $("#referenceImage").files[0];
    const storyId = createId();
    const compressedImage = await compressImage(file);
    let imageData = compressedImage;

    try {
      if (sharedStorageAvailable) {
        imageData = await uploadDataUrl(
          compressedImage,
          appConfig.storyBucket,
          `stories/${storyId}-${sanitizeFileName(file.name || "story-image.jpg")}`,
        );
      }
    } catch (error) {
      console.error("이미지 업로드 실패", error);
      alert("공용 저장소에 이미지를 업로드하지 못했습니다. Supabase 설정과 스토리지 버킷을 확인해 주세요.");
      return;
    }

    const passwordHash = await hashText(formData.get("deletePassword").trim());
    const story = {
      id: storyId,
      createdAt: new Date().toISOString(),
      reportMonth: formData.get("reportMonth").trim(),
      division: formData.get("division").trim(),
      owner: formData.get("owner").trim(),
      email: formData.get("email").trim(),
      title: formData.get("title").trim(),
      period: formData.get("period").trim(),
      participants: formData.get("participants").trim(),
      summary: formData.get("summary").trim(),
      impactMetric: formData.get("impactMetric").trim() || "정량적 성과는 운영 후 집계 예정",
      evidence: formData.get("evidence").trim(),
      cultureValue: formData.get("evidence").trim(),
      quote: formData.get("quote").trim() || "관련된 한마디는 추후 공유 예정입니다.",
      desiredMessage: formData.get("desiredMessage").trim(),
      passwordHash,
      imageName: file.name,
      imageData,
    };

    try {
      await persistStory(story);
      stories.unshift(story);
      saveToStorage(STORAGE_KEYS.stories, stories);
    } catch (error) {
      console.error("사례 저장 실패", error);
      alert("사례를 저장하지 못했습니다. 공용 저장소 설정을 확인해 주세요.");
      return;
    }

    elements.form.reset();
    setDefaultMonth();
    clearValidationAlert();
    renderAll();
    alert("사례가 공유되었습니다. 공유된 사례 보기에서 확인할 수 있습니다.");
    showView("archive");
  });

  elements.resetForm.addEventListener("click", () => {
    elements.form.reset();
    setDefaultMonth();
    clearValidationAlert();
  });

  elements.loadSample.addEventListener("click", fillSampleStory);

  elements.storySearch.addEventListener("input", renderStoryList);
  elements.monthFilter.addEventListener("change", renderStoryList);
}

function validateStoryForm() {
  const requiredFields = $$("[data-label][required]");
  const missingLabels = [];
  let firstInvalid = null;

  requiredFields.forEach((field) => {
    const isFile = field.type === "file";
    const isMissing = isFile ? field.files.length === 0 : !field.value.trim();

    field.classList.toggle("is-invalid", isMissing);

    if (isMissing) {
      missingLabels.push(field.dataset.label);
      firstInvalid ||= field;
    }
  });

  return {
    isValid: missingLabels.length === 0,
    missingLabels,
    firstInvalid,
  };
}

function showValidationAlert(missingLabels) {
  const message = missingLabels.map((label) => `‘${label}’ 칸을 입력하지 않으셨습니다.`).join("<br />");
  elements.validationAlert.innerHTML = `<strong>공유 전에 확인해 주세요.</strong>${message}`;
  elements.validationAlert.hidden = false;
  alert(`${missingLabels[0]} 칸을 입력하지 않으셨습니다.`);
}

function clearValidationAlert() {
  elements.validationAlert.hidden = true;
  elements.validationAlert.innerHTML = "";
  $$("[data-label]").forEach((field) => field.classList.remove("is-invalid"));
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);
  const maxSize = 1400;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fillSampleStory() {
  $("#reportMonth").value = "2026-05";
  $("#division").value = "경영기획실";
  $("#owner").value = "인사지원팀";
  $("#email").value = "김교보";
  $("#title").value = "전사 성과 및 활동 공유 프로그램 <성공로그> 운영 시작";
  $("#period").value = "2026.05.01~";
  $("#participants").value = "인사지원팀 2명, 각 본부/실 담당자 협업";
  $("#summary").value =
    "각 소속에서 만들어낸 성과와 의미 있는 시도를 한곳에 모아 공유하기 위해 <성공로그> 운영을 시작했습니다. 단순한 실적 취합을 넘어, 고객 가치 혁신을 만든 과정과 구성원의 노력을 함께 기록하고 카드뉴스로 확산하는 프로그램입니다.";
  $("#impactMetric").value = "월 1회 정기 공유, 6개 소속 참여 기반 구축";
  $("#evidence").value =
    "그동안 부서별 성과와 활동이 개별적으로 공유되어 전사 관점의 학습과 확산이 어려웠습니다. 성공로그는 담당자가 직접 사례를 공유하고, 카드뉴스로 보기 쉽게 정리해 좋은 시도가 조직 안에서 더 빠르게 발견되도록 돕습니다.";
  $("#quote").value = "좋은 성과와 시도가 조직 안에서 더 자주 발견되고 연결되었으면 합니다.";
  $("#desiredMessage").value = "우리의 성공 경험을 기록하고, 더 큰 고객 가치로 연결합니다.";
  $("#deletePassword").value = "successlog";
  clearValidationAlert();
}

function bindStudio() {
  renderTemplateOptions();

  elements.storySelect.addEventListener("change", () => {
    currentCardDataUrl = "";
    updatePrompt();
    drawPlaceholderCard();
  });

  elements.toneSelect.addEventListener("change", updatePrompt);

  elements.generateCard.addEventListener("click", async () => {
    const story = getSelectedStory();
    if (!story) {
      alert("카드뉴스 시안으로 제작할 사례를 먼저 선택해 주세요.");
      return;
    }

    elements.studioStatus.textContent = "이미지 콘셉트를 정리하고 카드뉴스 시안을 생성하는 중입니다...";
    elements.generateCard.disabled = true;

    try {
      await delay(320);
      await drawCard(story, getSelectedTemplate(), elements.toneSelect.value);
      currentCardDataUrl = elements.cardCanvas.toDataURL("image/png");
      elements.studioStatus.textContent = "카드뉴스 시안 미리보기가 생성되었습니다. 시안 공유 또는 PNG 다운로드를 진행할 수 있습니다.";
    } catch (error) {
      console.error("카드뉴스 시안 생성 실패", error);
      currentCardDataUrl = "";
      elements.studioStatus.textContent = "카드뉴스 시안 생성에 실패했습니다. 참고 이미지 접근 권한 또는 공용 저장소 설정을 확인해 주세요.";
    } finally {
      elements.generateCard.disabled = false;
    }
  });

  elements.copyPrompt.addEventListener("click", async () => {
    const prompt = elements.aiPrompt.value.trim();
    if (!prompt) {
      alert("복사할 프롬프트가 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      elements.studioStatus.textContent = "이미지 생성 프롬프트를 클립보드에 복사했습니다.";
    } catch (error) {
      elements.aiPrompt.select();
      document.execCommand("copy");
      elements.studioStatus.textContent = "프롬프트를 선택해 복사했습니다.";
    }
  });

  elements.saveCard.addEventListener("click", async () => {
    const story = getSelectedStory();
    if (!story || !currentCardDataUrl) {
      alert("먼저 카드뉴스 시안을 생성해 주세요.");
      return;
    }

    const cardId = createId();
    let imageData = currentCardDataUrl;

    try {
      if (sharedStorageAvailable) {
        imageData = await uploadDataUrl(
          elements.cardCanvas.toDataURL("image/jpeg", 0.9),
          appConfig.cardBucket,
          `cards/${cardId}-${sanitizeFileName(story.division)}-${sanitizeFileName(story.title)}.jpg`,
        );
      }
    } catch (error) {
      console.warn("카드뉴스 시안 이미지 업로드 실패, 데이터 URL 저장으로 대체합니다.", error);
      imageData = elements.cardCanvas.toDataURL("image/jpeg", 0.82);
    }

    const card = {
      id: cardId,
      storyId: story.id,
      createdAt: new Date().toISOString(),
      title: story.title,
      division: story.division,
      templateId: selectedTemplateId,
      tone: elements.toneSelect.value,
      prompt: elements.aiPrompt.value,
      imageData,
    };

    try {
      await persistCard(card);
      cards.unshift(card);
      saveToStorage(STORAGE_KEYS.cards, cards);
      renderAll();
      elements.studioStatus.textContent = "카드뉴스 시안을 공유했습니다. 공유된 시안 보기에서 확인할 수 있습니다.";
      showView("gallery");
    } catch (error) {
      console.error("카드뉴스 시안 저장 실패", error);
      alert("카드뉴스 시안 저장에 실패했습니다. 공용 저장소 설정 또는 브라우저 저장 공간을 확인해 주세요.");
    }
  });

  elements.downloadCard.addEventListener("click", () => {
    const story = getSelectedStory();
    if (!story || !currentCardDataUrl) {
      alert("먼저 카드뉴스 시안을 생성해 주세요.");
      return;
    }

    downloadDataUrl(currentCardDataUrl, `${sanitizeFileName(story.division)}_${sanitizeFileName(story.title)}.png`);
  });
}

function renderTemplateOptions() {
  elements.templateOptions.innerHTML = templates
    .map(
      (template, index) => `
        <label class="template-choice">
          <input type="radio" name="template" value="${template.id}" ${index === 0 ? "checked" : ""} />
          <span>
            <strong>${template.name}</strong>
            <small>${template.description}</small>
          </span>
        </label>
      `,
    )
    .join("");

  $$('input[name="template"]').forEach((input) => {
    input.addEventListener("change", () => {
      selectedTemplateId = input.value;
      currentCardDataUrl = "";
      updatePrompt();
      drawPlaceholderCard();
    });
  });
}

function populateStorySelect() {
  if (!stories.length) {
    elements.storySelect.innerHTML = `<option value="">공유된 사례가 없습니다</option>`;
    elements.storySelect.disabled = true;
    return;
  }

  const currentValue = elements.storySelect.value;
  elements.storySelect.disabled = false;
  elements.storySelect.innerHTML = stories
    .map((story) => `<option value="${story.id}">${story.reportMonth} · ${story.division} · ${story.title}</option>`)
    .join("");

  if (stories.some((story) => story.id === currentValue)) {
    elements.storySelect.value = currentValue;
  }
}

function updatePrompt() {
  const story = getSelectedStory();
  const template = getSelectedTemplate();
  const tone = toneCopy[elements.toneSelect.value];

  if (!story) {
    elements.aiPrompt.value = "사례를 먼저 공유하거나 공유된 사례 보기에서 제작을 시작해 주세요.";
    return;
  }

  elements.aiPrompt.value = [
    `1장짜리 사내 카드뉴스 시안 이미지를 제작해 주세요.`,
    `템플릿: ${template.name} - ${template.description}`,
    `톤앤매너: ${tone}`,
    `소속: ${story.division}`,
    `성과 제목: ${story.title}`,
    `활동 기간: ${story.period}`,
    `참여 인원/대상: ${story.participants}`,
    `핵심 메시지: ${story.desiredMessage}`,
    `정량적 성과: ${story.impactMetric}`,
    `이야기 요약: ${story.summary}`,
    `근거/에피소드: ${story.evidence}`,
    `고객/직원의 한마디: "${story.quote}"`,
    `디자인 지시: 공유된 사례의 전체 내용을 균형 있게 반영하되, 템플릿 제목에 맞춰 폰트, 정보 위계, 이미지 위치, 여백, 그래픽 장식을 분명히 다르게 구성해 주세요. 1080x1080 정사각형, 한국어 타이포그래피가 잘 보이게, 텍스트는 프레임을 벗어나지 않게 충분한 여백을 확보.`,
  ].join("\n");
}

function getSelectedStory() {
  const selectedId = elements.storySelect.value || stories[0]?.id;
  return stories.find((story) => story.id === selectedId) || null;
}

function getSelectedTemplate() {
  return templates.find((template) => template.id === selectedTemplateId) || templates[0];
}

function renderAll() {
  renderDashboard();
  renderMonthFilter();
  renderStoryList();
  populateStorySelect();
  updatePrompt();
  renderGallery();
}

function renderDashboard() {
  elements.storyCount.textContent = stories.length;
  if (elements.cardCount) elements.cardCount.textContent = cards.length;
  elements.divisionCount.textContent = new Set(stories.map((story) => story.division)).size;
}

function renderMonthFilter() {
  const currentValue = elements.monthFilter.value;
  const months = [...new Set(stories.map((story) => story.reportMonth).filter(Boolean))].sort().reverse();
  elements.monthFilter.innerHTML = [
    `<option value="">전체 연월</option>`,
    ...months.map((month) => `<option value="${escapeHtml(month)}">${escapeHtml(month)}</option>`),
  ].join("");

  if (months.includes(currentValue)) {
    elements.monthFilter.value = currentValue;
  }
}

function renderStoryList() {
  const keyword = elements.storySearch.value.trim().toLowerCase();
  const selectedMonth = elements.monthFilter.value;
  const filtered = stories.filter((story) => {
    const haystack = [story.division, story.owner, story.email, story.title, story.summary, story.impactMetric, story.evidence, story.quote]
      .join(" ")
      .toLowerCase();
    const matchesKeyword = haystack.includes(keyword);
    const matchesMonth = !selectedMonth || story.reportMonth === selectedMonth;
    return matchesKeyword && matchesMonth;
  });

  if (!filtered.length) {
    elements.storyList.innerHTML = getEmptyState("공유된 사례가 없습니다.", "사례 공유 페이지에서 첫 이야기를 등록해 주세요.");
    return;
  }

  elements.storyList.innerHTML = filtered
    .map(
      (story) => `
        <article class="story-card">
          <div class="story-thumb">${story.imageData ? `<img src="${story.imageData}" alt="${escapeHtml(story.title)} 참고 이미지" />` : ""}</div>
          <div class="story-body">
            <div class="story-meta">
              <span class="pill">${story.reportMonth}</span>
              <span class="pill">${story.division}</span>
            </div>
            <h3>${escapeHtml(story.title)}</h3>
            <p>${escapeHtml(story.summary)}</p>
            <p><strong>정량적 성과:</strong> ${escapeHtml(story.impactMetric)}</p>
            <div class="story-actions">
              <button class="tiny-button" type="button" data-view-story="${story.id}">전체 내용 확인</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  $$("[data-view-story]").forEach((button) => {
    button.addEventListener("click", () => handleStoryDetailView(button.dataset.viewStory));
  });
}

async function handleStoryDetailView(storyId) {
  const story = stories.find((item) => item.id === storyId);
  if (!story) return;

  const input = await showCredentialDialog({
    title: "전체 내용 확인",
    message: "사례 공유 시 입력한 비밀번호를 입력해 주세요.",
    confirmText: "확인",
    cancelText: "돌아가기",
  });

  if (input === null) return;

  const credential = input.trim();
  if (!credential) {
    alert("비밀번호를 입력해 주세요.");
    return;
  }

  const isAdmin = credential === ADMIN_VIEW_KEY;
  const isOwner = story.passwordHash && story.passwordHash === (await hashText(credential));

  if (!isAdmin && !isOwner) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  showStoryDetailDialog(story, credential);
}

async function handleStoryDelete(storyId) {
  const story = stories.find((item) => item.id === storyId);
  if (!story) return;

  const password = prompt("사례 공유 시 입력한 비밀번호를 입력해 주세요.");
  if (password === null) return;
  if (!password.trim()) {
    alert("비밀번호를 입력해 주세요.");
    return;
  }

  try {
    let canDelete = false;

    if (sharedStorageAvailable) {
      canDelete = await deleteRemoteStory(story.id, password.trim());
      if (!canDelete) {
        alert("비밀번호가 일치하지 않거나, 비밀번호 기능이 적용되기 전 공유된 사례입니다.");
        return;
      }
    } else {
      if (!story.passwordHash) {
        alert("비밀번호 기능이 적용되기 전 공유된 사례는 화면에서 삭제할 수 없습니다.");
        return;
      }

      canDelete = story.passwordHash === (await hashText(password.trim()));
      if (!canDelete) {
        alert("비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    stories = stories.filter((item) => item.id !== story.id);
    saveToStorage(STORAGE_KEYS.stories, stories);
    renderAll();
    drawPlaceholderCard();
    alert("사례가 삭제되었습니다.");
  } catch (error) {
    console.error("사례 삭제 실패", error);
    alert("사례를 삭제하지 못했습니다. Supabase 마이그레이션 SQL이 적용되었는지 확인해 주세요.");
  }
}

async function deleteStoryWithCredential(story, credential) {
  if (sharedStorageAvailable) {
    try {
      const canDelete = await deleteRemoteStoryWithKey(story.id, credential);
      if (!canDelete) throw new Error("비밀번호가 일치하지 않습니다.");
    } catch (error) {
      if (credential !== ADMIN_VIEW_KEY) {
        const canDelete = await deleteRemoteStory(story.id, credential);
        if (!canDelete) throw error;
      } else {
        throw error;
      }
    }
  }

  stories = stories.filter((item) => item.id !== story.id);
  saveToStorage(STORAGE_KEYS.stories, stories);
  renderAll();
  drawPlaceholderCard();
}

function renderGallery() {
  if (!cards.length) {
    elements.cardGallery.innerHTML = getEmptyState("공유된 카드뉴스 시안이 없습니다.", "카드뉴스 시안 제작 페이지에서 시안 공유를 눌러주세요.");
    return;
  }

  elements.cardGallery.innerHTML = cards
    .map(
      (card) => `
        <article class="gallery-item">
          <img src="${card.imageData}" alt="${escapeHtml(card.title)} 카드뉴스" />
          <div class="gallery-body">
            <div class="gallery-meta">
              <span class="pill">${escapeHtml(card.division)}</span>
              <span class="pill">${getTemplateName(card.templateId)}</span>
            </div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${formatDate(card.createdAt)} 저장</p>
            <div class="gallery-actions">
              <button class="tiny-button" type="button" data-download-card="${card.id}">PNG 다운로드</button>
              <button class="tiny-button alt" type="button" data-delete-card="${card.id}">삭제</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  $$("[data-download-card]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = cards.find((item) => item.id === button.dataset.downloadCard);
      if (!card) return;
      await downloadImageSource(card.imageData, `${sanitizeFileName(card.division)}_${sanitizeFileName(card.title)}.png`);
    });
  });

  $$("[data-delete-card]").forEach((button) => {
    button.addEventListener("click", () => handleCardDelete(button.dataset.deleteCard));
  });
}

async function handleCardDelete(cardId) {
  const card = cards.find((item) => item.id === cardId);
  if (!card) return;

  const confirmed = await showConfirmDialog({
    title: "카드뉴스 시안 삭제",
    message: "정말 삭제하시겠습니까? 본인의 시안이 맞는지 다시 확인해주세요",
    confirmText: "삭제",
    cancelText: "돌아가기",
  });

  if (!confirmed) return;

  try {
    if (sharedStorageAvailable) {
      await deleteRemoteCard(card.id);
    }

    cards = cards.filter((item) => item.id !== card.id);
    saveToStorage(STORAGE_KEYS.cards, cards);
    renderAll();
  } catch (error) {
    console.error("카드뉴스 시안 삭제 실패", error);
    alert("카드뉴스 시안을 삭제하지 못했습니다. Supabase 삭제 정책이 적용되었는지 확인해 주세요.");
  }
}

async function fetchRemoteStories() {
  const rows = await supabaseFetch(
    "/rest/v1/stories?select=id,created_at,report_month,division,owner,email,title,period,participants,summary,impact_metric,evidence,culture_value,quote,desired_message,password_hash,image_name,image_url&order=created_at.desc",
  );
  return Array.isArray(rows) ? rows.map(mapRemoteStory) : [];
}

async function fetchRemoteCards() {
  const rows = await supabaseFetch("/rest/v1/cards?select=*&order=created_at.desc");
  return Array.isArray(rows) ? rows.map(mapRemoteCard) : [];
}

async function persistStory(story) {
  if (!sharedStorageAvailable) return;

  await supabaseFetch("/rest/v1/stories", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(mapStoryToRemote(story)),
  });
}

async function updateRemoteStory(story, credential) {
  if (!sharedStorageAvailable) return;

  const result = await supabaseFetch("/rest/v1/rpc/update_story_with_key", {
    method: "POST",
    body: JSON.stringify({
      target_story_id: story.id,
      plain_key: credential,
      updated_report_month: story.reportMonth,
      updated_division: story.division,
      updated_owner: story.owner,
      updated_email: story.email,
      updated_title: story.title,
      updated_period: story.period,
      updated_participants: story.participants,
      updated_summary: story.summary,
      updated_impact_metric: story.impactMetric,
      updated_evidence: story.evidence,
      updated_quote: story.quote,
      updated_desired_message: story.desiredMessage,
    }),
  });

  if (result !== true) {
    throw new Error("사례 수정 권한이 확인되지 않았습니다.");
  }
}

async function persistCard(card) {
  if (!sharedStorageAvailable) return;

  await supabaseFetch("/rest/v1/cards", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(mapCardToRemote(card)),
  });
}

async function deleteRemoteStory(storyId, password) {
  const result = await supabaseFetch("/rest/v1/rpc/delete_story_with_password", {
    method: "POST",
    body: JSON.stringify({
      target_story_id: storyId,
      plain_password: password,
    }),
  });

  return result === true;
}

async function deleteRemoteStoryWithKey(storyId, credential) {
  const result = await supabaseFetch("/rest/v1/rpc/delete_story_with_key", {
    method: "POST",
    body: JSON.stringify({
      target_story_id: storyId,
      plain_key: credential,
    }),
  });

  return result === true;
}

async function deleteRemoteCard(cardId) {
  await supabaseFetch(`/rest/v1/cards?id=eq.${encodeURIComponent(cardId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${appConfig.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase 요청 실패: ${response.status} ${details}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function uploadDataUrl(dataUrl, bucket, objectPath) {
  const blob = dataUrlToBlob(dataUrl);
  const encodedPath = encodeObjectPath(objectPath);
  const response = await fetch(`${appConfig.supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: appConfig.supabaseAnonKey,
      Authorization: `Bearer ${appConfig.supabaseAnonKey}`,
      "Content-Type": blob.type,
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase Storage 업로드 실패: ${response.status} ${details}`);
  }

  return `${appConfig.supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mimeType = meta.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function encodeObjectPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function mapStoryToRemote(story) {
  return {
    id: story.id,
    created_at: story.createdAt,
    report_month: story.reportMonth,
    division: story.division,
    owner: story.owner,
    email: story.email,
    title: story.title,
    period: story.period,
    participants: story.participants,
    summary: story.summary,
    impact_metric: story.impactMetric,
    evidence: story.evidence,
    culture_value: story.cultureValue,
    quote: story.quote,
    desired_message: story.desiredMessage,
    password_hash: story.passwordHash,
    image_name: story.imageName,
    image_url: story.imageData,
  };
}

function mapRemoteStory(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    reportMonth: row.report_month,
    division: row.division,
    owner: row.owner,
    email: row.email,
    title: row.title,
    period: row.period,
    participants: row.participants,
    summary: row.summary,
    impactMetric: row.impact_metric,
    evidence: row.evidence,
    cultureValue: row.culture_value,
    quote: row.quote,
    desiredMessage: row.desired_message,
    passwordHash: row.password_hash || "",
    imageName: row.image_name,
    imageData: row.image_url || "",
  };
}

function mapCardToRemote(card) {
  return {
    id: card.id,
    story_id: card.storyId,
    created_at: card.createdAt,
    title: card.title,
    division: card.division,
    template_id: card.templateId,
    tone: card.tone,
    prompt: card.prompt,
    image_url: card.imageData,
  };
}

function mapRemoteCard(row) {
  return {
    id: row.id,
    storyId: row.story_id,
    createdAt: row.created_at,
    title: row.title,
    division: row.division,
    templateId: row.template_id,
    tone: row.tone,
    prompt: row.prompt,
    imageData: row.image_url || "",
  };
}

function getEmptyState(title, description) {
  return `
    <article class="empty-state">
      <span>${title}</span>
      <p>${description}</p>
    </article>
  `;
}

function getTemplateName(templateId) {
  return templates.find((template) => template.id === templateId)?.name || "템플릿";
}

function drawPlaceholderCard() {
  const canvas = elements.cardCanvas;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#214c36");
  gradient.addColorStop(0.48, "#355f47");
  gradient.addColorStop(1, "#f6be45");

  context.clearRect(0, 0, width, height);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  drawCircle(context, 880, 180, 210, "rgba(255, 247, 228, 0.20)");
  drawCircle(context, 160, 890, 240, "rgba(23, 33, 27, 0.18)");
  drawRoundedRect(context, 86, 92, 908, 896, 48, "rgba(255, 247, 228, 0.88)");

  context.fillStyle = "#214c36";
  context.font = `800 46px ${CANVAS_TITLE_FONT}`;
  context.fillText("성공로그", 140, 190);
  context.font = `700 32px ${CANVAS_BODY_FONT}`;
  wrapText(context, "사례를 선택하고 카드뉴스 시안 생성 버튼을 눌러주세요.", 140, 290, 780, 46);

  context.font = `700 26px ${CANVAS_BODY_FONT}`;
  context.fillStyle = "#66736c";
  wrapText(context, "공유된 성과와 활동이 이곳에서 1장짜리 카드뉴스 시안으로 정리됩니다.", 140, 410, 720, 40);
}

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

function getAdaptiveFontSize(context, text, maxWidth, startSize, minSize, fontFamily, weight, maxLines) {
  let size = startSize;

  while (size > minSize) {
    setCanvasFont(context, weight, size, fontFamily);
    if (estimateWrappedLineCount(context, text, maxWidth) <= maxLines) break;
    size -= 2;
  }

  return size;
}

function estimateWrappedLineCount(context, text, maxWidth) {
  const tokens = getWrapTokens(context, text, maxWidth);
  let line = "";
  let count = 0;

  tokens.forEach((token) => {
    const separator = token.glue && line ? token.glue : "";
    const testLine = `${line}${separator}${token.text}`;

    if (context.measureText(testLine).width > maxWidth && line) {
      count += 1;
      line = token.text;
    } else {
      line = testLine;
    }
  });

  return line ? count + 1 : count;
}

function getWrapTokens(context, text, maxWidth) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (context.measureText(word).width <= maxWidth) {
        return [{ text: word, glue: " " }];
      }

      return Array.from(word).map((character) => ({ text: character, glue: "" }));
    });
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const tokens = getWrapTokens(context, text, maxWidth);
  let line = "";
  let lineCount = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const separator = token.glue && line ? token.glue : "";
    const testLine = `${line}${separator}${token.text}`;
    const metrics = context.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      context.fillText(line, x, y);
      line = token.text;
      y += lineHeight;
      lineCount += 1;

      if (lineCount >= maxLines - 1) {
        const remaining = tokens.slice(index).map((item) => item.text).join("");
        drawEllipsizedText(context, `${line}${remaining}`, x, y, maxWidth);
        return;
      }
    } else {
      line = testLine;
    }
  }

  if (line) context.fillText(line, x, y);
}

function drawEllipsizedText(context, text, x, y, maxWidth) {
  let output = String(text || "");
  while (output.length > 0 && context.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  context.fillText(output.length < String(text || "").length ? `${output}...` : output, x, y);
}

function showCredentialDialog({ title, message, confirmText, cancelText }) {
  return new Promise((resolve) => {
    const previous = document.querySelector(".confirm-backdrop");
    previous?.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "confirm-backdrop";
    backdrop.innerHTML = `
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="credentialDialogTitle">
        <h2 id="credentialDialogTitle">${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <form class="credential-form">
          <label class="credential-field">
            <input type="password" name="credential" autocomplete="current-password" />
          </label>
          <div class="confirm-actions">
            <button class="primary-action" type="submit">${escapeHtml(confirmText)}</button>
            <button class="ghost-action" type="button" data-cancel-action>${escapeHtml(cancelText)}</button>
          </div>
        </form>
      </section>
    `;

    const close = (result) => {
      document.removeEventListener("keydown", handleEscape);
      backdrop.remove();
      resolve(result);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") close(null);
    };

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(null);
    });
    backdrop.querySelector(".credential-form").addEventListener("submit", (event) => {
      event.preventDefault();
      close(new FormData(event.currentTarget).get("credential") || "");
    });
    backdrop.querySelector("[data-cancel-action]").addEventListener("click", () => close(null));
    document.addEventListener("keydown", handleEscape);
    document.body.appendChild(backdrop);
    backdrop.querySelector("input").focus();
  });
}

function showStoryDetailDialog(story, credential) {
  const previous = document.querySelector(".confirm-backdrop");
  previous?.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "confirm-backdrop";
  backdrop.innerHTML = `
    <section class="confirm-dialog story-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="storyDetailTitle">
      <div class="story-detail-header">
        <span class="pill">내용 확인 및 수정</span>
        <h2 id="storyDetailTitle">${escapeHtml(story.title)}</h2>
      </div>
      ${story.imageData ? `<img class="story-detail-image" src="${story.imageData}" alt="${escapeHtml(story.title)} 참고 이미지" />` : ""}
      <form class="story-detail-form">
        <div class="story-detail-list">
          ${getStoryDetailField("공유 월", "reportMonth", story.reportMonth, "input", "month")}
          ${getStoryDetailSelect("본부/실", "division", story.division)}
          ${getStoryDetailField("소속(팀/점/파트)", "owner", story.owner)}
          ${getStoryDetailField("이름", "email", story.email)}
          ${getStoryDetailField("성과/활동 제목", "title", story.title)}
          ${getStoryDetailField("활동 기간", "period", story.period)}
          ${getStoryDetailField("참여 인원/대상", "participants", story.participants)}
          ${getStoryDetailField("핵심 이야기", "summary", story.summary, "textarea")}
          ${getStoryDetailField("정량적 성과", "impactMetric", story.impactMetric)}
          ${getStoryDetailField("근거/에피소드", "evidence", story.evidence, "textarea")}
          ${getStoryDetailField("고객/직원의 한마디", "quote", story.quote)}
          ${getStoryDetailField("강조하고 싶은 문구", "desiredMessage", story.desiredMessage)}
        </div>
        <div class="confirm-actions">
          <button class="primary-action" type="submit">수정 내용 저장</button>
          <button class="primary-action danger-action" type="button" data-delete-action>삭제</button>
          <button class="ghost-action" type="button" data-close-action>닫기</button>
        </div>
      </form>
    </section>
  `;

  const close = () => {
    document.removeEventListener("keydown", handleEscape);
    backdrop.remove();
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") close();
  };

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector(".story-detail-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updatedStory = {
      ...story,
      reportMonth: formData.get("reportMonth").trim(),
      division: formData.get("division").trim(),
      owner: formData.get("owner").trim(),
      email: formData.get("email").trim(),
      title: formData.get("title").trim(),
      period: formData.get("period").trim(),
      participants: formData.get("participants").trim(),
      summary: formData.get("summary").trim(),
      impactMetric: formData.get("impactMetric").trim() || "정량적 성과는 운영 후 집계 예정",
      evidence: formData.get("evidence").trim(),
      cultureValue: formData.get("evidence").trim(),
      quote: formData.get("quote").trim() || "관련된 한마디는 추후 공유 예정입니다.",
      desiredMessage: formData.get("desiredMessage").trim(),
    };

    try {
      await updateRemoteStory(updatedStory, credential);
      stories = stories.map((item) => (item.id === updatedStory.id ? updatedStory : item));
      saveToStorage(STORAGE_KEYS.stories, stories);
      renderAll();
      close();
      alert("사례 내용이 수정되었습니다.");
    } catch (error) {
      console.error("사례 수정 실패", error);
      alert("사례를 수정하지 못했습니다. Supabase 마이그레이션 SQL이 적용되었는지 확인해 주세요.");
    }
  });
  backdrop.querySelector("[data-delete-action]").addEventListener("click", async () => {
    const confirmed = await showConfirmDialog({
      title: "사례 삭제",
      message: "정말 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.",
      confirmText: "삭제",
      cancelText: "돌아가기",
    });

    if (!confirmed) {
      document.body.appendChild(backdrop);
      return;
    }

    try {
      await deleteStoryWithCredential(story, credential);
      close();
      alert("사례가 삭제되었습니다.");
    } catch (error) {
      console.error("사례 삭제 실패", error);
      alert("사례를 삭제하지 못했습니다. Supabase 마이그레이션 SQL이 적용되었는지 확인해 주세요.");
    }
  });
  backdrop.querySelector("[data-close-action]").addEventListener("click", close);
  document.addEventListener("keydown", handleEscape);
  document.body.appendChild(backdrop);
  backdrop.querySelector("[data-close-action]").focus();
}

function getStoryDetailField(label, name, value, element = "input", type = "text") {
  const escapedValue = escapeHtml(value || "");
  const control =
    element === "textarea"
      ? `<textarea name="${name}" rows="4">${escapedValue}</textarea>`
      : `<input name="${name}" type="${type}" value="${escapedValue}" />`;

  return `
    <label>
      <span>${escapeHtml(label)}</span>
      ${control}
    </label>
  `;
}

function getStoryDetailSelect(label, name, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${name}">
        ${CURRENT_DIVISIONS.map(
          (division) => `<option value="${escapeHtml(division)}" ${division === value ? "selected" : ""}>${escapeHtml(division)}</option>`,
        ).join("")}
      </select>
    </label>
  `;
}

function showConfirmDialog({ title, message, confirmText, cancelText }) {
  return new Promise((resolve) => {
    const previous = document.querySelector(".confirm-backdrop");
    previous?.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "confirm-backdrop";
    backdrop.innerHTML = `
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle">
        <h2 id="confirmDialogTitle">${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="primary-action danger-action" type="button" data-confirm-action>${escapeHtml(confirmText)}</button>
          <button class="ghost-action" type="button" data-cancel-action>${escapeHtml(cancelText)}</button>
        </div>
      </section>
    `;

    const close = (result) => {
      document.removeEventListener("keydown", handleEscape);
      backdrop.remove();
      resolve(result);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") close(false);
    };

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close(false);
    });
    backdrop.querySelector("[data-confirm-action]").addEventListener("click", () => close(true));
    backdrop.querySelector("[data-cancel-action]").addEventListener("click", () => close(false));
    document.addEventListener("keydown", handleEscape);
    document.body.appendChild(backdrop);
    backdrop.querySelector("[data-cancel-action]").focus();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadImageSource(src, fileName) {
  if (src.startsWith("data:")) {
    downloadDataUrl(src, fileName);
    return;
  }

  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    downloadDataUrl(objectUrl, fileName);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

function sanitizeFileName(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
