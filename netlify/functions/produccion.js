/**
 * Netlify Function — proxy a Apps Script (sin token)
 * Env opcional: APPS_SCRIPT_URL
 */
const fetch = globalThis.fetch;

const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyZdvK2-8VuA6NOd1sNcnSg2F4B3mYjC-kstZIZMZdtUK-buhpcB7BTx68OVmnjZjEdqg/exec';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const url = process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    // default action=todo
    if (!params.has('action')) params.set('action', 'todo');

    let target = url + (url.includes('?') ? '&' : '?') + params.toString();
    const init = { method: 'GET', redirect: 'follow' };

    if (event.httpMethod === 'POST') {
      init.method = 'POST';
      init.headers = { 'Content-Type': 'application/json' };
      let body = {};
      try {
        body = event.body ? JSON.parse(event.body) : {};
      } catch (_) {
        body = {};
      }
      params.forEach((v, k) => {
        if (body[k] == null) body[k] = v;
      });
      if (!body.action) body.action = 'todo';
      init.body = JSON.stringify(body);
      target = url;
    }

    const res = await fetch(target, init);
    const text = await res.text();
    return { statusCode: res.status, headers, body: text };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ ok: false, error: 'PROXY_FAILED', detail: String(err.message || err) })
    };
  }
};
