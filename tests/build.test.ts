import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

describe('Build Tests', () => {
  beforeAll(() => {
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

    const cssFiles = readdirSync(astroDir).filter((f: string) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);
  });
});

// 辅助函数：提取 meta 标签内容
function extractMetaContent(html: string, name: string): string | null {
  const regex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

// 辅助函数：提取 property 标签内容
function extractPropertyContent(html: string, property: string): string | null {
  const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

// 辅助函数：提取 title 内容
function extractTitle(html: string): string | null {
  const regex = /<title>([^<]*)<\/title>/i;
  const match = html.match(regex);
  return match ? match[1] : null;
}

describe('SEO Tags Tests', () => {
  const indexPath = resolve('dist', 'index.html');
  let html: string;

  beforeAll(() => {
    html = readFileSync(indexPath, 'utf-8');
  });

  it('should have non-empty title tag', () => {
    const title = extractTitle(html);
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
  });

  it('should have non-empty meta description', () => {
    const description = extractMetaContent(html, 'description');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(0);
  });

  it('should have non-empty meta keywords', () => {
    const keywords = extractMetaContent(html, 'keywords');
    expect(keywords).toBeTruthy();
    expect(keywords?.length).toBeGreaterThan(0);
  });

  it('should have non-empty canonical URL', () => {
    const regex = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i;
    const match = html.match(regex);
    expect(match).toBeTruthy();
    expect(match![1]).toBeTruthy();
    expect(match![1].length).toBeGreaterThan(0);
  });

  it('should have non-empty Open Graph tags', () => {
    const ogType = extractPropertyContent(html, 'og:type');
    const ogTitle = extractPropertyContent(html, 'og:title');
    const ogDescription = extractPropertyContent(html, 'og:description');
    const ogUrl = extractPropertyContent(html, 'og:url');

    expect(ogType).toBeTruthy();
    expect(ogType?.length).toBeGreaterThan(0);

    expect(ogTitle).toBeTruthy();
    expect(ogTitle?.length).toBeGreaterThan(0);

    expect(ogDescription).toBeTruthy();
    expect(ogDescription?.length).toBeGreaterThan(0);

    expect(ogUrl).toBeTruthy();
    expect(ogUrl?.length).toBeGreaterThan(0);
  });

  it('should have non-empty Twitter Card tags', () => {
    const twitterCard = extractMetaContent(html, 'twitter:card');
    const twitterTitle = extractMetaContent(html, 'twitter:title');
    const twitterDescription = extractMetaContent(html, 'twitter:description');

    expect(twitterCard).toBeTruthy();
    expect(twitterCard?.length).toBeGreaterThan(0);

    expect(twitterTitle).toBeTruthy();
    expect(twitterTitle?.length).toBeGreaterThan(0);

    expect(twitterDescription).toBeTruthy();
    expect(twitterDescription?.length).toBeGreaterThan(0);
  });
});

describe('Static Assets Tests', () => {
  it('should have sitemap.xml with valid content', () => {
    const sitemapPath = resolve('dist', 'sitemap.xml');
    expect(existsSync(sitemapPath)).toBe(true);

    const sitemap = readFileSync(sitemapPath, 'utf-8');
    expect(sitemap).toContain('<?xml');
    expect(sitemap).toContain('</urlset>');
  });

  it('should have robots.txt with sitemap reference', () => {
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

interface PinnedRepo {
  name: string;
  description: string;
  url: string;
  primaryLanguage?: {
    name: string;
  } | null;
}

interface GraphQLResponse {
  data?: {
    user?: {
      pinnedItems?: {
        nodes?: PinnedRepo[];
      } | null;
    } | null;
  } | null;
}

describe('Content Tests', () => {
  const indexPath = resolve('dist', 'index.html');
  let html: string;
  let pinnedRepos: PinnedRepo[];
  let useGhApi = true;

  beforeAll(() => {
    html = readFileSync(indexPath, 'utf-8');

    // 使用 gh CLI 获取 pinned projects
    try {
      const query = `query {
        user(login: "piratf") {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                name
                description
                url
                primaryLanguage {
                  name
                }
              }
            }
          }
        }
      }`;

      // 使用环境变量传递查询
      const result = execSync('gh api graphql -F query="$QUERY"', {
        encoding: 'utf-8',
        env: { ...process.env, QUERY: query.replace(/\n/g, ' ').replace(/\s+/g, ' ') },
        stdio: ['ignore', 'pipe', 'ignore']
      });

      const data = JSON.parse(result) as GraphQLResponse;
      pinnedRepos = data.data?.user?.pinnedItems?.nodes || [];

      if (pinnedRepos.length === 0) {
        useGhApi = false;
      }
    } catch (error) {
      console.error('Failed to fetch pinned repos:', (error as Error).message);
      useGhApi = false;
      pinnedRepos = [];
    }
  });

  it('should display all pinned projects', () => {
    // 如果 gh API 不可用，跳过此测试
    if (!useGhApi) {
      console.warn('Skipping pinned projects test - gh API not available');
      return;
    }

    expect(pinnedRepos.length).toBeGreaterThan(0);

    for (const repo of pinnedRepos) {
      expect(html).toContain(repo.name);
    }
  });

  it('should have project index section', () => {
    expect(html).toContain('Project Index');
  });

  it('should have semantic project list', () => {
    expect(html).toMatch(/<ul[^>]*>/);
    expect(html).toMatch(/<\/ul>/);
    expect(html).toMatch(/<li[^>]*>/);
    expect(html).toMatch(/<\/li>/);
  });

  it('should link to GitHub profile', () => {
    expect(html).toContain('github.com/piratf');
  });

  it('should have links to all pinned repositories', () => {
    // 如果 gh API 不可用，跳过此测试
    if (!useGhApi) {
      console.warn('Skipping repository links test - gh API not available');
      return;
    }

    for (const repo of pinnedRepos) {
      expect(html).toContain(repo.url);
    }
  });
});
