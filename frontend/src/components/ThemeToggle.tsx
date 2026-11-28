import { useSyncExternalStore } from "react";

export type ThemeMode = "system" | "light" | "dark";

const NEXT_THEME: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem("certum-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function applyTheme(next: ThemeMode) {
  const root = document.documentElement;
  if (next === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = next;
  }
  try {
    if (next === "system") {
      localStorage.removeItem("certum-theme");
    } else {
      localStorage.setItem("certum-theme", next);
    }
  } catch {
    // Ignore storage quota errors
  }
  window.dispatchEvent(new Event("certum-theme-change"));
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("certum-theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("certum-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "system" as ThemeMode,
  );
  const next = NEXT_THEME[theme];
  const iconClass =
    theme === "light"
      ? "bi-sun-fill"
      : theme === "dark"
        ? "bi-moon-stars-fill"
        : "bi-circle-half";

  return (
    <button
      type="button"
      className="certum-icon-btn"
      aria-label={`${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[next].toLowerCase()}`}
      title={THEME_LABEL[theme]}
      onClick={() => applyTheme(next)}
    >
      <i className={`bi ${iconClass}`} aria-hidden="true" />
    </button>
  );
}
