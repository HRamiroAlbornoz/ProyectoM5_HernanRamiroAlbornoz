import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createLabelSchema } from "../schemas/index.js";
import { createLabel } from "../github/operations/index.js";
import { toToolError } from "../errors/index.js";
import type { ToolResult } from "../types.js";

export function registerCreateLabel(server: McpServer): void {
  server.registerTool(
    "create_label",
    {
      title: "Crear label",
      description:
        "Crea un label personalizado en un repositorio de GitHub. Usá esta tool cuando el usuario quiera organizar issues y pull requests con etiquetas, crear categorías personalizadas o agregar un sistema de clasificación al repositorio.",
      inputSchema: createLabelSchema,
    },
    async (args): Promise<ToolResult> => {
      try {
        const label = await createLabel(
          args.owner,
          args.repo,
          args.name,
          args.color,
          args.description
        );
        return {
          content: [
            {
              type: "text",
              text: `Label creado exitosamente.\n\nNombre: ${label.name}\nColor: #${label.color}\nDescripción: ${label.description ?? "Sin descripción"}\nRepositorio: ${args.owner}/${args.repo}`,
            },
          ],
        };
      } catch (error) {
        const appError = toToolError(error, "crear el label");
        return {
          content: [{ type: "text", text: appError.message }],
          isError: true,
        };
      }
    }
  );
}
