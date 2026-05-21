import { Folder, Github, MessageSquare } from "lucide-react";
import { useStudioStore } from "../../state/studioStore";
import { OpenExternalURL, OpenOutputDir } from "../../../wailsjs/go/backend/Service";

const REPO_URL = "https://github.com/RoseKhlifa/Image-Studio";
const ISSUES_URL = "https://github.com/RoseKhlifa/Image-Studio/issues";
const VERSION = "0.1.3";

export function FooterBar() {
  const { fullscreen, history, runningJobs, isRunning, pushToast } = useStudioStore();
  if (fullscreen) return null;

  // 今日已生图 = 本地日历当天 00:00 起的条目数,不是「最近 24h」滚动窗口。
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = history.filter((h) => h.createdAt >= todayStart.getTime()).length;

  function open(url: string) {
    OpenExternalURL(url).catch(() => pushToast("无法打开浏览器", "error"));
  }

  return (
    <footer className="h-8 px-4 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-t border-black/[0.08] dark:border-white/[0.06]">
      <div className="flex items-center gap-1">
        <FooterBtn onClick={() => OpenOutputDir().catch(() => undefined)}>
          <Folder className="w-3 h-3" /> 输出目录
        </FooterBtn>
        <FooterBtn onClick={() => open(REPO_URL)}>
          <Github className="w-3 h-3" /> GitHub
        </FooterBtn>
        <FooterBtn onClick={() => open(ISSUES_URL)}>
          <MessageSquare className="w-3 h-3" /> 反馈
        </FooterBtn>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-baseline gap-1">
          <span className="opacity-70">今日已生图:</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{todayCount}</span>
        </span>
        <span className="opacity-40">·</span>
        <span className="flex items-baseline gap-1">
          <span className="opacity-70">总生图:</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">{history.length}</span>
        </span>
        {isRunning && (
          <>
            <span className="opacity-40">·</span>
            <span className="flex items-baseline gap-1">
              <span className="opacity-70">并发</span>
              <span className="font-medium text-emerald-500 tabular-nums">{runningJobs.length}</span>
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>{isRunning ? "运行中" : "就绪"}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isRunning
              ? "bg-emerald-500 shadow-[0_0_6px_rgb(16_185_129_/_0.8)] animate-pulse"
              : "bg-zinc-400 dark:bg-zinc-600"
          }`}
        />
        <span className="font-mono-token text-zinc-400 dark:text-zinc-600">v{VERSION}</span>
      </div>
    </footer>
  );
}

function FooterBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 inline-flex items-center gap-1 rounded hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
    >
      {children}
    </button>
  );
}
