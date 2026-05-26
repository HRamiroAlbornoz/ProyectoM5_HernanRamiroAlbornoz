import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listCommitsSchema } from "../schemas/index.js";
import { listCommits } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerListCommits(server: McpServer): void {
  server.registerTool(
    "list_commits",
    {
      title: "Listar commits",
      description:
        "Lista los commits recientes de un repositorio de GitHub. Usá esta tool cuando el usuario quiera ver el historial de cambios de un repositorio, revisar qué se modificó recientemente o buscar un commit específico.",
      inputSchema: listCommitsSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const commits = await listCommits(
          args.owner,
          args.repo,
          args.branch,
          args.limit ?? 10
        );

        if (commits.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No se encontraron commits en ${args.owner}/${args.repo}.`,
              },
            ],
          };
        }

        const lista = commits
          .map(
            (commit) =>
              `${commit.sha.slice(0, 7)} — ${commit.message.split("\n")[0] ?? commit.message}\n   Autor: ${commit.author ?? "desconocido"}\n   ${commit.url}`
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Últimos ${commits.length} commit(s) en ${args.owner}/${args.repo}:\n\n${lista}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "listar los commits");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
