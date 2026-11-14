import assert from 'node:assert/strict';
import test from 'node:test';
import {clickData, pageContext, trackerUrl} from '../site/analytics.mjs';
import {umamiConfig} from '../site/analytics-config.mjs';

const production = 'https://subtlesayak.github.io/open-resolve-list/';
const config = {
  scriptUrl: 'https://analytics.example/script.js',
  websiteId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
};

test('Umami is opt-in and restricted to the production project over HTTPS', () => {
  assert.equal(trackerUrl(new URL(production), config).href, config.scriptUrl);
  for (const url of [
    'http://localhost/open-resolve-list/',
    'http://subtlesayak.github.io/open-resolve-list/',
    'https://subtlesayak.github.io/portfolio/',
    'https://subtlesayak.github.io/open-resolve-list-preview/',
  ]) assert.equal(trackerUrl(new URL(url), config), null);
  assert.equal(trackerUrl(new URL(production), {...config, websiteId: ''}), null);
  assert.equal(trackerUrl(new URL(production), {...config, scriptUrl: config.scriptUrl + '?token=private'}), null);
  assert.equal(trackerUrl(new URL('http://localhost/'), umamiConfig), null);
});

test('analytics context removes searches, fragments and referrer details', () => {
  const page = new URL(production + '?q=private&edition=Studio#private');
  assert.deepEqual(pageContext(page, 'https://example.com/account?email=private#private'), {
    url: '/open-resolve-list/', referrer: 'https://example.com',
  });
  assert.equal(pageContext(page, production + '?q=private').referrer, '');
  assert.equal(pageContext(page, 'file:///private').referrer, '');
});

test('event data is limited to a public catalogue slug and known placement', () => {
  assert.deepEqual(clickData('tool_outbound_click', '3d-cube-dctl-and-cube-slice', 'browse'), {
    id: '3d-cube-dctl-and-cube-slice', placement: 'browse',
  });
  assert.equal(clickData('tool_outbound_click', 'a@example.com', 'browse'), null);
  assert.equal(clickData('creator_outbound_click', 'example-creator', 'browse'), null);
  assert.equal(clickData('affiliate_click', 'example-tool', 'browse'), null);
});
