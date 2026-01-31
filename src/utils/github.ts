import data from '../data/github.json';

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

export async function getUserProfile(): Promise<GitHubProfile> {
  return data.profile as GitHubProfile;
}

export async function getPinnedRepos(): Promise<GitHubRepo[]> {
  return data.repos as GitHubRepo[];
}

// 保留旧函数作为兼容
export async function getUserRepos(): Promise<GitHubRepo[]> {
  return getPinnedRepos();
}
