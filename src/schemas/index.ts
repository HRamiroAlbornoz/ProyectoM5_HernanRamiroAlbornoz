import { z } from "zod";

const repoName = z
  .string()
  .min(3, "El nombre del repositorio debe tener al menos 3 caracteres.")
  .max(100, "El nombre del repositorio no puede superar los 100 caracteres.")
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    "El nombre del repositorio solo puede contener letras, números, guiones, puntos y guiones bajos."
  )
  .describe("Nombre del repositorio en GitHub.");

const owner = z
  .string()
  .min(1, "El nombre de usuario o propietario no puede estar vacío.")
  .describe("Nombre de usuario o propietario del repositorio en GitHub.");

const issueNumber = z
  .number()
  .int("El número del issue debe ser un entero.")
  .positive("El número del issue debe ser mayor a cero.")
  .describe("Número del issue en GitHub.");

export const createRepositorySchema = {
  name: repoName,
  description: z
    .string()
    .max(350, "La descripción no puede superar los 350 caracteres.")
    .optional()
    .describe("Descripción opcional del repositorio."),
  isPrivate: z
    .boolean()
    .optional()
    .default(false)
    .describe("Indica si el repositorio es privado. Por defecto es público."),
};

export const createIssueSchema = {
  owner,
  repo: repoName,
  title: z
    .string()
    .min(1, "El título del issue no puede estar vacío.")
    .max(256, "El título del issue no puede superar los 256 caracteres.")
    .describe("Título del issue a crear."),
  body: z
    .string()
    .max(65536, "El cuerpo del issue no puede superar los 65536 caracteres.")
    .optional()
    .describe("Cuerpo o descripción del issue. Acepta Markdown."),
};

export const listRepositoriesSchema = {
  limit: z
    .number()
    .int("El límite debe ser un entero.")
    .min(1, "El límite debe ser al menos 1.")
    .max(100, "El límite no puede superar los 100 repositorios.")
    .optional()
    .default(30)
    .describe("Cantidad máxima de repositorios a listar. Por defecto es 30."),
};

export const createCommitSchema = {
  owner,
  repo: repoName,
  branch: z
    .string()
    .min(1, "El nombre de la rama no puede estar vacío.")
    .describe("Nombre de la rama donde se hará el commit."),
  filePath: z
    .string()
    .min(1, "La ruta del archivo no puede estar vacía.")
    .describe("Ruta del archivo a crear o modificar dentro del repositorio. Ejemplo: src/index.ts"),
  content: z
    .string()
    .describe("Contenido del archivo en texto plano."),
  message: z
    .string()
    .min(1, "El mensaje del commit no puede estar vacío.")
    .max(72, "El mensaje del commit no debería superar los 72 caracteres.")
    .describe("Mensaje descriptivo del commit."),
};

export const listIssuesSchema = {
  owner,
  repo: repoName,
  state: z
    .enum(["open", "closed", "all"])
    .optional()
    .default("open")
    .describe("Estado de los issues a listar: 'open' (abiertos), 'closed' (cerrados) o 'all' (todos). Por defecto es 'open'."),
  limit: z
    .number()
    .int("El límite debe ser un entero.")
    .min(1, "El límite debe ser al menos 1.")
    .max(100, "El límite no puede superar los 100 issues.")
    .optional()
    .default(30)
    .describe("Cantidad máxima de issues a listar. Por defecto es 30."),
};

export const createBranchSchema = {
  owner,
  repo: repoName,
  branchName: z
    .string()
    .min(1, "El nombre de la rama no puede estar vacío.")
    .max(255, "El nombre de la rama no puede superar los 255 caracteres.")
    .regex(
      /^[^\s~^:?*\\[]+$/,
      "El nombre de la rama contiene caracteres no válidos para Git."
    )
    .describe("Nombre de la nueva rama a crear."),
  fromBranch: z
    .string()
    .min(1, "El nombre de la rama base no puede estar vacío.")
    .optional()
    .describe("Rama desde la cual se creará la nueva rama. Si no se especifica, se usa la rama por defecto del repositorio."),
};

export const closeIssueSchema = {
  owner,
  repo: repoName,
  issueNumber,
};

export const addCommentToIssueSchema = {
  owner,
  repo: repoName,
  issueNumber,
  body: z
    .string()
    .min(1, "El comentario no puede estar vacío.")
    .max(65536, "El comentario no puede superar los 65536 caracteres.")
    .describe("Texto del comentario. Acepta Markdown."),
};

export const listCommitsSchema = {
  owner,
  repo: repoName,
  branch: z
    .string()
    .min(1, "El nombre de la rama no puede estar vacío.")
    .optional()
    .describe("Rama de la cual listar commits. Si no se especifica, se usa la rama por defecto."),
  limit: z
    .number()
    .int("El límite debe ser un entero.")
    .min(1, "El límite debe ser al menos 1.")
    .max(100, "El límite no puede superar los 100 commits.")
    .optional()
    .default(10)
    .describe("Cantidad máxima de commits a listar. Por defecto es 10."),
};

export const createPullRequestSchema = {
  owner,
  repo: repoName,
  title: z
    .string()
    .min(1, "El título del pull request no puede estar vacío.")
    .max(256, "El título del pull request no puede superar los 256 caracteres.")
    .describe("Título del pull request."),
  body: z
    .string()
    .max(65536, "El cuerpo del pull request no puede superar los 65536 caracteres.")
    .optional()
    .describe("Descripción del pull request. Acepta Markdown."),
  head: z
    .string()
    .min(1, "El nombre de la rama origen no puede estar vacío.")
    .describe("Rama que contiene los cambios a integrar (rama origen)."),
  base: z
    .string()
    .min(1, "El nombre de la rama destino no puede estar vacío.")
    .describe("Rama hacia la cual se quieren integrar los cambios (rama destino)."),
};

export const createLabelSchema = {
  owner,
  repo: repoName,
  name: z
    .string()
    .min(1, "El nombre del label no puede estar vacío.")
    .max(50, "El nombre del label no puede superar los 50 caracteres.")
    .describe("Nombre del label a crear."),
  color: z
    .string()
    .regex(/^[0-9a-fA-F]{6}$/, "El color debe ser un código hexadecimal de 6 dígitos sin el símbolo #. Ejemplo: ff0000.")
    .describe("Color del label en formato hexadecimal de 6 dígitos sin #. Ejemplo: ff0000 para rojo."),
  description: z
    .string()
    .max(100, "La descripción del label no puede superar los 100 caracteres.")
    .optional()
    .describe("Descripción opcional del label."),
};

export const assignIssueSchema = {
  owner,
  repo: repoName,
  issueNumber,
  assignees: z
    .array(
      z.string().min(1, "El nombre de usuario no puede estar vacío.")
    )
    .min(1, "Debe especificar al menos un usuario para asignar.")
    .max(10, "No se pueden asignar más de 10 usuarios a un issue.")
    .describe("Lista de nombres de usuario de GitHub a asignar al issue."),
};

export const addCollaboratorSchema = {
  owner,
  repo: repoName,
  username: z
    .string()
    .min(1, "El nombre de usuario no puede estar vacío.")
    .describe("Nombre de usuario de GitHub del colaborador a agregar."),
  permission: z
    .enum(["pull", "push", "admin", "maintain", "triage"])
    .optional()
    .default("push")
    .describe("Nivel de permisos del colaborador: 'pull' (lectura), 'push' (escritura), 'admin' (administrador), 'maintain' (mantenedor) o 'triage' (clasificador). Por defecto es 'push'."),
};
