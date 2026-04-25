const state = { config: null };

async function loadConfig() {
  const res = await fetch('config.json');
  state.config = await res.json();
}

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function renderNav() {
  const nav = document.getElementById('nav');
  const cur = currentPath();
  const parts = state.config.nav.map(item => {
    const active = cur === item.path ? ' class="active"' : '';
    return `<a href="#${item.path}"${active}>${item.label}</a>`;
  });
  nav.innerHTML = parts.join('<span class="sep">|</span>');
}

async function loadMarkdown(path) {
  const res = await fetch(`posts/${path}.md`);
  if (!res.ok) return `<p>Пост не найден: ${path}</p>`;
  const md = await res.text();
  return marked.parse(md);
}

function block(text) {
  return `<div class="block">${text}</div>`;
}

async function renderMain() {
  const cfg = state.config.main;
  const md = await loadMarkdown(cfg.post);
  return block(cfg.block) + `<div class="markdown">${md}</div>`;
}

function renderArticles() {
  const cfg = state.config.articles;
  const items = cfg.list
    .map(a => `<li><a href="#/post/${a.path}">${a.title}</a></li>`)
    .join('');
  return block(cfg.block) + `<ul class="articles">${items}</ul>`;
}

function renderNotes() {
  const cfg = state.config.notes;
  const items = (cfg.list || [])
    .map(n => `<li>${n}</li>`)
    .join('');
  return block(cfg.block) + (items ? `<ul class="articles">${items}</ul>` : '');
}

function renderAbout() {
  return state.config.about.html;
}

async function renderPost(path) {
  const md = await loadMarkdown(path);
  return `<div class="markdown">${md}</div>`;
}

async function route() {
  const view = document.getElementById('view');
  view.innerHTML = '';
  const path = currentPath();
  let html;
  if (path === '/') html = await renderMain();
  else if (path === '/articles') html = renderArticles();
  else if (path === '/notes') html = renderNotes();
  else if (path === '/about') html = renderAbout();
  else if (path.startsWith('/post/')) html = await renderPost(path.slice('/post/'.length));
  else html = '<p>404</p>';
  view.innerHTML = html;
  view.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
  renderNav();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  document.title = state.config.title;
  renderNav();
  route();
});
