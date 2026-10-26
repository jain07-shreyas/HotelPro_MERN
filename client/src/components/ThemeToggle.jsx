import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getStoredTheme, setTheme } from '../utils/theme';

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getStoredTheme());
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2.5 rounded-xl border border-slate-700 hover:border-brand-500 text-slate-300 hover:text-brand-500 transition-colors cursor-pointer"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
