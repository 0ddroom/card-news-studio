const STORAGE_KEYS = {
  stories: "cardNewsStudio.stories",
  cards: "cardNewsStudio.cards",
};

const appConfig = normalizeConfig(window.CARD_NEWS_STUDIO_CONFIG);
const sharedStorageEnabled = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let sharedStorageAvailable = sharedStorageEnabled;

const templates = [
  {
    id: "spotlight",
    name: "성과 스포트라이트",
    description: "숫자 성과와 핵심 메시지를 강하게 보여주는 템플릿",
    palette: ["#173d2a", "#f6be45", "#fff7e4", "#8daf63"],
  },
  {
    id: "field",
    name: "현장 스토리",
    description: "활동 사진과 구성원 이야기를 따뜻하게 담는 템플릿",
    palette: ["#f7ead8", "#ef735c", "#214c36", "#f6be45"],
  },
  {
    id: "culture",
    name: "조직문화 웨이브",
    description: "협업, 성장, 도전 같은 문화 메시지를 선명하게 표현",
    palette: ["#253b70", "#80d0b1", "#fff7e4", "#f6be45"],
  },
  {
    id: "quote",
    name: "인터뷰 임팩트",
    description: "담당자 한마디와 사람의 목소리를 전면에 배치",
    palette: ["#151515", "#fff3d3", "#ef735c", "#f6be45"],
  },
  {
    id: "beforeAfter",
    name: "Before & After",
    description: "문제와 변화를 한눈에 비교해 개선 성과를 강조",
    palette: ["#e8f2f0", "#214c36", "#3f70d6", "#f6be45"],
  },
];

const toneCopy = {
  professional: "전문적이고 신뢰감 있는 톤",
  warm: "따뜻하고 사람 중심의 톤",
  bold: "대담하고 성과 중심의 톤",
  playful: "밝고 활기 있는 톤",
};

let stories = loadFromStorage(STORAGE_KEYS.stories, []);
let cards = loadFromStorage(STORAGE_KEYS.cards, []);
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
  storageMode: $("#storageMode"),
  storageHint: $("#storageHint"),
  storyList: $("#storyList"),
  storySearch: $("#storySearch"),
  clearStories: $("#clearStories"),
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

