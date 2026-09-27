'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REQUIRED_FIELDS = ['title', 'date', 'lang', 'summary', 'slug', 'permalink'];
const ALLOWED_ROOT_ENTRIES = new Set(['_posts', 'assets', '.DS_Store']);
const PRIVATE_DIRECTORY = /(?:^|[-_.\s])(?:private|drafts?|originals?|raw|backups?|editorial|reviews?|scratch|tmp|temp)(?:$|[-_.\s])|私有|原稿|草稿|备份/i;

function containsPasswordKey(value, visited = new Set()) {
  if (value === null || typeof value !== 'object' || visited.has(value)) return false;
  visited.add(value);
  return Object.entries(value).some(([key, child]) =>
    key.toLowerCase() === 'password' || containsPasswordKey(child, visited)
  );
}

function validatePostHeader(text, filename) {
  const issues = [];
  const header = text.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!header) return ['missing or malformed frontmatter'];

  let metadata;
  try {
    // CORE_SCHEMA reads plain data, including an unquoted date as a string.
    metadata = yaml.load(header[1], { schema: yaml.CORE_SCHEMA });
  } catch {
    // YAML exceptions may include source excerpts. Never print their message.
    return ['invalid frontmatter YAML'];
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return ['frontmatter must be a mapping'];
  }
  if (containsPasswordKey(metadata)) issues.push('forbidden frontmatter field: password');
  if (!Object.hasOwn(metadata, 'privacy_reviewed') || metadata.privacy_reviewed !== true) {
    issues.push('privacy_reviewed must be true');
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(metadata, field) || typeof metadata[field] !== 'string' || !metadata[field].trim()) {
      issues.push(`missing or invalid field: ${field}`);
    }
  }

  const expectedSlug = filename.slice(0, -3);
  if (metadata.slug !== expectedSlug) issues.push('slug must match the Markdown filename');
  if (metadata.permalink !== `writing/${expectedSlug}/`) {
    issues.push('permalink must be the relative writing/<slug>/ route');
  }
  if (!['zh-CN', 'en'].includes(metadata.lang)) issues.push('lang must be zh-CN or en');
  return issues;
}

function preflight(projectRoot = path.resolve(__dirname, '..')) {
  const source = path.join(projectRoot, 'source');
  const issues = [];
  const posts = [];
  const report = (relativePath, reason) => issues.push({ file: relativePath, reason });

  let sourceInfo;
  try {
    sourceInfo = fs.lstatSync(source);
  } catch {
    report('source', 'source directory is missing or unreadable');
    return { issues, postCount: 0 };
  }
  if (sourceInfo.isSymbolicLink() || !sourceInfo.isDirectory()) {
    report('source', 'source must be a real directory, not a symbolic link');
    return { issues, postCount: 0 };
  }

  function walk(directory, relativeDirectory = '') {
    let names;
    try {
      names = fs.readdirSync(directory).sort();
    } catch {
      report(relativeDirectory || 'source', 'directory is unreadable');
      return;
    }

    for (const name of names) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const absolutePath = path.join(directory, name);
      let info;
      try {
        info = fs.lstatSync(absolutePath);
      } catch {
        report(relativePath, 'entry is unreadable');
        continue;
      }
      if (info.isSymbolicLink()) {
        report(relativePath, 'symbolic links are forbidden under source');
        continue;
      }
      if (!relativeDirectory && !ALLOWED_ROOT_ENTRIES.has(name)) {
        report(relativePath, 'entry is not allowed at the source root');
        continue;
      }
      if (!relativeDirectory && name === '.DS_Store' && info.isFile()) continue;
      if (name.startsWith('.')) {
        report(relativePath, 'hidden source entries are forbidden');
        continue;
      }
      if (!relativeDirectory && !info.isDirectory()) {
        report(relativePath, 'required source entry must be a directory');
        continue;
      }
      if (info.isDirectory()) {
        if (relativeDirectory === '_posts') {
          report(relativePath, 'post subdirectories are forbidden; reviewed posts must be direct Markdown files');
        } else if (PRIVATE_DIRECTORY.test(name)) {
          report(relativePath, 'private or draft source directories are forbidden');
        } else {
          walk(absolutePath, relativePath);
        }
      } else if (!info.isFile()) {
        report(relativePath, 'only regular files and directories are allowed');
      } else if (relativeDirectory === '_posts') {
        if (!name.endsWith('.md')) {
          report(relativePath, 'only reviewed Markdown files are allowed in _posts');
        } else {
          posts.push({ name, relativePath, absolutePath });
        }
      }
    }
  }

  walk(source);
  for (const requiredDirectory of ['_posts', 'assets']) {
    try {
      const info = fs.lstatSync(path.join(source, requiredDirectory));
      if (!info.isDirectory() || info.isSymbolicLink()) {
        report(requiredDirectory, 'required source directory is invalid');
      }
    } catch {
      report(requiredDirectory, 'required source directory is missing');
    }
  }
  if (posts.length === 0) report('_posts', 'no reviewed Markdown posts found');

  for (const post of posts) {
    let text;
    try {
      text = fs.readFileSync(post.absolutePath, 'utf8');
    } catch {
      report(post.relativePath, 'Markdown file is unreadable');
      continue;
    }
    for (const reason of validatePostHeader(text, post.name)) report(post.relativePath, reason);
  }
  return { issues, postCount: posts.length };
}

if (require.main === module) {
  const result = preflight();
  if (result.issues.length) {
    console.error(`Preflight failed: ${result.issues.length} issue(s).`);
    for (const issue of result.issues) {
      // JSON quoting prevents filenames from injecting terminal control characters.
      console.error(`- ${JSON.stringify(issue.file)}: ${issue.reason}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Preflight passed: ${result.postCount} reviewed posts; source tree is clear.`);
  }
}

module.exports = { preflight, validatePostHeader };
