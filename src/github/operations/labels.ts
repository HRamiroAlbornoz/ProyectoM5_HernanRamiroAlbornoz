import { getOctokitClient } from "../client.js";
import { repoContext } from "../mappers.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubLabel } from "../../types.js";

export async function createLabel(
  owner: string,
  repo: string,
  name: string,
  color: string,
  description: string | undefined
): Promise<GitHubLabel> {
  return withOperationLogging(
    "createLabel",
    { owner, repo, name, color },
    () =>
      withRetry(async () => {
        try {
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
          throw mapGitHubError(error, repoContext(owner, repo));
        }
      })
  );
}
