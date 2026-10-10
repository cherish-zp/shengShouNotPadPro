import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  IGNORE_KEY,
  clearIgnoredVersion,
  computeProgress,
  decideCheckPhase,
  getIgnoredVersion,
  ignoreVersion,
} from "./updateLogic";

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
