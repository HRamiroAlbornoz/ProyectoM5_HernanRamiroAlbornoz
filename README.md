# AutomateHub MCP Server

Servidor MCP (Model Context Protocol) que permite a agentes de IA ejecutar operaciones reales en GitHub mediante lenguaje natural. Desarrollado como Proyecto Integrador del Módulo 5 de Henry Full Stack.

## ¿Qué hace?

AutomateHub expone 13 herramientas (tools) que un agente de IA puede invocar desde Antigravity para automatizar tareas repetitivas de GitHub sin necesidad de abrir el navegador ni escribir código:

- Crear repositorios, ramas, issues, pull requests, labels y commits
- Listar repositorios, issues y commits
- Cerrar issues, agregar comentarios y asignar responsables
- Agregar colaboradores a repositorios

## ¿Por qué es útil?

Los equipos de desarrollo repiten las mismas operaciones en GitHub decenas de veces por día. Con AutomateHub, esas operaciones se ejecutan desde lenguaje natural:

> *"Creá un repositorio llamado api-rest con descripción 'Backend del proyecto'"*
> *"Abrí un issue en mi-repo reportando que el login falla en móvil"*
> *"Listá los últimos 5 commits de la rama main"*

El agente de IA interpreta el pedido, elige la herramienta correcta y ejecuta la acción automáticamente.

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        Antigravity (Host)                    │
│              Gestiona la sesión y conecta los componentes    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     LLM — Gemini / Claude                    │
│     Recibe el prompt, decide qué tool usar y con qué args    │
└──────────────────────────┬──────────────────────────────────┘
                           │ stdio (JSON-RPC)
