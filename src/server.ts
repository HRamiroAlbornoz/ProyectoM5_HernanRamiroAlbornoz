import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCreateRepository } from "./tools/create-repository.js";
import { registerCreateIssue } from "./tools/create-issue.js";
import { registerListRepositories } from "./tools/list-repositories.js";
import { registerCreateCommit } from "./tools/create-commit.js";
import { registerListIssues } from "./tools/list-issues.js";
import { registerCreateBranch } from "./tools/create-branch.js";
import { registerCloseIssue } from "./tools/close-issue.js";
import { registerAddCommentToIssue } from "./tools/add-comment-to-issue.js";
import { registerListCommits } from "./tools/list-commits.js";
import { registerCreatePullRequest } from "./tools/create-pull-request.js";
import { registerCreateLabel } from "./tools/create-label.js";
import { registerAssignIssue } from "./tools/assign-issue.js";
import { registerAddCollaborator } from "./tools/add-collaborator.js";
import { logger } from "./utils/logging.js";

const server = new McpServer({
  name: "automatehub-mcp-server",
  version: "1.0.0",
});

registerCreateRepository(server);
registerCreateIssue(server);
registerListRepositories(server);
registerCreateCommit(server);
registerListIssues(server);
registerCreateBranch(server);
registerCloseIssue(server);
registerAddCommentToIssue(server);
registerListCommits(server);
registerCreatePullRequest(server);
registerCreateLabel(server);
registerAssignIssue(server);
registerAddCollaborator(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("AutomateHub MCP Server iniciado", { version: "1.0.0" });
}

main().catch((error: unknown) => {
  logger.error("Error fatal al iniciar el servidor", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
