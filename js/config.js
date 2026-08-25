/* Q Berries · Rendimientos — config */
window.QB = window.QB || {};

(function () {
  var host = '';
  var proto = '';
  try {
    host = location.hostname || '';
    proto = location.protocol || '';
  } catch (e) {}
  var isFile = proto === 'file:';
  var isNetlify =
    host.indexOf('netlify.app') >= 0 ||
    host.indexOf('netlify.com') >= 0 ||
    (!isFile && host && host !== '127.0.0.1' && host !== 'localhost' && host !== '');

  /** Apps Script Web App (GET) */
  var APPS_SCRIPT =
    'https://script.google.com/macros/s/AKfycbyZdvK2-8VuA6NOd1sNcnSg2F4B3mYjC-kstZIZMZdtUK-buhpcB7BTx68OVmnjZjEdqg/exec';

  QB.config = {
    tz: 'America/Lima',
    isFileProtocol: isFile,
    appsScriptUrl: APPS_SCRIPT,
    /**
     * Index corrido (Live Server / local / prod):
     * - Netlify → proxy /api/produccion
     * - resto → Apps Script directo
     */
    apiBase: isFile ? '' : isNetlify ? '/api/produccion' : APPS_SCRIPT,
    forceDemo: false,
    pageSize: 12,
    topN: 25,
    brand: 'Q Berries'
  };
})();
