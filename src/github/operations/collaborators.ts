import { getOctokitClient } from "../client.js";
import { repoContext } from "../mappers.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";

export async function addCollaborator(
  owner: string,
  repo: string,
  username: string,
  permission: "pull" | "push" | "admin" | "maintain" | "triage"
): Promise<void> {
  return withOperationLogging(
    "addCollaborator",
    { owner, repo, username, permission },
    () =>
      withRetry(async () => {
        try {
          const octokit = getOctokitClient();
          await octokit.repos.addCollaborator({
            owner,
            repo,
            username,
            permission,
          });
        } catch (error) {
          throw mapGitHubError(error, repoContext(owner, repo));
        }
      })
  );
}
