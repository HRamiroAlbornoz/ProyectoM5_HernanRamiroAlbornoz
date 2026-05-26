import type {
  GitHubRepository,
  GitHubIssue,
  GitHubCommit,
  GitHubComment,
} from "../types.js";

export function repoContext(owner: string, repo: string): string {
  return `El repositorio "${owner}/${repo}"`;
}

export function issueContext(owner: string, repo: string, issueNumber: number): string {
  return `El issue #${issueNumber} en "${owner}/${repo}"`;
}

export function mapToRepository(data: {
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

export function normalizeIssueState(state: string): "open" | "closed" {
  return state === "closed" ? "closed" : "open";
}

export function mapToIssue(data: {
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
    state: normalizeIssueState(data.state),
    url: data.html_url,
    author: data.user?.login ?? null,
    createdAt: data.created_at,
  };
}

export function mapToCommit(data: {
  sha: string;
  html_url?: string;
  commit: {
    message: string;
    author?: { name?: string } | null;
  };
}): GitHubCommit {
  return {
    sha: data.sha,
    message: data.commit.message,
    url: data.html_url ?? "",
    author: data.commit.author?.name ?? null,
  };
}

export function mapToComment(data: {
  id: number;
  body?: string | null;
  html_url: string;
  user?: { login: string } | null;
  created_at: string;
}): GitHubComment {
  return {
    id: data.id,
    body: data.body ?? "",
    url: data.html_url,
    author: data.user?.login ?? null,
    createdAt: data.created_at,
  };
}
