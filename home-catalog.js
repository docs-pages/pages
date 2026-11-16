/* Progressive enhancement of the real docs home; no standalone page/router. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const labels = fetch(new URL('home-catalog-labels.json', base)).then(response => {
    if (!response.ok) throw new Error('labels');
    return response.json();
  });
  // Attach a rejection handler immediately while WASM is still starting.
  labels.catch(() => {});
  const element = (tag, text, attributes = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const size = bytes => {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
    let value = bytes, unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
    return unit ? `${value.toFixed(2)} ${units[unit]}` : `${bytes} B`;
  };
  const validCatalog = value => {
    const data = value && (value.data || value);
    if (!data || !Array.isArray(data.artifacts) || !Number.isSafeInteger(data.count) || data.count !== data.artifacts.length) throw new Error('catalog');
    const names = new Set();
    for (const item of data.artifacts) {
      if (!item || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(item.name) || names.has(item.name) || !/^[a-f0-9]{64}$/i.test(item.sha256)) throw new Error('artifact');
      names.add(item.name);
      for (const key of ['fileCount', 'totalBytes', 'updatedAt']) if (!Number.isSafeInteger(item[key]) || item[key] < 0) throw new Error('metadata');
    }
    return data;
  };
  const normalizeLocale = locale => String(locale || 'zh').toLowerCase().split(/[-_]/)[0];
  async function load(root) {
    const lang = normalizeLocale(root.dataset.docsCatalog);
    let t = key => key;
    try {
      const dictionary = await labels;
      t = key => dictionary[lang]?.[key] || key;
      root.replaceChildren(element('p', t('Loading projects…'), {role: 'status'}));
      const response = await fetch('/api/page-artifacts', {credentials: 'omit', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('request');
      const catalog = validCatalog(await response.json());
      const status = element('p', catalog.count ? `${t('Stored projects')}: ${catalog.count}` : t('No projects are available yet.'), {role: 'status'});
      const grid = element('div', undefined, {class: 'docs-catalog-grid'});
      for (const artifact of catalog.artifacts) {
        const card = element('article', undefined, {class: 'docs-catalog-card'});
        const heading = element('h3');
        heading.append(element('a', artifact.name, {href: `/pages/${artifact.name}/`}));
        const details = element('dl');
        const field = (label, node) => {
          details.append(element('dt', t(label)));
          const value = element('dd'); value.append(node); details.append(value);
        };
        field('Files', element('span', String(artifact.fileCount)));
        field('Total size', element('span', size(artifact.totalBytes), {title: `${artifact.totalBytes} B`, 'data-bytes': String(artifact.totalBytes)}));
        const date = new Date(artifact.updatedAt * 1000);
        if (!Number.isFinite(date.getTime())) throw new Error('timestamp');
        const iso = date.toISOString();
        field('Updated', element('time', new Intl.DateTimeFormat(lang, {dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC'}).format(date) + ' UTC', {datetime: iso, title: `${iso} · Unix: ${artifact.updatedAt} s`, 'data-unix-seconds': String(artifact.updatedAt)}));
        const disclosure = element('details');
        disclosure.append(element('summary', `${artifact.sha256.slice(0, 12)}…${artifact.sha256.slice(-12)}`, {'aria-label': t('Show full SHA-256')}));
        disclosure.append(element('code', artifact.sha256));
        const copy = element('button', t('Copy SHA-256'), {type: 'button'});
        const notice = element('p', '', {role: 'status', 'aria-live': 'polite'});
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(artifact.sha256); notice.textContent = t('Copied'); }
          catch { notice.textContent = t('Copy failed; select the full value to copy manually.'); }
        });
        disclosure.append(copy, notice);
        field('SHA-256', disclosure);
        card.append(heading, details); grid.append(card);
      }
      root.replaceChildren(status, grid);
    } catch {
      const status = element('p', t('Projects could not be loaded. Please try again later.'), {role: 'alert'});
      const retry = element('button', {zh: '重试', en: 'Retry', ja: '再試行', ko: '다시 시도'}[lang] || 'Retry', {type: 'button'});
      retry.addEventListener('click', () => load(root));
      root.replaceChildren(status, retry);
    }
  }
  // Docs navigates between locale homes without reloading the document.
  const scan = () => {
    if (typeof document === 'undefined' || !document.documentElement) return;
    for (const root of document.querySelectorAll('[data-docs-catalog]')) {
      if (root.dataset.catalogMounted === root.dataset.docsCatalog) continue;
      root.dataset.catalogMounted = root.dataset.docsCatalog;
      load(root);
    }
  };
  new MutationObserver(scan).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['data-docs-catalog']});
  scan();
})();
