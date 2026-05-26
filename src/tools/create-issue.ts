import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createIssueSchema } from "../schemas/index.js";
import { createIssue } from "../github/operations.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreateIssue(server: McpServer): void {
  server.registerTool(
    "create_issue",
    {
      title: "Crear issue",
      description:
        "Abre un nuevo issue en un repositorio de GitHub. Usá esta tool cuando el usuario quiera reportar un bug, solicitar una funcionalidad, documentar una tarea pendiente o crear cualquier tipo de issue en un repositorio específico.",
      inputSchema: createIssueSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const issue = await createIssue(
          args.owner,
          args.repo,
          args.title,
          args.body
        );
        return {
          content: [
            {
              type: "text",
              text: `Issue creado exitosamente.\n\nNúmero: #${issue.number}\nTítulo: ${issue.title}\nEstado: ${issue.state}\nURL: ${issue.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "crear el issue");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
