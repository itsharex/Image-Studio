import { lazy, Suspense, useState } from "react";
import {
  Dices, FileText, ImagePlus, ListPlus, RotateCw, Settings, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import { OpenFile } from "../runtime/host";
import {
  Mode, OutputFormatValue, OUTPUT_FORMAT_OPTIONS, QualityValue,
} from "../../types/domain";
import { ASPECT_OPTIONS, QUALITY_TIERS, STYLE_CHIPS } from "../../components/panel/panelOptions";
import { AndroidModeSwitch } from "./AndroidModeSwitch";
import { vibrateForPlatform } from "./bridge";

const PromptPopover = lazy(() => import("../../components/panel/PromptPopover").then((m) => ({ default: m.PromptPopover })));

export function AndroidPhoneComposePanel() {
  const {
    apiKey, mode, prompt, negativePrompt, size, quality, seed, styleTag,
    outputFormat, batchCount, sources, currentImage, errorMessage, errorRawPath,
    isRunning, lastPayload, isOptimizingPrompt, apiMode, baseURL, profiles,
    noPromptRevision, setField, clearError, pushToast, selectSourceImage,
    removeSource, clearSources, openUpstreamConfig, submit, cancel, retryLast, optimizePrompt,
  } = useStudioStore();
  const [promptPopover, setPromptPopover] = useState(false);
  const [parametersOpen, setParametersOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const promptLen = prompt.length;
  const needsUpstreamSetup = !apiKey.trim() || !baseURL.trim();
  const hasUsableResponsesProfile = profiles.some(
    (p) => p.apiMode === "responses" && p.baseURL.trim(),
  );
  const optimizeReady = !!(
    prompt.trim() && (hasUsableResponsesProfile || (apiKey.trim() && baseURL.trim()))
  );
  const activeStyleLabel = STYLE_CHIPS.find((item) => item.id === styleTag)?.label ?? "默认风格";
  const activeAspectLabel = ASPECT_OPTIONS.find((item) => item.value === size)?.label ?? size;
  const activeQualityLabel = QUALITY_TIERS.find((item) => item.value === quality)?.label ?? quality;
  const editSourceLabel = sources.length > 0 ? `${sources.length} 张已添加` : currentImage?.savedPath ? "使用当前画板" : "未添加";

  const handleModeChange = (next: Mode) => {
    vibrateForPlatform(12);
    setField("mode", next);
  };

  const handleSubmit = () => {
    vibrateForPlatform(15);
    submit();
  };

  const handleOptimize = () => {
    vibrateForPlatform(10);
    optimizePrompt();
  };

  const handleSelectSource = () => {
    vibrateForPlatform(8);
    selectSourceImage();
  };

  const toggleParameters = () => {
    vibrateForPlatform(8);
    setParametersOpen((current) => {
      const next = !current;
      if (next) setAdvancedOpen(false);
      return next;
    });
  };

  const toggleAdvanced = () => {
    vibrateForPlatform(8);
    setAdvancedOpen((current) => {
      const next = !current;
      if (next) setParametersOpen(false);
      return next;
    });
  };

  return (
    <div className="control-panel android-phone-compose flex w-full flex-col gap-3 overflow-y-auto border-r-0 bg-[var(--bg)] px-3 py-3" style={{ paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)", paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)" }}>
      {errorMessage ? (
        <section className="platform-card border border-red-500/18 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
          <div className="flex items-start gap-2">
            <div className="flex-1 whitespace-pre-wrap leading-relaxed">{errorMessage}</div>
            <button
              type="button"
              onClick={clearError}
              className="rounded-full p-1 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              title="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {(lastPayload && !isRunning) || errorRawPath ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {lastPayload && !isRunning ? (
                <button
                  type="button"
                  onClick={retryLast}
                  className="platform-pill inline-flex items-center gap-1 bg-red-500/15 px-2.5 py-1 text-[11px] transition-colors hover:bg-red-500/25"
                >
                  <RotateCw className="h-3 w-3" /> 重试
                </button>
              ) : null}
              {errorRawPath ? (
                <button
                  type="button"
                  onClick={() => OpenFile(errorRawPath).catch((e: any) => pushToast(`无法打开日志:${e?.message ?? e}`, "error"))}
                  className="platform-pill inline-flex items-center gap-1 px-2.5 py-1 text-[11px] ring-1 ring-red-500/30 transition-colors hover:bg-red-500/10"
                  title={errorRawPath}
                >
                  <FileText className="h-3 w-3" /> 查看日志
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {needsUpstreamSetup ? (
        <section className="platform-card android-phone-hero border border-[color:var(--accent)]/14 bg-[var(--accent-soft)] p-4">
          <div className="flex items-start gap-3">
            <div className="android-phone-hero-icon">
              <Settings className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="android-phone-kicker">启动前准备</div>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                先接入可用上游
              </h2>
              <p className="mt-2 text-[12px] leading-6 text-zinc-600 dark:text-zinc-300">
                保存中转站地址和 API Key 后，这里会切换成完整的移动端创作页。
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openUpstreamConfig("app")}
                  className="liquid-primary-button inline-flex min-h-[42px] items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white"
                >
                  <Settings className="h-3.5 w-3.5" /> 配置上游
                </button>
                <button
                  type="button"
                  onClick={() => openUpstreamConfig("app")}
                  className="platform-action-btn inline-flex min-h-[42px] items-center gap-1.5 border border-[color:var(--accent)]/20 bg-white/70 px-3 py-2 text-[12px] text-[var(--accent)] dark:bg-white/[0.05]"
                >
                  <Sparkles className="h-3.5 w-3.5" /> 去配置
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`platform-card android-phone-prompt ${needsUpstreamSetup ? "" : "android-phone-compose-sheet"} relative overflow-visible ${promptPopover ? "z-30" : "z-0"} p-4`}>
        {!needsUpstreamSetup ? (
          <div className="android-phone-sheet-header">
            <div className="android-phone-hero-top">
              <div className="min-w-0">
                <div className="android-phone-kicker">{mode === "edit" ? "图生图工作流" : "文生图工作流"}</div>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                  {mode === "edit" ? "说明修改目标" : "描述画面"}
                </h2>
              </div>
              <div className="android-phone-mode-switch android-phone-mode-switch-compact">
                <AndroidModeSwitch mode={mode} onChange={handleModeChange} variant="phone" />
              </div>
            </div>
            <p className="android-phone-hero-copy mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-300">
              {mode === "edit"
                ? "先写改动重点，再补参考图和参数。"
                : "先写主体和镜头，参数在下面补。"}
            </p>
          </div>
        ) : null}
        <div className="android-phone-prompt-head">
          <label className="android-phone-kicker">{mode === "edit" ? "修改要求" : "提示词"}</label>
          <span className="font-mono-token text-[11px] text-zinc-400 dark:text-zinc-500">{promptLen}</span>
        </div>
        <textarea
          value={prompt}
          placeholder={mode === "edit"
            ? "描述要修改的内容，例如换背景、改光线"
            : "描述主体、场景、光线、风格和镜头"}
          onChange={(e) => setField("prompt", e.target.value)}
          className="android-phone-prompt-input focus-ring"
        />
        <div className="android-phone-action-row">
          <div className="android-phone-action-item relative">
            <button
              type="button"
              onClick={() => { vibrateForPlatform(8); setPromptPopover((v) => !v); }}
              className={`platform-pill android-phone-action-pill inline-flex min-h-[38px] items-center gap-1.5 px-3 text-[11px] ${
                promptPopover
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20"
                  : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              }`}
              title="prompt 模板与历史"
            >
              <ListPlus className="h-3.5 w-3.5" /> 模板
            </button>
            {promptPopover ? (
              <Suspense fallback={null}>
                <PromptPopover
                  onClose={() => setPromptPopover(false)}
                  onPick={(text) => {
                    const current = useStudioStore.getState().prompt;
                    setField("prompt", current ? `${current}\n${text}` : text);
                  }}
                />
              </Suspense>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={!optimizeReady || isOptimizingPrompt}
            className={`platform-pill android-phone-action-pill inline-flex min-h-[38px] items-center gap-1.5 px-3 text-[11px] ${
              isOptimizingPrompt
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isOptimizingPrompt ? "animate-pulse" : ""}`} />
            {isOptimizingPrompt ? "优化中..." : "LLM 优化"}
          </button>
        </div>
      </section>

      {!needsUpstreamSetup && !advancedOpen ? (
        <section className="platform-card android-phone-summary-card p-4">
          <button
            type="button"
            onClick={toggleParameters}
            className="android-phone-summary-toggle"
          >
            <div className="min-w-0">
              <div className="android-phone-kicker">创作参数</div>
              <div className="mt-1 text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">
                {styleTag ? activeStyleLabel : "默认风格"}
              </div>
              <div className="android-phone-summary-meta mt-2">
                <span>{activeQualityLabel}</span>
                <span>{activeAspectLabel}</span>
                <span>{batchCount} 张</span>
              </div>
            </div>
            <span className="android-phone-summary-cta">{parametersOpen ? "收起" : "编辑"}</span>
          </button>
          {parametersOpen ? (
            <div className="mt-3 flex flex-col gap-4">
            <div className="android-phone-settings-group">
              <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">质量</div>
              <div className="android-phone-settings-list android-phone-quality-list">
                  {QUALITY_TIERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("quality", item.value as QualityValue); }}
                      className={`android-choice-chip android-phone-list-choice ${quality === item.value ? "active" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="android-phone-settings-group">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">风格</div>
                  {styleTag ? (
                    <button type="button" onClick={() => setField("styleTag", "")} className="text-[11px] text-[var(--accent)]">
                      清除
                    </button>
                  ) : null}
                </div>
                <div className="android-phone-settings-list">
                  {STYLE_CHIPS.map((item) => {
                    const active = styleTag === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { vibrateForPlatform(5); setField("styleTag", active ? "" : item.id); }}
                        className={`platform-chip android-phone-list-choice inline-flex min-h-[36px] items-center px-3 text-[12px] ${
                          active
                            ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20"
                            : "ring-1 ring-black/[0.08] text-zinc-600 hover:text-zinc-900 dark:ring-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="android-phone-settings-group">
                <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">比例</div>
                <div className="android-phone-settings-list android-phone-aspect-list">
                  {ASPECT_OPTIONS.map((item) => {
                    const active = size === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => { vibrateForPlatform(5); setField("size", item.value); }}
                        title={item.auto ? "让上游决定尺寸与比例" : item.value}
                        className={`android-aspect-card ${active ? "active" : ""}`}
                      >
                        <span
                          className={`block rounded-sm border-2 ${item.auto ? "border-dashed" : ""} ${active ? "border-[var(--accent)]" : "border-zinc-400 dark:border-zinc-600"}`}
                          style={{ width: item.w, height: item.h }}
                        />
                        <span className="mt-1 text-[10px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="android-phone-settings-group">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[12px] font-medium text-zinc-600 dark:text-zinc-300">出图张数</div>
                  <span className="font-mono-token text-[11px] text-zinc-400">{batchCount}x</span>
                </div>
                <div className="android-phone-settings-list android-phone-batch-list">
                  {[1, 2, 4, 6, 8, 9].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("batchCount", count); }}
                      className={`android-choice-chip android-phone-list-choice ${batchCount === count ? "active" : ""}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {mode === "edit" ? (
        <section className="platform-card android-phone-source-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="android-phone-kicker">源图片 / 参考图</div>
              <div className="mt-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{editSourceLabel}</div>
              <p className="mt-1 text-[12px] leading-6 text-zinc-500 dark:text-zinc-300">
                {sources.length > 0
                  ? "已添加显式参考图，可继续替换或补充更多图。"
                  : currentImage?.savedPath
                    ? "当前画板图片会作为隐式源图参与本次编辑。"
                    : "先添加一张图，或者从历史里挑一张结果继续编辑。"}
              </p>
            </div>
            <Wand2 className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
          </div>
          {sources.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {sources.map((source, index) => (
                <div key={source.path} className="flex items-center gap-2 rounded-[16px] border border-black/[0.06] bg-[var(--surface)] px-3 py-2 dark:border-white/[0.06]">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700 dark:text-zinc-300" title={source.path}>
                    {index + 1}. {source.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { vibrateForPlatform(5); removeSource(index); }}
                    title="移除"
                    className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSelectSource}
              className="platform-action-btn inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300"
            >
              <ImagePlus className="h-3.5 w-3.5" /> 添加图片
            </button>
            {sources.length > 0 ? (
              <button
                type="button"
                onClick={() => { vibrateForPlatform(5); clearSources(); }}
                className="platform-action-btn inline-flex min-h-[42px] items-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] text-zinc-500 transition-colors hover:border-red-400/40 hover:text-red-400 dark:border-white/[0.08]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!needsUpstreamSetup ? (
        <section>
          <button
            type="button"
            onClick={toggleAdvanced}
            className="platform-card android-phone-advanced-toggle flex w-full items-center justify-between px-4 py-3 text-left text-[12px] text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <span className="android-phone-kicker !mb-0">高级参数</span>
            <span className="text-[11px] opacity-70">{advancedOpen ? "收起 ▾" : "展开 ▸"}</span>
          </button>
          {advancedOpen ? (
            <div className="platform-card android-phone-advanced-card mt-2 flex flex-col gap-3 p-4">
              <button
                type="button"
                role="switch"
                aria-checked={noPromptRevision}
                onClick={() => {
                  if (apiMode !== "responses") return;
                  vibrateForPlatform(5);
                  setField("noPromptRevision", !noPromptRevision);
                }}
                className={`android-phone-advanced-switch inline-flex min-h-[40px] items-center justify-between gap-3 rounded-[16px] border px-3 py-2 text-[12px] transition-colors ${
                  noPromptRevision
                    ? "border-[color:var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-black/[0.08] bg-[var(--surface)] text-zinc-600 dark:border-white/[0.08] dark:text-zinc-300"
                } ${apiMode !== "responses" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                title={apiMode === "responses" ? "逐字把当前提示词发给图像模型" : "Images API 不支持该项"}
              >
                <span className="android-phone-advanced-copy min-w-0">
                  <span className="android-phone-advanced-title block font-medium">逐字提示词</span>
                  <span className="android-phone-advanced-caption mt-0.5 block text-[11px] opacity-75">关闭模型改写，按 prompt 原样出图。</span>
                </span>
                <span className={`android-phone-switch ${noPromptRevision ? "active" : ""}`}>
                  <span className={`android-phone-switch-knob ${noPromptRevision ? "active" : ""}`} />
                </span>
              </button>
              <div className="android-phone-advanced-section">
                <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">负向提示词</div>
                <textarea
                  value={negativePrompt}
                  placeholder="不希望出现的元素"
                  onChange={(e) => setField("negativePrompt", e.target.value)}
                  className="focus-ring min-h-[72px] w-full resize-none border border-black/[0.08] bg-[var(--surface)] px-4 py-3 text-[13px] leading-6 text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
              </div>
              <div className="android-phone-advanced-section">
                <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">输出格式</div>
                <div className="grid grid-cols-3 gap-2">
                  {OUTPUT_FORMAT_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("outputFormat", item.value as OutputFormatValue); }}
                      className={`android-choice-chip ${outputFormat === item.value ? "active" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
                  JPEG / WebP 更省空间，导出时 `jpeg` 会写成 `.jpg`。
                </p>
              </div>
              <div className="android-phone-advanced-section">
                <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">Seed</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed || ""}
                    placeholder="留空为随机"
                    min={0}
                    onChange={(e) => setField("seed", Number(e.target.value) || 0)}
                    className="focus-ring min-h-[42px] flex-1 border border-black/[0.08] bg-[var(--surface)] px-4 text-[13px] font-mono-token text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => { vibrateForPlatform(5); setField("seed", Math.floor(Math.random() * 2_000_000_000)); }}
                    title="随机 seed"
                    className="platform-action-btn inline-flex min-h-[42px] items-center justify-center border border-black/[0.08] px-3 text-zinc-600 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-400"
                  >
                    <Dices className="h-3.5 w-3.5" />
                  </button>
                  {seed > 0 ? (
                    <button
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("seed", 0); }}
                      title="清除"
                      className="platform-action-btn inline-flex min-h-[42px] items-center justify-center border border-black/[0.08] px-3 text-zinc-500 transition-colors hover:border-red-400/40 hover:text-red-400 dark:border-white/[0.08]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="android-phone-sticky-cta" style={{ paddingLeft: "calc(env(safe-area-inset-left, 0px) + 12px)", paddingRight: "calc(env(safe-area-inset-right, 0px) + 12px)" }}>
        {needsUpstreamSetup ? (
          <button
            type="button"
            onClick={() => { vibrateForPlatform(10); openUpstreamConfig("app"); }}
            className="liquid-primary-button h-[54px] w-full text-[15px] font-semibold text-white"
          >
            配置上游
          </button>
        ) : isRunning ? (
          <button
            type="button"
            onClick={() => { vibrateForPlatform(10); cancel(); }}
            className="h-[54px] w-full rounded-[20px] border border-red-500/30 bg-red-500/10 text-[15px] font-medium text-red-500 transition-colors hover:bg-red-500/16"
          >
            取消生成
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!apiKey || !prompt.trim()}
            className="liquid-primary-button h-[54px] w-full text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            {mode === "edit" ? "开始编辑" : "开始生成"}
          </button>
        )}
      </div>
    </div>
  );
}
