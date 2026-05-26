import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthenticationError, GitHubAPIError } from "../src/errors/index.js";

vi.mock("../src/github/client.js", () => ({
  getOctokitClient: vi.fn(),
}));

import { getOctokitClient } from "../src/github/client.js";
import {
  createRepository,
  createIssue,
  listRepositories,
  listIssues,
  closeIssue,
  addCommentToIssue,
  createBranch,
  listCommits,
  createCommit,
  createPullRequest,
  createLabel,
  assignIssue,
  addCollaborator,
} from "../src/github/operations.js";

const mockOctokit = {
  repos: {
    createForAuthenticatedUser: vi.fn(),
    listForAuthenticatedUser: vi.fn(),
    get: vi.fn(),
    listCommits: vi.fn(),
    addCollaborator: vi.fn(),
  },
  issues: {
    create: vi.fn(),
    listForRepo: vi.fn(),
    update: vi.fn(),
    createComment: vi.fn(),
    addAssignees: vi.fn(),
    createLabel: vi.fn(),
  },
  git: {
    getRef: vi.fn(),
    getCommit: vi.fn(),
    createBlob: vi.fn(),
    createTree: vi.fn(),
    createCommit: vi.fn(),
    updateRef: vi.fn(),
    createRef: vi.fn(),
  },
  pulls: {
    create: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOctokitClient).mockReturnValue(mockOctokit as never);
});

