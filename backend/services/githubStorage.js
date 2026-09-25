const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'Rub750/Rstream';
const GITHUB_BRANCH = process.env.GITHUB_PERSISTENCE_BRANCH || 'main';
const GITHUB_MEDIA_DIR = (process.env.GITHUB_MEDIA_DIR || 'uploads').replace(/^\/+|\/+$/g, '');

const isConfigured = () => Boolean(GITHUB_TOKEN);

const apiRequest = async (endpoint, options = {}) => {
  if (!GITHUB_TOKEN) throw new Error('GitHub persistence is not configured: GITHUB_TOKEN is missing');
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${data.message || 'request failed'}`);
  return data;
};

const encodePath = value => value.split('/').map(encodeURIComponent).join('/');

const putFile = async (repoPath, buffer, message) => {
  const endpoint = `/repos/${GITHUB_REPOSITORY}/contents/${encodePath(repoPath)}`;
  let sha;
  try {
    const current = await apiRequest(`${endpoint}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    sha = current.sha;
  } catch (error) {
    if (!error.message.includes('GitHub API 404')) throw error;
  }
  const body = {
    message,
    content: Buffer.from(buffer).toString('base64'),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;
  return apiRequest(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
};

const deleteFile = async (repoPath, message) => {
  const endpoint = `/repos/${GITHUB_REPOSITORY}/contents/${encodePath(repoPath)}`;
  try {
    const current = await apiRequest(`${endpoint}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    await apiRequest(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha: current.sha, branch: GITHUB_BRANCH })
    });
  } catch (error) {
    if (!error.message.includes('GitHub API 404')) throw error;
  }
};

const uploadMedia = async (buffer, filename, prefix = 'media') => {
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const repoPath = `${GITHUB_MEDIA_DIR}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  await putFile(repoPath, buffer, `Add Rstream media: ${safeName}`);
  return `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_BRANCH}/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
};

const deleteMedia = async url => {
  if (!url || typeof url !== 'string') return;
  const prefix = `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_BRANCH}/${GITHUB_MEDIA_DIR}/`;
  if (!url.startsWith(prefix)) return;
  const encodedPath = url.slice(`https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_BRANCH}/`.length);
  const repoPath = encodedPath.split('/').map(segment => decodeURIComponent(segment)).join('/');
  if (repoPath.startsWith(`${GITHUB_MEDIA_DIR}/`)) await deleteFile(repoPath, 'Remove Rstream media');
};

const persistDatabase = async databasePath => {
  await putFile('rstream.db', await fs.promises.readFile(databasePath), 'Persist Rstream database');
};

module.exports = { isConfigured, uploadMedia, deleteMedia, persistDatabase };
