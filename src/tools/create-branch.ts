import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createBranchSchema } from "../schemas/index.js";
import { createBranch } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreateBranch(server: McpServer): void {
  server.registerTool(
    "create_branch",
    {
      title: "Crear rama",
      description:
        "Crea una nueva rama en un repositorio de GitHub. Usá esta tool cuando el usuario quiera crear una rama para trabajar en una nueva funcionalidad, un fix o cualquier cambio que requiera una rama separada.",
      inputSchema: createBranchSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const branch = await createBranch(
          args.owner,
          args.repo,
          args.branchName,
          args.fromBranch
        );
        return {
          content: [
            {
              type: "text",
              text: `Rama creada exitosamente.\n\nNombre: ${branch.name}\nSHA: ${branch.sha.slice(0, 7)}\nRepositorio: ${args.owner}/${args.repo}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "crear la rama");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
