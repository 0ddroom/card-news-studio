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
  $("#deletePassword").value = "sample1234";
  clearValidationAlert();
}

