// js/darkmode.js — Design + dark-mode fast path (must load in <head> before body renders)
// Restores both the design system and dark mode before first paint to prevent FOUC.
// Also injects only the Google Font(s) needed for the active theme — avoids loading 8 families.
(function(){
  try {
    var dark   = localStorage.getItem('finflow_dark_cache');
    var design = localStorage.getItem('fincwin_design') || '';
    if (dark === 'true') document.body.classList.add('dark');
    if (design) document.body.setAttribute('data-design', design);

    // Map each design token to its required font families (Google Fonts query fragment)
    var THEME_FONTS = {
      'clay':       'Nunito:wght@400;600;700;800',
      'glass':      'Manrope:wght@400;500;600;700;800',
      'neuro':      'Space+Grotesk:wght@400;500;600;700',
      'bento':      'Plus+Jakarta+Sans:wght@400;500;600;700;800'
    };
    // Default / editorial themes (editorial-a, editorial-b, editorial-c, '') use Instrument Serif + Hanken Grotesk
    var themeFont = THEME_FONTS[design] || 'Instrument+Serif&family=Hanken+Grotesk:wght@400;500;600;700';
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + themeFont + '&display=swap';
    // Insert immediately after this script tag so the font request is issued as early as possible
    var s = document.currentScript || document.querySelector('script[src*="darkmode"]');
    if (s && s.parentNode) s.parentNode.insertBefore(link, s.nextSibling);
    else document.head.appendChild(link);
  } catch(e) {}
}());
