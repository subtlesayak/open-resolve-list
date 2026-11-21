const links = [
 ['browse', '', 'Browse'],
 ['workflows', 'workflows.html', 'Workflows'],
 ['creators', 'creators.html', 'Creators'],
 ['updates', 'updates.html', 'Updates'],
 ['about', 'about.html', 'About'],
];

export function siteHeader(prefix = '', current = '') {
 const home = prefix || './';
 const nav = links.map(([id, path, label]) => {
  const active = id === current ? ' aria-current="page"' : '';
  const update = id === 'updates' ? ' class="updates-link"' : '';
  const badge = id === 'updates' ? ' <span id="updates-indicator" class="update-indicator" hidden aria-label="New catalogue update"></span>' : '';
  return `<a href="${path ? prefix + path : home}"${active}${update}>${label}${badge}</a>`;
 }).join('');
 return `<header class="site-header"><a class="brand" href="${home}">Open Resolve List</a>
<div class="header-controls"><nav aria-label="Main">${nav}</nav>
<div class="header-actions"><a class="github-link" href="https://github.com/subtlesayak/open-resolve-list">GitHub ↗</a><a class="submit-link" href="https://github.com/subtlesayak/open-resolve-list/issues/new?template=resource.yml">+ Submit</a><button type="button" id="theme" class="theme-control" aria-label="Theme: System"><svg class="theme-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12H4z M8 20h8 M12 16v4"/></svg><span class="theme-label">Theme: System</span></button></div></div></header>`;
}

export function siteHeaderAssets(prefix = '') {
 return `<script src="${prefix}theme.mjs?v=5"></script><link rel="stylesheet" href="${prefix}style.css?v=36"><script type="module" src="${prefix}update-indicator.mjs?v=3"></script>`;
}
