import {
  base64ToBlob,
  blobToBase64,
  dataURLFromBase64,
  detectImageMimeTypeFromBase64,
  guessImageMimeTypeFromName,
  imageExtensionForMimeType,
} from "./images.ts";

type VirtualImageRecord = {
  path: string;
  name: string;
  size: number;
  imageB64: string;
  mimeType: string;
};

type VirtualTextRecord = {
  path: string;
  text: string;
  mimeType: string;
};

type ImportedImageRecord = {
  path: string;
  imageB64: string;
};

type SelectedImageRecord = {
  path: string;
  size: number;
  imageB64?: string;
};

const VIRTUAL_IMAGE_PREFIX = "memory://image/";
const VIRTUAL_TEXT_PREFIX = "memory://text/";

const virtualImages = new Map<string, VirtualImageRecord>();
const virtualTexts = new Map<string, VirtualTextRecord>();

function uniqueId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeName(name: string, fallbackBase: string): string {
  const trimmed = name.trim();
  if (!trimmed) return fallbackBase;
  return trimmed.replace(/[^\w.\-\u4e00-\u9fff]+/g, "-");
}

function base64SizeBytes(b64: string): number {
  const clean = b64.replace(/=+$/, "");
  return Math.floor((clean.length * 3) / 4);
}

function buildVirtualPath(prefix: string, name: string, mimeType: string): string {
  const stem = safeName(name, `image.${imageExtensionForMimeType(mimeType)}`);
  const ext = stem.includes(".") ? "" : `.${imageExtensionForMimeType(mimeType)}`;
  return `${prefix}${uniqueId("asset")}-${stem}${ext}`;
}

export function isVirtualPath(path: string | null | undefined): boolean {
  const value = (path ?? "").trim();
  return value.startsWith(VIRTUAL_IMAGE_PREFIX) || value.startsWith(VIRTUAL_TEXT_PREFIX);
}

export function getVirtualImageRecord(path: string): VirtualImageRecord | null {
  return virtualImages.get(path) ?? null;
}

export function registerVirtualImage(input: {
  imageB64: string;
  suggestedName?: string;
  mimeType?: string | null;
  path?: string;
}): ImportedImageRecord {
  const mimeType = input.mimeType
    || detectImageMimeTypeFromBase64(input.imageB64)
    || guessImageMimeTypeFromName(input.suggestedName)
    || "image/png";
  const suggestedName = safeName(
    input.suggestedName ?? `image.${imageExtensionForMimeType(mimeType)}`,
    `image.${imageExtensionForMimeType(mimeType)}`,
  );
  const path = input.path && input.path.startsWith(VIRTUAL_IMAGE_PREFIX)
    ? input.path
    : buildVirtualPath(VIRTUAL_IMAGE_PREFIX, suggestedName, mimeType);
  virtualImages.set(path, {
    path,
    name: suggestedName,
    size: base64SizeBytes(input.imageB64),
    imageB64: input.imageB64,
    mimeType,
  });
  return { path, imageB64: input.imageB64 };
}

export function readVirtualImageAsBase64(path: string): string {
  const record = virtualImages.get(path);
  if (!record) throw new Error(`虚拟图片不存在:${path}`);
  return record.imageB64;
}

export function registerVirtualText(
  text: string,
  suggestedName = "raw-response.txt",
  mimeType = "text/plain;charset=utf-8",
): string {
  const path = buildVirtualPath(VIRTUAL_TEXT_PREFIX, suggestedName, "image/png").replace(/\.png$/, ".txt");
  virtualTexts.set(path, { path, text, mimeType });
  return path;
}

export function readVirtualText(path: string): string {
  const record = virtualTexts.get(path);
  if (!record) throw new Error(`虚拟文本不存在:${path}`);
  return record.text;
}

export async function openVirtualPath(path: string): Promise<void> {
  const image = virtualImages.get(path);
  if (image) {
    const url = URL.createObjectURL(base64ToBlob(image.imageB64, image.mimeType));
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      const a = document.createElement("a");
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
    return;
  }

  const text = virtualTexts.get(path);
  if (text) {
    const url = URL.createObjectURL(new Blob([text.text], { type: text.mimeType }));
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      const a = document.createElement("a");
      a.href = url;
      a.download = path.split("/").pop() || "raw-response.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
    return;
  }

  throw new Error(`虚拟资源不存在:${path}`);
}

