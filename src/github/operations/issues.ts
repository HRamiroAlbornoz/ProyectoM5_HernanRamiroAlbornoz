import { getOctokitClient } from "../client.js";
import {
  mapToIssue,
  mapToComment,
  repoContext,
  issueContext,
} from "../mappers.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubIssue, GitHubComment } from "../../types.js";

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body: string | undefined
): Promise<GitHubIssue> {
  return withOperationLogging("createIssue", { owner, repo, title }, () =>
    withRetry(async () => {
      try {
        const octokit = getOctokitClient();
        const { data } = await octokit.issues.create({
          owner,
          repo,
          title,
          ...(body !== undefined && { body }),
        });
        return mapToIssue(data);
      } catch (error) {
        throw mapGitHubError(error, repoContext(owner, repo));
      }
    })
  );
}

export async function listIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all",
  limit: number
): Promise<GitHubIssue[]> {
  return withOperationLogging("listIssues", { owner, repo, state, limit }, () =>
    withRetry(async () => {
      try {
        const octokit = getOctokitClient();
        const { data } = await octokit.issues.listForRepo({
          owner,
          repo,
          state,
          per_page: limit,
        });
        return data.filter((issue) => !issue.pull_request).map(mapToIssue);
      } catch (error) {
        throw mapGitHubError(error, repoContext(owner, repo));
      }
    })
  );
}

export async function closeIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return withOperationLogging("closeIssue", { owner, repo, issueNumber }, () =>
    withRetry(async () => {
      try {
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
    })
  );
}

export async function addCommentToIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<GitHubComment> {
  return withOperationLogging(
    "addCommentToIssue",
    { owner, repo, issueNumber },
    () =>
      withRetry(async () => {
        try {
          const octokit = getOctokitClient();
          const { data } = await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body,
          });
          return mapToComment(data);
        } catch (error) {
          throw mapGitHubError(error, issueContext(owner, repo, issueNumber));
        }
      })
  );
}

export async function assignIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  assignees: string[]
): Promise<GitHubIssue> {
  return withOperationLogging(
    "assignIssue",
    { owner, repo, issueNumber, assignees },
    () =>
      withRetry(async () => {
        try {
          const octokit = getOctokitClient();
          const { data } = await octokit.issues.addAssignees({
            owner,
            repo,
            issue_number: issueNumber,
            assignees,
          });
          return mapToIssue(data);
        } catch (error) {
          throw mapGitHubError(error, issueContext(owner, repo, issueNumber));
        }
      })
  );
}
