/* Q Berries · Rendimientos — config */
window.QB = window.QB || {};

(function () {
  var proto = '';
  try {
    proto = location.protocol || '';
  } catch (e) {}
  var isFile = proto === 'file:';

  /** Apps Script público — un solo GET, sin proxy ni token */
  var APPS_SCRIPT =
    'https://script.google.com/macros/s/AKfycbyZdvK2-8VuA6NOd1sNcnSg2F4B3mYjC-kstZIZMZdtUK-buhpcB7BTx68OVmnjZjEdqg/exec';

  QB.config = {
    tz: 'America/Lima',
    isFileProtocol: isFile,
    appsScriptUrl: APPS_SCRIPT,
    /* Local y Netlify: mismo GET directo (rápido, sin Function) */
    apiBase: isFile ? '' : APPS_SCRIPT,
    forceDemo: false,
    pageSize: 12,
    topN: 25,
    brand: 'Q Berries',
    appVersion: 'm355'
  };
})();
