import { useEffect, useState } from "react";
import {
  ChevronRight, Database, Download, Folder, FolderEdit, Github, Info, KeyRound,
  MessageSquare, Monitor, Moon, PlugZap, RotateCw, Shield, SlidersHorizontal, Sun, Trash2, Upload,
} from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import {
  GetOutputDir, OpenOutputDir, OpenExternalURL, ChooseOutputDir, SetOutputDir,
} from "../../platform/runtime/host";
import type { KernelRuntimeMode } from "../../types/domain";
import { Modal } from "../common/Modal";
import { rememberTrustedOutputRoot } from "../../lib/storage";
import { platformOutputRootLabel } from "../../platform";
import { androidSaveHint, androidTarget, openExternalURLForPlatform, openOutputLocationForPlatform } from "../../platform/android/bridge";
import { usePlatform } from "../../platform/context";
import { AboutImageStudioModal } from "./AboutImageStudioModal";
import { SettingsPresetsRow } from "./SettingsPresetsRow";
import { SettingsRow, SettingsSegButton } from "./settingsPrimitives";

const REPO_URL = "https://github.com/RoseKhlifa/Image-Studio";
const ISSUES_URL = "https://github.com/RoseKhlifa/Image-Studio/issues";
const MIT_URL = "https://opensource.org/licenses/MIT";

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    kernelRuntimeMode,
    theme, fontScale,
    setField, setAPIKey,
    history,
    exportHistory, importHistory,
    pruneHistoryOlderThanDays,
    setTheme, setFontScale,
    pushToast,
    apiKey, baseURL, apiMode,
    profiles, activeProfileId, setActiveProfile,
    openUpstreamConfig, testAPIKey, isTestingKey,
  } = useStudioStore();

  const [outputDir, setOutputDir] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const { isMac, usesFluentUI, isAndroidPhone } = usePlatform();

  useEffect(() => {
    if (!open) return;
    GetOutputDir().then(setOutputDir).catch(() => undefined);
  }, [open]);

  async function clearAPIKey() {
    if (!confirm("确定清除已保存的 API Key 吗?")) return;
    try {
      await setAPIKey("");
      pushToast("已清除安全存储中的 API Key", "success");
    } catch (e: any) {
      pushToast(`清除失败:${e?.message ?? e}`, "error", 5000);
    }
  }

  async function clearHistory() {
    if (!confirm(`确定清除 ${history.length} 条历史记录吗?(本地数据库也会删除)`)) return;
    for (const h of history) {
      await useStudioStore.getState().deleteHistoryItem(h.id);
    }
  }

  async function pruneHistory(days: number) {
    const removed = await pruneHistoryOlderThanDays(days);
    if (removed > 0) pushToast(`已清理 ${removed} 条 ${days} 天前的历史`, "success");
    else pushToast(`没有 ${days} 天前的历史需要清理`, "info");
  }

  function openOutputLocation() {
    openOutputLocationForPlatform(OpenOutputDir).catch((e) => pushToast(e?.message ?? "无法打开保存位置", "warn"));
  }

  function openExternal(url: string) {
    openExternalURLForPlatform(url, OpenExternalURL).catch(() => undefined);
  }

  function closeSettings() {
    setAboutOpen(false);
    onClose();
  }

  const outputLabel = androidTarget.isAndroid ? platformOutputRootLabel() : (outputDir || "...");
  const historyCountLabel = `${history.length} 条`;
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const upstreamReady = !!apiKey.trim() && !!baseURL.trim();
  const upstreamModeLabel = apiMode === "responses" ? "Responses API" : "Images API";

  const androidSettings = isAndroidPhone ? (
    <div className="android-settings-panel">
      <section className="android-settings-hero">
        <div className="android-settings-hero-orb">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="android-settings-kicker">Image Studio</div>
          <h2>偏好设置</h2>
          <p>只保留移动端常用控制，桌面路径和上游配置仍在各自入口里处理。</p>
        </div>
      </section>

      <section className="android-settings-card">
        <div className="android-settings-section-title">运行</div>
        <div className="android-settings-upstream-card">
          <div className="android-settings-upstream-head">
            <span className="android-settings-row-icon"><PlugZap className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="android-settings-field-title">上游配置</span>
              <span className="android-settings-field-subtitle">
                {activeProfile ? `${activeProfile.name} · ${upstreamModeLabel}` : "还没有可用上游配置"}
              </span>
            </span>
            <span className={`android-settings-status-pill ${upstreamReady ? "ready" : "missing"}`}>
              {upstreamReady ? "已配置" : "未配置"}
            </span>
          </div>
          {profiles.length > 0 ? (
            <select
              value={activeProfileId}
              onChange={(e) => {
                const id = e.target.value;
                if (id) void setActiveProfile(id);
              }}
              className="focus-ring android-settings-profile-select"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.apiMode === "responses" ? "Responses" : "Images"}
                </option>
              ))}
            </select>
          ) : null}
          <div className="android-settings-action-grid android-settings-upstream-actions">
            <button type="button" onClick={() => openUpstreamConfig("settings")}>管理配置</button>
            <button type="button" onClick={testAPIKey} disabled={!upstreamReady || isTestingKey}>
              {isTestingKey ? "检查中..." : "测试连通性"}
            </button>
          </div>
        </div>
        <div className="android-settings-field">
          <div>
            <span className="android-settings-field-title">内核执行</span>
            <span className="android-settings-field-subtitle">默认使用自动策略，远程内核用于跨端验证。</span>
          </div>
          <select
            value={kernelRuntimeMode}
            onChange={(e) => setField("kernelRuntimeMode", e.target.value as KernelRuntimeMode)}
            className="focus-ring android-settings-select"
          >
            <option value="auto">Auto</option>
            <option value="local">Local</option>
            <option value="remote">Remote</option>
          </select>
        </div>
        <button type="button" className="android-settings-row-action" onClick={openOutputLocation}>
          <span className="android-settings-row-icon"><Folder className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="android-settings-field-title">保存位置</span>
            <span className="android-settings-field-subtitle truncate">{outputLabel}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        </button>
        <p className="android-settings-note">{androidSaveHint()}</p>
      </section>

      <section className="android-settings-card">
        <div className="android-settings-section-title">外观</div>
        <div className="android-settings-segmented" role="group" aria-label="主题">
          <button type="button" className={theme === "system" ? "active" : ""} onClick={() => setTheme("system")}>
            <Monitor className="h-3.5 w-3.5" /> 系统
          </button>
          <button type="button" className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
            <Sun className="h-3.5 w-3.5" /> 浅色
          </button>
          <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
            <Moon className="h-3.5 w-3.5" /> 深色
          </button>
        </div>
        <div className="android-settings-field">
          <div>
            <span className="android-settings-field-title">字号</span>
            <span className="android-settings-field-subtitle">当前 {Math.round(fontScale * 100)}%</span>
          </div>
          <div className="android-settings-size-pills">
            {[0.85, 1, 1.15].map((value) => (
              <button
                key={value}
                type="button"
                className={Math.abs(fontScale - value) < 0.01 ? "active" : ""}
                onClick={() => setFontScale(value)}
              >
                {value === 0.85 ? "小" : value === 1 ? "中" : "大"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="android-settings-card">
        <div className="android-settings-section-title">参数预设</div>
        <SettingsPresetsRow />
      </section>

      <section className="android-settings-card">
        <div className="android-settings-section-title">历史数据</div>
        <div className="android-settings-history-meter">
          <span><Database className="h-4 w-4" /> 本地历史</span>
          <strong>{historyCountLabel}</strong>
        </div>
        <div className="android-settings-action-grid">
          <button type="button" onClick={exportHistory}><Upload className="h-4 w-4" /> 导出</button>
          <button type="button" onClick={importHistory}><Download className="h-4 w-4" /> 导入</button>
          <button type="button" onClick={() => pruneHistory(3)}>清理 3 天前</button>
          <button type="button" onClick={() => pruneHistory(7)}>清理 7 天前</button>
        </div>
      </section>

      <section className="android-settings-card android-settings-danger-card">
        <div className="android-settings-section-title">安全与清理</div>
        <button type="button" className="android-settings-row-action danger" onClick={clearAPIKey}>
          <span className="android-settings-row-icon"><KeyRound className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="android-settings-field-title">清除 API Key</span>
            <span className="android-settings-field-subtitle">从系统凭据存储移除当前密钥。</span>
          </span>
          <Shield className="h-4 w-4 text-red-400" />
        </button>
        <button type="button" className="android-settings-row-action danger" onClick={clearHistory}>
          <span className="android-settings-row-icon"><Trash2 className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="android-settings-field-title">清空历史</span>
            <span className="android-settings-field-subtitle">删除本地数据库中的全部历史。</span>
          </span>
          <ChevronRight className="h-4 w-4 text-red-300" />
        </button>
      </section>

      <section className="android-settings-card">
        <div className="android-settings-section-title">支持</div>
        <div className="android-settings-action-grid">
          <button type="button" onClick={() => setAboutOpen(true)}><Info className="h-4 w-4" /> 关于</button>
          <button type="button" onClick={() => openExternal(REPO_URL)}><Github className="h-4 w-4" /> GitHub</button>
          <button type="button" onClick={() => openExternal(ISSUES_URL)}><MessageSquare className="h-4 w-4" /> 反馈</button>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <Modal open={open} onClose={closeSettings} title="设置" width={540}>
        {androidSettings ?? (
        <div className={`flex flex-col ${androidTarget.isAndroid ? "gap-3" : isMac ? "gap-4" : "gap-3.5"}`}>
          <SettingsRow label="内核执行">
            <select
              value={kernelRuntimeMode}
              onChange={(e) => setField("kernelRuntimeMode", e.target.value as KernelRuntimeMode)}
              className={`focus-ring w-full border border-black/[0.08] bg-[var(--surface)] px-3 ${isMac ? "min-h-[44px] py-3 text-[14px]" : "py-2.5 text-[12px]"} text-zinc-900 dark:border-white/[0.08] dark:text-zinc-100 ${usesFluentUI ? "rounded-[10px]" : "rounded-[16px]"}`}
            >
              <option value="auto">auto(按宿主自动选择)</option>
              <option value="local">local(桌面 Go/Wails)</option>
              <option value="remote">remote(共享远程内核)</option>
            </select>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-300">
              桌面可切到 remote 验证与 Android / Worker 是否走同一套共享请求内核
            </p>
          </SettingsRow>

          <SettingsRow label={androidTarget.isAndroid ? "保存位置" : "输出目录"}>
            <div className={`flex items-center gap-1 border border-black/[0.08] bg-[var(--surface)] px-3 ${isMac ? "py-3" : "py-2.5"} dark:border-white/[0.08] ${usesFluentUI ? "rounded-[10px]" : "rounded-[16px]"}`}>
              <span title={outputDir} className={`flex-1 truncate font-mono-token text-zinc-700 dark:text-zinc-200 ${isMac ? "text-[13px]" : "text-[12px]"}`}>
                {androidTarget.isAndroid ? platformOutputRootLabel() : (outputDir || "...")}
              </span>
              <button
                onClick={openOutputLocation}
                title={androidTarget.isAndroid ? "打开 Android 保存位置" : "在系统文件管理器中打开"}
                className={`p-1 text-zinc-500 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] ${usesFluentUI ? "rounded-[6px]" : "rounded-full"}`}
              >
                <Folder className="w-3.5 h-3.5" />
              </button>
            </div>
            {androidTarget.isAndroid ? (
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-300">{androidSaveHint()}</p>
            ) : (
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={async () => {
                    try {
                      const chosen = await ChooseOutputDir();
                      if (chosen) {
                        try { localStorage.setItem("gptcodex.outputDir", chosen); } catch {}
                        rememberTrustedOutputRoot(chosen);
                        setOutputDir(chosen);
                        pushToast(`输出目录已切换:${chosen}`, "success");
                      }
                    } catch (e: any) {
                      pushToast(`切换失败:${e?.message ?? e}`, "error", 5000);
                    }
                  }}
                  className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 ${isMac ? "py-2.5 text-[13px]" : "py-2 text-[12px]"} font-medium text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
                >
                  <FolderEdit className="w-3 h-3" /> 修改
                </button>
                <button
                  onClick={async () => {
                    try {
                      await SetOutputDir("");
                      try { localStorage.removeItem("gptcodex.outputDir"); } catch {}
                      const def = await GetOutputDir();
                      rememberTrustedOutputRoot(def);
                      setOutputDir(def);
                      pushToast("已恢复默认输出目录", "success");
                    } catch (e: any) {
                      pushToast(`重置失败:${e?.message ?? e}`, "error", 5000);
                    }
                  }}
                  title={`清除自定义路径,回到 ${platformOutputRootLabel()}/images`}
                  className={`inline-flex min-h-[34px] items-center gap-1 border border-black/[0.08] px-3 ${isMac ? "py-2.5 text-[13px]" : "py-2 text-[12px]"} font-medium text-zinc-500 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
                >
                  <RotateCw className="w-3 h-3" /> 默认
                </button>
              </div>
            )}
          </SettingsRow>

          <SettingsRow label="主题">
            <div className={`platform-seg flex flex-wrap gap-1 bg-black/[0.04] p-0.5 ring-1 ring-black/[0.05] dark:bg-white/[0.06] dark:ring-white/[0.06] ${usesFluentUI ? "rounded-[10px]" : "rounded-[18px]"}`}>
              <SettingsSegButton active={theme === "system"} onClick={() => setTheme("system")}>
                <Monitor className="w-3 h-3" /> 系统
              </SettingsSegButton>
              <SettingsSegButton active={theme === "dark"} onClick={() => setTheme("dark")}>
                <Moon className="w-3 h-3" /> 深色
              </SettingsSegButton>
              <SettingsSegButton active={theme === "light"} onClick={() => setTheme("light")}>
                <Sun className="w-3 h-3" /> 浅色
              </SettingsSegButton>
            </div>
          </SettingsRow>

          <SettingsRow label={`字号 ${Math.round(fontScale * 100)}%`}>
            <div className={`platform-seg flex flex-wrap gap-1 bg-black/[0.04] p-0.5 ring-1 ring-black/[0.05] dark:bg-white/[0.06] dark:ring-white/[0.06] ${usesFluentUI ? "rounded-[10px]" : "rounded-[18px]"}`}>
              {[0.85, 1, 1.15].map((v) => (
                <SettingsSegButton key={v} active={Math.abs(fontScale - v) < 0.01} onClick={() => setFontScale(v)}>
                  {v === 0.85 ? "小" : v === 1 ? "中" : "大"}
                </SettingsSegButton>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label="参数预设">
            <SettingsPresetsRow />
          </SettingsRow>

          {/* 历史 import / export */}
          <div className="flex gap-1.5">
            <button
              onClick={exportHistory}
              title="导出全部历史为 JSON"
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 ${isMac ? "py-2.5 text-[13px]" : "py-2 text-[12px]"} font-medium text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              <Upload className="w-3 h-3" /> 导出历史
            </button>
            <button
              onClick={importHistory}
              title="从 JSON 文件导入"
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 ${isMac ? "py-2.5 text-[13px]" : "py-2 text-[12px]"} font-medium text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              <Download className="w-3 h-3" /> 导入历史
            </button>
          </div>

          {/* 危险动作 */}
          <div className="flex gap-1.5">
            <button
              onClick={clearAPIKey}
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-red-400/40 hover:text-red-400 dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              <KeyRound className="w-3 h-3" /> 清除 API Key
            </button>
            <button
              onClick={clearHistory}
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-red-400/40 hover:text-red-400 dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              <Trash2 className="w-3 h-3" /> 清空历史
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => pruneHistory(3)}
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              清理 3 天前
            </button>
            <button
              onClick={() => pruneHistory(7)}
              className={`flex-1 inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
            >
              清理 7 天前
            </button>
          </div>

          <button
            onClick={() => setAboutOpen(true)}
            className={`inline-flex min-h-[34px] items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] font-medium text-zinc-500 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
          >
            <Info className="w-3 h-3" /> 关于 Image Studio
          </button>

          <SettingsRow label="支持与反馈">
            <div className="flex gap-1.5">
              <button
                onClick={() => openExternal(REPO_URL)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
              >
                <Github className="w-3 h-3" /> GitHub
              </button>
              <button
                onClick={() => openExternal(ISSUES_URL)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 border border-black/[0.08] px-3 py-2 text-[12px] text-zinc-700 transition-colors hover:border-[color:var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/[0.08] dark:text-zinc-300 ${usesFluentUI ? "rounded-[8px]" : "rounded-full"}`}
              >
                <MessageSquare className="w-3 h-3" /> 反馈
              </button>
            </div>
          </SettingsRow>

        </div>
        )}
      </Modal>

      <AboutImageStudioModal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onOpenFeedback={() => openExternal(REPO_URL + "/issues")}
        onOpenLicense={() => openExternal(MIT_URL)}
        onOpenRepo={() => openExternal(REPO_URL)}
        mitURL={MIT_URL}
      />
    </>
  );
}
