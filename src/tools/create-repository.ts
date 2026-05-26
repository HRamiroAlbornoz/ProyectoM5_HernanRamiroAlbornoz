import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRepositorySchema } from "../schemas/index.js";
import { createRepository } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreateRepository(server: McpServer): void {
  server.registerTool(
    "create_repository",
    {
      title: "Crear repositorio",
      description:
        "Crea un nuevo repositorio de GitHub para el usuario autenticado. Usá esta tool cuando el usuario quiera crear un repositorio nuevo, iniciar un proyecto o configurar un nuevo repo en su cuenta.",
      inputSchema: createRepositorySchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const repo = await createRepository(
          args.name,
          args.description,
          args.isPrivate ?? false
        );
        return {
          content: [
            {
              type: "text",
              text: `Repositorio creado exitosamente.\n\nNombre: ${repo.name}\nURL: ${repo.url}\nVisibilidad: ${repo.isPrivate ? "Privado" : "Público"}\nRama por defecto: ${repo.defaultBranch}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "crear el repositorio");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
