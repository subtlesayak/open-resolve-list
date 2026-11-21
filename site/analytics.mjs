import {installDiscoveryEvents} from './discovery-events.mjs';
import {FORMAT_LABELS} from './model.mjs';
import {resourceIds,creatorIds} from './analytics-ids.mjs';
import {umamiConfig} from './analytics-config.mjs?v=2';

const origin = 'https://subtlesayak.github.io';
const prefix = '/open-resolve-list/';
const placements = {
  tool_outbound_click: ['browse', 'detail', 'resource', 'directory', 'workflow'],
  creator_outbound_click: ['creator_directory', 'creator_profile'],
};
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function trackerUrl(page, config) {
  if (page.origin !== origin || !page.pathname.startsWith(prefix)) return null;
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(config.websiteId)) return null;
  try {
    const script = new URL(config.scriptUrl);
    return script.protocol === 'https:' && script.origin !== origin && !script.username &&
      !script.password && !script.search && !script.hash ? script : null;
  } catch {
    return null;
  }
}

export function pageContext(page, referrer) {
  let source = '';
  try {
    const url = new URL(referrer);
    if (/^https?:$/.test(url.protocol) && url.origin !== page.origin) source = url.origin;
  } catch {}
  return {url: page.pathname, referrer: source};
}

export function clickData(event, id, placement) {
  if (!placements[event]?.includes(placement) || typeof id !== 'string' ||
      id.length > 150 || !slug.test(id) || !(event==='tool_outbound_click'?resourceIds:creatorIds).includes(id)) return null;
  return {id, placement};
}

function startAnalytics() {
  const page = new URL(location.href);
  const url = trackerUrl(page, umamiConfig);
  if (!url) return;
  const context = pageContext(page, document.referrer);
  const send = (name, data) => {
    try { window.umami?.track(defaults => ({
      website: umamiConfig.websiteId,
      hostname: page.hostname,
      screen: defaults.screen,
      language: defaults.language,
      ...context,
      ...(name ? {name, data} : {}),
    }))?.catch?.(() => {}); } catch {}
  };
  const script = document.createElement('script');
  script.src = url.href;
  script.referrerPolicy = 'no-referrer';
  script.dataset.websiteId = umamiConfig.websiteId;
  script.dataset.autoTrack = 'false';
  script.dataset.domains = 'subtlesayak.github.io';
  script.dataset.excludeSearch = 'true';
  script.dataset.excludeHash = 'true';
  script.addEventListener('load', () => send(), {once: true});
  document.head.append(script);

  const trackLink = event => {
    const link = event.target.closest?.('a[data-analytics-event]');
    if (!link || link.protocol !== 'https:' || link.origin === origin) return;
    const {analyticsEvent, analyticsId, analyticsPlacement} = link.dataset;
    const data = clickData(analyticsEvent, analyticsId, analyticsPlacement);
    if (data) send(analyticsEvent, data);
  };
  document.addEventListener('click', trackLink);
  document.addEventListener('auxclick', event => {
    if (event.button === 1) trackLink(event);
  });
  document.addEventListener('resolve:compare-opened', () => send('compare_opened'));
  installDiscoveryEvents({send,page,creatorIds,formats:Object.keys(FORMAT_LABELS)});
}

if (typeof document !== 'undefined') startAnalytics();
