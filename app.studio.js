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

