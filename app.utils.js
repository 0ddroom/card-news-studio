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
