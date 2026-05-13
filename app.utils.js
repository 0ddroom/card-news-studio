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
