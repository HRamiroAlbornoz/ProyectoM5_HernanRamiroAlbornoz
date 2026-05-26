import { getOctokitClient } from "./client.js";
import { mapGitHubError } from "../errors/index.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logging.js";
import type {
  GitHubRepository,
  GitHubIssue,
  GitHubCommit,
  GitHubBranch,
  GitHubPullRequest,
  GitHubLabel,
  GitHubComment,
} from "../types.js";

function mapToRepository(data: {
  id: number;
  name: string;
  full_name: string;
  description?: string | null;
  html_url: string;
  private: boolean;
  default_branch: string;
  created_at?: string | null;
}): GitHubRepository {
  return {
    id: data.id,
    name: data.name,
    fullName: data.full_name,
    description: data.description ?? null,
    url: data.html_url,
    isPrivate: data.private,
    defaultBranch: data.default_branch,
    createdAt: data.created_at ?? null,
  };
}

function mapToIssue(data: {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: string;
  html_url: string;
  user?: { login: string } | null;
  created_at: string;
}): GitHubIssue {
  return {
    id: data.id,
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    state: data.state,
    url: data.html_url,
    author: data.user?.login ?? null,
    createdAt: data.created_at,
  };
}

export async function createRepository(
  name: string,
  description: string | undefined,
  isPrivate: boolean
): Promise<GitHubRepository> {
  return withRetry(async () => {
    try {
      logger.info("Creando repositorio", { name, isPrivate });
      const octokit = getOctokitClient();
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name,
        ...(description !== undefined && { description }),
        private: isPrivate,
        auto_init: true,
      });
      return mapToRepository(data);
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${name}"`);
    }
  });
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body: string | undefined
): Promise<GitHubIssue> {
  return withRetry(async () => {
    try {
      logger.info("Creando issue", { owner, repo, title });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title,
        ...(body !== undefined && { body }),
      });
      return mapToIssue(data);
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function listRepositories(
  limit: number
): Promise<GitHubRepository[]> {
  return withRetry(async () => {
    try {
      logger.info("Listando repositorios", { limit });
      const octokit = getOctokitClient();
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: limit,
        sort: "updated",
      });
      return data.map(mapToRepository);
    } catch (error) {
      throw mapGitHubError(error);
    }
  });
}

export async function createCommit(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string
): Promise<GitHubCommit> {
  return withRetry(async () => {
    try {
      logger.info("Creando commit", { owner, repo, branch, filePath });
      const octokit = getOctokitClient();

      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const latestSha = refData.object.sha;

      const [{ data: commitData }, { data: blobData }] = await Promise.all([
        octokit.git.getCommit({ owner, repo, commit_sha: latestSha }),
        octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(content).toString("base64"),
          encoding: "base64",
        }),
      ]);
      const treeSha = commitData.tree.sha;

      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: treeSha,
        tree: [
          {
            path: filePath,
            mode: "100644",
            type: "blob",
            sha: blobData.sha,
          },
        ],
      });

      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [latestSha],
      });

      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      });

      return {
        sha: newCommit.sha,
        message: newCommit.message,
        url: newCommit.html_url ?? `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
        author: newCommit.author?.name ?? null,
      };
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function listIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all",
  limit: number
): Promise<GitHubIssue[]> {
  return withRetry(async () => {
    try {
      logger.info("Listando issues", { owner, repo, state, limit });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.listForRepo({
        owner,
        repo,
        state,
        per_page: limit,
      });
      return data
        .filter((issue) => !issue.pull_request)
        .map(mapToIssue);
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string | undefined
): Promise<GitHubBranch> {
  return withRetry(async () => {
    try {
      logger.info("Creando rama", { owner, repo, branchName, fromBranch });
      const octokit = getOctokitClient();

      let baseSha: string;

      if (fromBranch !== undefined) {
        const { data: refData } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${fromBranch}`,
        });
        baseSha = refData.object.sha;
      } else {
        const { data: repoData } = await octokit.repos.get({ owner, repo });
        const { data: refData } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${repoData.default_branch}`,
        });
        baseSha = refData.object.sha;
      }

      const { data } = await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      return {
        name: branchName,
        sha: data.object.sha,
      };
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function closeIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return withRetry(async () => {
    try {
      logger.info("Cerrando issue", { owner, repo, issueNumber });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: "closed",
      });
      return mapToIssue(data);
    } catch (error) {
      throw mapGitHubError(error, `El issue #${issueNumber} en "${owner}/${repo}"`);
    }
  });
}

export async function addCommentToIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubComment> {
  return withRetry(async () => {
    try {
      logger.info("Agregando comentario al issue", { owner, repo, issueNumber });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      return {
        id: data.id,
        body: data.body ?? "",
        url: data.html_url,
        author: data.user?.login ?? null,
        createdAt: data.created_at,
      };
    } catch (error) {
      throw mapGitHubError(error, `El issue #${issueNumber} en "${owner}/${repo}"`);
    }
  });
}

export async function listCommits(
  owner: string,
  repo: string,
  branch: string | undefined,
  limit: number
): Promise<GitHubCommit[]> {
  return withRetry(async () => {
    try {
      logger.info("Listando commits", { owner, repo, branch, limit });
      const octokit = getOctokitClient();
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        ...(branch !== undefined && { sha: branch }),
        per_page: limit,
      });
      return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        url: commit.html_url,
        author: commit.commit.author?.name ?? null,
      }));
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string | undefined,
  head: string,
  base: string
): Promise<GitHubPullRequest> {
  return withRetry(async () => {
    try {
      logger.info("Creando pull request", { owner, repo, title, head, base });
      const octokit = getOctokitClient();
      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title,
        ...(body !== undefined && { body }),
        head,
        base,
      });
      return {
        id: data.id,
        number: data.number,
        title: data.title,
        url: data.html_url,
        state: data.state,
        sourceBranch: data.head.ref,
        targetBranch: data.base.ref,
      };
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function createLabel(
  owner: string,
  repo: string,
  name: string,
  color: string,
  description: string | undefined
): Promise<GitHubLabel> {
  return withRetry(async () => {
    try {
      logger.info("Creando label", { owner, repo, name, color });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.createLabel({
        owner,
        repo,
        name,
        color,
        ...(description !== undefined && { description }),
      });
      return {
        id: data.id,
        name: data.name,
        color: data.color,
        description: data.description ?? null,
      };
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}

export async function assignIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  assignees: string[]
): Promise<GitHubIssue> {
  return withRetry(async () => {
    try {
      logger.info("Asignando issue", { owner, repo, issueNumber, assignees });
      const octokit = getOctokitClient();
      const { data } = await octokit.issues.addAssignees({
        owner,
        repo,
        issue_number: issueNumber,
        assignees,
      });
      return mapToIssue(data);
    } catch (error) {
      throw mapGitHubError(error, `El issue #${issueNumber} en "${owner}/${repo}"`);
    }
  });
}

export async function addCollaborator(
  owner: string,
  repo: string,
  username: string,
  permission: "pull" | "push" | "admin" | "maintain" | "triage"
): Promise<void> {
  return withRetry(async () => {
    try {
      logger.info("Agregando colaborador", { owner, repo, username, permission });
      const octokit = getOctokitClient();
      await octokit.repos.addCollaborator({
        owner,
        repo,
        username,
        permission,
      });
    } catch (error) {
      throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
    }
  });
}
