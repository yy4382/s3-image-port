function __setTheme() {
  const root = window.document.documentElement;
  let theme;
  try {
    theme = JSON.parse(localStorage.getItem("s3ip:root:theme") || '"system"');
  } catch {
    theme = "system";
  }
  root.classList.remove("light", "dark");
  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
    return;
  }
  root.classList.add(theme);
}
__setTheme();
