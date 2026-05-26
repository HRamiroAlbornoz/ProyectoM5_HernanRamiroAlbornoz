import { getOctokitClient } from "../client.js";
import { mapToRepository } from "../mappers.js";
import { mapGitHubError } from "../../errors/index.js";
import { withRetry } from "../../utils/retry.js";
import { withOperationLogging } from "../../utils/logging.js";
import type { GitHubRepository } from "../../types.js";

export async function createRepository(
  name: string,
  description: string | undefined,
  isPrivate: boolean
): Promise<GitHubRepository> {
  return withOperationLogging("createRepository", { name, isPrivate }, () =>
    withRetry(async () => {
      try {
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
    })
  );
}

export async function listRepositories(
  limit: number
): Promise<GitHubRepository[]> {
  return withOperationLogging("listRepositories", { limit }, () =>
    withRetry(async () => {
      try {
        const octokit = getOctokitClient();
        const { data } = await octokit.repos.listForAuthenticatedUser({
          per_page: limit,
          sort: "updated",
        });
        return data.map(mapToRepository);
      } catch (error) {
        throw mapGitHubError(error);
      }
    })
  );
}
