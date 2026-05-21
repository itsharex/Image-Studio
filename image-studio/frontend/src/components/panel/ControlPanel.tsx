import { useState } from "react";
import {
  Dices, HelpCircle, ImagePlus, ListPlus, Plug, RotateCw,
  Settings, Trash2, X,
} from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import { SizeValue, QualityValue, Mode, OutputFormatValue, OUTPUT_FORMAT_OPTIONS } from "../../types/domain";
import { SettingsPanel } from "./SettingsPanel";
import { PromptPopover } from "./PromptPopover";
import { FAQModal } from "./FAQModal";

const STYLE_CHIPS: { id: string; label: string }[] = [
  { id: "cyberpunk", label: "赛博朋克" },
  { id: "anime",     label: "二次元" },
  { id: "illust",    label: "插画" },
  { id: "3d",        label: "3D 渲染" },
  { id: "chinese",   label: "国风" },
];

// auto 项不展示具体方框形状(让上游决定),用一个虚线方框作为视觉占位。
const ASPECT_OPTIONS: { value: SizeValue; label: string; w: number; h: number; auto?: boolean }[] = [
  { value: "auto",      label: "Auto", w: 18, h: 18, auto: true },
  { value: "1024x1024", label: "1:1",  w: 18, h: 18 },
  { value: "1024x1536", label: "2:3",  w: 14, h: 20 },
  { value: "1152x2048", label: "9:16", w: 12, h: 22 },
  { value: "1536x1024", label: "3:2",  w: 22, h: 14 },
  { value: "2048x1152", label: "16:9", w: 24, h: 13 },
];

const QUALITY_TIERS: { value: QualityValue; label: string }[] = [
  { value: "auto",   label: "Auto" },
  { value: "low",    label: "1K" },
  { value: "medium", label: "2K" },
  { value: "high",   label: "4K" },
];

