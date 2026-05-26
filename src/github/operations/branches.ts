import { getOctokitClient } from "../client.js";
import { repoContext } from "../mappers.js";
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

          const refName =
            fromBranch ??
            (await octokit.repos.get({ owner, repo })).data.default_branch;

          const { data: refData } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${refName}`,
          });

          const { data } = await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: refData.object.sha,
          });

          return {
            name: branchName,
            sha: data.object.sha,
          };
        } catch (error) {
          throw mapGitHubError(error, repoContext(owner, repo));
        }
      })
  );
}