┌──────────────────────────▼──────────────────────────────────┐
│               AutomateHub MCP Server (este proyecto)         │
│         Expone 13 tools, valida inputs con Zod y ejecuta     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + token
┌──────────────────────────▼──────────────────────────────────┐
│                       GitHub API (Octokit)                   │
│          Recibe las llamadas autenticadas y responde         │
└─────────────────────────────────────────────────────────────┘
```

**¿Por qué stdio y no HTTP?**
El protocolo MCP usa `stdio` (standard input/output) para comunicarse con el host. El servidor lee mensajes JSON-RPC de `stdin` y responde por `stdout`. Esto permite que Antigravity gestione el ciclo de vida del proceso directamente.

## Requisitos del sistema

- Node.js 18 o superior
- npm 9 o superior
- Cuenta de GitHub con Personal Access Token
- Antigravity instalado

Verificar la versión de Node.js:

```bash
node --version
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/HRamiroAlbornoz/ProyectoM5_HernanRamiroAlbornoz.git
cd ProyectoM5_HernanRamiroAlbornoz
```

### 2. Instalar las dependencias

Instalar cada dependencia de forma individual:

```bash
npm install @modelcontextprotocol/sdk
npm install @octokit/rest
npm install zod
npm install dotenv
npm install tsx
npm install --save-dev vitest
npm install --save-dev typescript
npm install --save-dev @types/node
npm install --save-dev @vitest/coverage-v8
```

### 3. Compilar el proyecto

```bash
npm run build
```

## Configuración

### Paso 1 — Obtener un GitHub Personal Access Token

1. Ingresar a [github.com/settings/tokens](https://github.com/settings/tokens)
2. Hacer clic en **Generate new token (classic)**
3. Asignar un nombre descriptivo, por ejemplo: `automatehub-mcp`
4. Seleccionar los siguientes scopes:
   - `repo` — acceso completo a repositorios (crear, leer, escribir)
   - `user` — acceso a información del usuario autenticado
   - `admin:org` — acceso a operaciones de organizaciones
5. Hacer clic en **Generate token**
6. Copiar el token inmediatamente — no se muestra nuevamente

> ⚠️ **Importante:** el token es como una contraseña. Nunca lo compartas ni lo subas a un repositorio.

### Paso 2 — Configurar el archivo `.env`

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Abrir `.env` y reemplazar el valor con el token real:

```
GITHUB_TOKEN=ghp_tu_token_real_aqui
```

### Paso 3 — Configurar el MCP server en Antigravity

Abrir la configuración de MCP servers en Antigravity y agregar la siguiente entrada:

```json
{
  "mcpServers": {
    "automatehub": {
      "command": "node",
      "args": ["ruta/absoluta/al/proyecto/dist/server.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_tu_token_real_aqui"
      }
    }
  }
}
```

Reemplazar `ruta/absoluta/al/proyecto` con la ruta real donde se clonó el repositorio.

**Ejemplo en Windows:**
```json
"args": ["C:/Users/tu-usuario/ProyectoM5_HernanRamiroAlbornoz/dist/server.js"]
```

**Ejemplo en macOS/Linux:**
```json
"args": ["/home/tu-usuario/ProyectoM5_HernanRamiroAlbornoz/dist/server.js"]
```

### Paso 4 — Verificar la instalación

Para verificar que el servidor funciona correctamente, usar MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

Deberías ver los 13 tools listados en la interfaz del inspector.

## Documentación de tools

### `create_repository`
Crea un nuevo repositorio en la cuenta del usuario autenticado.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | string | ✅ | Nombre del repositorio (3-100 caracteres, alfanuméricos y guiones) |
| `description` | string | ❌ | Descripción del repositorio |
| `isPrivate` | boolean | ❌ | Si es privado. Por defecto: `false` |

**Ejemplo de prompt:**
> *"Creá un repositorio llamado mi-proyecto con descripción 'Proyecto de práctica' y que sea privado"*

---

### `create_issue`
Abre un nuevo issue en un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `title` | string | ✅ | Título del issue (máx. 256 caracteres) |
| `body` | string | ❌ | Descripción del issue (acepta Markdown) |

**Ejemplo de prompt:**
> *"Abrí un issue en HRamiroAlbornoz/mi-repo con el título 'Bug: el login falla en móvil' y descripción 'El formulario no envía en Safari'"*

---

### `list_repositories`
Lista los repositorios del usuario autenticado ordenados por fecha de actualización.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `limit` | number | ❌ | Cantidad máxima de resultados (1-100). Por defecto: `30` |

**Ejemplo de prompt:**
> *"Mostrá mis últimos 10 repositorios de GitHub"*

---

### `create_commit`
Crea un commit agregando o modificando un archivo en un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `branch` | string | ✅ | Rama donde se hará el commit |
| `filePath` | string | ✅ | Ruta del archivo. Ejemplo: `src/index.ts` |
| `content` | string | ✅ | Contenido del archivo en texto plano |
| `message` | string | ✅ | Mensaje del commit (máx. 72 caracteres) |

**Ejemplo de prompt:**
> *"Hacé un commit en HRamiroAlbornoz/mi-repo en la rama main, creando el archivo README.md con el contenido '# Mi Proyecto', con el mensaje 'Add README'"*

---

### `list_issues`
Lista los issues de un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `state` | string | ❌ | Estado: `open`, `closed` o `all`. Por defecto: `open` |
| `limit` | number | ❌ | Cantidad máxima de resultados (1-100). Por defecto: `30` |

**Ejemplo de prompt:**
> *"Listá los issues cerrados de HRamiroAlbornoz/mi-repo"*

---

### `create_branch`
Crea una nueva rama en un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `branchName` | string | ✅ | Nombre de la nueva rama |
| `fromBranch` | string | ❌ | Rama base. Si no se especifica, usa la rama por defecto |

**Ejemplo de prompt:**
> *"Creá la rama feature/login en HRamiroAlbornoz/mi-repo a partir de main"*

---

### `close_issue`
Cierra un issue existente.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `issueNumber` | number | ✅ | Número del issue a cerrar |

**Ejemplo de prompt:**
> *"Cerrá el issue #5 de HRamiroAlbornoz/mi-repo"*

---

### `add_comment_to_issue`
Agrega un comentario a un issue existente.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `issueNumber` | number | ✅ | Número del issue |
| `body` | string | ✅ | Texto del comentario (acepta Markdown) |

**Ejemplo de prompt:**
> *"Comentá en el issue #3 de HRamiroAlbornoz/mi-repo: 'Esto está resuelto en la rama hotfix/login'"*

---

### `list_commits`
Lista los commits recientes de un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `branch` | string | ❌ | Rama a consultar. Si no se especifica, usa la rama por defecto |
| `limit` | number | ❌ | Cantidad máxima de resultados (1-100). Por defecto: `10` |

**Ejemplo de prompt:**
> *"Mostrá los últimos 5 commits de la rama develop en HRamiroAlbornoz/mi-repo"*

---

### `create_pull_request`
Crea un pull request entre dos ramas.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `title` | string | ✅ | Título del pull request |
| `body` | string | ❌ | Descripción del pull request (acepta Markdown) |
| `head` | string | ✅ | Rama origen (la que tiene los cambios) |
| `base` | string | ✅ | Rama destino (donde se van a integrar los cambios) |

**Ejemplo de prompt:**
> *"Creá un pull request en HRamiroAlbornoz/mi-repo para fusionar feature/login en main con el título 'feat: implementar login'"*

---

### `create_label`
Crea un label personalizado en un repositorio.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `name` | string | ✅ | Nombre del label (máx. 50 caracteres) |
| `color` | string | ✅ | Color en hexadecimal sin # (ejemplo: `ff0000`) |
| `description` | string | ❌ | Descripción del label |

**Ejemplo de prompt:**
> *"Creá un label llamado 'urgente' de color rojo (ff0000) en HRamiroAlbornoz/mi-repo"*

---

### `assign_issue`
Asigna uno o más usuarios a un issue.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `issueNumber` | number | ✅ | Número del issue |
| `assignees` | string[] | ✅ | Lista de nombres de usuario de GitHub (máx. 10) |

**Ejemplo de prompt:**
> *"Asigná el issue #2 de HRamiroAlbornoz/mi-repo al usuario HRamiroAlbornoz"*

---

### `add_collaborator`
Agrega un colaborador a un repositorio con permisos específicos.

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `owner` | string | ✅ | Nombre de usuario dueño del repositorio |
| `repo` | string | ✅ | Nombre del repositorio |
| `username` | string | ✅ | Nombre de usuario de GitHub del colaborador |
| `permission` | string | ❌ | Permisos: `pull`, `push`, `admin`, `maintain`, `triage`. Por defecto: `push` |

**Ejemplo de prompt:**
> *"Agregá al usuario octocat como colaborador con permisos de escritura en HRamiroAlbornoz/mi-repo"*

---

## Ejemplos de uso — flujo completo

### Flujo 1: Crear un proyecto desde cero

```
1. "Creá un repositorio llamado api-rest con descripción 'REST API en Node.js'"
2. "Creá la rama develop en HRamiroAlbornoz/api-rest"
3. "Hacé un commit en HRamiroAlbornoz/api-rest en la rama develop creando el archivo src/index.ts con el contenido 'export {}', con el mensaje 'Initial commit'"
4. "Creá un pull request en HRamiroAlbornoz/api-rest para fusionar develop en main con el título 'feat: setup inicial'"
```

### Flujo 2: Gestionar issues de un sprint

```
1. "Listá los issues abiertos de HRamiroAlbornoz/mi-repo"
2. "Asigná el issue #1 al usuario HRamiroAlbornoz"
3. "Comentá en el issue #1 de HRamiroAlbornoz/mi-repo: 'Trabajo en progreso, estimado para el viernes'"
4. "Cerrá el issue #1 de HRamiroAlbornoz/mi-repo"
```

### Flujo 3: Organizar el repositorio

```
1. "Creá un label llamado 'bug' de color d73a4a en HRamiroAlbornoz/mi-repo"
2. "Creá un label llamado 'feature' de color 0075ca en HRamiroAlbornoz/mi-repo"
3. "Listá mis repositorios"
```

## Cómo ejecutar los tests

```bash
npm run test
```

Para ver el reporte de cobertura:

```bash
npx vitest run --coverage
```

Los tests cubren tres áreas:
- **`tests/errors.test.ts`** — transformación de errores de GitHub a mensajes en lenguaje natural
- **`tests/tools.test.ts`** — validación de schemas Zod (inputs válidos e inválidos)
- **`tests/github.test.ts`** — operaciones de GitHub con Octokit completamente mockeado

## Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| Compilar | `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| Desarrollo | `npm run dev` | Ejecuta el servidor sin compilar |
| Tests | `npm run test` | Ejecuta los tests una vez |
| Tests watch | `npm run test:watch` | Ejecuta los tests en modo watch |
| Lint | `npm run lint` | Verifica tipos de TypeScript sin compilar |

