export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string | null;
};

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  url: string;
  author: string | null;
  createdAt: string;
};

export type GitHubCommit = {
  sha: string;
  message: string;
  url: string;
  author: string | null;
};

export type GitHubBranch = {
  name: string;
  sha: string;
};

export type GitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  url: string;
  state: string;
  sourceBranch: string;
  targetBranch: string;
};

export type GitHubLabel = {
  id: number;
  name: string;
  color: string;
  description: string | null;
};

export type GitHubComment = {
  id: number;
  body: string;
  url: string;
  author: string | null;
  createdAt: string;
};
