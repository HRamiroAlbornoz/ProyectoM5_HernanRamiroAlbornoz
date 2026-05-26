import { getOctokitClient } from "../client.js";
import { normalizeIssueState } from "../mappers.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubPullRequest } from "../../types.js";

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string | undefined,
  head: string,
  base: string
): Promise<GitHubPullRequest> {
  return withOperationLogging(
    "createPullRequest",
    { owner, repo, title, head, base },
    () =>
      withRetry(async () => {
        try {
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
            state: normalizeIssueState(data.state),
            sourceBranch: data.head.ref,
            targetBranch: data.base.ref,
          };
        } catch (error) {
          throw mapGitHubError(error, `El repositorio "${owner}/${repo}"`);
        }
      })
  );
}
