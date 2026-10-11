import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  IGNORE_KEY,
  clearIgnoredVersion,
  classifyUpdateError,
  computeProgress,
  decideCheckPhase,
  getIgnoredVersion,
  ignoreVersion,
} from "./updateLogic";
import { useUpdateStore } from "@/store/updateStore";

// updater 插件 mock：node 环境没有 Tauri，store 里的动态 import 命中这里的 check
const checkMock = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/plugin-updater", () => ({ check: checkMock }));

// node 环境没有 localStorage，用内存实现 mock（测试间用例互不污染）
class MemStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("computeProgress（下载进度百分比）", () => {
  it("total 为 0 时返回 null（大小未知，无法计算百分比）", () => {
    expect(computeProgress(0, 0)).toBeNull();
    expect(computeProgress(1024, 0)).toBeNull();
  });

  it("正常区间按四舍五入计算百分比", () => {
    expect(computeProgress(0, 200)).toBe(0);
    expect(computeProgress(50, 200)).toBe(25);
    expect(computeProgress(100, 300)).toBe(33); // 33.33 → 33
    expect(computeProgress(200, 200)).toBe(100);
  });

  it("越界值钳制在 0-100 之间", () => {
    expect(computeProgress(300, 200)).toBe(100);
    expect(computeProgress(-5, 200)).toBe(0);
  });

  it("total 为负数时视为未知大小返回 null", () => {
    expect(computeProgress(10, -1)).toBeNull();
  });
});

describe("decideCheckPhase（检查结果决策）", () => {
  it("无更新时返回 up-to-date", () => {
    expect(decideCheckPhase(false, null, null)).toBe("up-to-date");
    expect(decideCheckPhase(false, "0.3.0", null)).toBe("up-to-date");
  });

  it("有更新且未忽略该版本时返回 available", () => {
    expect(decideCheckPhase(true, "0.3.0", null)).toBe("available");
    expect(decideCheckPhase(true, "0.3.0", "0.2.0")).toBe("available");
  });

  it("有更新但该版本已被忽略时返回 up-to-date（不打扰用户）", () => {
    expect(decideCheckPhase(true, "0.3.0", "0.3.0")).toBe("up-to-date");
  });

  it("忽略的是旧版本、来了更新的新版本时仍返回 available", () => {
    expect(decideCheckPhase(true, "0.4.0", "0.3.0")).toBe("available");
  });
});

describe("忽略版本的 localStorage 读写", () => {
  it("写后能读到", () => {
    expect(getIgnoredVersion()).toBeNull();
    ignoreVersion("0.3.0");
    expect(getIgnoredVersion()).toBe("0.3.0");
    // 直接从 localStorage 里也能验证 key 与值
    expect(localStorage.getItem(IGNORE_KEY)).toBe("0.3.0");
  });

  it("重复写入覆盖旧值", () => {
    ignoreVersion("0.3.0");
    ignoreVersion("0.4.0");
    expect(getIgnoredVersion()).toBe("0.4.0");
  });

  it("clearIgnoredVersion 清除后读不到", () => {
    ignoreVersion("0.3.0");
    expect(getIgnoredVersion()).toBe("0.3.0");
    clearIgnoredVersion();
    expect(getIgnoredVersion()).toBeNull();
  });
});

describe("classifyUpdateError（更新错误分类转译）", () => {
  it("按分类规则表把原始英文报错转译成中文提示", () => {
    const cases: Array<[string, string]> = [
      // 规则1：ReleaseNotFound（两个更新端点都没有 latest.json，典型场景：新版本尚未发布）
      [
        "Error: Could not fetch a valid release JSON from the remote",
        "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试",
      ],
      [
        "updater error: ReleaseNotFound: no latest.json on remote",
        "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试",
      ],
      // 规则1 优先于规则2：原文同时含 "fetch"/"connection" 也必须判为「未发布」
      [
        "Could not fetch a valid release JSON from the remote (connection refused)",
        "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试",
      ],
      // 规则2：网络类
      [
        "error sending request: error trying to connect: dns error: failed to lookup address information",
        "网络连接失败，请检查网络后重试",
      ],
      [
        "NetworkError: failed to fetch update: connection reset by peer",
        "网络连接失败，请检查网络后重试",
      ],
      ["request timed out after 30s", "网络连接失败，请检查网络后重试"],
      ["url error: unsupported scheme", "网络连接失败，请检查网络后重试"],
      // 规则3：签名校验
      [
        "signature verification failed: could not verify update signature",
        "更新包签名校验失败，为保证安全已中止更新",
      ],
      ["public key mismatch", "更新包签名校验失败，为保证安全已中止更新"],
      // 规则4：权限
      ["updater not allowed: permission denied", "没有权限执行更新操作"],
      // 规则5：未知错误原样返回
      ["boom", "boom"],
    ];
    for (const [raw, expected] of cases) {
      expect(classifyUpdateError(raw)).toBe(expected);
    }
  });

  it("匹配大小写不敏感", () => {
    expect(classifyUpdateError("Error(ReleaseNotFound)")).toBe(
      "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试"
    );
    expect(classifyUpdateError("Request Timed Out")).toBe(
      "网络连接失败，请检查网络后重试"
    );
  });

  it("空错误返回「未知错误」", () => {
    expect(classifyUpdateError("")).toBe("未知错误");
  });
});

describe("updateStore（错误信息接线：runCheck / downloadAndInstall）", () => {
  beforeEach(() => {
    // 让 isTauriEnvironment() 为 true，走进真正的插件调用（被 mock）
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    checkMock.mockReset();
    useUpdateStore.setState({
      phase: "idle",
      version: null,
      notes: null,
      progress: 0,
      downloaded: 0,
      total: 0,
      error: null,
      ignoredVersion: null,
    });
  });

  it("静默检查失败：回到 idle 且不写 error（不打扰用户）", async () => {
    checkMock.mockRejectedValueOnce(
      new Error("Could not fetch a valid release JSON from the remote")
    );
    await useUpdateStore.getState().silentCheck();
    const s = useUpdateStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.error).toBeNull();
  });

  it("手动检查失败：写入分类后的中文文案", async () => {
    checkMock.mockRejectedValueOnce(
      new Error("Could not fetch a valid release JSON from the remote")
    );
    const phase = await useUpdateStore.getState().checkNow();
    expect(phase).toBe("error");
    expect(useUpdateStore.getState().error).toBe(
      "更新服务器暂未提供新版本（可能仍在发布流程中），请稍后再试"
    );
  });

  it("下载失败：写入分类后的中文文案", async () => {
    useUpdateStore.setState({ phase: "available", version: "0.3.0" });
    checkMock.mockRejectedValueOnce(
      new Error("error sending request: connection refused")
    );
    await useUpdateStore.getState().downloadAndInstall();
    const s = useUpdateStore.getState();
    expect(s.phase).toBe("error");
    expect(s.error).toBe("网络连接失败，请检查网络后重试");
  });
});
