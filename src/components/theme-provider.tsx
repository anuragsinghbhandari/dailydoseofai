import * as React from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  defaultTheme?: Theme;
  storageKey?: string;
  children: React.ReactNode;
}

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "system",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTheme: () => {}
});

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ai-dose-theme"
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    const stored =
      (window.localStorage.getItem(storageKey) as Theme | null) ??
      defaultTheme;
    applyTheme(stored);
  }, [defaultTheme, storageKey]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      applyTheme(next);
      window.localStorage.setItem(storageKey, next);
    },
    [storageKey]
  );

  function applyTheme(next: Theme) {
    setThemeState(next);
    const root = window.document.documentElement;

    const systemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const resolved =
      next === "system" ? (systemDark ? "dark" : "light") : next;

    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

