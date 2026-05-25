import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createCommitSchema } from "../schemas/index.js";
import { createCommit } from "../github/operations.js";
import { AppError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreateCommit(server: McpServer): void {
  server.registerTool(
    "create_commit",
    {
      title: "Crear commit",
      description:
        "Crea un commit en un repositorio de GitHub agregando o modificando un archivo. Usá esta tool cuando el usuario quiera guardar cambios en un archivo, crear un archivo nuevo en el repo o actualizar contenido existente en una rama específica.",
      inputSchema: createCommitSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const commit = await createCommit(
          args.owner,
          args.repo,
          args.branch,
          args.filePath,
          args.content,
          args.message
        );
        return {
          content: [
            {
              type: "text",
              text: `Commit creado exitosamente.\n\nSHA: ${commit.sha.slice(0, 7)}\nMensaje: ${commit.message}\nArchivo: ${args.filePath}\nURL: ${commit.url}`,
            },
          ],
        };
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          "Error inesperado al crear el commit.",
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