export async function openImageDialogFallback(): Promise<SelectedImageRecord> {
  if (typeof document === "undefined") {
    throw new Error("当前环境不支持浏览器文件选择");
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.addEventListener("change", async () => {
      try {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve({ path: "", size: 0, imageB64: "" });
          return;
        }
        const imageB64 = await blobToBase64(file);
        const imported = registerVirtualImage({
          imageB64,
          suggestedName: file.name,
          mimeType: file.type || guessImageMimeTypeFromName(file.name) || "image/png",
        });
        cleanup();
        resolve({
          path: imported.path,
          size: file.size,
          imageB64,
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, { once: true });
    input.click();
  });
}

async function loadRecordBitmap(path: string): Promise<{ record: VirtualImageRecord; bitmap: ImageBitmap }> {
  const record = getVirtualImageRecord(path);
  if (!record) throw new Error(`虚拟图片不存在:${path}`);
  const bitmap = await createImageBitmap(base64ToBlob(record.imageB64, record.mimeType));
  return { record, bitmap };
}

async function canvasToRegisteredImage(
  canvas: HTMLCanvasElement,
  sourceRecord: VirtualImageRecord,
  suggestedName: string,
): Promise<ImportedImageRecord> {
  const preferredMime = sourceRecord.mimeType || "image/png";
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (out) => resolve(out ?? base64ToBlob(sourceRecord.imageB64, sourceRecord.mimeType)),
      preferredMime,
      preferredMime === "image/jpeg" ? 0.92 : undefined,
    );
  });
  const imageB64 = await blobToBase64(blob);
  return registerVirtualImage({
    imageB64,
    suggestedName,
    mimeType: blob.type || preferredMime,
  });
}

export async function rotateVirtualImage(path: string, degrees: number): Promise<ImportedImageRecord> {
  const { record, bitmap } = await loadRecordBitmap(path);
  try {
    const normalized = ((degrees % 360) + 360) % 360;
    const swap = normalized === 90 || normalized === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? bitmap.height : bitmap.width;
    canvas.height = swap ? bitmap.width : bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图像画布");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normalized * Math.PI) / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    return canvasToRegisteredImage(canvas, record, record.name);
  } finally {
    bitmap.close();
  }
}

export async function flipVirtualImage(path: string, horizontal: boolean): Promise<ImportedImageRecord> {
  const { record, bitmap } = await loadRecordBitmap(path);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图像画布");
    ctx.translate(horizontal ? canvas.width : 0, horizontal ? 0 : canvas.height);
    ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
    ctx.drawImage(bitmap, 0, 0);
    return canvasToRegisteredImage(canvas, record, record.name);
  } finally {
    bitmap.close();
  }
}

export async function cropVirtualImage(
  path: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<ImportedImageRecord> {
  const { record, bitmap } = await loadRecordBitmap(path);
  try {
    const left = Math.max(0, Math.min(bitmap.width, Math.round(x)));
    const top = Math.max(0, Math.min(bitmap.height, Math.round(y)));
    const cropWidth = Math.max(1, Math.min(bitmap.width - left, Math.round(width)));
    const cropHeight = Math.max(1, Math.min(bitmap.height - top, Math.round(height)));
    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建图像画布");
    ctx.drawImage(bitmap, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return canvasToRegisteredImage(canvas, record, record.name);
  } finally {
    bitmap.close();
  }
}

export async function sourceToDataURL(source: {
  path?: string;
  name?: string;
  mimeType?: string | null;
  imageB64?: string | null;
  imageBlob?: Blob | null;
} | null | undefined): Promise<string> {
  if (!source) return "";
  let imageB64 = source.imageB64?.trim() ?? "";
  let mimeType = source.mimeType
    || guessImageMimeTypeFromName(source.name)
    || guessImageMimeTypeFromName(source.path)
    || null;
  if (!imageB64 && source.imageBlob) {
    imageB64 = await blobToBase64(source.imageBlob);
    mimeType = source.imageBlob.type || mimeType;
  }
  if (!imageB64 && source.path && source.path.startsWith(VIRTUAL_IMAGE_PREFIX)) {
    const record = getVirtualImageRecord(source.path);
    if (record) {
      imageB64 = record.imageB64;
      mimeType = record.mimeType;
    }
  }
  if (!imageB64) return "";
  return dataURLFromBase64(imageB64, mimeType);
}
