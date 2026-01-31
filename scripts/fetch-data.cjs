// 构建时数据获取脚本
const { execSync } = require('child_process');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname } = require('path');

function getPinnedRepos() {
  try {
    const result = execSync(
      `gh api graphql -f query='
        query {
          user(login: "piratf") {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  id
                  name
                  description
                  url
                  primaryLanguage {
                    name
                  }
                  stargazerCount
                  forkCount
                  updatedAt
                  homepageUrl
                }
              }
            }
          }
        }'`,
      { encoding: 'utf-8' }
    );

    const data = JSON.parse(result);
    return data.data.user.pinnedItems.nodes.map(repo => ({
      id: parseInt(repo.id),
      name: repo.name,
      description: repo.description,
      html_url: repo.url,
      language: repo.primaryLanguage?.name || null,
      stargazers_count: repo.stargazerCount,
      forks_count: repo.forkCount,
      updated_at: repo.updatedAt,
      topics: [],
      homepage: repo.homepageUrl,
    }));
  } catch (error) {
    console.error('Failed to fetch pinned repos:', error.message);
    return [];
  }
}

function getUserProfile() {
  try {
    const result = execSync('gh api users/piratf', { encoding: 'utf-8' });
    return JSON.parse(result);
  } catch (error) {
    console.error('Failed to fetch user profile:', error.message);
    return null;
  }
}

const repos = getPinnedRepos();
const profile = getUserProfile();

// 确保目录存在
const filePath = 'src/data/github.json';
mkdirSync(dirname(filePath), { recursive: true });

// 保存为 JSON 文件
writeFileSync(filePath, JSON.stringify({ repos, profile }, null, 2));

console.log('Fetched data:', { repos: repos.length, profile: !!profile });
