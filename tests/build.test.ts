import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Build Tests', () => {
  beforeAll(() => {
    // 运行构建
    execSync('npm run build', { stdio: 'inherit' });
  });

  it('should build successfully', () => {
    const distPath = resolve('dist');
    expect(existsSync(distPath)).toBe(true);
  });

  it('should generate index.html', () => {
    const indexPath = resolve('dist', 'index.html');
    expect(existsSync(indexPath)).toBe(true);

    const html = readFileSync(indexPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('should generate CSS file', () => {
    const astroDir = resolve('dist', '_astro');
    expect(existsSync(astroDir)).toBe(true);

    const cssFiles = require('fs').readdirSync(astroDir).filter((f: string) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);
  });
});

describe('SEO Tags Tests', () => {
  const indexPath = resolve('dist', 'index.html');
  let html: string;

  beforeAll(() => {
    html = readFileSync(indexPath, 'utf-8');
  });

  it('should have title tag', () => {
    expect(html).toContain('<title>');
    expect(html).toContain('Pan | Open Source Project Index');
  });

  it('should have meta description', () => {
    expect(html).toContain('name="description"');
    expect(html).toContain('windows-folder-remark');
  });

  it('should have meta keywords', () => {
    expect(html).toContain('name="keywords"');
    expect(html).toMatch(/piratf|open source|python/i);
  });

  it('should have canonical URL', () => {
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('https://piratf.github.io/');
  });

  it('should have Open Graph tags', () => {
    expect(html).toContain('property="og:type"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:url"');
  });

  it('should have Twitter Card tags', () => {
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="twitter:description"');
  });
});

describe('Static Assets Tests', () => {
  it('should have sitemap.xml', () => {
    const sitemapPath = resolve('dist', 'sitemap.xml');
    expect(existsSync(sitemapPath)).toBe(true);

    const sitemap = readFileSync(sitemapPath, 'utf-8');
    expect(sitemap).toContain('<?xml');
    expect(sitemap).toContain('https://piratf.github.io/');
  });

  it('should have robots.txt', () => {
    const robotsPath = resolve('dist', 'robots.txt');
    expect(existsSync(robotsPath)).toBe(true);

    const robots = readFileSync(robotsPath, 'utf-8');
    expect(robots).toContain('Sitemap:');
  });

  it('should have favicon', () => {
    const faviconPath = resolve('dist', 'favicon.svg');
    expect(existsSync(faviconPath)).toBe(true);
  });
});

describe('Content Tests', () => {
  const indexPath = resolve('dist', 'index.html');
  let html: string;

  beforeAll(() => {
    html = readFileSync(indexPath, 'utf-8');
  });

  it('should display pinned project', () => {
    expect(html).toContain('windows-folder-remark');
  });

  it('should have project index section', () => {
    expect(html).toContain('Project Index');
  });

  it('should have semantic project list', () => {
    expect(html).toMatch(/<ul[^>]*>/);
    expect(html).toMatch(/<li[^>]*>/);
  });

  it('should link to GitHub profile', () => {
    expect(html).toContain('https://github.com/piratf');
  });
});
