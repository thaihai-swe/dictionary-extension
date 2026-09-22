(function () {
  try {
    var raw = localStorage.getItem('dict_setting_theme');
    var theme = raw ? raw.replace(/^"|"$/g, '') : 'dark';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.classList.toggle('light-theme', !isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
