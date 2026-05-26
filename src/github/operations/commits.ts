import { getOctokitClient } from "../client.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubCommit } from "../../types.js";

export async function createCommit(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string
): Promise<GitHubCommit> {
  return withOperationLogging("createCommit", { owner, repo, branch, filePath }, () =>
    withRetry(async () => {
      try {
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
    })
  );
}

export async function listCommits(
  owner: string,
  repo: string,
  branch: string | undefined,
  limit: number
): Promise<GitHubCommit[]> {
  return withOperationLogging(
    "listCommits",
    { owner, repo, branch, limit },
    () =>
      withRetry(async () => {
        try {
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
      })
  );
}
