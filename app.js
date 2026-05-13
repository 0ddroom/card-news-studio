const STORAGE_KEYS = {
  stories: "cardNewsStudio.stories",
  cards: "cardNewsStudio.cards",
};

const appConfig = normalizeConfig(window.CARD_NEWS_STUDIO_CONFIG);
const sharedStorageEnabled = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let sharedStorageAvailable = sharedStorageEnabled;

const templates = [
  {
    id: "report",
    name: "성공로그 리포트",
    description: "사례의 전체 맥락을 균형 있게 정리하는 기본형",
    palette: ["#173d2a", "#f6be45", "#fff7e4", "#8daf63"],
  },
  {
    id: "magazine",
    name: "현장 매거진",
    description: "이미지와 이야기를 크게 보여주는 감성형",
    palette: ["#f7ead8", "#ef735c", "#214c36", "#f6be45"],
  },
  {
    id: "metric",
    name: "성과 숫자 스포트라이트",
    description: "정량적 성과가 있을 때 숫자를 크게 강조하는 성과형",
    palette: ["#173d2a", "#f6be45", "#fff7e4", "#ef735c"],
  },
  {
    id: "timeline",
    name: "진행 여정 타임라인",
    description: "활동 기간, 참여, 근거를 흐름으로 보여주는 과정형",
    palette: ["#253b70", "#80d0b1", "#fff7e4", "#f6be45"],
  },
  {
    id: "quote",
    name: "한마디 포커스",
    description: "고객/직원의 한마디를 사례 맥락과 함께 보여주는 인용형",
    palette: ["#151515", "#fff3d3", "#ef735c", "#f6be45"],
  },
  {
    id: "compare",
    name: "변화 비교 보드",
    description: "문제와 시도, 결과를 좌우 비교로 정리하는 개선형",
    palette: ["#e8f2f0", "#214c36", "#3f70d6", "#f6be45"],
  },
  {
    id: "checklist",
    name: "핵심 포인트 체크리스트",
    description: "공유 사례의 핵심 요소를 읽기 쉬운 체크리스트로 정리",
    palette: ["#253b70", "#80d0b1", "#fff7e4", "#f6be45"],
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
    `디자인 지시: 공유된 사례의 전체 내용을 균형 있게 반영하고, 템플릿에 따라 정보 배치와 디자인만 다르게 구성해 주세요. 1080x1080 정사각형, 한국어 타이포그래피가 잘 보이게, 기업 내부 공유용으로 신뢰감 있게, 이미지와 텍스트의 여백을 충분히 확보.`,
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
  elements.cardCount.textContent = cards.length;
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
              <button class="tiny-button" type="button" data-start-card="${story.id}">카드뉴스 시안 제작</button>
              <button class="tiny-button alt" type="button" data-delete-story="${story.id}">삭제</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  $$("[data-start-card]").forEach((button) => {
    button.addEventListener("click", () => {
      showView("studio");
      elements.storySelect.value = button.dataset.startCard;
      updatePrompt();
      drawPlaceholderCard();
    });
  });

  $$("[data-delete-story]").forEach((button) => {
    button.addEventListener("click", () => handleStoryDelete(button.dataset.deleteStory));
  });

}

async function handleStoryDelete(storyId) {
  const story = stories.find((item) => item.id === storyId);
  if (!story) return;

  const password = prompt("사례 공유 시 입력한 삭제 비밀번호를 입력해 주세요.");
  if (password === null) return;
  if (!password.trim()) {
    alert("삭제 비밀번호를 입력해 주세요.");
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
    button.addEventListener("click", () => {
      const card = cards.find((item) => item.id === button.dataset.deleteCard);
      if (!card) return;
      if (sharedStorageAvailable) {
        alert("공용 저장소 모드에서는 웹 화면 삭제를 막아두었습니다. Supabase 관리자 화면에서 삭제해 주세요.");
        return;
      }

      const confirmed = confirm(`‘${card.title}’ 카드뉴스 시안을 저장함에서 삭제할까요?`);
      if (!confirmed) return;

      cards = cards.filter((item) => item.id !== card.id);
      saveToStorage(STORAGE_KEYS.cards, cards);
      renderAll();
    });
  });
}

async function fetchRemoteStories() {
  const rows = await supabaseFetch(
    "/rest/v1/stories?select=id,created_at,report_month,division,owner,email,title,period,participants,summary,impact_metric,evidence,culture_value,quote,desired_message,image_name,image_url&order=created_at.desc",
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

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const words = String(text).split(/\s+/);
  let line = "";
  let lineCount = 0;

  for (let index = 0; index < words.length; index += 1) {
    const testLine = line ? `${line} ${words[index]}` : words[index];
    const metrics = context.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      context.fillText(line, x, y);
      line = words[index];
      y += lineHeight;
      lineCount += 1;

      if (lineCount >= maxLines - 1) {
        const remaining = words.slice(index).join(" ");
        drawEllipsizedText(context, `${line} ${remaining}`, x, y, maxWidth);
        return;
      }
    } else {
      line = testLine;
    }
  }

  if (line) context.fillText(line, x, y);
}

function drawEllipsizedText(context, text, x, y, maxWidth) {
  let output = String(text);
  while (output.length > 0 && context.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  context.fillText(`${output}...`, x, y);
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
