import type { QualityValue, SizeValue } from "../../types/domain";

export const STYLE_CHIPS: { id: string; label: string }[] = [
  { id: "cyberpunk", label: "赛博朋克" },
  { id: "anime", label: "二次元" },
  { id: "illust", label: "插画" },
  { id: "3d", label: "3D 渲染" },
  { id: "chinese", label: "国风" },
];

// auto 不展示具体方框形状,留给上游决定。
export const ASPECT_OPTIONS: { value: SizeValue; label: string; w: number; h: number; auto?: boolean }[] = [
  { value: "auto", label: "Auto", w: 18, h: 18, auto: true },
  { value: "1024x1024", label: "1:1", w: 18, h: 18 },
  { value: "1024x1536", label: "2:3", w: 14, h: 20 },
  { value: "1152x2048", label: "9:16", w: 12, h: 22 },
  { value: "1536x1024", label: "3:2", w: 22, h: 14 },
  { value: "2048x1152", label: "16:9", w: 24, h: 13 },
];

export const QUALITY_TIERS: { value: QualityValue; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "1K" },
  { value: "medium", label: "2K" },
  { value: "high", label: "4K" },
];
