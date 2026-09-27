'use strict';
const escape = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
hexo.extend.filter.register('before_post_render', data => {
  if(data.layout==='post' && (data.privacy_reviewed!==true || Object.prototype.hasOwnProperty.call(data,'password'))) throw new Error('Public articles need privacy_reviewed: true and must not carry passwords.');
  return data;
});
const isPublicOrigin = () => {
  try { const url=new URL(hexo.config.url); return url.protocol==='https:' && !/^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) && url.pathname==='/'; } catch { return false; }
};
const absoluteURL = p => new URL(String(p||'').replace(/^\/+/,''),hexo.config.url.replace(/\/$/,'')+'/').href;
hexo.extend.helper.register('journal_public_origin',isPublicOrigin);
hexo.extend.helper.register('journal_canonical',function(page){ return absoluteURL((page.path||'').replace(/index\.html$/,'')); });
hexo.extend.helper.register('journal_posts', function() { return this.site.posts.sort('date', -1).toArray(); });
hexo.extend.helper.register('journal_featured', function() { return this.site.posts.toArray().filter(p => p.featured_rank > 0).sort((a,b) => Number(!!a.archived)-Number(!!b.archived) || a.featured_rank - b.featured_rank).slice(0,8); });
hexo.extend.helper.register('journal_categories', function() { return [...new Set(this.site.posts.toArray().map(p => p.topic))].filter(Boolean); });
hexo.extend.helper.register('date_label', function(date) { return date.format('YYYY.MM.DD'); });
hexo.extend.helper.register('reading_time', function(post) { return Math.max(1, Math.ceil(post.lang==='en' ? (post.raw || '').split(/\s+/).length / 220 : (post.raw || '').length / 1200)); });
hexo.extend.filter.register('marked:renderer', renderer => {
  renderer.html = html => {
    if (/^\s*<br\s*\/?\s*>\s*$/i.test(html)) return '<br>';
    const code = escape(html);
    return html.includes('\n') ? `<pre class="html-example"><code>${code}</code></pre>` : code;
  };
  renderer.image = (href, title, alt) => {
    if (String(href).startsWith('/assets/') && !String(href).includes('..')) return `<img src="${escape(href)}" alt="${escape(alt || 'Article illustration')}" loading="lazy" decoding="async">`;
    if (String(href)==='redacted-image:withheld') return '<span class="missing-image" role="note" lang="en">▧ Image withheld</span>';
    return `<span class="missing-image" role="note" lang="en"><span aria-hidden="true">▧</span> Archived image unavailable</span>`;
  };
});
// Hexo restores its own escaped code placeholders after Markdown rendering.
// Remove the extra wrapper around these trusted, generated figures only.
hexo.extend.filter.register('after_post_render', data => {
  data.content = data.content.replace(/<pre class="html-example"><code>\s*(<figure class="highlight[\s\S]*?<\/figure>)\s*<\/code><\/pre>/g, '$1');
  return data;
}, 50);
hexo.extend.generator.register('journal', locals => {
  const posts=locals.posts.sort('date',-1).toArray();
  const search=posts.map(p=>({title:p.title, originalTitle:[p.original_title,p.title_zh,p.summary_zh].filter(Boolean).join(' '), lang:p.lang, url:'/'+p.path.replace(/^\/+/, ''), topic:p.topic, date:p.date.format('YYYY'), summary:p.summary||'', text:(p.raw||'').replace(/^---[\s\S]*?---/,'').replace(/https?:\/\/\S+/g,'').slice(0,50000)}));
  const paths=['','writing/','about/',...posts.map(p=>p.path.replace(/^\/+/,'') )];
  return [
    {path:'.nojekyll',data:''},
    {path:'robots.txt',data:isPublicOrigin()?`User-agent: *\nAllow: /\nSitemap: ${absoluteURL('sitemap.xml')}\n`:'User-agent: *\nDisallow: /\n'},
    {path:'sitemap.xml',data:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${isPublicOrigin()?paths.map(p=>`<url><loc>${escape(absoluteURL(p))}</loc></url>`).join(''):''}</urlset>`},
    {path:'index.html',layout:'index',data:{title:'Security notes',section:'home'}},
    {path:'writing/index.html',layout:'archive',data:{title:'Writing',section:'writing'}},
    {path:'about/index.html',layout:'about',data:{title:'About',section:'about'}},
    {path:'404.html',layout:'404',data:{title:'Page not found'}},
    {path:'search-index.json',data:JSON.stringify(search)},
    {path:'feed.xml',data:`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>z3vok — Field notes</title><link>${escape(hexo.config.url)}</link><description>Security notes</description>${posts.map(p=>`<item><title>${escape(p.title)}</title><link>${escape(absoluteURL(p.path))}</link><guid>${escape(absoluteURL(p.path))}</guid><pubDate>${p.date.toDate().toUTCString()}</pubDate><description>${escape(p.summary||'')}</description></item>`).join('')}</channel></rss>`}
  ];
});
