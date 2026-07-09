# Part 3: MCP Server & Tools

In this section you'll build the heart of the workshop: an MCP server that exposes two tools the AI can call — one to list hubs and projects, and one to browse folder contents. By the end, GitHub Copilot Chat will be able to answer questions about your APS data by calling those tools directly.

## Theory

### What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI clients — like GitHub Copilot — call tools and access data from external servers. Think of it as a plugin system for AI: you define named functions with typed arguments, and the AI decides when and how to call them.

### Key concepts

**MCP tool** — a named function the AI can call with typed arguments. It receives a structured input object and returns text or structured content. You'll define two tools in this section.

**STDIO transport** — the simplest MCP transport. The AI client (VS Code / Copilot) launches your server as a child process and communicates over stdin/stdout. No ports, no networking — just a process.

### The factory function pattern

> **Design note:** You'll write a `create_mcp_server(authentication_provider)` factory function that creates and returns the server — it does **not** start it. This separation is intentional.
>
> The same factory can later be used with different transports:
>
> - **STDIO** for local development (this section)
> - **Streamable HTTP** for a deployed, shared server (the advanced session)
>
> Because the server logic lives in `create_mcp_server`, swapping transports requires changing only `main.py` — the server tools themselves are untouched.

## Step 1: MCP Server

Create a new file called `server.py` in the project root. Start with the imports and a skeleton factory function:

```python
import json
from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from aps import get_hubs_projects, get_folder_contents


def create_mcp_server(authentication_provider):
    mcp = FastMCP(name='aps-mcp-server', instructions='MCP server for Autodesk Platform Services')

    # TODO: register the list-hubs-projects tool

    # TODO: register the list-folder-contents tool

    return mcp
```

`FastMCP` is the main class from the MCP Python SDK. You give it a name and instructions, then register tools on it before returning it.

## Step 2: MCP tools

Replace the first `# TODO` comment with the following tool registration:

```python
    @mcp.tool(
        name='list-hubs-projects',
        description='Lists all hubs and their projects available to the APS application.',
        structured_output=False,
    )
    def list_hubs_projects() -> str:
        hubs = get_hubs_projects(authentication_provider)
        return json.dumps(hubs, indent=2)
```

`@mcp.tool` is a decorator that registers the function it wraps as a tool:

1. **`name`** — the identifier the AI uses to call this tool
2. **`description`** — a plain-language explanation the AI uses to decide when to call the tool
3. **`structured_output=False`** — tells FastMCP to return the string as plain text content, instead of trying to infer a structured JSON schema from the return type
4. **The function itself** — does the work and returns the result

Replace the second `# TODO` comment with:

```python
    @mcp.tool(
        name='list-folder-contents',
        description='Lists the contents of a folder in a project, or top-level folders if no folder ID is provided.',
        structured_output=False,
    )
    def list_folder_contents(
        hub_id: Annotated[str, Field(description='Hub ID.')],
        project_id: Annotated[str, Field(description='Project ID.')],
        folder_id: Annotated[str | None, Field(description='Folder ID. Omit to list top-level folders.')] = None,
    ) -> str:
        items = get_folder_contents(hub_id, project_id, folder_id, authentication_provider)
        return json.dumps(items, indent=2)
```

FastMCP derives the tool's input schema from the function signature — there's no separate schema object to build, unlike Zod in a JavaScript MCP server. `Annotated[str, Field(description=...)]` attaches the per-argument description the AI reads to fill in arguments automatically from context.

`folder_id` defaults to `None`, which lets the AI omit it when it wants top-level folders rather than the contents of a specific folder.

## Step 3: Update the app

The `main.py` you created in the previous section was a temporary sanity check. Replace its entire contents with the real entry point:

