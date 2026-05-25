import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPullRequestSchema } from "../schemas/index.js";
import { createPullRequest } from "../github/operations.js";
import { AppError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreatePullRequest(server: McpServer): void {
  server.registerTool(
    "create_pull_request",
    {
      title: "Crear pull request",
      description:
        "Crea un pull request en un repositorio de GitHub para integrar cambios de una rama en otra. Usá esta tool cuando el usuario quiera proponer la fusión de cambios, solicitar una revisión de código o iniciar el proceso de integración de una funcionalidad.",
      inputSchema: createPullRequestSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const pr = await createPullRequest(
          args.owner,
          args.repo,
          args.title,
          args.body,
          args.head,
          args.base
        );
        return {
          content: [
            {
              type: "text",
              text: `Pull request creado exitosamente.\n\nNúmero: #${pr.number}\nTítulo: ${pr.title}\nDe: ${pr.sourceBranch} → ${pr.targetBranch}\nEstado: ${pr.state}\nURL: ${pr.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          "Error inesperado al crear el pull request.",
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
