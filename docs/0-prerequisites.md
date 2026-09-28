# Prerequisites

Complete these steps **before the workshop**. They take roughly 20–30 minutes.

## Access to Flow Production Tracking

Your MCP server will need to access Flow Production Tracking (Flow PTR) data using the API. This workshop starts using **script credentials** — an admin-level credential that authenticates as an application, not as you — so every request sees the same fixed set of projects regardless of who's asking. Later in the workshop, you'll swap this for a per-user credential, so the server can act on behalf of whoever is signed in instead of one shared script.

Ask your Flow PTR administrator to create a **Script** for this workshop with a limited group permission and scoped to a test project if needed.

1. Your Flow PTR admin can review group permissions following the [steps in the documentation](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_permissions_html) to limit the access of this script. He can create one with **Read-only** permissions. These are enough for everything this workshop covers — ask for that rather than read/write, so the credential can't modify or delete anything even if it's ever exposed.
2. Then the admin can [create a new script](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_create_manage_html).
3. Copy the **Script Name** and **Application Key** once you have them — you'll need both during the workshop.

## GitHub, Codespaces and JavaScript

This workshop runs inside a GitHub Codespace using **JavaScript** (a **Python** variant is in progress). You won't install Node.js, clone locally, or manage a toolchain — everything is preconfigured with an up-to-date npm version and tested package versions, so a corporate laptop that blocks local installs is not a blocker. Every attendee starts from an identical environment, which cuts down on "it works on my machine" issues during the workshop. Because the Codespace runs in the cloud, it will be later easy to access from any machine, share with someone else, or hand off for a colleague to also test.

1. Sign in to [GitHub](https://github.com) (create a free account if needed).
2. Confirm you have access to **GitHub Codespaces** — available on free accounts with limited hours, and on paid plans.

## Copilot

1. Confirm you have access to **GitHub Copilot** — available as an individual subscription or through your organisation. Copilot Free comes with enough tokens to try this workshop.

> Not sure if you have Copilot? Go to [github.com/settings/copilot](https://github.com/settings/copilot) to check.

## Verify your setup

Once you have your Flow PTR script credentials and GitHub access, you're ready. The workshop instructor will do a quick setup check at the start of the session.