async function hydrateSharedStorage() {
  if (!sharedStorageEnabled) return;

  elements.storageHint.textContent = "Supabase 연결 확인 중";

  try {
    const [remoteStories, remoteCards] = await Promise.all([fetchRemoteStories(), fetchRemoteCards()]);
    stories = remoteStories;
    cards = remoteCards;
    saveToStorage(STORAGE_KEYS.stories, stories);
    saveToStorage(STORAGE_KEYS.cards, cards);
    renderAll();
    drawPlaceholderCard();
  } catch (error) {
    console.warn("공용 저장소 연결에 실패했습니다. 로컬 모드로 계속 진행합니다.", error);
    sharedStorageAvailable = false;
    elements.storageHint.textContent = "공용 저장소 연결 실패, 로컬 캐시 사용";
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
      impactMetric: formData.get("impactMetric").trim(),
      evidence: formData.get("evidence").trim(),
      cultureValue: formData.get("cultureValue").trim(),
      quote: formData.get("quote").trim(),
      desiredMessage: formData.get("desiredMessage").trim(),
      imageName: file.name,
      imageData,
    };

    try {
      await persistStory(story);
      stories.unshift(story);
      saveToStorage(STORAGE_KEYS.stories, stories);
    } catch (error) {
      console.error("스토리 저장 실패", error);
      alert("스토리를 저장하지 못했습니다. 공용 저장소 설정을 확인해 주세요.");
      return;
    }

    elements.form.reset();
    setDefaultMonth();
    clearValidationAlert();
    renderAll();
    alert("스토리가 제출되었습니다. 취합 목록에서 확인할 수 있습니다.");
    showView("archive");
  });

  elements.resetForm.addEventListener("click", () => {
    elements.form.reset();
    setDefaultMonth();
    clearValidationAlert();
  });

  elements.loadSample.addEventListener("click", fillSampleStory);

  elements.storySearch.addEventListener("input", renderStoryList);
  elements.clearStories.addEventListener("click", () => {
    if (!stories.length) return;
    if (sharedStorageAvailable) {
      alert("공용 저장소 모드에서는 전체 삭제를 막아두었습니다. 삭제가 필요하면 Supabase 관리자 화면에서 처리해 주세요.");
      return;
    }

    const confirmed = confirm("취합된 스토리 목록을 모두 비울까요? 저장된 카드뉴스는 유지됩니다.");
    if (!confirmed) return;

    stories = [];
    saveToStorage(STORAGE_KEYS.stories, stories);
    currentCardDataUrl = "";
    renderAll();
    drawPlaceholderCard();
  });
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
  elements.validationAlert.innerHTML = `<strong>제출 전에 확인해 주세요.</strong>${message}`;
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
  $("#division").value = "고객경험실";
  $("#owner").value = "김하나";
  $("#email").value = "hana.kim@company.com";
  $("#title").value = "고객 문의 응답 시간을 절반으로 줄인 CX 개선 스프린트";
  $("#period").value = "2026.05.01~05.10";
  $("#participants").value = "고객경험실 12명, 제품본부 4명 협업";
  $("#summary").value =
    "반복 문의가 많은 5개 유형을 재분류하고, 답변 템플릿과 제품 FAQ를 함께 개선했습니다. 구성원들이 매일 15분씩 고객 목소리를 함께 읽으며 병목을 줄였습니다.";
  $("#impactMetric").value = "평균 1차 응답 시간 42% 단축, 고객 만족도 4.8점 달성";
  $("#evidence").value =
    "고객 피드백 중 '답변이 빨라졌다'는 언급이 전월 대비 2.1배 증가했고, 신규 FAQ 적용 후 동일 문의 재접수율이 31% 줄었습니다.";
  $("#cultureValue").value =
    "고객중심이라는 가치를 선언에 그치지 않고, 매일의 작은 개선 루틴으로 바꾼 사례입니다. 부서 간 협업으로 문제를 더 빠르게 발견하고 해결했습니다.";
  $("#quote").value = "고객의 불편을 우리 일의 출발점으로 삼았더니 개선 방향이 선명해졌습니다.";
  $("#desiredMessage").value = "고객의 목소리를 매일 읽자, 응답 속도가 42% 빨라졌습니다.";
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
      alert("카드뉴스로 제작할 스토리를 먼저 선택해 주세요.");
      return;
    }

    elements.studioStatus.textContent = "AI 이미지 콘셉트를 정리하고 카드뉴스를 생성하는 중입니다...";
    elements.generateCard.disabled = true;

    try {
      await delay(320);
      await drawCard(story, getSelectedTemplate(), elements.toneSelect.value);
      currentCardDataUrl = elements.cardCanvas.toDataURL("image/png");
      elements.studioStatus.textContent = "카드뉴스 미리보기가 생성되었습니다. 최종 확정 또는 PNG 다운로드를 진행할 수 있습니다.";
    } catch (error) {
      console.error("카드뉴스 생성 실패", error);
      currentCardDataUrl = "";
      elements.studioStatus.textContent = "카드뉴스 생성에 실패했습니다. 참고 이미지 접근 권한 또는 공용 저장소 설정을 확인해 주세요.";
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
      elements.studioStatus.textContent = "AI 이미지 생성 프롬프트를 클립보드에 복사했습니다.";
    } catch (error) {
      elements.aiPrompt.select();
      document.execCommand("copy");
      elements.studioStatus.textContent = "프롬프트를 선택해 복사했습니다.";
    }
  });

  elements.saveCard.addEventListener("click", async () => {
    const story = getSelectedStory();
    if (!story || !currentCardDataUrl) {
      alert("먼저 카드뉴스를 생성해 주세요.");
      return;
    }

    const cardId = createId();
    let imageData = currentCardDataUrl;

    try {
      if (sharedStorageAvailable) {
        imageData = await uploadDataUrl(
          currentCardDataUrl,
          appConfig.cardBucket,
          `cards/${cardId}-${sanitizeFileName(story.division)}-${sanitizeFileName(story.title)}.png`,
        );
      }
    } catch (error) {
      console.error("카드뉴스 이미지 업로드 실패", error);
      alert("카드뉴스 이미지를 공용 저장소에 업로드하지 못했습니다.");
      return;
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
      elements.studioStatus.textContent = "최종 카드뉴스를 저장함에 보관했습니다.";
      showView("gallery");
    } catch (error) {
      console.error("카드뉴스 저장 실패", error);
      alert("카드뉴스 저장에 실패했습니다. 공용 저장소 설정 또는 브라우저 저장 공간을 확인해 주세요.");
    }
  });

  elements.downloadCard.addEventListener("click", () => {
    const story = getSelectedStory();
    if (!story || !currentCardDataUrl) {
      alert("먼저 카드뉴스를 생성해 주세요.");
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
    elements.storySelect.innerHTML = `<option value="">제출된 스토리가 없습니다</option>`;
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
    elements.aiPrompt.value = "스토리를 먼저 제출하거나 취합 목록에서 제작을 시작해 주세요.";
    return;
  }

  elements.aiPrompt.value = [
    `1장짜리 사내 카드뉴스 이미지를 제작해 주세요.`,
    `템플릿: ${template.name} - ${template.description}`,
    `톤앤매너: ${tone}`,
    `본부/실: ${story.division}`,
    `성과 제목: ${story.title}`,
    `핵심 메시지: ${story.desiredMessage}`,
    `숫자 성과: ${story.impactMetric}`,
    `이야기 요약: ${story.summary}`,
    `조직문화 의미: ${story.cultureValue}`,
    `담당자 한마디: "${story.quote}"`,
    `디자인 지시: 1080x1080 정사각형, 한국어 타이포그래피가 잘 보이게, 기업 내부 공유용으로 신뢰감 있게, 이미지와 텍스트의 여백을 충분히 확보.`,
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
  renderStoryList();
  populateStorySelect();
  updatePrompt();
  renderGallery();
}

function renderDashboard() {
  elements.storyCount.textContent = stories.length;
  elements.cardCount.textContent = cards.length;
  elements.divisionCount.textContent = new Set(stories.map((story) => story.division)).size;
  elements.storageMode.textContent = sharedStorageAvailable ? "공용" : "로컬";
  elements.storageHint.textContent = sharedStorageAvailable ? "Supabase 무료 저장소 사용" : "현재 브라우저에 저장";
}

function renderStoryList() {
  const keyword = elements.storySearch.value.trim().toLowerCase();
  const filtered = stories.filter((story) => {
    const haystack = [story.division, story.title, story.summary, story.impactMetric, story.cultureValue].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  if (!filtered.length) {
    elements.storyList.innerHTML = getEmptyState("취합된 스토리가 없습니다.", "스토리 제출 페이지에서 첫 이야기를 등록해 주세요.");
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
            <p><strong>성과:</strong> ${escapeHtml(story.impactMetric)}</p>
            <div class="story-actions">
              <button class="tiny-button" type="button" data-start-card="${story.id}">카드뉴스 제작</button>
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
    button.addEventListener("click", () => {
      const story = stories.find((item) => item.id === button.dataset.deleteStory);
      if (!story) return;
      if (sharedStorageAvailable) {
        alert("공용 저장소 모드에서는 웹 화면 삭제를 막아두었습니다. 실수 삭제를 피하기 위해 Supabase 관리자 화면에서 삭제해 주세요.");
        return;
      }

      const confirmed = confirm(`‘${story.title}’ 스토리를 삭제할까요?`);
      if (!confirmed) return;

      stories = stories.filter((item) => item.id !== story.id);
      saveToStorage(STORAGE_KEYS.stories, stories);
      renderAll();
      drawPlaceholderCard();
    });
  });
}

function renderGallery() {
  if (!cards.length) {
    elements.cardGallery.innerHTML = getEmptyState("저장된 카드뉴스가 없습니다.", "AI 카드뉴스 제작 페이지에서 최종 확정 및 저장을 눌러주세요.");
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

      const confirmed = confirm(`‘${card.title}’ 카드뉴스를 저장함에서 삭제할까요?`);
      if (!confirmed) return;

      cards = cards.filter((item) => item.id !== card.id);
      saveToStorage(STORAGE_KEYS.cards, cards);
      renderAll();
    });
  });
}

