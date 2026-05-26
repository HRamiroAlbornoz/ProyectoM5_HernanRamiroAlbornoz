import { getOctokitClient } from "../client.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubBranch } from "../../types.js";

export async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string | undefined
): Promise<GitHubBranch> {
  return withOperationLogging(
    "createBranch",
    { owner, repo, branchName, fromBranch },
    () =>
      withRetry(async () => {
        try {
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
      })
  );
}
