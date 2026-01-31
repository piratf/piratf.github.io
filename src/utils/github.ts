const GITHUB_USERNAME = 'piratf';
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

export interface GitHubProfile {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
  homepage: string | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; type?: string }>;
}

interface PinnedReposData {
  user?: {
    pinnedItems?: {
      nodes?: Array<{
        id: string;
        name: string;
        description: string | null;
        url: string;
        primaryLanguage?: {
          name: string;
          color: string;
        } | null;
        stargazerCount: number;
        forkCount: number;
        updatedAt: string;
        repositoryTopics?: {
          nodes?: Array<{
            topic?: {
              name: string;
            };
          }>;
        };
        homepageUrl: string | null;
      }>;
    } | null;
  } | null;
}

export async function getUserProfile(): Promise<GitHubProfile> {
  const headers: Record<string, string> = {};
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.statusText}`);
  }
  return res.json();
}

async function getPinnedReposFromGraphQL(): Promise<GitHubRepo[]> {
  const query = `
    query {
      user(login: "${GITHUB_USERNAME}") {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            id
            name
            description
            url
            primaryLanguage {
              name
              color
            }
            stargazerCount
            forkCount
            updatedAt
            repositoryTopics(first: 10) {
              nodes {
                topic {
                  name
                }
              }
            }
            homepageUrl
          }
        }
      }
    }
  `;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GraphQL API error: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json() as GraphQLResponse<PinnedReposData>;

  if (data.errors) {
    // 如果是速率限制错误，抛出特定错误以便回退
    if (data.errors.some(e => e.type === 'RATE_LIMITED')) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
  }

  const nodes = data.data?.user?.pinnedItems?.nodes || [];

  return nodes.map(repo => ({
    id: parseInt(repo.id),
    name: repo.name,
    description: repo.description,
    html_url: repo.url,
    language: repo.primaryLanguage?.name || null,
    stargazers_count: repo.stargazerCount,
    forks_count: repo.forkCount,
    updated_at: repo.updatedAt,
    topics: repo.repositoryTopics?.nodes?.map(t => t.topic?.name || '').filter(Boolean) || [],
    homepage: repo.homepageUrl,
  }));
}

// 从 REST API 获取仓库作为后备方案
async function getReposFromREST(): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = {};
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6&type=public`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.statusText}`);
  }
  return res.json();
}

export async function getPinnedRepos(): Promise<GitHubRepo[]> {
  try {
    return await getPinnedReposFromGraphQL();
  } catch (error) {
    // 如果是速率限制或 GraphQL 错误，回退到 REST API
    if (error instanceof Error && (error.message === 'RATE_LIMITED' || error.message.includes('GraphQL'))) {
      console.warn('GraphQL API failed, falling back to REST API');
      return await getReposFromREST();
    }
    throw error;
  }
}

// 保留旧函数作为兼容
export async function getUserRepos(): Promise<GitHubRepo[]> {
  return getPinnedRepos();
}
