# Part 2: Flow PTR & Authentication

In this section you will build the Flow PTR integration layer for your project. By the end you will have an `fptr.js` module with a reusable authentication provider and two data helpers, plus a temporary `index.js` that lists all of your Flow Production Tracking projects as JSON. That output proves your credentials work and that you can talk to Flow PTR.

## Theory

### The Flow PTR REST API

The [Flow PTR REST API](https://developers.shotgridsoftware.com/rest-api/) is flat, not hierarchical: **Projects** contain entities such as **Assets**, **Shots**, and **Tasks** directly — there is no Hub or Folder layer to walk through first. Every entity has a numeric `id`, a `type`, and an `attributes` object holding its fields. This workshop only needs two entity types: `projects` and `assets`.

### Script authentication (client credentials)

Flow PTR issues bearer tokens through a `client_credentials` grant: you exchange a **Script Name** and **Application Key** for a short-lived access token, and no user has to sign in. This is the right choice for server-to-server access, where the server acts as itself with the fixed permissions its permission group was given — exactly what the [prerequisites](0-prerequisites.md) set up with a read-only Script.

Every site is a separate tenant, so requests also need a **site URL** (`https://yourteam.shotgrid.autodesk.com`) — there is no shared base URL the way APS has one.

### The authentication provider pattern

Rather than requesting a new token for every API call — or, worse, passing raw tokens around as function arguments — you will create a small object called an **authentication provider**. The rest of the code never touches tokens directly. It calls `provider.getAccessToken()` and receives a valid token.

> **Design note:** Later sessions swap this Script-based provider for a per-user one. Because everything downstream only depends on the `getAccessToken()` interface, *not a single other line of code changes*. Building the abstraction now means the payoff is visible later.

## Step 1: Authentication provider

Create a new file called `fptr.js` in the project root. Node's built-in `fetch` is all you need — there is no official Flow PTR SDK for Node.js, so this talks to the REST API directly:

```js
export class ScriptAuthenticationProvider {
    constructor(siteUrl, scriptName, scriptKey) {
        this.siteUrl = siteUrl;
        this.scriptName = scriptName;
        this.scriptKey = scriptKey;
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now() + 60 * 1000) { // refresh a minute early to absorb clock skew and request latency
            const response = await fetch(`${this.siteUrl}/api/v1.1/auth/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.scriptName,
                    client_secret: this.scriptKey,
                    grant_type: 'client_credentials',
                }),
            });
            if (!response.ok) {
                throw new Error(`Flow PTR authentication failed: ${response.status} ${response.statusText}`);
            }
            const credentials = await response.json();
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}
```

A few things worth noting:

- `siteUrl` is stored on the provider itself, not just the credentials. Every request — the token exchange and every data call — needs it, and Flow PTR has no fixed base URL the way APS does.
- `cache` is a plain object with `accessToken` and `expiresAt`. A fresh token is fetched whenever `expiresAt` is less than a minute away — on first call, or once the token is close to expiring.
- The response also includes a `refresh_token`, valid for 24 hours. This workshop ignores it and just requests a fresh token with the same Script credentials once the cached one expires — simpler, and the credentials never change anyway.

## Step 2: List projects

This helper calls `/entity/projects` and returns a clean array of plain objects. Add it in the `fptr.js` file after `ScriptAuthenticationProvider`:

```js
export async function getProjects(authenticationProvider) {
    const token = await authenticationProvider.getAccessToken();
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/projects?fields=name`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: projects = [] } = await response.json();
    return projects.map(p => ({ id: p.id, name: p.attributes.name }));
}
```

`fields=name` keeps the response small — without it, Flow PTR returns every field the Script can see. `data` is the array the REST API wraps every entity list in; the destructuring default (`= []`) keeps the code compact if the Script has no project access yet.

## Step 3: List project assets

This helper returns the assets in a single project. It is not used in this section, but it will be needed when you build the MCP server later. Add it in the `fptr.js` file after `getProjects`:

```js
export async function getProjectAssets(authenticationProvider, projectId) {
    const token = await authenticationProvider.getAccessToken();
    // TODO: only the first page of results is returned; projects with more than 500 assets need pagination via links.next
    const fields = 'code,sg_asset_type,sg_status_list,updated_at,updated_by';
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/assets?filter[project.Project.id]=${projectId}&fields=${fields}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: assets = [] } = await response.json();
    // updated_by is a JSON:API relationship: { data: { id, name, type }, links }
    return assets.map(a => ({
        id: a.id,
        name: a.attributes.code,
        type: a.attributes.sg_asset_type,
        status: a.attributes.sg_status_list,
        modifiedAt: a.attributes.updated_at,
        modifiedBy: a.relationships.updated_by?.data?.name
    }));
}
```

`filter[project.Project.id]=<id>` is Flow PTR's dot-path filter syntax for linked-entity fields — it scopes the request to a single project's assets. `code` is the asset's name field in Flow PTR (there is no plain `name` field on an Asset), and `sg_asset_type` is the category a studio assigns it, such as character, prop, or environment. `sg_status_list`, `updated_at`, and `updated_by` are what the weekly-update agent skill in [Part 4](4-agent-skill.md) needs — status, and who changed the asset last, and when.

## Step 4: Update the app

The `index.js` you created previously just printed your credentials. Replace the entire file with this temporary test script — it creates an authentication provider, calls `getProjects`, and dumps the result as JSON:

```js
import { ScriptAuthenticationProvider, getProjects } from './fptr.js';

const { FPTR_SITE_URL, FPTR_SCRIPT_NAME, FPTR_SCRIPT_KEY } = process.env;
if (!FPTR_SITE_URL || !FPTR_SCRIPT_NAME || !FPTR_SCRIPT_KEY) {
    console.error('FPTR_SITE_URL, FPTR_SCRIPT_NAME, and FPTR_SCRIPT_KEY environment variables are required.');
    process.exit(1);
}
console.log('FPTR_SCRIPT_NAME:', FPTR_SCRIPT_NAME);

const authenticationProvider = new ScriptAuthenticationProvider(FPTR_SITE_URL, FPTR_SCRIPT_NAME, FPTR_SCRIPT_KEY);
const projects = await getProjects(authenticationProvider);
console.log(JSON.stringify(projects, null, 2));
```

This code is still temporary. It will be replaced again in the next section when you start building the MCP server.

## Checkpoint

You should now have:

- [x] `fptr.js` with `ScriptAuthenticationProvider`, `getProjects`, and `getProjectAssets`
- [x] `index.js` replaced with the project listing script
- [x] `node index.js` printing a JSON array of your projects

<details>
    <summary>
        Reference: full <code>fptr.js</code>
    </summary>

```js
export class ScriptAuthenticationProvider {
    constructor(siteUrl, scriptName, scriptKey) {
        this.siteUrl = siteUrl;
        this.scriptName = scriptName;
        this.scriptKey = scriptKey;
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now() + 60 * 1000) { // refresh a minute early to absorb clock skew and request latency
            const response = await fetch(`${this.siteUrl}/api/v1.1/auth/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.scriptName,
                    client_secret: this.scriptKey,
                    grant_type: 'client_credentials',
                }),
            });
            if (!response.ok) {
                throw new Error(`Flow PTR authentication failed: ${response.status} ${response.statusText}`);
            }
            const credentials = await response.json();
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}

