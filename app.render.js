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

