# Part 1: Project Setup

In this section you'll create a GitHub repository, launch a Codespace, and store your Flow PTR script credentials as secrets. By the end you'll have verified they're available to your code — everything you need before writing a single line of business logic.

## Step 1: Repository

Create a new GitHub repository:

1. Go to [github.com/new](https://github.com/new).
2. Set the repository name to `mcp-fptr-workshop-beginner`.
3. Keep the visibility set to **Private**.
4. Check **Add a README file** so the repository is initialised and has a default branch.
5. Click **Create repository**.

Next, add your Flow PTR script credentials:

> Credentials are stored as GitHub Codespace secrets — they are injected as environment variables when a Codespace starts, so you never need to write them to a file.

> **Add the secrets *before* you create your Codespace in Step 2.** Codespace secrets are only injected at start-up. If you create the Codespace first and add the secrets afterwards, you will need to stop and recreate the Codespace for them to take effect.

1. From the repository page, click the **Settings** tab.
2. In the left sidebar, look for the **Security and quality** block, expand **Secrets and variables**, and click **Codespaces**.
3. Click **New repository secret** and add the following three secrets:

| Name | Value |
| --- | --- |
| `FPTR_SCRIPT_NAME` | Your Flow PTR Script's name |
| `FPTR_SCRIPT_KEY` | Your Flow PTR Script's Application Key |
| `FPTR_SITE_URL` | Your Flow PTR site's base URL, e.g. `https://yourteam.shotgrid.autodesk.com` |

> **Where do I find these values?** Ask the Flow PTR administrator who created the Script for you — see [Access to Flow Production Tracking](0-prerequisites.md#access-to-flow-production-tracking).

## Step 2: Codespace

Start a new GitHub Codespace:

1. Go back to the repository's **Code** tab.
2. Click the green **Code** button.
3. Select the **Codespaces** tab.
4. Click **Create codespace on main**.

GitHub will build and launch a cloud development environment with Node.js pre-installed. This takes about a minute the first time.

In this workshop we will be using VS Code in the browser but you can also use VS Code desktop:

1. In the Codespace browser tab, click the **...** menu (top-left or bottom-left status bar).
2. Select **Open in Visual Studio Code**.
3. VS Code will install the GitHub Codespaces extension if needed and reconnect to your Codespace.

![Codespaces options: Code button, Codespaces tab, the "..." menu on your codespace, then Open in Browser or Open in Visual Studio Code](codespaces-options.png)

> **Recommended:** use a Codespace. It needs no local setup. If you prefer, you can run the project locally instead. Clone the repository, install an up-to-date version of Node.js and npm, and create a `.env` file in the project root with the three `FPTR_*` values from Step 1. Then start the server with `node --env-file=.env index.js`.

## Step 3: Dependencies

Create `package.json` in the project root with the following content:

```json
{
  "name": "mcp-fptr-workshop-beginner",
  "version": "1.0.0",
  "description": "Flow PTR MCP Workshop — Beginner Session",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "^2.0.0",
    "zod": "^4.4.0"
  }
}
```

Open new terminal in VS Code (`` Ctrl+` `` on Windows/Linux, `` Cmd+` `` on macOS, or **Terminal → New Terminal** from the menu bar), and run the following command:

```bash
npm install
```

You should see output ending with something like:

```bash
added 42 packages, and audited 43 packages in 5s
```

The exact numbers will vary. As long as there are no errors, you're good.

## Step 4: Ignore local files

`npm install` just created a `node_modules/` folder with hundreds of files in it. None of that belongs in your repository.

Create `.gitignore` in the project root with the following content:

```text
node_modules/
.env
*.log
.DS_Store
.claude
```

This keeps installed dependencies, local environment files, logs, and editor scratch directories out of version control. Your Flow PTR script credentials live in Codespace secrets rather than in a file, so there is nothing sensitive to commit.

## Step 5: Simple app

The code in this file is a quick sanity check — it will be replaced later.

Create `index.js` in the project root with the following content:

```js
console.log('FPTR_SCRIPT_NAME:', process.env.FPTR_SCRIPT_NAME);
```

## Checkpoint

You should now have:

- [x] A private GitHub repository named `mcp-fptr-workshop-beginner`
- [x] `FPTR_SCRIPT_NAME`, `FPTR_SCRIPT_KEY`, and `FPTR_SITE_URL` configured as Codespace secrets
- [x] A running Codespace with dependencies installed
- [x] A `.gitignore` keeping `node_modules/` out of version control

The folder structure should look like this:

```text
.gitignore
README.md
index.js
node_modules/
package-lock.json
package.json
```

## Try it out

Run the `index.js` script in the terminal:

```bash
node index.js
# or
npm start
```

Expected output:

```bash
FPTR_SCRIPT_NAME: <your-script-name>
```

If you see `FPTR_SCRIPT_NAME: undefined`, the secrets were not picked up. The most common cause is that the Codespace was created *before* the secrets were added. Stop the Codespace and create a new one — secrets are only injected at start-up.

## Additional resources

- [GitHub Codespaces documentation](https://docs.github.com/en/codespaces)
- [Flow PTR REST API documentation](https://developers.shotgridsoftware.com/rest-api/)
