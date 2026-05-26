import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  createRepositorySchema,
  createIssueSchema,
  listRepositoriesSchema,
  createCommitSchema,
  listIssuesSchema,
  createBranchSchema,
  closeIssueSchema,
  addCommentToIssueSchema,
  listCommitsSchema,
  createPullRequestSchema,
  createLabelSchema,
  assignIssueSchema,
  addCollaboratorSchema,
} from "../src/schemas/index.js";

function parse<T extends z.ZodRawShape>(shape: T, data: unknown) {
  return z.object(shape).safeParse(data);
}

describe("createRepositorySchema", () => {
  it("acepta un nombre válido", () => {
    const result = parse(createRepositorySchema, { name: "mi-repo" });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre con menos de 3 caracteres", () => {
    const result = parse(createRepositorySchema, { name: "ab" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre con más de 100 caracteres", () => {
    const result = parse(createRepositorySchema, { name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre con caracteres inválidos", () => {
    const result = parse(createRepositorySchema, { name: "mi repo inválido!" });
    expect(result.success).toBe(false);
  });

  it("usa false como valor por defecto para isPrivate", () => {
    const result = parse(createRepositorySchema, { name: "mi-repo" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrivate).toBe(false);
  });
});

describe("createIssueSchema", () => {
  it("acepta parámetros válidos", () => {
    const result = parse(createIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      title: "Bug encontrado",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza título vacío", () => {
    const result = parse(createIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza título con más de 256 caracteres", () => {
    const result = parse(createIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      title: "a".repeat(257),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza owner vacío", () => {
    const result = parse(createIssueSchema, {
      owner: "",
      repo: "mi-repo",
      title: "Título válido",
    });
    expect(result.success).toBe(false);
  });
});

describe("listRepositoriesSchema", () => {
  it("usa 30 como valor por defecto para limit", () => {
    const result = parse(listRepositoriesSchema, {});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(30);
  });

  it("rechaza limit mayor a 100", () => {
    const result = parse(listRepositoriesSchema, { limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rechaza limit menor a 1", () => {
    const result = parse(listRepositoriesSchema, { limit: 0 });
    expect(result.success).toBe(false);
  });
});

describe("createCommitSchema", () => {
  it("acepta parámetros válidos", () => {
    const result = parse(createCommitSchema, {
      owner: "usuario",
      repo: "mi-repo",
      branch: "main",
      filePath: "src/index.ts",
      content: "console.log('hola')",
      message: "Add index file",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza mensaje de commit vacío", () => {
    const result = parse(createCommitSchema, {
      owner: "usuario",
      repo: "mi-repo",
      branch: "main",
      filePath: "src/index.ts",
      content: "contenido",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza filePath vacío", () => {
    const result = parse(createCommitSchema, {
      owner: "usuario",
      repo: "mi-repo",
      branch: "main",
      filePath: "",
      content: "contenido",
      message: "mensaje",
    });
    expect(result.success).toBe(false);
  });
});

describe("listIssuesSchema", () => {
  it("usa 'open' como estado por defecto", () => {
    const result = parse(listIssuesSchema, {
      owner: "usuario",
      repo: "mi-repo",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.state).toBe("open");
  });

  it("acepta estado 'closed'", () => {
    const result = parse(listIssuesSchema, {
      owner: "usuario",
      repo: "mi-repo",
      state: "closed",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza estado inválido", () => {
    const result = parse(listIssuesSchema, {
      owner: "usuario",
      repo: "mi-repo",
      state: "pending",
    });
    expect(result.success).toBe(false);
  });
});

describe("createBranchSchema", () => {
  it("acepta parámetros válidos", () => {
    const result = parse(createBranchSchema, {
      owner: "usuario",
      repo: "mi-repo",
      branchName: "feature/nueva-funcionalidad",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre de rama con espacios", () => {
    const result = parse(createBranchSchema, {
      owner: "usuario",
      repo: "mi-repo",
      branchName: "mi rama",
    });
    expect(result.success).toBe(false);
  });
});

describe("closeIssueSchema", () => {
  it("acepta número de issue válido", () => {
    const result = parse(closeIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 42,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza número de issue negativo", () => {
    const result = parse(closeIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza número de issue cero", () => {
    const result = parse(closeIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("addCommentToIssueSchema", () => {
  it("acepta parámetros válidos", () => {
    const result = parse(addCommentToIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 1,
      body: "Este es un comentario.",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza comentario vacío", () => {
    const result = parse(addCommentToIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 1,
      body: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("listCommitsSchema", () => {
  it("usa 10 como limit por defecto", () => {
    const result = parse(listCommitsSchema, {
      owner: "usuario",
      repo: "mi-repo",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(10);
  });
});

describe("createPullRequestSchema", () => {
  it("acepta parámetros válidos", () => {
    const result = parse(createPullRequestSchema, {
      owner: "usuario",
      repo: "mi-repo",
      title: "feat: nueva funcionalidad",
      head: "feature/nueva",
      base: "main",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza head vacío", () => {
    const result = parse(createPullRequestSchema, {
      owner: "usuario",
      repo: "mi-repo",
      title: "feat: nueva funcionalidad",
      head: "",
      base: "main",
    });
    expect(result.success).toBe(false);
  });
});

describe("createLabelSchema", () => {
  it("acepta color hexadecimal válido", () => {
    const result = parse(createLabelSchema, {
      owner: "usuario",
      repo: "mi-repo",
      name: "bug",
      color: "ff0000",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza color con símbolo #", () => {
    const result = parse(createLabelSchema, {
      owner: "usuario",
      repo: "mi-repo",
      name: "bug",
      color: "#ff0000",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza color con menos de 6 dígitos", () => {
    const result = parse(createLabelSchema, {
      owner: "usuario",
      repo: "mi-repo",
      name: "bug",
      color: "ff00",
    });
    expect(result.success).toBe(false);
  });
});

describe("assignIssueSchema", () => {
  it("acepta lista de assignees válida", () => {
    const result = parse(assignIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 1,
      assignees: ["usuario1", "usuario2"],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza lista de assignees vacía", () => {
    const result = parse(assignIssueSchema, {
      owner: "usuario",
      repo: "mi-repo",
      issueNumber: 1,
      assignees: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("addCollaboratorSchema", () => {
  it("usa 'push' como permiso por defecto", () => {
    const result = parse(addCollaboratorSchema, {
      owner: "usuario",
      repo: "mi-repo",
      username: "colaborador",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.permission).toBe("push");
  });

  it("rechaza permiso inválido", () => {
    const result = parse(addCollaboratorSchema, {
      owner: "usuario",
      repo: "mi-repo",
      username: "colaborador",
      permission: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});
