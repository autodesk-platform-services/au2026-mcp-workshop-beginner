# Extras

## Vibe-Code Additional Features

Use GitHub Copilot to add a new feature to your MCP server. Some ideas:

- **Search project by name**: update the project listing tool so that it accepts an optional project name to search for
- **List tasks**: add a tool that lists tasks in a project using the Flow PTR REST API's `tasks` entity
- **Search assets by name**: add a tool that searches for assets by name across a project
- **Recent changes skill**: extend the `fptr-weekly-update` skill to send the summary as a formatted email draft

> **Tip — Skills repository.** Check out as well the [Autodesk Platform Services skills repository](https://github.com/autodesk-platform-services/skills). It's maintained by the Autodesk Developer Advocacy team and may already have some AI agent skills useful to help you save time while building a new feature for your MCP server.

### Suggested approach

1. Describe the feature to Copilot in plain language.
2. Let Copilot suggest the implementation.
3. Review the code, ask follow-up questions, iterate.
4. Test with GitHub Copilot Chat (and restart the MCP server after edits so the new tool is registered).

This is intentionally open-ended — the goal is to get comfortable using AI to extend the server you've built.

### Example prompts

Vibe coding works best when the prompt names the file you want changed, the shape of the new tool, and the API to call. A few patterns that work well with the beginner project:

- **Search project by name** (extend an existing tool):

  > In `mcp.js`, add an optional `nameFilter` string parameter to the `list-projects` tool. When provided, only return projects whose `attributes.name` contains the filter (case-insensitive). Keep the existing behaviour when it's omitted, and update the tool description so Copilot Chat knows when to pass the filter.

- **List tasks** (new tool against a new entity):

  > Add a new MCP tool `list-tasks` in `mcp.js`. It takes a `projectId` (string) and returns tasks from the Flow PTR REST API: `GET {siteUrl}/api/v1.1/entity/tasks?filter[project]=<projectId>&fields=content,sg_status_list`. Reuse the existing `ScriptAuthenticationProvider` in `fptr.js`. Return an array of `{ id, name, status }`, mapping `content` to `name`. Add a short JSDoc-style description so Copilot Chat can discover it.

- **Search assets by name** (server-side filtering):

  > Add a `find-assets` tool in `mcp.js` that takes `projectId` and `query` (string). POST to the REST API's `/entity/assets/_search` endpoint with a `contains` filter on `code`, scoped to that project, and return matches as `{ id, name }`. Cap the total results returned so the tool stays responsive.

- **Recent changes skill** (extend the skill, not the server):

  > Update `.github/skills/fptr-weekly-update/SKILL.md` so the final step produces a Markdown email draft with a subject line, a one-paragraph summary, and a bulleted list of changes grouped by asset type. Keep the existing data-collection steps unchanged.

#### Tips for getting good results

- Point Copilot at the exact file (`mcp.js`, `fptr.js`, the prompt file) instead of asking for "the server".
- Include the Flow PTR endpoint URL and the fields you care about — Copilot can't guess the schema.
- After it generates code, ask follow-ups like *"what happens if the token expires mid-request?"* or *"add input validation for projectId"* to harden it.
- If a generated tool doesn't show up in Copilot Chat, reload the MCP server and check the tool name matches the schema.

## Production checklist

You've built a working MCP server. Here's what you'd need to address before shipping it as a real product.

| Area | Workshop state | Production requirement |
|---|---|---|
| Transport | STDIO (local process only) | Switch to Streamable HTTP (covered in the advanced session) |
| Credentials | Codespace secrets | Proper secret manager (e.g. Azure Key Vault, AWS Secrets Manager) |
| Token caching | In-memory, process lifetime | Persistent cache; handle expiry and refresh across restarts |
| Script provisioning | Single Flow PTR project | Provision the Script's permission group to every project it needs; consider automation |
| Error handling | Minimal | Structured error responses, logging, and alerting |
| MCP client access | Anyone with the binary | Restrict to authorised users; consider authentication at the client layer |

> **Next step:** Watch the advanced session. It adds Streamable HTTP transport, 3-legged user authentication, an embedded design viewer, and an OAuth proxy for client sign-in on top of what you've built.
