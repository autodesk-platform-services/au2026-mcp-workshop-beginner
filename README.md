# APS MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes Autodesk Forma project data via the [APS Data Management API](https://aps.autodesk.com/en/docs/data/v2/reference/http/). Built for the beginner workshop.

## What it does

The server connects GitHub Copilot (or any MCP-compatible client) to your APS hubs and projects, letting an AI assistant browse folder structures and generate activity summaries without leaving the chat.

### MCP tools

| Tool | Inputs | Description |
| --- | --- | --- |
| `list-hubs-projects` | — | Lists all hubs and their projects accessible to the APS application |
| `list-folder-contents` | `hubId`, `projectId`, `folderId?` | Lists folder contents; omit `folderId` to get top-level folders |

### Agent skill

`.github/skills/forma-weekly-update/SKILL.md` defines a GitHub Copilot agent skill (`forma-weekly-update`) that uses the two tools above to produce a weekly summary of file changes in a given project.

## Prerequisites

- Node.js 20+
- An APS application with `data:read` scope ([create one here](https://aps.autodesk.com/myapps))
- Admin access to an Autodesk Forma hub

## Setup

```bash
npm install
```

## VS Code integration

`.vscode/mcp.json` registers the server as **APS MCP Server** using the STDIO transport. VS Code launches `node index.js` as a child process, so `APS_CLIENT_ID` and `APS_CLIENT_SECRET` have to be present in that process's environment. In a GitHub Codespace they already are — the workshop stores them as Codespace secrets. Running locally, export them in your shell before launching VS Code, or add an `envFile` entry to `.vscode/mcp.json` pointing at a gitignored `.env`.

## Architecture

```text
index.js          Entry point — wires credentials → auth provider → MCP server → STDIO transport
mcp.js            MCP server factory — registers tools, never calls server.connect()
aps.js            APS layer — 2-legged OAuth provider + Data Management helpers
```

`AppAuthenticationProvider` (in `aps.js`) caches tokens in memory and exposes a single `getAccessToken()` method. The Data Management client calls it internally — raw tokens never leave the class. The advanced workshop session swaps in a 3-legged provider without changing any other file.

## Tutorial

Step-by-step instructions for building this server from scratch are in the `docs/` folder. Serve them locally with:

```bash
npx serve docs
```

Then open `http://localhost:3000`.
