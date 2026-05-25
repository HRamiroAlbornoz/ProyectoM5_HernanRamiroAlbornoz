import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closeIssueSchema } from "../schemas/index.js";
import { closeIssue } from "../github/operations.js";
import { AppError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCloseIssue(server: McpServer): void {
  server.registerTool(
    "close_issue",
    {
      title: "Cerrar issue",
      description:
        "Cierra un issue existente en un repositorio de GitHub. Usá esta tool cuando el usuario quiera marcar un issue como resuelto, completado o que ya no es relevante.",
      inputSchema: closeIssueSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const issue = await closeIssue(args.owner, args.repo, args.issueNumber);
        return {
          content: [
            {
              type: "text",
              text: `Issue cerrado exitosamente.\n\nNúmero: #${issue.number}\nTítulo: ${issue.title}\nEstado: ${issue.state}\nURL: ${issue.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          "Error inesperado al cerrar el issue.",
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
