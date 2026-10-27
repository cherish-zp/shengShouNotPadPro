import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  formatFileSize,
  formatFileSizeTooltip,
  getFileSizeBytes,
} from "./fileSize";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe("fileSize", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe("formatFileSize", () => {
    it("formats bytes without decimals", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats base-1024 units with one decimal", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(12 * 1024 + 410)).toBe("12.4 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
      expect(formatFileSize(1024 ** 3)).toBe("1.0 GB");
      expect(formatFileSize(1024 ** 4)).toBe("1.0 TB");
    });

    it("returns null for invalid sizes", () => {
      expect(formatFileSize(null)).toBeNull();
      expect(formatFileSize(undefined)).toBeNull();
      expect(formatFileSize(Number.NaN)).toBeNull();
      expect(formatFileSize(Number.POSITIVE_INFINITY)).toBeNull();
      expect(formatFileSize(Number.NEGATIVE_INFINITY)).toBeNull();
      expect(formatFileSize(-1)).toBeNull();
    });
  });

  describe("formatFileSizeTooltip", () => {
    it("formats the raw byte count for tooltips", () => {
      expect(formatFileSizeTooltip(12682)).toBe("12,682 字节");
    });

    it("returns null for invalid sizes", () => {
      expect(formatFileSizeTooltip(null)).toBeNull();
      expect(formatFileSizeTooltip(undefined)).toBeNull();
      expect(formatFileSizeTooltip(Number.NaN)).toBeNull();
      expect(formatFileSizeTooltip(Number.POSITIVE_INFINITY)).toBeNull();
      expect(formatFileSizeTooltip(-1)).toBeNull();
    });
  });

  describe("getFileSizeBytes", () => {
    it("invokes the Tauri get_file_size command", async () => {
      invokeMock.mockResolvedValueOnce(12682);

      await expect(getFileSizeBytes("/tmp/example.txt")).resolves.toBe(12682);
      expect(invokeMock).toHaveBeenCalledWith("get_file_size", { path: "/tmp/example.txt" });
    });

    it("returns null when the Tauri command fails", async () => {
      invokeMock.mockRejectedValueOnce(new Error("not found"));

      await expect(getFileSizeBytes("/tmp/missing.txt")).resolves.toBeNull();
    });
  });
});
