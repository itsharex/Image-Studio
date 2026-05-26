import { lazy, Suspense, useState } from "react";
import {
  Dices, ImagePlus, ListPlus, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import { ASPECT_OPTIONS, QUALITY_TIERS, STYLE_CHIPS } from "../../components/panel/panelOptions";
import type { Mode, OutputFormatValue, QualityValue } from "../../types/domain";
import { OUTPUT_FORMAT_OPTIONS } from "../../types/domain";
import { AndroidModeSwitch } from "./AndroidModeSwitch";
import { usePlatform } from "../context";
import { vibrateForPlatform } from "./bridge";

const PromptPopover = lazy(() => import("../../components/panel/PromptPopover").then((m) => ({ default: m.PromptPopover })));

export function AndroidPadComposePanel() {
  const {
    apiKey, mode, prompt, negativePrompt, size, quality, seed, styleTag, outputFormat,
    batchCount, sources, currentImage, isRunning, isOptimizingPrompt, apiMode, baseURL,
    profiles, noPromptRevision, setField, selectSourceImage, removeSource, clearSources,
    openUpstreamConfig, submit, cancel, optimizePrompt,
  } = useStudioStore();
  const [promptPopover, setPromptPopover] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [aspectOpen, setAspectOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const promptLen = prompt.length;
  const { androidWidthClass } = usePlatform();
  const isMediumPad = androidWidthClass === "medium";
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

  return (
    <div className="control-panel android-pad-compose flex w-full flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg)] px-4 py-4" style={{ paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)", paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)" }}>
      <section className="platform-card android-pad-overview p-4">
        <div className="android-pad-overview-row">
          <div className="android-pad-hero-copy">
            <div className="android-phone-kicker">{mode === "edit" ? "图生图工作流" : "文生图工作流"}</div>
            <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
              图像工作区
            </h2>
            <p className="mt-1 text-[12px] leading-6 text-zinc-500 dark:text-zinc-300">
              {isMediumPad
                ? "中等宽度下保留 rail 导航，把主要操作压在单列主区域里。"
                : "参数在左，画布在中，大屏下保持一眼可扫的多窗格结构。"}
            </p>
          </div>
          <div className="android-pad-mode-switch">
            <AndroidModeSwitch mode={mode} onChange={handleModeChange} variant="pad" />
          </div>
        </div>
        <div className="android-inline-metrics mt-3">
          <span>{mode === "edit" ? "图生图" : "文生图"}</span>
          <span>{activeQualityLabel}</span>
          <span>{activeAspectLabel}</span>
          <span>{batchCount} 张</span>
          {!needsUpstreamSetup ? <span>上游已连接</span> : <span>待配置上游</span>}
        </div>
      </section>

      <section className="platform-card android-pad-prompt p-5">
        <div className="android-pad-section-head">
          <label className="android-phone-kicker">{mode === "edit" ? "修改要求" : "提示词"}</label>
          <span className="font-mono-token text-[11px] text-zinc-400 dark:text-zinc-500">{promptLen}</span>
        </div>
        <textarea
          value={prompt}
          placeholder={mode === "edit"
            ? "描述如何修改源图，例如：把背景换成夜景、保留主体姿态"
            : "描述你想生成的画面内容、光线、构图、风格、镜头感"}
          onChange={(e) => setField("prompt", e.target.value)}
          className="focus-ring mt-3 min-h-[170px] w-full resize-none border border-black/[0.08] bg-[var(--surface)] px-4 py-3 text-[15px] leading-7 text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <div className="android-pad-action-row mt-3">
          <div className="relative android-pad-action-slot">
            <button
              type="button"
              onClick={() => { vibrateForPlatform(8); setPromptPopover((v) => !v); }}
              className={`platform-pill inline-flex min-h-[40px] items-center gap-1.5 px-3 text-[12px] ${
                promptPopover
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20"
                  : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              }`}
            >
              <ListPlus className="h-3.5 w-3.5" /> 模板 / 历史
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
            className={`platform-pill inline-flex min-h-[40px] items-center gap-1.5 px-3 text-[12px] ${
              isOptimizingPrompt
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isOptimizingPrompt ? "animate-pulse" : ""}`} />
            {isOptimizingPrompt ? "优化中..." : "LLM 优化"}
          </button>
          <label
            className={`platform-pill inline-flex min-h-[40px] items-center gap-1.5 px-3 text-[12px] ring-1 transition-colors ${
              noPromptRevision
                ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[color:var(--accent)]/20"
                : "text-zinc-500 ring-transparent hover:ring-black/[0.08] dark:text-zinc-400 dark:hover:ring-white/[0.06]"
            } ${apiMode !== "responses" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            title={apiMode === "responses" ? "逐字把当前提示词发给图像模型" : "Images API 不支持该项"}
          >
            <input
              type="checkbox"
              checked={noPromptRevision}
              disabled={apiMode !== "responses"}
              onChange={(e) => { vibrateForPlatform(5); setField("noPromptRevision", e.target.checked); }}
              className="sr-only"
            />
            <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${noPromptRevision ? "border-[var(--accent)] bg-[var(--accent)]" : "border-zinc-400 dark:border-zinc-600"}`}>
              {noPromptRevision ? <span className="h-1.5 w-1.5 rounded-sm bg-white" /> : null}
            </span>
            逐字提示词
          </label>
        </div>
      </section>

      <section className="platform-card android-pad-parameter-card p-5">
        <div className="android-pad-parameter-head">
          <div className="android-pad-parameter-copy">
            <div className="android-phone-kicker">创作参数</div>
            <div className="mt-1 text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">
              {activeStyleLabel}
            </div>
            <div className="android-phone-summary-chips mt-2">
              <span>{activeQualityLabel}</span>
              <span>{activeAspectLabel}</span>
              <span>{batchCount} 张</span>
            </div>
          </div>
          {needsUpstreamSetup ? (
            <button
              type="button"
              onClick={() => { vibrateForPlatform(8); openUpstreamConfig("app"); }}
              className="platform-action-btn inline-flex min-h-[42px] items-center gap-1.5 border border-[color:var(--accent)]/20 bg-white/70 px-3 py-2 text-[12px] text-[var(--accent)] dark:bg-white/[0.05]"
            >
              打开设置
            </button>
          ) : null}
        </div>

        {isMediumPad ? (
          <div className="mt-4 flex flex-col gap-3">
            <PaneBlock title="质量">
              <button
                type="button"
                onClick={() => { vibrateForPlatform(8); setQualityOpen((v) => !v); }}
                className="android-pad-medium-toggle"
              >
                <span>{activeQualityLabel}</span>
                <span>{qualityOpen ? "收起 ▾" : "展开 ▸"}</span>
              </button>
              {qualityOpen ? (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {QUALITY_TIERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("quality", item.value as QualityValue); }}
                      className={`android-choice-chip ${quality === item.value ? "active" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </PaneBlock>

            <PaneBlock title="出图张数">
              <button
                type="button"
                onClick={() => { vibrateForPlatform(8); setBatchOpen((v) => !v); }}
                className="android-pad-medium-toggle"
              >
                <span>{batchCount} 张</span>
                <span>{batchOpen ? "收起 ▾" : "展开 ▸"}</span>
              </button>
              {batchOpen ? (
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {[1, 2, 4, 6, 8, 9].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("batchCount", count); }}
                      className={`android-choice-chip ${batchCount === count ? "active" : ""}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              ) : null}
            </PaneBlock>

            <PaneBlock title="风格">
              <button
                type="button"
                onClick={() => { vibrateForPlatform(8); setStyleOpen((v) => !v); }}
                className="android-pad-medium-toggle"
              >
                <span>{activeStyleLabel}</span>
                <span>{styleOpen ? "收起 ▾" : "展开 ▸"}</span>
              </button>
              {styleOpen ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {STYLE_CHIPS.map((item) => {
                    const active = styleTag === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { vibrateForPlatform(5); setField("styleTag", active ? "" : item.id); }}
                        className={`platform-chip inline-flex min-h-[42px] items-center justify-center px-3 text-[12px] ${
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
              ) : null}
            </PaneBlock>

            <PaneBlock title="比例">
              <button
                type="button"
                onClick={() => { vibrateForPlatform(8); setAspectOpen((v) => !v); }}
                className="android-pad-medium-toggle"
              >
                <span>{activeAspectLabel}</span>
                <span>{aspectOpen ? "收起 ▾" : "展开 ▸"}</span>
              </button>
              {aspectOpen ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {ASPECT_OPTIONS.map((item) => {
                    const active = size === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => { vibrateForPlatform(5); setField("size", item.value); }}
                        className={`android-aspect-card ${active ? "active" : ""}`}
                        title={item.auto ? "让上游决定尺寸与比例" : item.value}
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
              ) : null}
            </PaneBlock>
          </div>
        ) : (
          <>
            <div className="android-pad-parameter-grid mt-4">
              <PaneBlock title="质量">
                <div className="grid grid-cols-2 gap-2">
                  {QUALITY_TIERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("quality", item.value as QualityValue); }}
                      className={`android-choice-chip ${quality === item.value ? "active" : ""}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </PaneBlock>

              <PaneBlock title="出图张数">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4, 6, 8, 9].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("batchCount", count); }}
                      className={`android-choice-chip ${batchCount === count ? "active" : ""}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </PaneBlock>
            </div>

            <PaneBlock title="风格" className="mt-3">
              <div className="flex flex-wrap gap-2">
                {STYLE_CHIPS.map((item) => {
                  const active = styleTag === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("styleTag", active ? "" : item.id); }}
                      className={`platform-chip inline-flex min-h-[38px] items-center px-3 text-[12px] ${
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
            </PaneBlock>

            <PaneBlock title="比例" className="mt-3">
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_OPTIONS.map((item) => {
                  const active = size === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => { vibrateForPlatform(5); setField("size", item.value); }}
                      className={`android-aspect-card ${active ? "active" : ""}`}
                      title={item.auto ? "让上游决定尺寸与比例" : item.value}
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
            </PaneBlock>
          </>
        )}
      </section>

      {mode === "edit" ? (
        <section className="platform-card p-5">
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
            < Wand2 className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
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

      <section>
        <button
          type="button"
          onClick={() => { vibrateForPlatform(8); setAdvancedOpen((v) => !v); }}
          className="platform-card android-pad-advanced-toggle flex w-full items-center justify-between px-4 py-3 text-left text-[12px] text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <span className="android-phone-kicker !mb-0">高级参数</span>
          <span className="text-[11px] opacity-70">{advancedOpen ? "收起 ▾" : "展开 ▸"}</span>
        </button>
        {advancedOpen ? (
          <div className="platform-card mt-2 flex flex-col gap-3 p-4">
            <textarea
              value={negativePrompt}
              placeholder="负向提示词，不希望出现的元素"
              onChange={(e) => setField("negativePrompt", e.target.value)}
              className="focus-ring min-h-[88px] w-full resize-none border border-black/[0.08] bg-[var(--surface)] px-4 py-3 text-[13px] leading-6 text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <input
                type="number"
                value={seed || ""}
                placeholder="Seed 留空为随机"
                min={0}
                onChange={(e) => setField("seed", Number(e.target.value) || 0)}
                className="focus-ring min-h-[42px] border border-black/[0.08] bg-[var(--surface)] px-4 text-[13px] font-mono-token text-zinc-900 placeholder:text-zinc-400 dark:border-white/[0.08] dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
              ) : <span />}
            </div>
            <div>
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
            </div>
          </div>
        ) : null}
      </section>

      <div className="android-pad-cta" style={{ paddingLeft: "calc(env(safe-area-inset-left, 0px) + 16px)", paddingRight: "calc(env(safe-area-inset-right, 0px) + 16px)" }}>
        {needsUpstreamSetup ? (
          <button
            type="button"
            onClick={() => { vibrateForPlatform(10); openUpstreamConfig("app"); }}
            className="liquid-primary-button h-[52px] w-full text-[15px] font-semibold text-white"
          >
            配置上游
          </button>
        ) : isRunning ? (
          <button
            type="button"
            onClick={() => { vibrateForPlatform(10); cancel(); }}
            className="h-[52px] w-full rounded-[20px] border border-red-500/30 bg-red-500/10 text-[15px] font-medium text-red-500 transition-colors hover:bg-red-500/16"
          >
            取消生成
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!apiKey || !prompt.trim()}
            className="liquid-primary-button h-[52px] w-full text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            {mode === "edit" ? "开始编辑" : "开始生成"}
          </button>
        )}
      </div>
    </div>
  );
}

function PaneBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">{title}</div>
      {children}
    </section>
  );
}
