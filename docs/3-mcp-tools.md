# Part 3: MCP Server & Tools

In this section you'll build the heart of the workshop: an MCP server that exposes two tools the AI can call — one to list hubs and projects, and one to browse folder contents. By the end, GitHub Copilot Chat will be able to answer questions about your APS data by calling those tools directly.

## Theory

### What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI clients — like GitHub Copilot — call tools and access data from external servers. Think of it as a plugin system for AI: you define named functions with typed arguments, and the AI decides when and how to call them.

### Key concepts

**MCP tool** — a named function the AI can call with typed arguments. It receives a structured input object and returns text or structured content. You'll define two tools in this section.

**STDIO transport** — the simplest MCP transport. The AI client (VS Code / Copilot) launches your server as a child process and communicates over stdin/stdout. No ports, no networking — just a process.

### The factory function pattern

> **Design note:** You'll write a `createMcpServer(authenticationProvider)` factory function that creates and returns the server — it does **not** start it. This separation is intentional.
>
> The same factory can later be used with different transports:
>
> - **STDIO** for local development (this section)
> - **Streamable HTTP** for a deployed, shared server (the advanced session)
>
> Because the server logic lives in `createMcpServer`, swapping transports requires changing only `index.js` — the server tools themselves are untouched.

## Step 1: MCP Server

Create a new file called `mcp.js` in the project root. Start with the imports and a skeleton factory function:

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getHubsProjects, getFolderContents } from './aps.js';

export function createMcpServer(authenticationProvider) {
    const server = new McpServer({
        name: 'aps-mcp-server',
        description: 'MCP server for Autodesk Platform Services',
        version: '1.0.0'
    });

    // TODO: register the list-hubs-projects tool

    // TODO: register the list-folder-contents tool

    return server;
}
```

`McpServer` is the main class from the MCP SDK. You give it a name and version, then register tools on it before returning it.

## Step 2: MCP tools

Replace the first `// TODO` comment with the following tool registration:

```js
    server.registerTool(
        'list-hubs-projects',
        {
            description: 'Lists all hubs and their projects available to the APS application.',
        },
        async () => {
            const hubs = await getHubsProjects(authenticationProvider);
            return { content: [{ type: 'text', text: JSON.stringify(hubs, null, 2) }] };
        }
    );
```

`server.registerTool` takes three arguments:

1. **Name** — the identifier the AI uses to call this tool
2. **Options object** — contains at minimum a `description` (plain-language explanation the AI uses to decide when to call the tool); tools with inputs also include an `inputSchema`
3. **Handler** — an async function that does the work and returns `{ content: [...] }`

Replace the second `// TODO` comment with:

```js
    server.registerTool(
        'list-folder-contents',
        {
            description: 'Lists the contents of a folder in a project, or top-level folders if no folder ID is provided.',
            inputSchema: z.object({
                hubId: z.string().describe('Hub ID.'),
                projectId: z.string().describe('Project ID.'),
                folderId: z.string().optional().describe('Folder ID. Omit to list top-level folders.'),
            })
        },
        async ({ hubId, projectId, folderId }) => {
            const items = await getFolderContents(hubId, projectId, folderId, authenticationProvider);
            return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        }
    );
```

This tool has a typed input schema defined with [Zod](https://zod.dev). The schema is passed as `inputSchema` inside the options object, wrapped in `z.object({...})`. The `.describe()` calls on each field tell the AI what to pass — the AI reads these descriptions to fill in arguments automatically from context.

`folderId` is marked `.optional()`, which lets the AI omit it when it wants top-level folders rather than the contents of a specific folder.

## Step 3: Update the app

The `index.js` you created in the previous section was a temporary sanity check. Replace its entire contents with the real entry point:

```js
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppAuthenticationProvider } from './aps.js';
import { createMcpServer } from './mcp.js';

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_SERVICE_ACCOUNT_ID || !APS_KEY_ID) {
    console.error('APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, and APS_KEY_ID environment variables are required.');
    process.exit(1);
}
console.log('APS_CLIENT_ID:', APS_CLIENT_ID);

const authenticationProvider = new AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID, './service-account-key.pem');
const server = createMcpServer(authenticationProvider);
const transport = new StdioServerTransport();
await server.connect(transport);
```

What each part does:

- `StdioServerTransport` wires the server to stdin/stdout
- `AppAuthenticationProvider` is passed into the factory so the server can make authenticated APS calls
- `server.connect(transport)` starts the MCP message loop — the process now waits for tool calls from a client

## Step 4: Copilot integration

Create the `.vscode/` directory if it doesn't exist, then create `.vscode/mcp.json`:

```json
{
  "servers": {
    "APS MCP Server": {
      "type": "stdio",
      "command": "node",
      "args": ["index.js"]
    }
  }
}
```

VS Code reads this file and, when you open Copilot Chat in agent mode, it automatically starts `node index.js` as a child process and connects to it over STDIO. You don't need to run the server yourself in a terminal.

> **After editing `mcp.js`, `aps.js`, or `index.js`:** click the **Restart** action above the server definition in `mcp.json` (or stop and start it again). Copilot keeps using the previously-loaded build of the server until you restart it, which is the most common source of "my change didn't take effect" confusion.

> **Note:** The `APS_CLIENT_ID` and `APS_CLIENT_SECRET` environment variables are injected by your Codespace secrets — you don't need to add them here.

## Checkpoint

You should now have:

- [x] `mcp.js` with `createMcpServer` factory and two registered tools
- [x] `index.js` using `StdioServerTransport` to start the server
- [x] `.vscode/mcp.json` pointing VS Code at your server

<details>
    <summary>
        Reference: full <code>mcp.js</code>
    </summary>

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getHubsProjects, getFolderContents } from './aps.js';

