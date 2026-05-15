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

