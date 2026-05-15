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
    const validation = validateStoryDetailForm(event.currentTarget);

    if (!validation.isValid) {
      alert(validation.missingLabels.map((label) => `‘${label}’ 칸을 입력하지 않으셨습니다.`).join("\n"));
      validation.firstInvalid?.focus();
      return;
    }

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

function validateStoryDetailForm(form) {
  const missingLabels = [];
  let firstInvalid = null;

  STORY_DETAIL_REQUIRED_FIELDS.forEach(({ name, label }) => {
    const field = form.elements[name];
    const isMissing = !field || !field.value.trim();
    field?.classList.toggle("is-invalid", isMissing);

    if (isMissing) {
      missingLabels.push(label);
      firstInvalid ||= field;
    }
  });

  return {
    isValid: missingLabels.length === 0,
    missingLabels,
    firstInvalid,
  };
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
