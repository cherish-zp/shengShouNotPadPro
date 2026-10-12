import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";

// node 环境没有 localStorage，用内存实现 mock（参考 src/utils/updateLogic.test.ts 的 MemStorage 模式）
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
  // 只重置测试涉及的字段，避免用例间串扰（不触碰需要 DOM 的视觉字段）
  useSettingsStore.setState({ fontSize: 14 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("settingsStore 持久化防抖", () => {
  it("updateSetting 立即更新内存状态，但不立即写 localStorage", () => {
    vi.useFakeTimers();
    useSettingsStore.getState().updateSetting("fontSize", 18);
    expect(useSettingsStore.getState().fontSize).toBe(18);
    expect(localStorage.getItem("novaedit-settings")).toBeNull();
  });

  it("500ms 防抖窗口内的多次调整合并为一次写入，值为最后调整", () => {
    vi.useFakeTimers();
    const setItemSpy = vi.spyOn(localStorage, "setItem");

    useSettingsStore.getState().updateSetting("fontSize", 16);
    vi.advanceTimersByTime(200);
    useSettingsStore.getState().updateSetting("fontSize", 18); // 重置防抖计时
    vi.advanceTimersByTime(200);
    expect(setItemSpy).not.toHaveBeenCalled(); // 距最后一次调整不足 500ms

    vi.advanceTimersByTime(300); // 距最后一次调整满 500ms
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(setItemSpy.mock.calls[0][1]);
    expect(saved.fontSize).toBe(18);
  });

  it("resetDefaults 保持同步写盘（不走防抖）", () => {
    vi.stubGlobal("document", {
      documentElement: {
        classList: { remove: vi.fn(), add: vi.fn(), toggle: vi.fn() },
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
      },
      body: { style: {} },
    });
    useSettingsStore.setState({ fontSize: 20 });
    useSettingsStore.getState().resetDefaults();
    const saved = JSON.parse(localStorage.getItem("novaedit-settings")!);
    expect(saved.fontSize).toBe(14); // DEFAULTS.fontSize
  });

  it("saveSettings 直接调用仍同步写盘", () => {
    useSettingsStore.getState().saveSettings();
    const saved = JSON.parse(localStorage.getItem("novaedit-settings")!);
    expect(saved.fontSize).toBe(14);
  });
});

describe("loadSettings 旧版本遗留键清理", () => {
  it("忽略旧 localStorage 残留的 sidebarWidth 键，不将其混入 state", () => {
    // loadSettings 内部会调用 apply* 系列写 documentElement/body，需按 resetDefaults 用例的方式 stub document
    vi.stubGlobal("document", {
      documentElement: {
        classList: { remove: vi.fn(), add: vi.fn(), toggle: vi.fn() },
        style: { setProperty: vi.fn(), removeProperty: vi.fn() },
      },
      body: { style: {} },
    });
    localStorage.setItem("novaedit-settings", JSON.stringify({ fontSize: 18, sidebarWidth: 999 }));
    useSettingsStore.getState().loadSettings();
    const state = useSettingsStore.getState() as unknown as Record<string, unknown>;
    expect(state.fontSize).toBe(18); // 正常键照常生效
    expect("sidebarWidth" in state).toBe(false); // 遗留键被防御性删除
  });
});
