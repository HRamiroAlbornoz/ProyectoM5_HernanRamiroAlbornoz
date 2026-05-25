import { Octokit } from "@octokit/rest";
import { AuthenticationError } from "../errors/index.js";

let octokitInstance: Octokit | null = null;

export function getOctokitClient(): Octokit {
  if (octokitInstance !== null) return octokitInstance;

  const token = process.env["GITHUB_TOKEN"];

  if (!token) {
    throw new AuthenticationError(
      "No se encontró el token de GitHub. Configurá la variable de entorno GITHUB_TOKEN en el archivo .env."
    );
  }

  octokitInstance = new Octokit({ auth: token });
  return octokitInstance;
}
