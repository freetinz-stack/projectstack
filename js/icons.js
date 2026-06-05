// Central SVG icon library — all icons are 16×16 viewBox, stroke-based
// Usage: ICONS.check  → SVG string (decorative, aria-hidden)
//        icon('check') → same
//        icon('check', {label:'Paid', size:20}) → with aria-label + custom size

(function(){
  var _d = {
    // Status
    check:      '<polyline points="3 8 6.5 12 13 4"/>',
    circle:     '<circle cx="8" cy="8" r="5"/>',
    hourglass:  '<path d="M4 2h8v4l-4 4 4 4v4H4v-4l4-4-4-4V2z"/>',
    warning:    '<path d="M8 2L1 14h14L8 2z"/><line x1="8" y1="7" x2="8" y2="10"/><circle cx="8" cy="12.5" r=".6" fill="currentColor" stroke="none"/>',
    info:       '<circle cx="8" cy="8" r="6"/><line x1="8" y1="6" x2="8" y2="6" stroke-width="2"/><line x1="8" y1="9" x2="8" y2="12"/>',
    star:       '<polygon points="8 1 10 6 15 6 11 9.5 12.5 15 8 11.5 3.5 15 5 9.5 1 6 6 6"/>',
    lock:       '<rect x="3" y="7" width="10" height="8" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/>',
    unlock:     '<rect x="3" y="7" width="10" height="8" rx="1"/><path d="M11 7V5a3 3 0 0 0-6 0"/>',
    // Actions
    close:      '<line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>',
    trash:      '<polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10h8l1-10"/>',
    edit:       '<path d="M11 2l3 3-9 9H2v-3L11 2z"/>',
    add:        '<line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>',
    search:     '<circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/>',
    backspace:  '<path d="M6 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6L1 8l5-6z"/><line x1="10" y1="6" x2="13" y2="10"/><line x1="13" y1="6" x2="10" y2="10"/>',
    refresh:    '<polyline points="2 8 2 2 8 2"/><path d="M2 2a6 6 0 1 1-1 5"/>',
    download:   '<path d="M8 2v10"/><polyline points="4 8 8 12 12 8"/><line x1="2" y1="14" x2="14" y2="14"/>',
    upload:     '<path d="M8 14V4"/><polyline points="4 8 8 4 12 8"/><line x1="2" y1="14" x2="14" y2="14"/>',
    restore:    '<polyline points="2 8 2 2 8 2"/><path d="M2 2a6 6 0 1 1-1 5"/>',
    copy:       '<rect x="4" y="4" width="9" height="11" rx="1"/><path d="M3 12H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/>',
    print:      '<polyline points="4 4 4 1 12 1 12 4"/><rect x="1" y="4" width="14" height="8" rx="1"/><polyline points="4 8 4 15 12 15 12 8"/>',
    expand:     '<polyline points="6 4 10 8 6 12"/>',
    collapse:   '<polyline points="10 4 6 8 10 12"/>',
    chevronUp:  '<polyline points="4 10 8 6 12 10"/>',
    chevronDown:'<polyline points="4 6 8 10 12 6"/>',
    arrowRight: '<line x1="2" y1="8" x2="14" y2="8"/><polyline points="9 3 14 8 9 13"/>',
    arrowLeft:  '<line x1="14" y1="8" x2="2" y2="8"/><polyline points="7 3 2 8 7 13"/>',
    // Navigation
    home:       '<path d="M1 9L8 2l7 7"/><path d="M3 7v7h4v-4h2v4h4V7"/>',
    calendar:   '<rect x="1" y="3" width="14" height="12" rx="1"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/>',
    settings:   '<circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/>',
    menu:       '<line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/>',
    archive:    '<rect x="1" y="1" width="14" height="4" rx="1"/><path d="M2 5v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5"/><line x1="6" y1="9" x2="10" y2="9"/>',
    // Finance
    creditCard: '<rect x="1" y="4" width="14" height="10" rx="1"/><line x1="1" y1="8" x2="15" y2="8"/>',
    coin:       '<circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="11"/><path d="M6 6.5h3a1 1 0 1 1 0 2H6a1 1 0 1 1 0 2h4"/>',
    chart:      '<line x1="2" y1="14" x2="2" y2="2"/><line x1="2" y1="14" x2="14" y2="14"/><polyline points="4 10 7 6 10 8 13 4"/>',
    chartBar:   '<rect x="2" y="9" width="3" height="5"/><rect x="6.5" y="5" width="3" height="9"/><rect x="11" y="2" width="3" height="12"/>',
    trendUp:    '<polyline points="2 12 6 7 9 10 14 4"/><polyline points="10 4 14 4 14 8"/>',
    piggyBank:  '<circle cx="9" cy="8" r="5"/><path d="M4.5 10C3 10 2 9 2 7.5 2 6 3 5 4.5 5"/><line x1="9" y1="3" x2="9" y2="1"/><path d="M12 9l1.5 1.5"/><line x1="7" y1="8" x2="11" y2="8"/>',
    wallet:     '<rect x="1" y="4" width="14" height="11" rx="1"/><path d="M15 8H1"/><circle cx="11.5" cy="11.5" r="1" fill="currentColor" stroke="none"/>',
    // Content
    receipt:    '<path d="M3 1h10v14l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5V1z"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="8" y2="11"/>',
    note:       '<path d="M11 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5l-3-4z"/><polyline points="11 1 11 5 14 5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="9" y2="11"/>',
    camera:     '<path d="M5.5 2l-1 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2.5l-1-2h-5z"/><circle cx="8" cy="8" r="2.5"/>',
    photo:      '<rect x="1" y="3" width="14" height="11" rx="1"/><circle cx="8" cy="8.5" r="2.5"/><path d="M5 3V1M11 3V1"/>',
    link:       '<path d="M10 6H6a4 4 0 0 0 0 8h1m-1-8h4a4 4 0 0 1 0 8H9"/>',
    import:     '<path d="M8 14V4"/><polyline points="4 8 8 4 12 8"/><rect x="1" y="1" width="14" height="4" rx="1"/>',
    export:     '<path d="M8 2v10"/><polyline points="4 8 8 12 12 8"/><rect x="1" y="11" width="14" height="4" rx="1"/>',
    floppy:     '<path d="M13 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4l-3-3z"/><rect x="5" y="1" width="6" height="4"/><rect x="4" y="9" width="8" height="5"/>',
    cloud:      '<path d="M13 10a4 4 0 0 0 0-8 5 5 0 0 0-10 1 3 3 0 0 0 0 7h10z"/>',
    // People / AI
    robot:      '<rect x="3" y="4" width="10" height="9" rx="1"/><line x1="8" y1="2" x2="8" y2="4"/><circle cx="8" cy="2" r="1"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><circle cx="5.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><line x1="5" y1="11" x2="11" y2="11"/>',
    chat:       '<path d="M14 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>',
    bell:       '<path d="M8 1a5 5 0 0 1 5 5v3l1.5 2.5H1.5L3 9V6a5 5 0 0 1 5-5z"/><path d="M6 12.5a2 2 0 0 0 4 0"/>',
    // Lighting / Power
    lightning:  '<polygon points="13 6 8 1 8 7 3 7 8 15 8 9 13 9"/>',
    sun:        '<circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3.1" y1="3.1" x2="4.5" y2="4.5"/><line x1="11.5" y1="11.5" x2="12.9" y2="12.9"/><line x1="12.9" y1="3.1" x2="11.5" y2="4.5"/><line x1="4.5" y1="11.5" x2="3.1" y2="12.9"/>',
    moon:       '<path d="M12 10A6 6 0 0 1 6 2a6 6 0 1 0 6 8z"/>',
    lightbulb:  '<path d="M8 1a5 5 0 0 1 5 5c0 2.5-1.5 4-3 5v2H6v-2C4.5 10 3 8.5 3 6a5 5 0 0 1 5-5z"/><line x1="6" y1="13" x2="10" y2="13"/>',
    // Category-specific
    bank:       '<line x1="8" y1="1" x2="8" y2="3"/><polygon points="1 5 8 1 15 5"/><line x1="1" y1="5" x2="15" y2="5"/><rect x="2" y="6" width="2" height="6"/><rect x="7" y="6" width="2" height="6"/><rect x="12" y="6" width="2" height="6"/><line x1="1" y1="12" x2="15" y2="12"/><line x1="1" y1="14" x2="15" y2="14"/>',
    phone:      '<rect x="4" y="1" width="8" height="14" rx="1"/><line x1="7" y1="12" x2="9" y2="12"/>',
    repeat:     '<polyline points="5 4 1 4 1 8"/><polyline points="11 12 15 12 15 8"/><path d="M15 4H9a4 4 0 0 0-4 4v0M1 12h6a4 4 0 0 0 4-4v0"/>',
    car:        '<path d="M2 9l1-4h10l1 4"/><rect x="1" y="9" width="14" height="5" rx="1"/><circle cx="4" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><line x1="6" y1="11" x2="10" y2="11"/>',
    bolt:       '<path d="M6 1L2 9h5l-2 6L14 7H9L11 1H6z"/>',
    house:      '<path d="M1 9L8 2l7 7v6H1V9z"/><rect x="6" y="10" width="4" height="5"/>',
    fork:       '<path d="M5 3v4c0 1.5 1 2.5 2 3v4"/><line x1="11" y1="3" x2="11" y2="14"/><path d="M9 3v3l2 2 2-2V3"/>',
    film:       '<rect x="1" y="3" width="14" height="10" rx="1"/><line x1="5" y1="3" x2="5" y2="13"/><line x1="11" y1="3" x2="11" y2="13"/><line x1="1" y1="8" x2="5" y2="8"/><line x1="11" y1="8" x2="15" y2="8"/>',
    hospital:   '<rect x="1" y="1" width="14" height="14" rx="1"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/>',
    mortarboard:'<polygon points="8 2 15 6 8 10 1 6"/><path d="M4 8v4c0 2 4 4 4 4s4-2 4-4V8"/><line x1="15" y1="6" x2="15" y2="10"/>',
    package:    '<path d="M13 4L8 1 3 4v8l5 3 5-3V4z"/><line x1="8" y1="1" x2="8" y2="15"/><polyline points="3 4 8 7 13 4"/>',
    // Special
    snowball:   '<circle cx="8" cy="8" r="6"/><circle cx="6" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="7" r="1.5" fill="currentColor" stroke="none"/><path d="M5.5 10.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/>',
    trophy:     '<path d="M4 1h8v6a4 4 0 0 1-8 0V1z"/><path d="M4 4H1a2 2 0 0 0 2 2"/><path d="M12 4h3a2 2 0 0 1-2 2"/><line x1="8" y1="11" x2="8" y2="13"/><line x1="5" y1="15" x2="11" y2="15"/>',
    medal:      '<circle cx="8" cy="10" r="4"/><path d="M5 1h6l-2 5H7L5 1z"/>',
    compass:    '<circle cx="8" cy="8" r="6"/><polygon points="11 5 9 9 5 11 7 7"/>',
    globe:      '<circle cx="8" cy="8" r="6"/><line x1="2" y1="8" x2="14" y2="8"/><path d="M8 2a11 11 0 0 1 0 12M8 2a11 11 0 0 0 0 12"/>',
    shuffle:    '<polyline points="14 2 11 2 14 5"/><path d="M2 14h3a3 3 0 0 0 3-3V5a3 3 0 0 1 3-3h3"/><path d="M2 2h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h3"/><polyline points="14 11 11 11 14 14"/>',
  };

  function icon(name, opts){
    opts = opts || {};
    var size  = opts.size  || 16;
    var cls   = opts.cls   ? ' class="'+opts.cls+'"' : '';
    var label = opts.label || null;
    var style = opts.style ? ' style="'+opts.style+'"' : '';
    var accessibility = label
      ? 'role="img" aria-label="'+label+'"'
      : 'aria-hidden="true"';
    var title = label ? '<title>'+label+'</title>' : '';
    var d = _d[name] || _d.close; // fallback
    return '<svg'+cls+' width="'+size+'" height="'+size+'" viewBox="0 0 16 16"'+
      ' fill="none" stroke="currentColor" stroke-width="1.5"'+
      ' stroke-linecap="round" stroke-linejoin="round"'+
      ' '+accessibility+' focusable="false"'+style+'>'+title+d+'</svg>';
  }

  window.ICONS = _d;
  window.icon  = icon;
})();