## Troubleshooting

### El servidor no arranca y dice "No se encontró el token de GitHub"
Verificar que el archivo `.env` existe en la raíz del proyecto y que `GITHUB_TOKEN` tiene un valor real (no el placeholder del `.env.example`).

### Error 401 — Token inválido o expirado
El token de GitHub expiró o fue revocado. Generar uno nuevo en [github.com/settings/tokens](https://github.com/settings/tokens) con los scopes `repo`, `user` y `admin:org`.

### Error 403 — Sin permisos
El token no tiene los scopes necesarios. Verificar que tiene `repo`, `user` y `admin:org` activados.

### Error 404 — Repositorio no encontrado
Verificar que el `owner` y el `repo` estén escritos exactamente igual que en GitHub (respetan mayúsculas y minúsculas).

### Antigravity no detecta el servidor
- Verificar que se ejecutó `npm run build` antes de configurar Antigravity
- Verificar que la ruta en la configuración de Antigravity apunta al archivo `dist/server.js` compilado
- Verificar que el `GITHUB_TOKEN` está configurado en la sección `env` de la configuración de Antigravity

### Los tools no aparecen en Antigravity
Usar MCP Inspector para verificar que el servidor arranca correctamente y lista los 13 tools:
```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

### El servidor arranca pero los tools fallan silenciosamente
Revisar los logs del servidor. Los logs se escriben a `stderr` en formato JSON. En Antigravity se pueden ver los logs del servidor en la consola de desarrollo.

## Stack tecnológico

- **Runtime:** Node.js 18+ con ESM nativo
- **Lenguaje:** TypeScript 5 con strict mode
- **Protocolo:** Model Context Protocol (MCP) — `@modelcontextprotocol/sdk`
- **GitHub API:** Octokit (`@octokit/rest`)
- **Validación:** Zod v4
- **Variables de entorno:** dotenv
- **Testing:** Vitest con cobertura v8
- **Ejecución en desarrollo:** tsx

## Estructura del proyecto

```
ProyectoM5_HernanRamiroAlbornoz/
├── src/
│   ├── errors/        → Jerarquía de errores tipados y función mapGitHubError
│   ├── github/        → Cliente Octokit (singleton) y operaciones de la API
│   ├── schemas/       → Schemas Zod de validación para las 13 tools
│   ├── tools/         → Registro de cada tool en el servidor MCP (13 archivos)
│   ├── utils/         → Logger estructurado (stderr) y retry con backoff exponencial
│   ├── types.ts       → DTOs de respuesta y tipo ToolResult
│   └── server.ts      → Bootstrap del servidor MCP
├── tests/
│   ├── errors.test.ts → Tests de mapGitHubError y clases de error
│   ├── tools.test.ts  → Tests de validación de schemas Zod
│   └── github.test.ts → Tests de operaciones con Octokit mockeado
├── .env.example       → Template de variables de entorno
├── tsconfig.json      → Configuración TypeScript (NodeNext, strict, ESM)
├── vitest.config.ts   → Configuración de tests y cobertura
└── package.json       → Scripts y dependencias
```

## Decisiones arquitectónicas

**Separación cliente / operaciones:** `src/github/client.ts` contiene únicamente el singleton de Octokit y `src/github/operations.ts` contiene la lógica de cada operación. Esta separación es intencional: permite que los tests reemplacen el cliente con un mock sin modificar las operaciones, respetando el principio de responsabilidad única.

**Schemas como contrato:** Los schemas Zod en `src/schemas/index.ts` cumplen dos roles al mismo tiempo. En runtime validan el input que llega del LLM antes de tocar la API. En tiempo de compilación, los tipos se derivan con `z.infer` para que nunca queden desfasados con la validación. Un solo cambio en el schema propaga a toda la cadena.

**Logging exclusivo a stderr:** El protocolo MCP usa `stdout` para comunicación JSON-RPC con el host. Cualquier byte extra en `stdout` —incluso un `console.log`— corrompe el canal. Por eso todos los logs van a `process.stderr.write()` en formato JSON estructurado con timestamp, nivel y datos de contexto.

**Retry con backoff exponencial:** Los errores marcados como `retryable: true` (errores de red, 429, 5xx) se reintentan automáticamente hasta 3 veces con demoras de 1s, 2s y 4s. Los errores definitivos (401, 403, 404, 422) no se reintentan jamás, evitando desperdiciar rate limit.

**Jerarquía de errores tipada:** Cada error tiene `code`, `retryable`, `action` y `message` con hints accionables. El campo `action` (`FIX_INPUT`, `REQUEST_CREDENTIALS`, `WAIT_AND_RETRY`, `ESCALATE`) le indica al agente LLM exactamente qué hacer después de un fallo, reduciendo la ambigüedad en flujos automatizados.

**Un solo token de GitHub (decisión intencional):** El servidor está diseñado para un único usuario autenticado. La gestión de múltiples tokens con caché y rotación dinámica (Extra Credit 2 del enunciado) fue descartada por su complejidad arquitectónica, priorizando la solidez del caso base.

## Limitaciones conocidas

**`create_commit` no soporta archivos binarios:** el tool trabaja con contenido en texto plano. Intentar crear un commit con un archivo binario (imagen, PDF, ejecutable) producirá un resultado incorrecto o un error de la API.

**Sin lectura del header `Retry-After`:** el sistema de retry usa backoff exponencial fijo (1s, 2s, 4s) y no lee el header `Retry-After` que GitHub incluye en respuestas 429 y 403 por rate limit. En casos de rate limit severo, el tiempo de espera real sugerido por GitHub puede ser mayor.

**`create_commit` sobreescribe sin advertencia:** si el archivo ya existe en la rama, su contenido se reemplaza completamente. No hay modo "append" ni confirmación previa antes de sobreescribir.

**Sin paginación automática:** los tools de listado (`list_repositories`, `list_issues`, `list_commits`) tienen un límite máximo de 100 resultados por llamada. Para repositorios o proyectos con más de 100 elementos, los resultados se truncan sin notificación explícita.

**Un solo usuario simultáneo:** el servidor gestiona un único token de GitHub. No soporta múltiples usuarios ni cambio de credenciales en caliente sin reiniciar el proceso.

## Uso de IA en el desarrollo

Durante el desarrollo de este proyecto utilicé **Claude (Anthropic)** como asistente de desarrollo. A continuación detallo cómo lo integré y qué aprendí.

### Situaciones donde fue más efectivo

**Análisis previo al código:** antes de escribir cualquier línea, compartí el enunciado completo y pedí un análisis detallado de la arquitectura. Esto me permitió entender las dependencias entre módulos, identificar los casos borde críticos y planificar el orden de implementación antes de empezar. Aprendí que planificar antes de codear evita errores costosos.

**Explicación de conceptos nuevos:** cuando encontraba tecnologías que no había usado antes (protocolo MCP, Git Data API de GitHub, backoff exponencial, logging a stderr), pedí explicaciones con analogías simples antes de ver el código. Esto me permitió entender el *por qué* de cada decisión, no solo el *cómo*.

**Resolución de errores paso a paso:** ante errores de TypeScript relacionados con `exactOptionalPropertyTypes` y `NodeNext`, pedí que me explicaran la causa antes de la solución. Aprendí por ejemplo que `module: "NodeNext"` requiere extensiones `.js` explícitas en los imports, y que `any` en el tipo de retorno de una función puede contaminar todo el sistema de tipos sin avisar.

**Escritura de tests con mocks:** los tests de `github.test.ts` requieren mockear Octokit completamente para no hacer llamadas reales a la API. Aprendí cómo usar `vi.mock()` con factory functions y cómo estructurar un mock object que replique fielmente la interfaz del cliente real.

### Patrones de uso que descubrí

- **"Primero el análisis, después el código":** pedir análisis del enunciado antes de cualquier implementación evitó tener que reescribir módulos enteros.
- **"Explicame el error antes de darme la solución":** entender la causa de un error de TypeScript es más valioso que copiar la corrección.
- **"Un archivo a la vez":** recibir y verificar cada archivo antes de pasar al siguiente evitó acumular errores difíciles de rastrear.
- **"Verificación antes de avanzar":** después de cada etapa, correr `npm run lint` y `npm run test` antes de continuar garantizó que la base siempre estuvo sólida.

### Comprensión del código implementado

Todo el código fue revisado y comprendido antes de ser incorporado al proyecto. Cuando algo no quedaba claro, pedí re-explicaciones con ejemplos más concretos. Las decisiones técnicas —como separar el cliente Octokit de las operaciones, escribir logs exclusivamente a stderr, o marcar errores con `retryable`— fueron tomadas con criterio propio después de entender las ventajas y desventajas de cada opción.

## Autor

**Hernán Ramiro Albornoz**

🔗 [Repositorio en GitHub](https://github.com/HRamiroAlbornoz/ProyectoM5_HernanRamiroAlbornoz)

Proyecto Integrador M5 — Henry Bootcamp Full Stack

---

## Licencia

MIT — libre para usar, modificar y distribuir.
