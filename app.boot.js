const STORAGE_KEYS = {
  stories: "cardNewsStudio.stories",
  cards: "cardNewsStudio.cards",
};

const appConfig = normalizeConfig(window.CARD_NEWS_STUDIO_CONFIG);
const sharedStorageEnabled = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);
let sharedStorageAvailable = sharedStorageEnabled;
const ADMIN_VIEW_KEY = "successl5g";
const STORY_DETAIL_REQUIRED_FIELDS = [
  { name: "reportMonth", label: "공유 월" },
  { name: "division", label: "본부/실" },
  { name: "owner", label: "작성자 소속" },
  { name: "email", label: "작성자 이름" },
  { name: "title", label: "성과/활동 제목" },
  { name: "period", label: "활동 기간" },
  { name: "participants", label: "참여 인원" },
  { name: "summary", label: "핵심 이야기" },
  { name: "evidence", label: "근거/에피소드" },
  { name: "desiredMessage", label: "강조 키워드/문구" },
];
const STORY_IMAGE_TARGET_BYTES = 3 * 1024 * 1024;
const STORY_IMAGE_MAX_DIMENSION = 2400;
const STORY_IMAGE_INITIAL_QUALITY = 0.92;
const STORY_IMAGE_MIN_QUALITY = 0.72;

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

const CURRENT_DIVISIONS = ["경영기획실", "경영지원실", "eBiz본부", "점포사업본부", "IT지원실", "정보보안실"];
const LEGACY_DIVISION_MAP = {
  경영관리실: "경영지원실",
  "인사/조직문화실": "경영기획실",
  영업본부: "점포사업본부",
  마케팅본부: "eBiz본부",
  제품본부: "eBiz본부",
  개발본부: "IT지원실",
  고객경험실: "eBiz본부",
  재무실: "경영지원실",
  전략기획실: "경영기획실",
};
const TEAM_BY_DIVISION = {
  경영기획실: "인사지원팀",
  경영지원실: "경영관리팀",
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
  currentMonthCount: $("#currentMonthCount"),
  topDivisionRankList: $("#topDivisionRankList"),
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

