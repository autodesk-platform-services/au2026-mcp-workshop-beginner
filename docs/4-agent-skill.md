# Part 4: Agent Skill

In this section you'll create an **agent skill** — a Markdown prompt file that teaches GitHub Copilot (and other AI agents) a named, repeatable task. By the end, you'll have a `.github/skills/fptr-weekly-update/SKILL.md` file that Copilot can invoke on demand to generate a weekly activity summary for any of your Flow PTR projects.

## Theory

### What is an agent skill?

An agent skill is a plain Markdown file that describes *what* an AI agent should do — not *how* to do it. The agent figures out the how using its available tools (like the MCP server you built in the previous section). Skills are reusable, sharable, and version-controlled alongside your code.

### Skills vs MCP tools

Skills and MCP tools solve different problems. MCP gives an agent *access* — a live connection to a data source or API, like the Flow PTR tools you built in the previous section. A skill teaches the agent *how* to carry out a procedure using the tools it already has access to. Use both together: MCP for connectivity, skills for repeatable know-how.

| | MCP tool | Agent skill |
| --- | --- | --- |
| Solves | Access to external systems and data | Procedural knowledge — how to do a task |
| Example in this workshop | `list-projects`, `list-project-assets` | `fptr-weekly-update` |
| Runs as | Code the agent calls | Instructions the agent reads and follows |

Read more: [Skills, explained](https://claude.com/blog/skills-explained) on the Claude blog.

### Auto-discovery in GitHub Copilot

GitHub Copilot in VS Code automatically discovers skill files placed at `.github/skills/<skill-name>/SKILL.md` in your repository. Once discovered, the skill name becomes a callable command — for example, `/fptr-weekly-update` — that you can reference directly in Copilot Chat.

### Skill file structure

A skill can include more than a single prompt body. In practice, skills often combine metadata, guidance, examples, and supporting assets:

| Part | Purpose |
| --- | --- |
| **Frontmatter** (`---` block) | Declares metadata like `name` and `description` used for discovery and display |
| **Instructions** | Step-by-step guidance the agent follows when the skill is invoked |
| **Examples** | Concrete input/output patterns that steer tone, format, and quality |
| **Scripts and assets** | Optional helper files (for example scripts, templates, or reference docs) the skill can use |
| **Output format** | A template or example showing what the result should look like |

Skill content can also be split across multiple files to support progressive disclosure: keep the main `SKILL.md` concise, and move detailed references into adjacent files that are only loaded when needed.

For deeper guidance on skill design patterns and structure, see [agentskills.io](https://agentskills.io/home).

## Step 1: Create the skill

Inside your project root, create the directory that Copilot will scan:

```bash
mkdir -p .github/skills/fptr-weekly-update
```

Create `.github/skills/fptr-weekly-update/SKILL.md` with the following content:

````markdown
---
name: fptr-weekly-update
description: Generates a summary of asset changes in a given Flow PTR project for the last 7 days, or for a specific date range if provided.
---

Generate a summary of recent asset changes in a Flow PTR project using the available MCP tools.

## Instructions

1. If the user has not specified a project, use `list-projects` to show available projects and ask which one to summarise.
2. Use `list-project-assets` to list the assets in the project.
3. Filter results to those modified within the requested time range:
   - Default: last 7 days from today
   - If the user provides a date range (e.g. "between May 1 and May 15"), use that range instead
4. Group results by assets. For each modified item, include:
   - Asset name
   - Asset type
   - Asset status
   - Who modified it
   - When it was modified
5. Present the output as a readable summary, for example:

```
## Weekly Update — [Project Name]
Period: [start date] to [end date]

- **[Asset Name]** ([Asset Type], [Asset Status]) — modified by [User] on [Date]
- ...
```

If no changes were found in the period, say so clearly.
````

> **Tip:** Keep the instructions concrete but agent-neutral. Avoid naming specific API endpoints or coding patterns — the agent will use whatever tools are available to satisfy each step.

## Checkpoint

Confirm your skill file is in the right place:

```text
.github/
└── skills/
    └── fptr-weekly-update/
        └── SKILL.md
```

## Try it out

1. Open the **Copilot Chat** panel in VS Code (`Ctrl+Shift+I` / `Cmd+Shift+I`).
2. Make sure your MCP server is configured and running (see [Part 3](3-mcp-tools.md)).
3. Type the following prompt:

   ```text
   Use the fptr-weekly-update skill to summarise changes in my project.
   ```

4. Copilot will discover the skill, call `list-projects` to show your available projects, and then list its assets to produce a summary.

> **Skill not detected?** Type `/` in the Copilot Chat input — registered skills appear in the suggestions list alongside built-in commands. If `/fptr-weekly-update` isn't there, double-check the folder name (`.github/skills/fptr-weekly-update/`) and the `name:` value in the frontmatter, then reload the VS Code window.

## Where next?

You've built a full MCP server and registered it with Copilot. You've also taught the agent a reusable skill. The [Extras](extras.md) page has open-ended ideas for vibe-coding new features, plus a production checklist for what you'd need to address before shipping a real MCP service.

## Additional resources

- [GitHub Copilot documentation](https://docs.github.com/en/copilot)
- [MCP documentation](https://modelcontextprotocol.io)
- [Agent Skills documentation](https://agentskills.io/home)
