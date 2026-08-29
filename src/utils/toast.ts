/**
 * 极轻量 toast 提示：全局单例容器，逐条堆叠，2.5s 自动消失。
 * 仅用于贴图等操作的非阻塞反馈，样式跟随主题 CSS 变量。
 */

interface ToastOptions {
  type?: "info" | "error";
  duration?: number;
}

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    left: "50%",
    bottom: "48px",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    zIndex: "99999",
    pointerEvents: "none",
  });
  document.body.appendChild(container);
  return container;
}

export function toast(message: string, options: ToastOptions = {}): void {
  if (typeof document === "undefined") return;
  const { type = "info", duration = 2500 } = options;

  const item = document.createElement("div");
  item.textContent = message;
  Object.assign(item.style, {
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "12.5px",
    lineHeight: "1.4",
    maxWidth: "360px",
    color: type === "error" ? "#fff" : "var(--text-primary, #1d1d1f)",
    background: type === "error" ? "var(--error, #ff3b30)" : "var(--glass-bg-strong, rgba(255,255,255,0.9))",
    border: "0.5px solid var(--border-strong, rgba(0,0,0,0.12))",
    boxShadow: "var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.12))",
    backdropFilter: "var(--glass-blur, blur(24px))",
    WebkitBackdropFilter: "var(--glass-blur, blur(24px))",
    opacity: "0",
    transform: "translateY(6px)",
    transition: "opacity 180ms cubic-bezier(0.4,0,0.2,1), transform 180ms cubic-bezier(0.4,0,0.2,1)",
  });
  ensureContainer().appendChild(item);

  requestAnimationFrame(() => {
    item.style.opacity = "1";
    item.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    item.style.opacity = "0";
    item.style.transform = "translateY(6px)";
    window.setTimeout(() => item.remove(), 220);
  }, duration);
}
