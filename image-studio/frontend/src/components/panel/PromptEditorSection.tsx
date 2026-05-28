import { lazy, Suspense } from "react";
import { ListPlus, Sparkles } from "lucide-react";
import { submitShortcutLabel } from "../../platform";
import { usePlatform } from "../../platform/context";
import { useStudioStore } from "../../state/studioStore";

const PromptPopover = lazy(() => import("./PromptPopover").then((m) => ({ default: m.PromptPopover })));

export function PromptEditorSection({
  mode,
  prompt,
  promptLen,
  promptPopover,
  setPromptPopover,
  optimizeReady,
  isOptimizingPrompt,
  apiMode,
  noPromptRevision,
  onSetPrompt,
  onToggleNoPromptRevision,
  onOptimizePrompt,
}: {
  mode: "generate" | "edit";
  prompt: string;
  promptLen: number;
  promptPopover: boolean;
  setPromptPopover: (open: boolean | ((v: boolean) => boolean)) => void;
  optimizeReady: boolean;
  isOptimizingPrompt: boolean;
  apiMode: "responses" | "images";
  noPromptRevision: boolean;
  onSetPrompt: (value: string) => void;
  onToggleNoPromptRevision: (checked: boolean) => void;
  onOptimizePrompt: () => void;
}) {
  const { isMac, usesFluentUI } = usePlatform();

  return (
    <section className={`platform-card relative overflow-visible ${promptPopover ? "z-30" : "z-0"} ${isMac ? "p-5" : "p-4"}`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
          {mode === "edit" ? "修改要求" : "提示词"}
        </label>
        <span className={`font-mono-token tabular-nums ${isMac ? "rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] dark:bg-white/[0.06]" : ""} text-zinc-400 dark:text-zinc-500`}>{promptLen}</span>
      </div>
      {isMac && (
        <p className="mb-3 text-[12px] leading-6 text-zinc-500 dark:text-zinc-400">
          建议把主体、场景、镜头、材质和光照拆成短句，模板会追加到当前内容末尾。
        </p>
      )}
      <textarea
        value={prompt}
        placeholder={mode === "edit"
          ? "主体保持不变\n把背景换成夜空，补一圈冷色边缘光，保留原有构图"
          : "主体 / 场景 / 光照 / 镜头 / 风格\n例如：一只橘猫坐在雨夜窗边，电影级侧逆光，50mm，浅景深，写实摄影"}
        onChange={(e) => onSetPrompt(e.target.value)}
        className={`focus-ring w-full resize-y border border-black/[0.08] bg-[var(--surface)] text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500 ${usesFluentUI ? "min-h-[124px] rounded-[10px] px-3.5 py-3 text-[14px] leading-[1.65]" : isMac ? "min-h-[176px] rounded-[18px] px-4 py-3.5 text-[15px] leading-[1.72]" : "min-h-[124px] rounded-[14px] px-3.5 py-3 text-[14px] leading-[1.65]"}`}
      />
      <div className={`mt-3 ${isMac ? "flex flex-col gap-3" : "flex gap-2.5 items-center justify-between"}`}>
        <div className={`${isMac ? "grid grid-cols-2 gap-2.5" : "flex gap-2.5 items-center"}`}>
          <div className={`relative ${isMac ? "min-w-0" : "shrink-0"}`}>
            <button
              type="button"
              onClick={() => setPromptPopover((v) => !v)}
              title="prompt 模板与历史"
              className={`platform-pill inline-flex items-center justify-center gap-1.5 ${isMac ? "min-h-[38px] w-full px-3 py-2 text-[11px] font-medium" : "px-3 py-1.5 text-[10px]"} transition-colors ${
                promptPopover
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20"
                  : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              } ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              <ListPlus className="w-3 h-3" /> 模板 / 历史
            </button>
            {promptPopover && (
              <Suspense fallback={null}>
                <PromptPopover
                  onClose={() => setPromptPopover(false)}
                  onPick={(text) => {
                    const current = useStudioStore.getState().prompt;
                    onSetPrompt(current ? `${current}\n${text}` : text);
                  }}
                />
              </Suspense>
            )}
          </div>
          <button
            type="button"
            onClick={onOptimizePrompt}
            disabled={!optimizeReady || isOptimizingPrompt}
            className={`platform-pill inline-flex items-center justify-center gap-1.5 ${isMac ? "min-h-[38px] w-full px-3 py-2 text-[11px] font-medium" : "px-3 py-1.5 text-[10px]"} transition-colors ${
              isOptimizingPrompt
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            } disabled:cursor-not-allowed disabled:opacity-50 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            title="调用 Responses/llmapi 优化当前提示词"
          >
            <Sparkles className={`w-3 h-3 ${isOptimizingPrompt ? "animate-pulse" : ""}`} />
            {isOptimizingPrompt ? "优化中..." : "LLM 优化"}
          </button>
        </div>
        <div className={`flex ${isMac ? "items-center justify-between gap-2.5" : "ml-auto items-center gap-2.5"}`}>
          <label
            title={apiMode === "responses"
              ? "勾上后 Responses API 文本模型不会优化你的 prompt,逐字传给图像模型"
              : "Images API 形态本就不优化 prompt,此开关无效"}
            className={`platform-pill inline-flex min-w-0 items-center gap-1.5 ${isMac ? "min-h-[36px] px-3.5 py-2 text-[12px] font-medium" : "px-3 py-1.5 text-[10px]"} ring-1 transition-colors ${
              noPromptRevision
                ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[color:var(--accent)]/20"
                : "text-zinc-500 dark:text-zinc-400 ring-transparent hover:ring-black/[0.08] dark:hover:ring-white/[0.06]"
            } ${apiMode !== "responses" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
          >
            <input
              type="checkbox"
              checked={noPromptRevision}
              disabled={apiMode !== "responses"}
              onChange={(e) => onToggleNoPromptRevision(e.target.checked)}
              className="sr-only peer"
            />
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${noPromptRevision ? "border-[var(--accent)] bg-[var(--accent)]" : "border-zinc-400 dark:border-zinc-600"}`}>
              {noPromptRevision && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
            </span>
            不优化提示词
          </label>
          <span className={`${isMac ? "ml-auto rounded-full bg-black/[0.03] px-2.5 py-1.5 text-[11px] dark:bg-white/[0.04]" : "text-[10px]"} text-zinc-400 dark:text-zinc-500`}>{submitShortcutLabel}</span>
        </div>
      </div>
    </section>
  );
}