async function fetchRemoteStories() {
  const rows = await supabaseFetch("/rest/v1/stories?select=*&order=created_at.desc");
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
  context.font = "800 46px Malgun Gothic, sans-serif";
  context.fillText("Card News Studio", 140, 190);
  context.font = "700 32px Malgun Gothic, sans-serif";
  wrapText(context, "스토리를 선택하고 AI 카드뉴스 생성 버튼을 눌러주세요.", 140, 290, 780, 46);

  context.font = "700 26px Malgun Gothic, sans-serif";
  context.fillStyle = "#66736c";
  wrapText(context, "본부/실의 성과와 활동이 이곳에서 1장짜리 카드뉴스로 정리됩니다.", 140, 410, 720, 40);
}

async function drawCard(story, template, tone) {
  const canvas = elements.cardCanvas;
  const context = canvas.getContext("2d");
  const image = story.imageData ? await loadImage(story.imageData) : null;

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (template.id === "spotlight") drawSpotlight(context, story, template, image, tone);
  if (template.id === "field") drawFieldStory(context, story, template, image, tone);
  if (template.id === "culture") drawCultureWave(context, story, template, image, tone);
  if (template.id === "quote") drawQuoteImpact(context, story, template, image, tone);
  if (template.id === "beforeAfter") drawBeforeAfter(context, story, template, image, tone);
}

