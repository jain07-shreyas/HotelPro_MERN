export const getStoredTheme = () => {
  try {
    return localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {
    return 'light';
  }
};
export const applyTheme = (theme) => document.documentElement.classList.toggle('dark', theme === 'dark');
export const setTheme = (theme) => {
  try { localStorage.setItem('theme', theme); } catch { /* storage may be blocked */ }
  applyTheme(theme);
};
export const initTheme = () => applyTheme(getStoredTheme());