```python
import os
import sys

from aps import AppAuthenticationProvider
from server import create_mcp_server

APS_CLIENT_ID = os.environ.get('APS_CLIENT_ID')
APS_CLIENT_SECRET = os.environ.get('APS_CLIENT_SECRET')
if not APS_CLIENT_ID or not APS_CLIENT_SECRET:
    print('APS_CLIENT_ID and APS_CLIENT_SECRET environment variables are required.', file=sys.stderr)
    sys.exit(1)

authentication_provider = AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET)
mcp_server = create_mcp_server(authentication_provider)
mcp_server.run(transport='stdio')
```

What each part does:

- `AppAuthenticationProvider` is passed into the factory so the server can make authenticated APS calls
- `create_mcp_server` builds the `FastMCP` instance and registers its tools
- `mcp_server.run(transport='stdio')` starts the MCP message loop over stdin/stdout — the process now waits for tool calls from a client

## Step 4: Copilot integration

Create the `.vscode/` directory if it doesn't exist, then create `.vscode/mcp.json`:

```json
{
  "servers": {
    "APS MCP Server": {
      "type": "stdio",
      "command": "python",
      "args": ["main.py"]
    }
  }
}
```

VS Code reads this file and, when you open Copilot Chat in agent mode, it automatically starts `python main.py` as a child process and connects to it over STDIO. You don't need to run the server yourself in a terminal.

> **After editing `server.py`, `aps.py`, or `main.py`:** click the **Restart** action above the server definition in `mcp.json` (or stop and start it again). Copilot keeps using the previously-loaded build of the server until you restart it, which is the most common source of "my change didn't take effect" confusion.

> **Note:** The `APS_CLIENT_ID` and `APS_CLIENT_SECRET` environment variables are injected by your Codespace secrets — you don't need to add them here.

## Checkpoint

You should now have:

- [x] `server.py` with `create_mcp_server` factory and two registered tools
- [x] `main.py` using `mcp_server.run(transport='stdio')` to start the server
- [x] `.vscode/mcp.json` pointing VS Code at your server

<details>
    <summary>
        Reference: full <code>server.py</code>
    </summary>

```python
import json
from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from aps import get_hubs_projects, get_folder_contents


def create_mcp_server(authentication_provider):
    mcp = FastMCP(name='aps-mcp-server', instructions='MCP server for Autodesk Platform Services')

    @mcp.tool(
        name='list-hubs-projects',
        description='Lists all hubs and their projects available to the APS application.',
        structured_output=False,
    )
    def list_hubs_projects() -> str:
        hubs = get_hubs_projects(authentication_provider)
        return json.dumps(hubs, indent=2)

    @mcp.tool(
        name='list-folder-contents',
        description='Lists the contents of a folder in a project, or top-level folders if no folder ID is provided.',
        structured_output=False,
    )
    def list_folder_contents(
        hub_id: Annotated[str, Field(description='Hub ID.')],
        project_id: Annotated[str, Field(description='Project ID.')],
        folder_id: Annotated[str | None, Field(description='Folder ID. Omit to list top-level folders.')] = None,
    ) -> str:
        items = get_folder_contents(hub_id, project_id, folder_id, authentication_provider)
        return json.dumps(items, indent=2)

    return mcp
```

</details>

<details>
    <summary>
        Reference: full <code>main.py</code>
    </summary>

```python
import os
import sys

from aps import AppAuthenticationProvider
from server import create_mcp_server

APS_CLIENT_ID = os.environ.get('APS_CLIENT_ID')
APS_CLIENT_SECRET = os.environ.get('APS_CLIENT_SECRET')
if not APS_CLIENT_ID or not APS_CLIENT_SECRET:
    print('APS_CLIENT_ID and APS_CLIENT_SECRET environment variables are required.', file=sys.stderr)
    sys.exit(1)

authentication_provider = AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET)
mcp_server = create_mcp_server(authentication_provider)
mcp_server.run(transport='stdio')
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
> npx @modelcontextprotocol/inspector python main.py
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
- [MCP SDK for Python](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
