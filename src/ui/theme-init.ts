(function initTheme() {
  try {
    const raw = localStorage.getItem('dict_setting_theme');
    const theme = raw ? raw.replace(/^"|"$/g, '') : 'dark';
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.classList.toggle('light-theme', !isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
    if (document.body) {
      document.body.classList.toggle('dark', isDark);
      document.body.classList.toggle('light', !isDark);
      document.body.classList.toggle('light-theme', !isDark);
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      document.body.style.colorScheme = isDark ? 'dark' : 'light';
    }
  } catch {}
})();
