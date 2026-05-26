import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addCommentToIssueSchema } from "../schemas/index.js";
import { addCommentToIssue } from "../github/operations.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerAddCommentToIssue(server: McpServer): void {
  server.registerTool(
    "add_comment_to_issue",
    {
      title: "Agregar comentario a issue",
      description:
        "Agrega un comentario a un issue existente en un repositorio de GitHub. Usá esta tool cuando el usuario quiera responder a un issue, agregar información adicional, dar una actualización de estado o interactuar con la discusión de un issue.",
      inputSchema: addCommentToIssueSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const comment = await addCommentToIssue(
          args.owner,
          args.repo,
          args.issueNumber,
          args.body
        );
        return {
          content: [
            {
              type: "text",
              text: `Comentario agregado exitosamente al issue #${args.issueNumber}.\n\nURL: ${comment.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "agregar el comentario");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