export function ControlPanel() {
  const {
    apiKey, mode, prompt, negativePrompt, size, quality, seed, styleTag,
    outputFormat,
    sources, currentImage,
    errorMessage, isRunning, lastPayload, isTestingKey,
    apiMode, baseURL, responsesConfig, imagesConfig, openUpstreamConfig,
    noPromptRevision,
    setField,
    selectSourceImage, removeSource, clearSources,
    submit, cancel, retryLast, testAPIKey,
  } = useStudioStore();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [promptPopover, setPromptPopover] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const promptLen = prompt.length;

  return (
    <div className="w-[320px] shrink-0 overflow-y-auto flex flex-col gap-4 p-4 bg-white/85 dark:bg-zinc-900/40 border-r border-black/[0.08] dark:border-white/[0.06]">
      {errorMessage && (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 p-3 text-xs text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2">
            <div className="flex-1 whitespace-pre-wrap leading-relaxed">{errorMessage}</div>
            <button
              onClick={() => setField("errorMessage", null)}
              className="text-red-400 hover:text-red-300 -m-1 p-1"
              title="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {lastPayload && !isRunning && (
            <button
              onClick={retryLast}
              className="mt-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 transition-colors"
            >
              <RotateCw className="w-3 h-3" /> 重试上次请求
            </button>
          )}
        </div>
      )}

      {/* 模式 */}
      <Section label="模式">
        <Seg>
          {(["generate", "edit"] as Mode[]).map((m) => (
            <SegItem
              key={m}
              active={mode === m}
              onClick={() => setField("mode", m)}
            >
              {m === "generate" ? "📝 文生图" : "🖼 图生图"}
            </SegItem>
          ))}
        </Seg>
      </Section>

      {/* Prompt */}
      <section className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] uppercase tracking-wide text-zinc-500">
            {mode === "edit" ? "修改要求" : "Prompt 提示词"}
          </label>
          <span className="font-mono-token text-zinc-400 dark:text-zinc-600 tabular-nums">{promptLen}</span>
        </div>
        <textarea
          value={prompt}
          placeholder={mode === "edit"
            ? "描述如何修改源图(例如:把背景换成夜空,人物保持不变)..."
            : "描述你想要生成的画面内容,越详细越好..."}
          onChange={(e) => setField("prompt", e.target.value)}
          className="w-full min-h-[110px] resize-y bg-white dark:bg-zinc-950 ring-1 ring-black/[0.08] dark:ring-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-ring"
        />
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <button
            type="button"
            onClick={() => setPromptPopover((v) => !v)}
            title="prompt 模板与历史"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <ListPlus className="w-3 h-3" /> 模板 / 历史
          </button>
          <label
            title={apiMode === "responses"
              ? "勾上后 Responses API 文本模型不会优化你的 prompt,逐字传给图像模型"
              : "Images API 形态本就不优化 prompt,此开关无效"}
            className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ring-1 transition-colors ${
              noPromptRevision
                ? "bg-emerald-500/12 text-emerald-300 ring-emerald-500/30"
                : "text-zinc-500 dark:text-zinc-400 ring-transparent hover:ring-black/[0.08] dark:hover:ring-white/[0.06]"
            } ${apiMode !== "responses" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={noPromptRevision}
              disabled={apiMode !== "responses"}
              onChange={(e) => setField("noPromptRevision", e.target.checked)}
              className="sr-only peer"
            />
            <span className={`w-3 h-3 rounded border ${noPromptRevision ? "border-emerald-500 bg-emerald-500" : "border-zinc-400 dark:border-zinc-600"} flex items-center justify-center transition-colors`}>
              {noPromptRevision && <span className="w-1.5 h-1.5 rounded-sm bg-zinc-950" />}
            </span>
            不优化提示词
          </label>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Ctrl+Enter</span>
        </div>
        {promptPopover && (
          <PromptPopover
            onClose={() => setPromptPopover(false)}
            onPick={(text) => {
              const current = useStudioStore.getState().prompt;
              setField("prompt", current ? `${current}\n${text}` : text);
            }}
          />
        )}
      </section>

      {/* 风格 */}
      <Section label="风格" trailing={styleTag ? (
        <button onClick={() => setField("styleTag", "")} className="text-[11px] text-emerald-500 hover:text-emerald-400">清除</button>
      ) : null}>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_CHIPS.map((s) => {
            const active = styleTag === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setField("styleTag", active ? "" : s.id)}
                className={`px-2.5 py-1 rounded-md text-xs ring-1 transition-colors ${
                  active
                    ? "bg-emerald-500/12 text-emerald-300 ring-emerald-500/30"
                    : "text-zinc-600 dark:text-zinc-400 ring-black/[0.08] dark:ring-white/[0.06] hover:text-zinc-900 dark:hover:text-zinc-200 hover:ring-emerald-500/30"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 比例 */}
      <Section label="比例">
        <div className="grid grid-cols-6 gap-1.5">
          {ASPECT_OPTIONS.map((a) => {
            const active = size === a.value;
            return (
              <button
                key={a.value}
                onClick={() => setField("size", a.value)}
                title={a.auto ? "让上游决定尺寸 / 比例" : a.value}
                className={`flex flex-col items-center gap-1 py-2 rounded-md ring-1 transition-colors ${
                  active
                    ? "bg-emerald-500/12 ring-emerald-500/40"
                    : "ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/30"
                }`}
              >
                <span
                  className={`block rounded-sm border-2 ${a.auto ? "border-dashed" : ""} ${
                    active ? "border-emerald-400" : "border-zinc-400 dark:border-zinc-600"
                  }`}
                  style={{ width: a.w, height: a.h }}
                />
                <span className={`text-[10px] ${active ? "text-emerald-400" : "text-zinc-500"}`}>{a.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 质量 */}
      <Section label="质量">
        <Seg>
          {QUALITY_TIERS.map((q) => (
            <SegItem
              key={q.value}
              active={quality === q.value}
              onClick={() => setField("quality", q.value as QualityValue)}
            >
              {q.label}
            </SegItem>
          ))}
        </Seg>
      </Section>

      {/* 源图(只在 edit 模式)*/}
      {mode === "edit" && (
        <Section
          label={`源图片 / 参考图${sources.length > 0 ? ` · ${sources.length} 张` : ""}`}
        >
          <div className="flex flex-col gap-1.5">
            {sources.length === 0 && currentImage?.savedPath && (
              <div className="px-3 py-2 rounded-md ring-1 ring-black/[0.06] dark:ring-white/[0.04] text-xs text-zinc-500 dark:text-zinc-500 italic">
                (画板当前图 · 隐式源图)
              </div>
            )}
            {sources.map((src, i) => (
              <div key={src.path} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md ring-1 ring-black/[0.08] dark:ring-white/[0.06] bg-white dark:bg-zinc-950">
                <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 truncate" title={src.path}>
                  {i + 1}. {src.name}
                </span>
                <button
                  onClick={() => removeSource(i)}
                  title="移除"
                  className="p-1 -m-1 text-zinc-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <button onClick={selectSourceImage} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors">
                <ImagePlus className="w-3.5 h-3.5" /> 添加图片
              </button>
              {sources.length > 0 && (
                <button onClick={clearSources} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:text-red-400 hover:ring-red-400/40 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 高级参数(可折叠)*/}
      <section>
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          type="button"
          className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <span className="uppercase tracking-wide">高级参数</span>
          <span className="text-[10px] opacity-60">{advancedOpen ? "收起 ▾" : "展开 ▸"}</span>
        </button>
        {advancedOpen && (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              value={negativePrompt}
              placeholder="负向提示词(不希望出现的元素)..."
              onChange={(e) => setField("negativePrompt", e.target.value)}
              className="w-full min-h-[50px] resize-y bg-white dark:bg-zinc-950 ring-1 ring-black/[0.08] dark:ring-white/[0.06] rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-ring"
            />
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-zinc-500 mb-1">输出格式</label>
              <Seg>
                {OUTPUT_FORMAT_OPTIONS.map((f) => (
                  <SegItem
                    key={f.value}
                    active={outputFormat === f.value}
                    onClick={() => setField("outputFormat", f.value as OutputFormatValue)}
                  >
                    {f.label}
                  </SegItem>
                ))}
              </Seg>
              <p className="text-[10px] text-zinc-500 mt-1">JPEG/WebP 体积更小;落盘扩展名 jpeg→.jpg</p>
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={seed || ""}
                placeholder="seed (留空=随机)"
                min={0}
                onChange={(e) => setField("seed", Number(e.target.value) || 0)}
                className="flex-1 bg-white dark:bg-zinc-950 ring-1 ring-black/[0.08] dark:ring-white/[0.06] rounded-md px-2.5 py-1.5 text-xs font-mono-token text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus-ring"
              />
              <button
                onClick={() => setField("seed", Math.floor(Math.random() * 2_000_000_000))}
                title="随机 seed"
                className="px-2 py-1.5 rounded-md ring-1 ring-black/[0.08] dark:ring-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-emerald-400 hover:ring-emerald-500/40 transition-colors"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
              {seed > 0 && (
                <button
                  onClick={() => setField("seed", 0)}
                  title="清除"
                  className="px-2 py-1.5 rounded-md ring-1 ring-black/[0.08] dark:ring-white/[0.06] text-zinc-500 hover:text-red-400 hover:ring-red-400/40 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 上游 */}
      <Section
        label={
          <span className="flex items-center gap-1.5">
            上游
            <span className={`w-1.5 h-1.5 rounded-full ${apiKey && baseURL ? "bg-emerald-500 shadow-[0_0_6px_rgb(16_185_129_/_0.8)]" : "bg-red-500"}`} />
            <span className={`text-[10px] ${apiKey && baseURL ? "text-emerald-500" : "text-red-400"}`}>
              {apiKey && baseURL ? "已配置" : "未配置"}
            </span>
          </span>
        }
        trailing={
          <button
            onClick={() => setFaqOpen(true)}
            title="关于 API Key 分组、模型选择等"
            className="text-[11px] text-zinc-500 hover:text-emerald-500 inline-flex items-center gap-0.5"
          >
            <HelpCircle className="w-3 h-3" /> FAQ
          </button>
        }
      >
        {/* 热切换 chip */}
        <div className="flex gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-black/[0.06] dark:ring-white/[0.04]">
          {(["responses", "images"] as const).map((m) => {
            const cfg = m === "responses" ? responsesConfig : imagesConfig;
            const ready = cfg.apiKey.trim() && cfg.baseURL.trim();
            const active = apiMode === m;
            return (
              <button
                key={m}
                onClick={() => setField("apiMode", m)}
                title={ready ? `${m} · 已配置 · ${cfg.baseURL.replace(/^https?:\/\//, "")}` : `${m} · 未配置`}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-white dark:bg-zinc-900 text-emerald-500 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {m === "responses" ? "Responses" : "Images"}
                <span className={`w-1 h-1 rounded-full ${ready ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={openUpstreamConfig}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> 上游配置
          </button>
          <button
            onClick={testAPIKey}
            disabled={!apiKey.trim() || !baseURL.trim() || isTestingKey}
            title="发送一个最小请求验证 BASE_URL + API Key + 分组权限"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plug className={`w-3.5 h-3.5 ${isTestingKey ? "animate-spin" : ""}`} /> {isTestingKey ? "测试中..." : "测试"}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-500 leading-relaxed mt-1.5">
          {apiMode === "responses"
            ? "Responses API · key 需绑「拥有 gpt-5.5 模型的分组」(可防 CF 524)"
            : "Images API · 可使用标准 image-2 / image API 分组"}
        </p>
      </Section>

      <FAQModal open={faqOpen} onClose={() => setFaqOpen(false)} />

      {/* 生成按钮 */}
      <div className="mt-auto pt-2 sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-zinc-900 dark:via-zinc-900/95 -mx-4 px-4 pb-4">
        {isRunning ? (
          <button
            onClick={cancel}
            className="w-full py-2.5 rounded-xl bg-red-500/12 hover:bg-red-500/20 text-red-400 ring-1 ring-red-500/40 font-medium transition-colors"
          >
            取消生成
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!apiKey || !prompt}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold transition-colors disabled:cursor-not-allowed"
          >
            {mode === "edit" ? "编辑" : "生成"}
          </button>
        )}
        {(!apiKey || !baseURL) && (
          <p className="mt-2 text-[11px] text-zinc-500 text-center">
            首次使用请点击「上游配置」填入 BASE_URL + API Key
          </p>
        )}
      </div>

      <SettingsPanel />
    </div>
  );
}

// ---- 内部 helpers ----

function Section({
  label, trailing, children,
}: {
  label: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</label>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function Seg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-black/[0.06] dark:ring-white/[0.04]">
      {children}
    </div>
  );
}

function SegItem({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
        active
          ? "bg-white dark:bg-zinc-900 text-emerald-500 shadow-sm"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
