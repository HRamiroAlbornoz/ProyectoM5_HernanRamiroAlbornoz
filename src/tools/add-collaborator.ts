import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { addCollaboratorSchema } from "../schemas/index.js";
import { addCollaborator } from "../github/operations.js";
import { AppError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerAddCollaborator(server: McpServer): void {
  server.registerTool(
    "add_collaborator",
    {
      title: "Agregar colaborador",
      description:
        "Agrega un colaborador a un repositorio de GitHub con un nivel de permisos específico. Usá esta tool cuando el usuario quiera dar acceso a otro usuario a su repositorio, ya sea para lectura, escritura o administración.",
      inputSchema: addCollaboratorSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        await addCollaborator(
          args.owner,
          args.repo,
          args.username,
          args.permission ?? "push"
        );
        return {
          content: [
            {
              type: "text",
              text: `Colaborador agregado exitosamente.\n\nUsuario: ${args.username}\nRepositorio: ${args.owner}/${args.repo}\nPermisos: ${args.permission ?? "push"}\n\nNota: Se envió una invitación al usuario. Deberá aceptarla para acceder al repositorio.`,
            },
          ],
        };
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError(
          "Error inesperado al agregar el colaborador.",
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
