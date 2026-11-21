import {writeFileSync} from 'node:fs';

const websiteId = process.env.UMAMI_WEBSITE_ID?.trim();
if (websiteId) {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(websiteId)) {
    throw new Error('UMAMI_WEBSITE_ID must be a website UUID');
  }

  const config = {scriptUrl: 'https://cloud.umami.is/script.js', websiteId};
  const target = new URL('../site/analytics-config.mjs', import.meta.url);
  writeFileSync(target, `export const umamiConfig = ${JSON.stringify(config)};\n`);
}
