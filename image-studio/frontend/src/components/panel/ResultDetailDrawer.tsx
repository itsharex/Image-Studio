import { useEffect } from "react";
import { ClipboardCopy, Folder, RotateCw, Save, Sparkles, X } from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import type { HistoryItem, SizeValue } from "../../types/domain";
import { SaveImageAs, OpenOutputDir } from "../../../wailsjs/go/backend/Service";

const ASPECT_LABEL: Record<SizeValue, string> = {
  auto: "auto",
  "1024x1024": "1:1",
  "1024x1536": "2:3",
  "1152x2048": "9:16",
  "1536x1024": "3:2",
  "2048x1152": "16:9",
};

const QUALITY_LABEL: Record<string, string> = {
  low: "1K (low)",
  medium: "2K (medium)",
  high: "4K (high)",
  auto: "auto",
};

export function ResultDetailDrawer() {
  const item = useStudioStore((s) => s.resultDetail);
  const close = useStudioStore((s) => s.closeResultDetail);
  const setField = useStudioStore((s) => s.setField);
  const pushToast = useStudioStore((s) => s.pushToast);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, close]);

  if (!item) return null;

  const aspect = ASPECT_LABEL[item.size as SizeValue] ?? "";
  const quality = QUALITY_LABEL[item.quality] ?? item.quality;
  const created = new Date(item.createdAt).toLocaleString();

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => pushToast(`已复制${label}`, "success"),
      () => pushToast("复制失败", "error"),
    );
  }

  function useAsNextPrompt(text: string) {
    setField("prompt", text);
    pushToast("已应用为下次 prompt,Ctrl+Enter 生成", "success");
    close();
  }

  function openSaveDialog() {
    const it = item!;
    const suggested = `image-${it.mode}-${it.id.slice(0, 8)}.png`;
    SaveImageAs(it.imageB64, suggested).then(
      (p) => p && pushToast(`已保存:${p.split(/[\\/]/).pop()}`, "success"),
      (e) => pushToast(`保存失败:${e?.message ?? e}`, "error"),
    );
  }

  return (
    <aside
      role="dialog"
      aria-label="生成详情"
      className="fixed top-0 right-0 bottom-0 w-[420px] z-[9000] flex flex-col bg-white dark:bg-zinc-900 border-l border-black/[0.08] dark:border-white/[0.06] shadow-2xl animate-[rd-in_180ms_ease-out]"
      style={{ animation: "rd-in 180ms ease-out" }}
    >
      <style>{`@keyframes rd-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <header className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.04]">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">生成详情</span>
        <button
          onClick={close}
          title="关闭 (Esc)"
          className="p-1 -mr-1 rounded text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 预览 */}
        <div className="rounded-lg ring-1 ring-black/[0.08] dark:ring-white/[0.06] p-2 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
          <img
            src={`data:image/png;base64,${item.imageB64}`}
            alt="生成结果"
            className="max-w-full max-h-[280px] object-contain rounded"
          />
        </div>

        {/* 参数 */}
        <Section title="参数">
          <Kv label="模式" value={item.mode === "edit" ? "图生图" : "文生图"} />
          <Kv label="尺寸" value={`${item.size}${aspect ? ` · ${aspect}` : ""}`} />
          <Kv label="质量" value={quality} />
          {item.seed ? <Kv label="seed" value={String(item.seed)} mono /> : null}
          {item.styleTag ? <Kv label="风格" value={`#${item.styleTag}`} /> : null}
          {typeof item.elapsedSec === "number" ? <Kv label="耗时" value={`${item.elapsedSec.toFixed(1)}s`} /> : null}
          <Kv label="创建时间" value={created} />
          {item.transport ? <Kv label="通道" value={item.transport} /> : null}
        </Section>

        {/* 原 prompt */}
        <Section title="原 prompt">
          <PromptBlock>{item.prompt || <em className="opacity-60">(空)</em>}</PromptBlock>
          {item.prompt && (
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => copy(item.prompt, "原 prompt")}><ClipboardCopy className="w-3 h-3" /> 复制</Btn>
              <Btn onClick={() => useAsNextPrompt(item.prompt)}><RotateCw className="w-3 h-3" /> 用作下次 prompt</Btn>
            </div>
          )}
        </Section>

        {item.negativePrompt && (
          <Section title="负向 prompt">
            <PromptBlock muted>{item.negativePrompt}</PromptBlock>
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => copy(item.negativePrompt!, "负向 prompt")}><ClipboardCopy className="w-3 h-3" /> 复制</Btn>
            </div>
          </Section>
        )}

        {item.revisedPrompt && (
          <Section
            title={<span className="inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-emerald-400" /> 模型优化后</span>}
            hint="Responses API 模式下文本模型会优化原 prompt 再生图。要逐字使用,可在 prompt 框下勾「不优化提示词」。"
          >
            <PromptBlock highlight>{item.revisedPrompt}</PromptBlock>
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => copy(item.revisedPrompt!, "优化版 prompt")}><ClipboardCopy className="w-3 h-3" /> 复制</Btn>
              <Btn primary onClick={() => useAsNextPrompt(item.revisedPrompt!)}><RotateCw className="w-3 h-3" /> 用作下次 prompt</Btn>
            </div>
          </Section>
        )}

        <Section title="文件">
          {item.savedPath ? (
            <p className="font-mono-token break-all bg-zinc-50 dark:bg-zinc-950 ring-1 ring-black/[0.06] dark:ring-white/[0.04] rounded-md px-2.5 py-1.5 text-[11px] text-zinc-600 dark:text-zinc-400" title={item.savedPath}>
              {item.savedPath}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 italic">(本次未落盘 / 路径丢失)</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.savedPath && (
              <Btn onClick={() => copy(item.savedPath!, "路径")}><ClipboardCopy className="w-3 h-3" /> 复制路径</Btn>
            )}
            <Btn onClick={() => OpenOutputDir().catch(() => undefined)}><Folder className="w-3 h-3" /> 打开文件夹</Btn>
            <Btn onClick={openSaveDialog}><Save className="w-3 h-3" /> 另存为</Btn>
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, hint, children }: {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-1.5">{title}</h3>
      {hint && <p className="text-[10px] text-zinc-500 mb-2 leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

function Kv({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex text-xs py-0.5 border-b border-dashed border-black/[0.05] dark:border-white/[0.04] last:border-b-0">
      <span className="w-16 text-zinc-500 shrink-0">{label}</span>
      <span className={`flex-1 text-zinc-700 dark:text-zinc-300 break-words ${mono ? "font-mono-token" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function PromptBlock({ children, muted, highlight }: {
  children: React.ReactNode;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <p className={`mb-2 px-3 py-2 rounded-md text-xs leading-relaxed whitespace-pre-wrap break-words ${
      highlight
        ? "bg-emerald-500/8 ring-1 ring-emerald-500/30 text-emerald-300"
        : muted
          ? "bg-zinc-100 dark:bg-zinc-950 ring-1 ring-black/[0.06] dark:ring-white/[0.04] text-zinc-500"
          : "bg-zinc-100 dark:bg-zinc-950 ring-1 ring-black/[0.06] dark:ring-white/[0.04] text-zinc-700 dark:text-zinc-300"
    }`}>
      {children}
    </p>
  );
}

function Btn({ children, onClick, primary }: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-colors ${
        primary
          ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
          : "ring-1 ring-black/[0.08] dark:ring-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:ring-emerald-500/40 hover:text-emerald-400"
      }`}
    >
      {children}
    </button>
  );
}

// ensure HistoryItem import is treated as used by TS
export type _UnusedHi = HistoryItem;
