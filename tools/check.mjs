import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom');
const matter=require('hexo-front-matter');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'source');
const output=path.join(root,'public');
const walk=p=>fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]):[];
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const errors=[];
const fail=(scope,code)=>errors.push(`${scope}: ${code}`);
const docs=walk(output).filter(p=>p.endsWith('.html'));
const postDir=path.join(source,'_posts');
const postFiles=fs.existsSync(postDir)?fs.readdirSync(postDir).filter(p=>p.endsWith('.md')):[];
const indexPath=path.join(output,'search-index.json');
const index=fs.existsSync(indexPath)?readJSON(indexPath):[];
const posts=new Map();
if(!docs.length)fail('site','missing built HTML');
if(!fs.existsSync(indexPath))fail('site','missing search index');

// Check public content and generated output without embedding private audit data.
const forbiddenMarkers=[
  ['local home path',/\/Users\/|\/private\/var\/folders\//i]
];
for(const [area,dir] of [['source',source],['public',output]]){
  for(const file of walk(dir)){
    const rel=path.relative(dir,file);
    if(/(?:^|\/)(?:private_redaction[^/]*|private_image_review\.json|migration-report\.json|recovered_legacy_images\/manifest\.json)$/i.test(rel))fail(area+'/'+rel,'private audit artifact exposed');
    if(!/\.(?:md|html?|json|xml|css|js|txt|ya?ml|svg)$/i.test(file))continue;
    const text=fs.readFileSync(file,'utf8');
    for(const [label,pattern] of forbiddenMarkers)if(pattern.test(text))fail(area+'/'+rel,label);
  }
}

for(const file of docs){
  const html=fs.readFileSync(file,'utf8');
  const rel=path.relative(output,file);
  const dom=new JSDOM(html);
  const document=dom.window.document;
  if(document.querySelectorAll('h1').length<1)fail(rel,'missing h1');
  for(const node of document.querySelectorAll('script')){
    if(node.src&&node.getAttribute('src')!=='/js/journal.js')fail(rel,'unexpected script source');
    if(!node.src&&!node.textContent.startsWith("try{document.documentElement.dataset.theme=localStorage.getItem('z3vok-theme')"))fail(rel,'unexpected inline script');
  }
  if(document.querySelector('iframe,object,embed,form'))fail(rel,'active embedded content');
  if(document.querySelector('pre.html-example figure.highlight'))fail(rel,'nested code figure');
  for(const el of document.querySelectorAll('*'))for(const attr of el.attributes){
    if(/^on/i.test(attr.name))fail(rel,'event attribute');
    if(['href','src'].includes(attr.name)&&/^\s*(javascript|vbscript|data):/i.test(attr.value))fail(rel,'active URI');
  }
  for(const el of document.querySelectorAll('a[href],img[src],link[href],script[src]')){
    const attr=el.hasAttribute('href')?'href':'src';const href=el.getAttribute(attr);
    if(href.startsWith('//')){fail(rel,'protocol-relative link');continue;}
    if(/^[a-z][a-z\d+.-]*:/i.test(href)||href.startsWith('#')||href==='')continue;
    let url,target;
    try{url=new URL(href,'https://test.invalid/'+rel);target=path.join(output,decodeURIComponent(url.pathname));}
    catch{fail(rel,'invalid local link');continue;}
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!fs.existsSync(target))fail(rel,'missing local link target');
  }
  if(document.querySelector('a[href^="/tools/"]'))fail(rel,'retired tools navigation present');
  dom.window.close();
}
for(const file of postFiles){
  const text=fs.readFileSync(path.join(postDir,file),'utf8');
  const post=matter.parse(text);
  const slug=file.slice(0,-3);
  posts.set(slug,{...post,sourceText:text});
  if(Object.prototype.hasOwnProperty.call(post,'password'))fail(slug,'protected frontmatter in source');
  if(post.privacy_reviewed!==true)fail(slug,'privacy review marker required');
  if(post.slug!==slug)fail(slug,'source slug mismatch');
  if(typeof post.permalink!=='string'||!fs.existsSync(path.join(output,post.permalink,'index.html')))fail(slug,'article output missing');
  if(!index.some(p=>p.url==='/'+post.permalink))fail(slug,'article absent from search index');
}
if(index.length!==posts.size)fail('search','article coverage mismatch');
if(fs.existsSync(path.join(output,'tools')))fail('site','retired tools output present');

if(errors.length){
  console.error(`FAIL: ${errors.length} check issue(s).`);
  console.error([...new Set(errors)].slice(0,50).join('\n'));
  process.exitCode=1;
}else{
  console.log(`PASS: ${posts.size} articles; ${docs.length} HTML pages; search coverage, local links, inert code, privacy markers and local-path checks.`);
}