function drawSpotlight(context, story, template, image) {
  const [dark, gold, cream, moss] = template.palette;
  drawGradient(context, dark, "#2d684a");
  drawCircle(context, 870, 170, 260, "rgba(246, 190, 69, 0.7)");
  drawCircle(context, 880, 190, 180, "rgba(255, 247, 228, 0.34)");
  drawImagePanel(context, image, 648, 210, 330, 470, 44);

  drawPillText(context, `${story.reportMonth} · ${story.division}`, 80, 80, cream, "rgba(255,255,255,0.16)");
  drawHeadline(context, story.desiredMessage, 80, 190, 560, cream, 62);
  drawMetricBlock(context, story.impactMetric, 80, 600, gold, dark);

  context.fillStyle = cream;
  context.globalAlpha = 0.88;
  context.font = "700 28px Malgun Gothic, sans-serif";
  wrapText(context, story.cultureValue, 80, 790, 860, 42, 4);
  context.globalAlpha = 1;
  drawFooter(context, story.owner, moss, cream);
}

function drawFieldStory(context, story, template, image) {
  const [paper, coral, forest, gold] = template.palette;
  drawGradient(context, "#fff7e4", paper);
  drawCircle(context, 135, 135, 120, "rgba(239, 115, 92, 0.28)");
  drawCircle(context, 945, 930, 190, "rgba(246, 190, 69, 0.34)");
  drawPolaroid(context, image, 90, 90, 900, 520, coral);

  drawPillText(context, `${story.division} field note`, 96, 660, "#fff7e4", forest);
  drawHeadline(context, story.title, 96, 735, 830, forest, 48);
  context.fillStyle = "#506259";
  context.font = "700 27px Malgun Gothic, sans-serif";
  wrapText(context, story.summary, 96, 900, 840, 38, 3);
  drawFooter(context, story.impactMetric, gold, forest);
}

function drawCultureWave(context, story, template, image) {
  const [blue, mint, cream, gold] = template.palette;
  drawGradient(context, blue, "#13264d");
  drawCircle(context, 270, 280, 240, "rgba(128, 208, 177, 0.38)");
  drawCircle(context, 800, 760, 330, "rgba(246, 190, 69, 0.22)");
  drawRoundedRect(context, 72, 78, 936, 924, 54, "rgba(255, 247, 228, 0.92)");
  drawCircle(context, 830, 214, 110, mint);
  drawImagePanel(context, image, 690, 260, 245, 245, 122);

  drawPillText(context, "Culture signal", 120, 130, cream, blue);
  drawHeadline(context, story.desiredMessage, 120, 230, 610, blue, 58);
  drawMetricBlock(context, story.impactMetric, 120, 590, gold, blue);

  context.fillStyle = "#33443b";
  context.font = "700 30px Malgun Gothic, sans-serif";
  wrapText(context, story.cultureValue, 120, 780, 780, 44, 4);
  drawFooter(context, `${story.division} · ${story.owner}`, mint, blue);
}

