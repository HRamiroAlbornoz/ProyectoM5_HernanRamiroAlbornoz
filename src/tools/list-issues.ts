import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listIssuesSchema } from "../schemas/index.js";
import { listIssues } from "../github/operations.js";
import { AppError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerListIssues(server: McpServer): void {
  server.registerTool(
    "list_issues",
    {
      title: "Listar issues",
      description:
        "Lista los issues de un repositorio de GitHub. Usá esta tool cuando el usuario quiera ver los issues abiertos, cerrados o todos los issues de un repositorio específico.",
      inputSchema: listIssuesSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const issues = await listIssues(
          args.owner,
          args.repo,
          args.state ?? "open",
          args.limit ?? 30
        );

        if (issues.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No se encontraron issues en ${args.owner}/${args.repo} con el estado "${args.state ?? "open"}".`,
              },
            ],
          };
        }

        const lista = issues
          .map(
            (issue) =>
              `#${issue.number} — ${issue.title}\n   Estado: ${issue.state} | Autor: ${issue.author ?? "desconocido"}\n   ${issue.url}`
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Se encontraron ${issues.length} issue(s) en ${args.owner}/${args.repo}:\n\n${lista}`,
            },
          ],
        };
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          "Error inesperado al listar los issues.",
          "UNKNOWN_ERROR",
          false,
          "ESCALATE",
          undefined
        );
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