export function createMcpServer(authenticationProvider) {
    const server = new McpServer({
        name: 'aps-mcp-server',
        description: 'MCP server for Autodesk Platform Services',
        version: '1.0.0'
    });

    server.registerTool(
        'list-hubs-projects',
        {
            description: 'Lists all hubs and their projects available to the APS application.',
        },
        async () => {
            const hubs = await getHubsProjects(authenticationProvider);
            return { content: [{ type: 'text', text: JSON.stringify(hubs, null, 2) }] };
        }
    );

    server.registerTool(
        'list-folder-contents',
        {
            description: 'Lists the contents of a folder in a project, or top-level folders if no folder ID is provided.',
            inputSchema: z.object({
                hubId: z.string().describe('Hub ID.'),
                projectId: z.string().describe('Project ID.'),
                folderId: z.string().optional().describe('Folder ID. Omit to list top-level folders.'),
            })
        },
        async ({ hubId, projectId, folderId }) => {
            const items = await getFolderContents(hubId, projectId, folderId, authenticationProvider);
            return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        }
    );

    return server;
}
```

</details>

<details>
    <summary>
        Reference: full <code>index.js</code>
    </summary>

```js
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppAuthenticationProvider } from './aps.js';
import { createMcpServer } from './mcp.js';

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_SERVICE_ACCOUNT_ID || !APS_KEY_ID) {
    console.error('APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, and APS_KEY_ID environment variables are required.');
    process.exit(1);
}
console.log('APS_CLIENT_ID:', APS_CLIENT_ID);

const authenticationProvider = new AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID, './service-account-key.pem');
const server = createMcpServer(authenticationProvider);
const transport = new StdioServerTransport();
await server.connect(transport);
```

</details>

### Try it out

Use this quick smoke test to verify the implementation works in its current state:

1. Open `.vscode/mcp.json` in VS Code.
2. Use the **Start** or **Enable** action shown above the server definition so VS Code registers the `APS MCP Server` from this file.
3. Open a **new GitHub Copilot Chat** window, and make sure the mode picker at the bottom shows **Agent** (not Ask or Edits). Tools are only invoked in Agent mode.
4. Ask a question such as:

    > What Forma projects do I have access to?

If the server is running correctly, Copilot should call your MCP tool and respond with data from your APS account. If VS Code prompts you to approve the tool call, click **Allow**.

> **Debugging tip — MCP Inspector.** If something isn't working, the MCP Inspector lets you test the server directly, bypassing Copilot entirely:
>
> ```bash
> npx @modelcontextprotocol/inspector node index.js
> ```
>
> The command launches two things in your Codespace: the Inspector's proxy (which spawns your server over STDIO) and a web UI on port **6274**. Because it's running inside the Codespace, the web UI is **not** immediately available in your local browser — you need to forward the port first:
>
> 1. Open the **Ports** panel in VS Code (bottom panel → **Ports** tab, or **Terminal → New Terminal → Ports**).
> 2. Look for port `6274`. VS Code usually detects it automatically and adds it to the list as soon as the Inspector starts.
> 3. Hover over the **Forwarded Address** column and click the globe icon to open it in your browser.
>
> Once the UI is open, you can list and call tools, see the raw JSON-RPC traffic, and confirm whether a problem is in your server code or in the Copilot integration.

### Additional resources

- [Model Context Protocol documentation](https://modelcontextprotocol.io)
- [MCP SDK for JavaScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