export async function getProjects(authenticationProvider) {
    const token = await authenticationProvider.getAccessToken();
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/projects?fields=name`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: projects = [] } = await response.json();
    return projects.map(p => ({ id: p.id, name: p.attributes.name }));
}

export async function getProjectAssets(authenticationProvider, projectId) {
    const token = await authenticationProvider.getAccessToken();
    // TODO: only the first page of results is returned; projects with more than 500 assets need pagination via links.next
    const fields = 'code,sg_asset_type,sg_status_list,updated_at,updated_by';
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/assets?filter[project.Project.id]=${projectId}&fields=${fields}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: assets = [] } = await response.json();
    // updated_by is a JSON:API relationship: { data: { id, name, type }, links }
    return assets.map(a => ({
        id: a.id,
        name: a.attributes.code,
        type: a.attributes.sg_asset_type,
        status: a.attributes.sg_status_list,
        modifiedAt: a.attributes.updated_at,
        modifiedBy: a.relationships.updated_by?.data?.name
    }));
}
```

</details>

## Try it out

Run the `index.js` script in the terminal:

```bash
node index.js
```

If your Flow PTR credentials are valid, you should see output like:

```json
[
  { "id": 82, "name": "Demo Project" }
]
```

The actual IDs and project names will be specific to your site.

**If you see an empty array (`[]`):** the Script's permission group has no project access yet. Ask your Flow PTR administrator to grant it access to at least one project, as described in the [prerequisites](0-prerequisites.md).

**If you see a `401` or `403` error:** double-check that `FPTR_SITE_URL`, `FPTR_SCRIPT_NAME`, and `FPTR_SCRIPT_KEY` are set correctly, and that the Script hasn't been disabled.

## Additional resources

- [Flow PTR REST API documentation](https://developers.shotgridsoftware.com/rest-api/)
- [Managing Scripts](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_create_manage_html)
- [Permission groups](https://help.autodesk.com/view/SGDEV/ENU/?guid=SGD_py_python_api_permissions_html)
