import { useEffect, useState } from "react";
import {
  ChevronDown, Download, Folder, FolderEdit, Github, Info, KeyRound,
  MessageSquare, Moon, RotateCw, Settings as SettingsIcon, Sun, Trash2, Upload, X,
} from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import {
  GetOutputDir, OpenOutputDir, OpenExternalURL, ChooseOutputDir, SetOutputDir,
} from "../../../wailsjs/go/backend/Service";
import type { TransportKind } from "../../types/domain";
import { Modal } from "../common/Modal";

const REPO_URL = "https://github.com/RoseKhlifa/Image-Studio";
const MIT_URL = "https://opensource.org/licenses/MIT";

function PresetsRow() {
  const { presets, savePreset, applyPreset, deletePreset } = useStudioStore();
  function onSave() {
    const name = prompt("预设名:");
    if (name) savePreset(name);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {presets.map((p) => (
        <div key={p.id} className="flex items-center gap-1">
          <button
            onClick={() => applyPreset(p.id)}
            title={`${p.size} · ${p.quality}`}
            className="flex-1 px-2.5 py-1.5 rounded-md text-xs text-left text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
          >
            {p.name}
          </button>
          <button
            onClick={() => deletePreset(p.id)}
            title="删除"
            className="p-1.5 rounded text-zinc-500 hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onSave}
        className="px-2.5 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-dashed ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
      >
        + 保存当前参数
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const {
    transport, baseURL, apiMode, openUpstreamConfig,
    theme, fontScale,
    setField, setAPIKey,
    history,
    exportHistory, importHistory,
    setTheme, setFontScale,
    pushToast,
  } = useStudioStore();

  const [open, setOpen] = useState(false);
  const [outputDir, setOutputDir] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    GetOutputDir().then(setOutputDir).catch(() => undefined);
  }, [open]);

  function clearAPIKey() {
    if (!confirm("确定清除已保存的 API Key 吗?")) return;
    setAPIKey("");
  }

  async function clearHistory() {
    if (!confirm(`确定清除 ${history.length} 条历史记录吗?(本地 IndexedDB 也会删除)`)) return;
    for (const h of history) {
      await useStudioStore.getState().deleteHistoryItem(h.id);
    }
  }

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        title="高级设置"
        className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <span className="inline-flex items-center gap-1.5 uppercase tracking-wide">
          <SettingsIcon className="w-3 h-3" /> 设置
        </span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3.5 mt-3">
          {/* 网络通道 */}
          <Row label="网络通道">
            <select
              value={transport}
              onChange={(e) => setField("transport", e.target.value as TransportKind)}
              className="w-full bg-white dark:bg-zinc-950 ring-1 ring-black/[0.08] dark:ring-white/[0.06] rounded-md px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus-ring"
            >
              <option value="auto">auto(原生 HTTP)</option>
              <option value="native">native(强制原生)</option>
              <option value="curl">curl(子进程兜底)</option>
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">
              如果遇到网络问题(Cloudflare TLS / 公司代理),试 curl
            </p>
          </Row>

          {/* 输出目录 */}
          <Row label="输出目录">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md ring-1 ring-black/[0.08] dark:ring-white/[0.06] bg-white dark:bg-zinc-950">
              <span title={outputDir} className="flex-1 text-[11px] font-mono-token text-zinc-700 dark:text-zinc-300 truncate">
                {outputDir || "..."}
              </span>
              <button
                onClick={() => OpenOutputDir().catch(() => undefined)}
                title="在资源管理器中打开"
                className="p-1 rounded text-zinc-500 hover:text-emerald-400"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={async () => {
                  try {
                    const chosen = await ChooseOutputDir();
                    if (chosen) {
                      try { localStorage.setItem("gptcodex.outputDir", chosen); } catch {}
                      setOutputDir(chosen);
                      pushToast(`输出目录已切换:${chosen}`, "success");
                    }
                  } catch (e: any) {
                    pushToast(`切换失败:${e?.message ?? e}`, "error", 5000);
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
              >
                <FolderEdit className="w-3 h-3" /> 修改
              </button>
              <button
                onClick={async () => {
                  try {
                    await SetOutputDir("");
                    try { localStorage.removeItem("gptcodex.outputDir"); } catch {}
                    const def = await GetOutputDir();
                    setOutputDir(def);
                    pushToast("已恢复默认输出目录", "success");
                  } catch (e: any) {
                    pushToast(`重置失败:${e?.message ?? e}`, "error", 5000);
                  }
                }}
                title="清除自定义路径,回到 %APPDATA%\image-studio\images"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
              >
                <RotateCw className="w-3 h-3" /> 默认
              </button>
            </div>
          </Row>

          {/* 上游接入 */}
          <Row label="上游接入">
            <button
              onClick={openUpstreamConfig}
              className="w-full inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <SettingsIcon className="w-3 h-3" />
              修改上游配置(API 形态 / BASE_URL / Key / 模型)
            </button>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              当前 <span className="text-zinc-700 dark:text-zinc-300">{apiMode === "responses" ? "Responses API · SSE 保活" : "Images API · 标准 endpoints"}</span>
              {baseURL && <> · <span className="font-mono-token">{baseURL.replace(/^https?:\/\//, "")}</span></>}
            </p>
          </Row>

          {/* 主题 */}
          <Row label="主题">
            <div className="flex gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-black/[0.06] dark:ring-white/[0.04]">
              <SegBtn active={theme === "dark"} onClick={() => setTheme("dark")}>
                <Moon className="w-3 h-3" /> 深色
              </SegBtn>
              <SegBtn active={theme === "light"} onClick={() => setTheme("light")}>
                <Sun className="w-3 h-3" /> 浅色
              </SegBtn>
            </div>
          </Row>

          {/* 字号 */}
          <Row label={`字号 ${Math.round(fontScale * 100)}%`}>
            <div className="flex gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 ring-1 ring-black/[0.06] dark:ring-white/[0.04]">
              {[0.85, 1, 1.15].map((v) => (
                <SegBtn key={v} active={Math.abs(fontScale - v) < 0.01} onClick={() => setFontScale(v)}>
                  {v === 0.85 ? "小" : v === 1 ? "中" : "大"}
                </SegBtn>
              ))}
            </div>
          </Row>

          {/* 预设 */}
          <Row label="参数预设">
            <PresetsRow />
          </Row>

          {/* 历史 import / export */}
          <div className="flex gap-1.5">
            <button
              onClick={exportHistory}
              title="导出全部历史为 JSON"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <Upload className="w-3 h-3" /> 导出历史
            </button>
            <button
              onClick={importHistory}
              title="从 JSON 文件导入"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
            >
              <Download className="w-3 h-3" /> 导入历史
            </button>
          </div>

          {/* 危险动作 */}
          <div className="flex gap-1.5">
            <button
              onClick={clearAPIKey}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:text-red-400 hover:ring-red-400/40 transition-colors"
            >
              <KeyRound className="w-3 h-3" /> 清除 API Key
            </button>
            <button
              onClick={clearHistory}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:text-red-400 hover:ring-red-400/40 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 清空历史
            </button>
          </div>

          <button
            onClick={() => setAboutOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:ring-emerald-500/40 hover:text-emerald-400 transition-colors"
          >
            <Info className="w-3 h-3" /> 关于 Image Studio
          </button>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            快捷键:1/2/3 切工具 · 空格临时拖动 · F 重置视图 · [ ] 调笔刷 · Ctrl+Z 撤销 · Esc 取消/退出对比 · Shift+点击历史 进入对比
          </p>
        </div>
      )}

      {/* 关于 modal */}
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="关于 Image Studio" width={460}>
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white dark:bg-zinc-100 ring-1 ring-black/15 dark:ring-white/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 1024 1024" fill="none" aria-hidden>
              <rect x="160" y="270" width="704" height="490" rx="56" stroke="#18181b" strokeWidth="56" />
              <path d="M 200 740 L 420 470 L 560 600 L 460 740 Z" fill="#52525b" />
              <path d="M 380 740 L 580 490 L 670 580 L 770 480 L 824 740 Z" fill="#18181b" />
              <circle cx="700" cy="420" r="55" stroke="#18181b" strokeWidth="48" />
              <polygon points="820,200 836,240 820,280 804,240" fill="#18181b" />
              <polygon points="780,240 820,224 860,240 820,256" fill="#18181b" />
            </svg>
          </div>
          <div className="text-lg font-bold">Image Studio</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            v0.1.3 · <span onClick={() => OpenExternalURL(MIT_URL).catch(() => undefined)} className="text-emerald-500 cursor-pointer hover:text-emerald-400">MIT License</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          一个开源的图片生成 / 编辑桌面客户端,基于 Wails(Go + React/TS)。
          所有数据(API Key、历史记录、生成图)都保存在本地机器,不上传任何服务器。
        </p>
        <div className="mt-3.5 text-xs text-zinc-500 leading-relaxed space-y-0.5">
          <div><strong className="text-zinc-700 dark:text-zinc-300">技术栈:</strong></div>
          <div>· 后端:Go ≥ 1.25 / net/http SSE / pkg/client</div>
          <div>· 前端:React 18 + TypeScript / Tailwind v4 / zustand / react-konva</div>
          <div>· 打包:Wails v2 / WebView2</div>
          <div className="pt-1.5"><strong className="text-zinc-700 dark:text-zinc-300">支持的上游:</strong></div>
          <div>· 任何兼容 OpenAI <strong className="text-zinc-700 dark:text-zinc-300">Responses API</strong> 形态的中转站</div>
          <div>· 标准 <strong className="text-zinc-700 dark:text-zinc-300">Images API</strong>(generations + edits)</div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => OpenExternalURL(REPO_URL).catch(() => undefined)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
          >
            <Github className="w-3.5 h-3.5" /> GitHub 仓库
          </button>
          <button
            onClick={() => OpenExternalURL(REPO_URL + "/issues").catch(() => undefined)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 ring-1 ring-black/[0.08] dark:ring-white/[0.06] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" /> 反馈
          </button>
        </div>
        <hr className="border-black/[0.06] dark:border-white/[0.04] mt-4 mb-3" />
        <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
          100% 本地数据 · 无遥测 · 无云端账户 · 无内购<br />
          Copyright © 2026 · Released under MIT
        </div>
      </Modal>
    </section>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SegBtn({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        active
          ? "bg-white dark:bg-zinc-900 text-emerald-500 shadow-sm"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