function drawQuoteImpact(context, story, template, image) {
  const [black, cream, coral, gold] = template.palette;

  if (image) {
    drawCroppedImage(context, image, 0, 0, 1080, 1080);
    context.fillStyle = "rgba(0, 0, 0, 0.68)";
    context.fillRect(0, 0, 1080, 1080);
  } else {
    drawGradient(context, black, "#303030");
  }

  drawCircle(context, 930, 120, 150, "rgba(246, 190, 69, 0.46)");
  drawCircle(context, 140, 910, 190, "rgba(239, 115, 92, 0.32)");
  drawPillText(context, story.division, 80, 80, black, gold);

  context.fillStyle = cream;
  context.font = "900 76px Georgia, serif";
  context.fillText("“", 76, 275);
  context.font = "800 54px Malgun Gothic, sans-serif";
  wrapText(context, story.quote, 140, 280, 800, 72, 5);

  context.fillStyle = coral;
  context.font = "900 34px Malgun Gothic, sans-serif";
  wrapText(context, story.impactMetric, 140, 720, 760, 44, 2);

  context.fillStyle = "rgba(255, 243, 211, 0.86)";
  context.font = "700 26px Malgun Gothic, sans-serif";
  wrapText(context, story.title, 140, 840, 760, 38, 2);
  drawFooter(context, story.owner, gold, cream);
}

function drawBeforeAfter(context, story, template, image) {
  const [paper, forest, blue, gold] = template.palette;
  drawGradient(context, paper, "#f8f2e6");
  drawPillText(context, "Before & After", 74, 78, "#fff7e4", forest);
  drawHeadline(context, story.title, 74, 170, 910, forest, 52);

  drawRoundedRect(context, 74, 390, 440, 410, 34, "rgba(33, 76, 54, 0.1)");
  drawRoundedRect(context, 566, 390, 440, 410, 34, "rgba(63, 112, 214, 0.12)");
  drawPillText(context, "Before", 112, 430, "#fff7e4", "#66736c");
  drawPillText(context, "After", 604, 430, "#fff7e4", blue);

  context.fillStyle = forest;
  context.font = "800 32px Malgun Gothic, sans-serif";
  wrapText(context, story.summary, 112, 535, 330, 46, 4);
  context.fillStyle = blue;
  wrapText(context, story.impactMetric, 604, 535, 330, 48, 4);

  drawImagePanel(context, image, 742, 78, 240, 240, 40);
  drawMetricBlock(context, story.desiredMessage, 74, 848, gold, forest);
  drawFooter(context, `${story.division} · ${story.owner}`, gold, forest);
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
  context.font = "900 24px Malgun Gothic, sans-serif";
  const metrics = context.measureText(text);
  const width = metrics.width + 42;
  drawRoundedRect(context, x, y, width, 48, 24, fillColor);
  context.fillStyle = textColor;
  context.fillText(text, x + 21, y + 32);
  context.restore();
}

function drawHeadline(context, text, x, y, maxWidth, color, size) {
  context.fillStyle = color;
  context.font = `900 ${size}px Malgun Gothic, sans-serif`;
  wrapText(context, text, x, y, maxWidth, size * 1.18, 5);
}

function drawMetricBlock(context, text, x, y, background, color) {
  drawRoundedRect(context, x, y, 830, 116, 30, background);
  context.fillStyle = color;
  context.font = "900 34px Malgun Gothic, sans-serif";
  wrapText(context, text, x + 34, y + 46, 760, 42, 2);
}

function drawFooter(context, text, accent, color) {
  drawRoundedRect(context, 74, 984, 932, 4, 2, accent);
  context.fillStyle = color;
  context.font = "800 22px Malgun Gothic, sans-serif";
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
  context.font = "900 26px Malgun Gothic, sans-serif";
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
