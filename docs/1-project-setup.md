# Part 1: Project Setup

In this section you'll create a GitHub repository, launch a Codespace, store your APS credentials as secrets, and verify they're available to your code — everything you need before writing a single line of business logic.

## Step 1: Repository

Create a new GitHub repository:

1. Go to [github.com/new](https://github.com/new).
2. Set the repository name to `au2026-mcp-workshop-beginner`.
3. Set visibility to **Public**.
4. Check **Add a README file** so the repository is initialised and has a default branch.
5. Click **Create repository**.

Next, add your APS credentials:

> Credentials are stored as GitHub Codespace secrets — they are injected as environment variables when a Codespace starts, so you never need to write them to a file.

> **Add the secrets *before* you create your Codespace in Step 2.** Codespace secrets are only injected at start-up. If you create the Codespace first and add the secrets afterwards, you will need to stop and recreate the Codespace for them to take effect.

1. From the repository page, click the **Settings** tab.
2. In the left sidebar, expand **Secrets and variables** and click **Codespaces**.
3. Click **New repository secret** and add the following two secrets:

| Name | Value |
| --- | --- |
| `APS_CLIENT_ID` | Your APS application client ID |
| `APS_CLIENT_SECRET` | Your APS application client secret |

> **Where do I find these values?** They are on your application page at [https://aps.autodesk.com](https://aps.autodesk.com) → My Apps → your app.

## Step 2: Codespace

Start a new GitHub Codespace:

1. Go back to the repository's **Code** tab.
2. Click the green **Code** button.
3. Select the **Codespaces** tab.
4. Click **Create codespace on main**.

GitHub will build and launch a cloud development environment with Python pre-installed. This takes about a minute the first time.

You can work directly in the browser, but opening the Codespace in your local VS Code gives you a better experience with GitHub Copilot.

1. In the Codespace browser tab, click the **...** menu (top-left or bottom-left status bar).
2. Select **Open in Visual Studio Code**.
3. VS Code will install the GitHub Codespaces extension if needed and reconnect to your Codespace.

> **Browser is fine too.** If you prefer to stay in the browser, skip this step — everything works the same way.

## Step 3: Dependencies

Create `requirements.txt` in the project root with the following content:

```text
mcp>=1.28.0,<2.0.0
requests>=2.31.0,<3.0.0
```

Open new terminal in VS Code (`` Ctrl+` `` on Windows/Linux, `` Cmd+` `` on macOS, or **Terminal → New Terminal** from the menu bar), and run the following command:

```bash
pip install -r requirements.txt
```

You should see output ending with something like:

```bash
Successfully installed mcp-1.28.0 requests-2.31.0 ...
```

The exact versions will vary. As long as there are no errors, you're good.

## Step 4: Simple app

The code in this file is just a quick sanity check — it will be replaced later.

Create `main.py` in the project root with the following content:

```python
import os

print('APS_CLIENT_ID:', os.environ.get('APS_CLIENT_ID'))
```

## Checkpoint

You should now have:

- [x] A public GitHub repository named `au2026-mcp-workshop-beginner`
- [x] `APS_CLIENT_ID` and `APS_CLIENT_SECRET` configured as Codespace secrets
- [x] A running Codespace with dependencies installed

The folder structure should look like this:

```text
main.py
requirements.txt
```

### Try it out

Run the `main.py` script in the terminal:

```bash
python main.py
```

Expected output:

```bash
APS_CLIENT_ID: <your-client-id>
```

If you see `APS_CLIENT_ID: None`, the secrets were not picked up. The most common cause is that the Codespace was created *before* the secrets were added. Stop the Codespace and create a new one — secrets are only injected at start-up.

### Additional resources

- [GitHub Codespaces documentation](https://docs.github.com/en/codespaces)
- [APS getting started guide](https://aps.autodesk.com/en/docs/oauth/v2/tutorials/get-2-legged-token/)
