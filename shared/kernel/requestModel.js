export const DEFAULT_TEXT_MODEL = "gpt-5.5";
export const DEFAULT_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_SIZE = "1024x1024";
export const DEFAULT_QUALITY = "auto";
export const DEFAULT_OUTPUT_FORMAT = "png";
export const MAX_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = 15_000;
export const STATUS_INTERVAL_MS = 10_000;

export function normalizeBaseURL(raw) {
  return String(raw || "").trim().replace(/\/+$/, "");
}

export function normalizeAPIMode(apiMode) {
  return apiMode === "images" ? "images" : "responses";
}

export function normalizeTextModel(modelID) {
  return String(modelID || "").trim() || DEFAULT_TEXT_MODEL;
}

export function normalizeImageModel(modelID) {
  return String(modelID || "").trim() || DEFAULT_IMAGE_MODEL;
}

export function fileNameFromPath(path) {
  if (!path) return "image.png";
  return String(path).split(/[\\/]/).pop() || "image.png";
}

export function buildResponsesPayload(payload, sourceDataURLs) {
  const size = payload.size || DEFAULT_SIZE;
  const quality = payload.quality || DEFAULT_QUALITY;
  const outputFormat = payload.outputFormat || DEFAULT_OUTPUT_FORMAT;
  const content = [{ type: "input_text", text: payload.prompt }];
  for (const dataURL of sourceDataURLs) {
    content.push({ type: "input_image", image_url: dataURL });
  }
  const tool = {
    type: "image_generation",
    model: normalizeImageModel(payload.imageModelID),
    action: sourceDataURLs.length > 0 ? "edit" : "generate",
    size,
    quality,
    output_format: outputFormat,
    moderation: "low",
    partial_images: 0,
  };
  if (payload.maskB64) tool.mask = payload.maskB64;
  if (payload.seed) tool.seed = payload.seed;
  if (String(payload.negativePrompt || "").trim()) tool.negative_prompt = String(payload.negativePrompt).trim();

  const request = {
    model: normalizeTextModel(payload.textModelID),
    input: [{ role: "user", content }],
    tools: [tool],
    tool_choice: { type: "image_generation" },
    reasoning: { effort: "xhigh" },
    store: false,
    stream: true,
  };
  if (payload.noPromptRevision) {
    request.instructions = "You are a tool runner. Pass the user prompt to image_generation VERBATIM. DO NOT rewrite, expand, polish, or revise it in any way. Use the exact text the user gave.";
  }
  return request;
}

export function buildPromptOptimizePayload(input, sourceDataURLs) {
  let instruction = "Rewrite the user's image prompt into a clearer, more detailed prompt for image generation. Keep the meaning, preserve the requested subject, and only return the improved prompt text. Do not add explanations, labels, markdown, or quotes.";
  if (String(input.mode || "").trim() === "edit") {
    instruction += " Treat any attached images as reference context and preserve edit intent.";
  }
  const content = [{ type: "input_text", text: `Original prompt:\n${String(input.prompt || "").trim()}` }];
  for (const dataURL of sourceDataURLs) {
    content.push({ type: "input_image", image_url: dataURL });
  }
  return {
    model: normalizeTextModel(input.textModelID),
    instructions: instruction,
    input: [{ role: "user", content }],
    reasoning: { effort: "low" },
    store: false,
  };
}

export function retryableMarkers() {
  return [
    "error code 524",
    "524: a timeout occurred",
    "error code 504",
    "gateway time-out",
    "service temporarily unavailable",
    "origin_gateway_timeout",
  ];
}

export function isRetryableRaw(raw) {
  const text = String(raw || "").trim();
  const lower = text.toLowerCase();
  if (retryableMarkers().some((marker) => lower.includes(marker))) return true;
  try {
    const data = JSON.parse(text);
    if (data?.retryable === true) return true;
    if ([502, 503, 504, 524].includes(Number(data?.status))) return true;
    const err = data?.error;
    if (err && typeof err === "object") {
      const message = String(err.message || "").toLowerCase();
      const type = String(err.type || "").toLowerCase();
      if (message.includes("temporarily unavailable")) return true;
      if (type === "api_error" || type === "server_error") return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function describeAPIError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const type = String(error?.type || "");

  switch (code.toLowerCase()) {
    case "moderation_blocked":
      return "🚫 上游内容审核拦截 · 生成被拒";
    case "content_policy_violation":
      return "🚫 上游内容政策拦截 (content_policy_violation)";
    case "rate_limit_exceeded":
      return `⏱ 上游限速 (rate_limit_exceeded)\n\n${message}`;
    case "insufficient_quota":
    case "billing_hard_limit_reached":
      return `💳 上游账户额度不足\n\n${message}`;
    case "model_not_found":
      return `🤷 上游找不到指定模型\n\n${message}`;
    default:
      break;
  }

  const parts = [];
  if (message) parts.push(message);
  const tail = [];
  if (code) tail.push(`code: ${code}`);
  if (type) tail.push(`type: ${type}`);
  if (tail.length > 0) parts.push(`(${tail.join(", ")})`);
  return parts.length > 0 ? `接口返回错误:${parts.join(" ")}` : "接口返回错误";
}

export function describeProblem(raw) {
  const text = String(raw || "").trim();
  if (!text) return "接口返回为空。";
  const lower = text.toLowerCase();
  if (lower.includes("error code 524") || lower.includes("524: a timeout occurred")) {
    return "Cloudflare 524:源站在超时时间内没有返回有效响应。";
  }
  if (lower.includes("error code 504") || lower.includes("gateway time-out")) {
    return "Cloudflare 504:源站网关超时。";
  }

  try {
    const data = JSON.parse(text);
    if (data?.error && typeof data.error === "object") return describeAPIError(data.error);
    if (typeof data?.message === "string" && data.message.trim()) return `接口返回消息:${data.message.trim()}`;
    if (data?.status && [502, 503, 504, 524].includes(Number(data.status))) {
      return `接口返回 ${data.status}:上游服务超时。`;
    }
  } catch {
    // ignore
  }

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload);
      if (event?.error && typeof event.error === "object") return describeAPIError(event.error);
      if (event?.response?.error && typeof event.response.error === "object") return describeAPIError(event.response.error);
    } catch {
      // ignore
    }
  }
  return "接口已返回内容,但没有发现 image_generation_call.result。";
}