describe("createRepository", () => {
  it("retorna el repositorio creado con los campos mapeados correctamente", async () => {
    mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
      data: {
        id: 1,
        name: "mi-repo",
        full_name: "usuario/mi-repo",
        description: "Un repositorio de prueba",
        html_url: "https://github.com/usuario/mi-repo",
        private: false,
        default_branch: "main",
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await createRepository("mi-repo", "Un repositorio de prueba", false);

    expect(result.name).toBe("mi-repo");
    expect(result.fullName).toBe("usuario/mi-repo");
    expect(result.isPrivate).toBe(false);
    expect(result.defaultBranch).toBe("main");
    expect(result.url).toBe("https://github.com/usuario/mi-repo");
  });

  it("lanza AuthenticationError cuando el token es inválido (401)", async () => {
    mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({ status: 401 });

    await expect(createRepository("mi-repo", undefined, false)).rejects.toBeInstanceOf(
      AuthenticationError
    );
  });

  it("lanza GitHubAPIError no reintentable cuando el repo ya existe (422)", async () => {
    mockOctokit.repos.createForAuthenticatedUser.mockRejectedValue({ status: 422 });

    const error = await createRepository("mi-repo", undefined, false).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("createIssue", () => {
  it("retorna el issue creado con los campos mapeados correctamente", async () => {
    mockOctokit.issues.create.mockResolvedValue({
      data: {
        id: 100,
        number: 5,
        title: "Bug en producción",
        body: "Descripción del bug",
        state: "open",
        html_url: "https://github.com/usuario/mi-repo/issues/5",
        user: { login: "usuario" },
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await createIssue("usuario", "mi-repo", "Bug en producción", "Descripción del bug");

    expect(result.number).toBe(5);
    expect(result.title).toBe("Bug en producción");
    expect(result.state).toBe("open");
    expect(result.author).toBe("usuario");
  });

  it("lanza GitHubAPIError cuando el repositorio no existe (404)", async () => {
    mockOctokit.issues.create.mockRejectedValue({ status: 404 });

    const error = await createIssue("usuario", "repo-inexistente", "Título", undefined).catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).message).toContain("no fue encontrado");
  });
});

describe("listRepositories", () => {
  it("retorna la lista de repositorios mapeados correctamente", async () => {
    mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "repo-uno",
          full_name: "usuario/repo-uno",
          description: "Primer repo",
          html_url: "https://github.com/usuario/repo-uno",
          private: false,
          default_branch: "main",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "repo-dos",
          full_name: "usuario/repo-dos",
          description: null,
          html_url: "https://github.com/usuario/repo-dos",
          private: true,
          default_branch: "main",
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
    });

    const result = await listRepositories(30);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("repo-uno");
    expect(result[1]?.isPrivate).toBe(true);
    expect(result[1]?.description).toBeNull();
  });

  it("retorna array vacío cuando no hay repositorios", async () => {
    mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({ data: [] });
    const result = await listRepositories(30);
    expect(result).toHaveLength(0);
  });
});

describe("listIssues", () => {
  it("filtra los pull requests de la lista de issues", async () => {
    mockOctokit.issues.listForRepo.mockResolvedValue({
      data: [
        {
          id: 1,
          number: 1,
          title: "Issue real",
          body: null,
          state: "open",
          html_url: "https://github.com/usuario/mi-repo/issues/1",
          user: { login: "usuario" },
          created_at: "2024-01-01T00:00:00Z",
          pull_request: undefined,
        },
        {
          id: 2,
          number: 2,
          title: "Pull request disfrazado",
          body: null,
          state: "open",
          html_url: "https://github.com/usuario/mi-repo/pull/2",
          user: { login: "usuario" },
          created_at: "2024-01-01T00:00:00Z",
          pull_request: { url: "https://api.github.com/repos/usuario/mi-repo/pulls/2" },
        },
      ],
    });

    const result = await listIssues("usuario", "mi-repo", "open", 30);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Issue real");
  });
});

describe("closeIssue", () => {
  it("retorna el issue con estado 'closed'", async () => {
    mockOctokit.issues.update.mockResolvedValue({
      data: {
        id: 1,
        number: 3,
        title: "Bug resuelto",
        body: null,
        state: "closed",
        html_url: "https://github.com/usuario/mi-repo/issues/3",
        user: { login: "usuario" },
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await closeIssue("usuario", "mi-repo", 3);

    expect(result.state).toBe("closed");
    expect(result.number).toBe(3);
  });

  it("lanza GitHubAPIError cuando el issue no existe (404)", async () => {
    mockOctokit.issues.update.mockRejectedValue({ status: 404 });

    const error = await closeIssue("usuario", "mi-repo", 999).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("addCommentToIssue", () => {
  it("retorna el comentario creado correctamente", async () => {
    mockOctokit.issues.createComment.mockResolvedValue({
      data: {
        id: 50,
        body: "Este es un comentario de prueba.",
        html_url: "https://github.com/usuario/mi-repo/issues/1#issuecomment-50",
        user: { login: "usuario" },
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await addCommentToIssue("usuario", "mi-repo", 1, "Este es un comentario de prueba.");

    expect(result.id).toBe(50);
    expect(result.body).toBe("Este es un comentario de prueba.");
    expect(result.author).toBe("usuario");
  });
});

describe("createBranch", () => {
  it("crea la rama desde la rama por defecto cuando no se especifica fromBranch", async () => {
    mockOctokit.repos.get.mockResolvedValue({
      data: { default_branch: "main" },
    });
    mockOctokit.git.getRef.mockResolvedValue({
      data: { object: { sha: "abc123def456" } },
    });
    mockOctokit.git.createRef.mockResolvedValue({
      data: { object: { sha: "abc123def456" } },
    });

    const result = await createBranch("usuario", "mi-repo", "feature/nueva", undefined);

    expect(result.name).toBe("feature/nueva");
    expect(result.sha).toBe("abc123def456");
    expect(mockOctokit.repos.get).toHaveBeenCalledWith({ owner: "usuario", repo: "mi-repo" });
  });

  it("crea la rama desde la rama especificada en fromBranch", async () => {
    mockOctokit.git.getRef.mockResolvedValue({
      data: { object: { sha: "xyz789" } },
    });
    mockOctokit.git.createRef.mockResolvedValue({
      data: { object: { sha: "xyz789" } },
    });

    const result = await createBranch("usuario", "mi-repo", "feature/otra", "develop");

    expect(result.name).toBe("feature/otra");
    expect(mockOctokit.repos.get).not.toHaveBeenCalled();
  });
});

describe("listCommits", () => {
  it("retorna la lista de commits mapeados correctamente", async () => {
    mockOctokit.repos.listCommits.mockResolvedValue({
      data: [
        {
          sha: "abc123def456ghi789",
          html_url: "https://github.com/usuario/mi-repo/commit/abc123",
          commit: {
            message: "feat: primera funcionalidad",
            author: { name: "Hernán Albornoz" },
          },
        },
      ],
    });

    const result = await listCommits("usuario", "mi-repo", undefined, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.sha).toBe("abc123def456ghi789");
    expect(result[0]?.message).toBe("feat: primera funcionalidad");
    expect(result[0]?.author).toBe("Hernán Albornoz");
  });
});

describe("createCommit", () => {
  function setupSuccessfulCommitMocks() {
    mockOctokit.git.getRef.mockResolvedValue({
      data: { object: { sha: "latest-sha-123" } },
    });
    mockOctokit.git.getCommit.mockResolvedValue({
      data: { tree: { sha: "tree-sha-456" } },
    });
    mockOctokit.git.createBlob.mockResolvedValue({
      data: { sha: "blob-sha-789" },
    });
    mockOctokit.git.createTree.mockResolvedValue({
      data: { sha: "new-tree-sha-abc" },
    });
    mockOctokit.git.createCommit.mockResolvedValue({
      data: {
        sha: "new-commit-sha-def",
        message: "Add new file",
        html_url: "https://github.com/usuario/mi-repo/commit/new-commit-sha-def",
        author: { name: "Hernán Albornoz" },
      },
    });
    mockOctokit.git.updateRef.mockResolvedValue({ data: {} });
  }

  it("ejecuta el flujo completo y retorna el commit creado", async () => {
    setupSuccessfulCommitMocks();

    const result = await createCommit(
      "usuario",
      "mi-repo",
      "main",
      "src/index.ts",
      "console.log('hola')",
      "Add new file"
    );

    expect(result.sha).toBe("new-commit-sha-def");
    expect(result.message).toBe("Add new file");
    expect(result.author).toBe("Hernán Albornoz");
    expect(result.url).toBe("https://github.com/usuario/mi-repo/commit/new-commit-sha-def");
  });

  it("encodea el contenido del archivo a base64 antes de crear el blob", async () => {
    setupSuccessfulCommitMocks();

    await createCommit("usuario", "mi-repo", "main", "src/index.ts", "hola mundo", "msg");

    // "hola mundo" en base64
    const expectedBase64 = "aG9sYSBtdW5kbw==";
    expect(mockOctokit.git.createBlob).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      content: expectedBase64,
      encoding: "base64",
    });
  });

  it("actualiza la referencia de la rama con el nuevo commit SHA", async () => {
    setupSuccessfulCommitMocks();

    await createCommit("usuario", "mi-repo", "main", "src/index.ts", "contenido", "msg");

    expect(mockOctokit.git.updateRef).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      ref: "heads/main",
      sha: "new-commit-sha-def",
    });
  });

  it("usa el árbol base correcto en createTree", async () => {
    setupSuccessfulCommitMocks();

    await createCommit("usuario", "mi-repo", "main", "src/index.ts", "contenido", "msg");

    expect(mockOctokit.git.createTree).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      base_tree: "tree-sha-456",
      tree: [
        {
          path: "src/index.ts",
          mode: "100644",
          type: "blob",
          sha: "blob-sha-789",
        },
      ],
    });
  });

  it("falla con GitHubAPIError cuando la rama no existe (404)", async () => {
    mockOctokit.git.getRef.mockRejectedValue({ status: 404 });

    const error = await createCommit(
      "usuario",
      "mi-repo",
      "rama-inexistente",
      "src/index.ts",
      "contenido",
      "msg"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).message).toContain("no fue encontrado");
  });

  it("falla con AuthenticationError cuando el token es inválido (401)", async () => {
    mockOctokit.git.getRef.mockRejectedValue({ status: 401 });

    await expect(
      createCommit("usuario", "mi-repo", "main", "src/index.ts", "contenido", "msg")
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("createBranch (casos de error)", () => {
  it("falla con GitHubAPIError cuando fromBranch no existe (404)", async () => {
    mockOctokit.git.getRef.mockRejectedValue({ status: 404 });

    const error = await createBranch(
      "usuario",
      "mi-repo",
      "feature/nueva",
      "rama-inexistente"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("createPullRequest", () => {
  it("retorna el PR creado con los campos mapeados correctamente", async () => {
    mockOctokit.pulls.create.mockResolvedValue({
      data: {
        id: 200,
        number: 7,
        title: "feat: nueva funcionalidad",
        html_url: "https://github.com/usuario/mi-repo/pull/7",
        state: "open",
        head: { ref: "feature/nueva" },
        base: { ref: "main" },
      },
    });

    const result = await createPullRequest(
      "usuario",
      "mi-repo",
      "feat: nueva funcionalidad",
      "Descripción del PR",
      "feature/nueva",
      "main"
    );

    expect(result.number).toBe(7);
    expect(result.title).toBe("feat: nueva funcionalidad");
    expect(result.state).toBe("open");
    expect(result.sourceBranch).toBe("feature/nueva");
    expect(result.targetBranch).toBe("main");
  });

  it("falla con GitHubAPIError cuando una rama no existe (422)", async () => {
    mockOctokit.pulls.create.mockRejectedValue({ status: 422 });

    const error = await createPullRequest(
      "usuario",
      "mi-repo",
      "título",
      undefined,
      "rama-inexistente",
      "main"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("createLabel", () => {
  it("retorna el label creado con los campos mapeados correctamente", async () => {
    mockOctokit.issues.createLabel.mockResolvedValue({
      data: {
        id: 300,
        name: "bug",
        color: "ff0000",
        description: "Errores de la app",
      },
    });

    const result = await createLabel(
      "usuario",
      "mi-repo",
      "bug",
      "ff0000",
      "Errores de la app"
    );

    expect(result.id).toBe(300);
    expect(result.name).toBe("bug");
    expect(result.color).toBe("ff0000");
    expect(result.description).toBe("Errores de la app");
  });

  it("retorna description: null cuando el label no tiene descripción", async () => {
    mockOctokit.issues.createLabel.mockResolvedValue({
      data: {
        id: 301,
        name: "wontfix",
        color: "cccccc",
        description: null,
      },
    });

    const result = await createLabel("usuario", "mi-repo", "wontfix", "cccccc", undefined);

    expect(result.description).toBeNull();
  });

  it("falla con GitHubAPIError cuando el label ya existe (422)", async () => {
    mockOctokit.issues.createLabel.mockRejectedValue({ status: 422 });

    const error = await createLabel(
      "usuario",
      "mi-repo",
      "duplicado",
      "ff0000",
      undefined
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("assignIssue", () => {
  it("retorna el issue con los assignees actualizados", async () => {
    mockOctokit.issues.addAssignees.mockResolvedValue({
      data: {
        id: 1,
        number: 10,
        title: "Issue a asignar",
        body: null,
        state: "open",
        html_url: "https://github.com/usuario/mi-repo/issues/10",
        user: { login: "usuario" },
        created_at: "2024-01-01T00:00:00Z",
      },
    });

    const result = await assignIssue("usuario", "mi-repo", 10, [
      "colaborador1",
      "colaborador2",
    ]);

    expect(result.number).toBe(10);
    expect(result.state).toBe("open");
    expect(mockOctokit.issues.addAssignees).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      issue_number: 10,
      assignees: ["colaborador1", "colaborador2"],
    });
  });

  it("falla con GitHubAPIError cuando el issue no existe (404)", async () => {
    mockOctokit.issues.addAssignees.mockRejectedValue({ status: 404 });

    const error = await assignIssue("usuario", "mi-repo", 999, ["colab"]).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});

describe("addCollaborator", () => {
  it("llama a la API con los parámetros correctos", async () => {
    mockOctokit.repos.addCollaborator.mockResolvedValue({ data: {} });

    await addCollaborator("usuario", "mi-repo", "nuevo-colaborador", "push");

    expect(mockOctokit.repos.addCollaborator).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      username: "nuevo-colaborador",
      permission: "push",
    });
  });

  it("acepta otros niveles de permiso", async () => {
    mockOctokit.repos.addCollaborator.mockResolvedValue({ data: {} });

    await addCollaborator("usuario", "mi-repo", "admin-user", "admin");

    expect(mockOctokit.repos.addCollaborator).toHaveBeenCalledWith({
      owner: "usuario",
      repo: "mi-repo",
      username: "admin-user",
      permission: "admin",
    });
  });

  it("falla con GitHubAPIError cuando el usuario no existe (404)", async () => {
    mockOctokit.repos.addCollaborator.mockRejectedValue({ status: 404 });

    const error = await addCollaborator(
      "usuario",
      "mi-repo",
      "usuario-inexistente",
      "push"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(false);
  });
});
