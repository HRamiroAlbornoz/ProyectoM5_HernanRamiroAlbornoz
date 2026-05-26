import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assignIssueSchema } from "../schemas/index.js";
import { assignIssue } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerAssignIssue(server: McpServer): void {
  server.registerTool(
    "assign_issue",
    {
      title: "Asignar issue",
      description:
        "Asigna uno o más usuarios a un issue de GitHub. Usá esta tool cuando el usuario quiera designar responsables para un issue, distribuir tareas entre miembros del equipo o actualizar la asignación de un issue existente.",
      inputSchema: assignIssueSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const issue = await assignIssue(
          args.owner,
          args.repo,
          args.issueNumber,
          args.assignees
        );
        return {
          content: [
            {
              type: "text",
              text: `Issue #${issue.number} asignado exitosamente.\n\nTítulo: ${issue.title}\nAsignados: ${args.assignees.join(", ")}\nURL: ${issue.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "asignar el issue");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
