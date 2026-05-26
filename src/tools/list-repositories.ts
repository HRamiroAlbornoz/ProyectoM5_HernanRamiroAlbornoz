import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listRepositoriesSchema } from "../schemas/index.js";
import { listRepositories } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerListRepositories(server: McpServer): void {
  server.registerTool(
    "list_repositories",
    {
      title: "Listar repositorios",
      description:
        "Lista los repositorios del usuario autenticado en GitHub, ordenados por fecha de actualización. Usá esta tool cuando el usuario quiera ver sus repositorios, buscar un repo existente o conocer qué proyectos tiene en su cuenta.",
      inputSchema: listRepositoriesSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const repos = await listRepositories(args.limit ?? 30);

        if (repos.length === 0) {
          return {
            content: [{ type: "text", text: "No se encontraron repositorios en tu cuenta de GitHub." }],
          };
        }

        const lista = repos
          .map(
            (repo, i) =>
              `${i + 1}. ${repo.fullName}${repo.isPrivate ? " [privado]" : ""}\n   ${repo.description ?? "Sin descripción"}\n   ${repo.url}`
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Se encontraron ${repos.length} repositorio(s):\n\n${lista}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "listar los repositorios");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
