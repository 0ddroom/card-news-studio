const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const recipients = ["indiheating@kyobobook.com", "kyj57@kyobobook.com"];
const subject = "'성공로그' 새 사례가 공유되었습니다!";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY is not configured" }, 500);
  }

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") || "성공로그 <onboarding@resend.dev>";
  const payload = await request.json().catch(() => ({}));
  const story = payload.story || {};
  const manageUrl = payload.manageUrl || Deno.env.get("SUCCESSLOG_MANAGE_URL") || "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html: buildHtml(story, manageUrl),
      text: buildText(story, manageUrl),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return jsonResponse({ error: "Failed to send email", details }, 502);
  }

  const result = await response.json().catch(() => ({}));
  return jsonResponse({ ok: true, result });
});

function buildHtml(story: Record<string, string>, manageUrl: string) {
  const rows = [
    ["본부/실", story.division],
    ["작성자 소속", story.owner],
    ["작성자 이름", story.email],
    ["제목", story.title],
    ["요약", story.summary],
  ];

  const bodyRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="width:120px;padding:10px 12px;text-align:left;color:#214c36;background:#edf4e6;border-bottom:1px solid #d9e5d2;">${escapeHtml(label)}</th>
          <td style="padding:10px 12px;color:#17211b;border-bottom:1px solid #e7dfd1;">${escapeHtml(value || "-")}</td>
        </tr>
      `,
    )
    .join("");

  const link = manageUrl
    ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(manageUrl)}" style="color:#214c36;font-weight:700;">관리용 링크 열기</a></p>`
    : "";

  return `
    <div style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.6;color:#17211b;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#214c36;">'성공로그' 새 사례가 공유되었습니다!</h1>
      <table style="width:100%;max-width:720px;border-collapse:collapse;border:1px solid #d9e5d2;background:#fffaf0;">
        ${bodyRows}
      </table>
      ${link}
    </div>
  `;
}

function buildText(story: Record<string, string>, manageUrl: string) {
  return [
    "'성공로그' 새 사례가 공유되었습니다!",
    "",
    `본부/실: ${story.division || "-"}`,
    `작성자 소속: ${story.owner || "-"}`,
    `작성자 이름: ${story.email || "-"}`,
    `제목: ${story.title || "-"}`,
    `요약: ${story.summary || "-"}`,
    `관리용 링크: ${manageUrl || "-"}`,
  ].join("\n");
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
