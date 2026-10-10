import { create } from "zustand";
import type { UpdatePhase } from "@/utils/updateLogic";
import {
  computeProgress,
  decideCheckPhase,
  getIgnoredVersion,
  ignoreVersion as persistIgnoredVersion,
  isTauriEnvironment,
} from "@/utils/updateLogic";

/**
 * 应用内一键更新状态机（zustand 版，移植自圣手码头 use-app-updater）：
 *
 *   idle → checking → available → downloading（进度）→ ready →（重启生效）
 *                    ↘ up-to-date / error
 *
 * 触发时机：启动 8s 后静默检查 + 每 60 分钟静默检查 + 设置页手动检查。
 * 「忽略此版本」持久化到 localStorage（key 见 updateLogic.IGNORE_KEY）。
 */

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 每 60 分钟静默检查
const STARTUP_DELAY_MS = 8 * 1000; // 启动后等 8s 再首查，让应用先安定下来

// 模块级防重复调度：App 在 StrictMode 下 effect 会执行两次，只允许挂一套定时器
let autoCheckStarted = false;

interface UpdateStore {
  phase: UpdatePhase;
  /** 新版本号（available / ready 阶段） */
  version: string | null;
  /** latest.json 里的更新说明 */
  notes: string | null;
  /** 下载进度 0-100 */
  progress: number;
  /** 已下载 / 总字节数 */
  downloaded: number;
  total: number;
  /** 错误信息（仅手动检查与下载失败会写入；静默检查失败保持 idle） */
  error: string | null;
  /** 用户忽略的版本号 */
  ignoredVersion: string | null;

  /** 手动检查（设置页），失败进入 error 态 */
  checkNow: () => Promise<UpdatePhase>;
  /** 静默检查（启动/定时），失败保持 idle 不弹错误 */
  silentCheck: () => Promise<void>;
  /** 下载并安装更新 */
  downloadAndInstall: () => Promise<void>;
  /** 重启应用以完成更新 */
  restartToUpdate: () => Promise<void>;
  /** 忽略当前新版本（不再提示） */
  ignoreCurrentVersion: () => void;
  /** 关闭错误横幅 */
  dismissError: () => void;
  /** App 挂载时调用一次：8s 后首查 + 每 60 分钟定时查 */
  startAutoCheck: () => void;
}

// 静默/手动检查共用一套流程；silent=true 时失败不进 error 态
async function runCheck(
  get: () => UpdateStore,
  set: (partial: Partial<UpdateStore>) => void,
  silent: boolean
): Promise<UpdatePhase> {
  const { phase } = get();
  if (phase === "checking" || phase === "downloading") return phase;

  set({ phase: "checking", error: null });
  // 非 Tauri 环境（浏览器 dev）直接视为最新，不报错
  if (!isTauriEnvironment()) {
    set({ phase: "up-to-date" });
    return "up-to-date";
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    const ignored = get().ignoredVersion ?? getIgnoredVersion();
    const nextPhase = decideCheckPhase(!!update, update?.version ?? null, ignored);
    if (nextPhase === "available" && update) {
      set({
        phase: "available",
        version: update.version,
        notes: update.body ?? null,
        error: null,
      });
    } else {
      set({ phase: "up-to-date", version: update?.version ?? null });
    }
    return nextPhase;
  } catch (e) {
    if (silent) {
      // 静默检查失败（如还没发布 latest.json）：回到 idle，不打扰用户
      set({ phase: "idle", error: null });
    } else {
      set({ phase: "error", error: String(e) });
    }
    return silent ? "idle" : "error";
  }
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  phase: "idle",
  version: null,
  notes: null,
  progress: 0,
  downloaded: 0,
  total: 0,
  error: null,
  ignoredVersion: getIgnoredVersion(),

  checkNow: () => runCheck(get, set, false),

  silentCheck: async () => {
    await runCheck(get, set, true);
  },

  downloadAndInstall: async () => {
    if (get().phase !== "available") return;
    set({ phase: "downloading", progress: 0, downloaded: 0, total: 0 });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        set({ phase: "error", error: "更新已失效，请重新检查" });
        return;
      }
      await update.downloadAndInstall((event) => {
        const s = get();
        switch (event.event) {
          case "Started":
            set({ total: event.data.contentLength ?? 0 });
            break;
          case "Progress": {
            const downloaded = s.downloaded + event.data.chunkLength;
            // total 未知时保持原进度（computeProgress 返回 null）
            const progress = computeProgress(downloaded, s.total) ?? s.progress;
            set({ downloaded, progress });
            break;
          }
          case "Finished":
            set({ progress: 100 });
            break;
        }
      });
      set({ phase: "ready" });
    } catch (e) {
      set({ phase: "error", error: String(e) });
    }
  },

  restartToUpdate: async () => {
    if (!isTauriEnvironment()) return;
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  },

  ignoreCurrentVersion: () => {
    const { version } = get();
    if (!version) return;
    persistIgnoredVersion(version);
    set({ ignoredVersion: version, phase: "idle", version: null, notes: null });
  },

  dismissError: () => {
    set({ phase: "idle", error: null });
  },

  startAutoCheck: () => {
    if (autoCheckStarted) return;
    autoCheckStarted = true;
    setTimeout(() => void get().silentCheck(), STARTUP_DELAY_MS);
    setInterval(() => void get().silentCheck(), CHECK_INTERVAL_MS);
  },
}));
