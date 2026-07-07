# Part 2: APS & Authentication

In this section you will build the APS integration layer for your project. By the end you will have an `aps.js` module with a reusable authentication provider and two data helpers, plus a temporary `index.js` that lists all of your Autodesk Forma hubs and projects as JSON — proving that your credentials work and that you can talk to APS.

## Theory

### The APS Data Management API

The [APS Data Management API](https://aps.autodesk.com/en/docs/data/v2/overview/) organises your files in a hierarchy: **Hubs → Projects → Folders → Items → Versions**. A Hub is typically your company's Forma or Fusion account; Projects live inside hubs; Folders and Items (files, drawings, models) live inside projects. Everything in this hierarchy is identified by a unique ID.

### Secure Service Accounts (SSA)

Server-to-server applications like this one can't prompt a human to sign in, but they still need to act on data inside a specific hub. Autodesk Platform Services solves this with **Secure Service Accounts (SSA)**: a dedicated, non-human identity that a hub administrator adds as a member — the same way they'd add a person — and grants exactly the permissions your integration needs.

An SSA authenticates using a private key instead of a client secret. Your application signs a short-lived JSON Web Token (JWT) with that key and exchanges it for an access token scoped to whatever the SSA has been granted. Because the token carries real permissions rather than blanket app-level access, this also enables integrations — like the Issues API used in [Extras](extras.md) — that a plain client-credentials token can't reach.

> **Design note:** APS also supports 2-legged (client credentials) OAuth, where an application authenticates purely as itself with no per-hub identity. SSA is the recommended approach for new integrations because it gives hub administrators the same visibility and control over your application as they have over any other member.

### The authentication provider pattern

Rather than requesting a new token for every API call — or, worse, passing raw tokens around as function arguments — we will create a small object called an **authentication provider**. The rest of the code never touches tokens directly; it just calls `provider.getAccessToken()` and receives a valid token.

> **Why does this pattern matter?**
>
> In the advanced session of this workshop, participants swap this provider for a 3-legged (user-level) provider. Because everything downstream only depends on the `getAccessToken()` interface, *not a single other line of code changes*. Building the abstraction now means the payoff is visible later.

## Step 1: Create a Secure Service Account

Before writing any code, create the service account your application will authenticate as.

1. Open the [SSA Manager](https://ssa-manager.autodesk.io/) tool and sign in with your APS account.
2. Create a new service account and give it a name (e.g. `au2026-workshop-bot`). Note its **Service Account ID**.
3. Generate a new key for the service account. The tool will prompt you to download a `.pem` private key file — **it's shown only once**, so save it now.
4. Copy the downloaded file into your project root and rename it to `service-account-key.pem`. It's already covered by `.gitignore`, so it won't be committed.
5. Note the **Key ID** shown alongside the key you just created.
6. In [Autodesk Forma](https://acc.autodesk.com), open the hub from the prerequisites, go to **Hub Admin → Members**, and add the service account's email address (shown in the SSA Manager) as a member.
7. Add two more Codespace secrets, the same way you added `APS_CLIENT_ID` and `APS_CLIENT_SECRET` in [Part 1](1-project-setup.md):

   | Name | Value |
   | --- | --- |
   | `APS_SERVICE_ACCOUNT_ID` | The Service Account ID from step 2 |
   | `APS_KEY_ID` | The Key ID from step 5 |

   > **Restart your Codespace.** Like the first two secrets, these are only injected at start-up. Stop and recreate your Codespace so the new secrets take effect.

## Step 2: Authentication provider

Create a new file called `aps.js` in the project root. Start with a pair of import statements and a skeleton comment so you know what you are about to build:

```js
import { SecureServiceAccountClient, Utils, Scopes } from '@aps_sdk/secure-service-account';
import { DataManagementClient } from '@aps_sdk/data-management';
import { readFileSync } from 'fs';

const SCOPES = [Scopes.DataRead];

// TODO: implement AppAuthenticationProvider
```

The `AppAuthenticationProvider` class will have five properties: the client ID and secret, the service account ID and key ID, and the private key loaded from `service-account-key.pem`, plus a token cache. The cache stores the last generated token so that it can be reused for as long as it's valid.

Replace the `// TODO` comment with the following class:

```js
export class AppAuthenticationProvider {
    constructor(clientId, clientSecret, serviceAccountId, keyId, privateKeyPath) {
        this.ssaClient = new SecureServiceAccountClient();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.serviceAccountId = serviceAccountId;
        this.keyId = keyId;
        this.privateKey = readFileSync(privateKeyPath, 'utf8');
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now()) {
            const jwtAssertion = Utils.generateJwtAssertion(this.clientId, this.serviceAccountId, this.privateKey, this.keyId, SCOPES);
            const credentials = await this.ssaClient.exchangeJwtAssertion(jwtAssertion, this.clientId, this.clientSecret, { scope: SCOPES });
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}
```

A few things worth noting:

- `SCOPES` is defined once at the module level as `[Scopes.DataRead]`. Centralising it means you only need to change it in one place if you later need additional scopes.
- The private key is read once, in the constructor, rather than on every call — `readFileSync` only runs when the provider is created.
- `Utils.generateJwtAssertion` builds and signs a short-lived JWT (five minutes by default) identifying the service account; `exchangeJwtAssertion` trades that JWT for an access token.
- `cache` is a plain object with `accessToken` and `expiresAt`. A fresh token is fetched whenever `expiresAt` is in the past (i.e. 0 on first call, or after the token has expired).

## Step 3: List hubs & projects

This helper creates a `DataManagementClient` backed by your authentication provider, fetches all hubs, then fetches the projects inside each hub, and returns a clean array of objects. Add it in the `aps.js` file after the `AppAuthenticationProvider` class:

```js
export async function getHubsProjects(authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: hubs = [] } = await client.getHubs();
    return Promise.all(hubs.map(async hub => {
        const { data: projects = [] } = await client.getHubProjects(hub.id);
        return {
            id: hub.id,
            name: hub.attributes.name,
            region: hub.attributes.region,
            projects: projects.map(p => ({ id: p.id, name: p.attributes.name }))
        };
    }));
}
```

Notice that `DataManagementClient` receives `{ authenticationProvider }` — the SDK calls `getAccessToken` internally whenever it needs a token. You never see the raw token string outside of the provider class. `Promise.all` fetches the projects for every hub concurrently, and the destructuring assignment with default values (`= []`) keeps the code compact when a hub has no projects.

## Step 4: List folder contents

This helper returns the contents of a folder, or — when no `folderId` is given — the top-level folders of a project. It is not used in this section, but it will be needed when you build the MCP server later. Add it in the `aps.js` file after the `getHubsProjects` function:

```js
export async function getFolderContents(hubId, projectId, folderId, authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: items = [] } = folderId
        ? await client.getFolderContents(projectId, folderId)
        : await client.getProjectTopFolders(hubId, projectId);
    return items.map(item => ({
        type: item.type,
        id: item.id,
        name: item.attributes.displayName,
        modifiedAt: item.attributes.lastModifiedTime,
        modifiedBy: item.attributes.lastModifiedUserName
    }));
}
```

## Step 5: Update the app

The `index.js` you created previously just printed your client ID. Replace the entire file with this temporary test script — it creates an authentication provider, calls `getHubsProjects`, and dumps the result as JSON:

```js
import { AppAuthenticationProvider, getHubsProjects } from './aps.js';

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_SERVICE_ACCOUNT_ID || !APS_KEY_ID) {
    console.error('APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, and APS_KEY_ID environment variables are required.');
    process.exit(1);
}
console.log('APS_CLIENT_ID:', APS_CLIENT_ID);

const authenticationProvider = new AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID, './service-account-key.pem');
const hubs = await getHubsProjects(authenticationProvider);
console.log(JSON.stringify(hubs, null, 2));
```

This code is still temporary. It will be replaced again in the next section when you start building the MCP server.

## Checkpoint

You should now have:

- [x] A Secure Service Account created, with its key downloaded as `service-account-key.pem` in the project root
- [x] The service account added as a member of your Forma hub
- [x] `APS_SERVICE_ACCOUNT_ID` and `APS_KEY_ID` configured as Codespace secrets
- [x] `aps.js` with `AppAuthenticationProvider`, `getHubsProjects`, and `getFolderContents`
- [x] `index.js` replaced with the hub/project listing script
- [x] `node index.js` printing a JSON array of your hubs and projects

<details>
    <summary>
        Reference: full <code>aps.js</code>
    </summary>

```js
import { SecureServiceAccountClient, Utils, Scopes } from '@aps_sdk/secure-service-account';
import { DataManagementClient } from '@aps_sdk/data-management';
import { readFileSync } from 'fs';

const SCOPES = [Scopes.DataRead];

export class AppAuthenticationProvider {
    constructor(clientId, clientSecret, serviceAccountId, keyId, privateKeyPath) {
        this.ssaClient = new SecureServiceAccountClient();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.serviceAccountId = serviceAccountId;
        this.keyId = keyId;
        this.privateKey = readFileSync(privateKeyPath, 'utf8');
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now()) {
            const jwtAssertion = Utils.generateJwtAssertion(this.clientId, this.serviceAccountId, this.privateKey, this.keyId, SCOPES);
            const credentials = await this.ssaClient.exchangeJwtAssertion(jwtAssertion, this.clientId, this.clientSecret, { scope: SCOPES });
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}

export async function getHubsProjects(authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: hubs = [] } = await client.getHubs();
    return Promise.all(hubs.map(async hub => {
        const { data: projects = [] } = await client.getHubProjects(hub.id);
        return {
            id: hub.id,
            name: hub.attributes.name,
            region: hub.attributes.region,
            projects: projects.map(p => ({ id: p.id, name: p.attributes.name }))
        };
    }));
}

export async function getFolderContents(hubId, projectId, folderId, authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: items = [] } = folderId
        ? await client.getFolderContents(projectId, folderId)
        : await client.getProjectTopFolders(hubId, projectId);
    return items.map(item => ({
        type: item.type,
        id: item.id,
        name: item.attributes.displayName,
        modifiedAt: item.attributes.lastModifiedTime,
        modifiedBy: item.attributes.lastModifiedUserName
    }));
}
```

</details>

### Try it out

Run the `index.js` script in the terminal:

```bash
node index.js
```

If your APS credentials are valid and your service account has been added to a Forma hub, you should see output like:

```json
[
  {
    "id": "b.xxx",
    "name": "My Hub",
    "region": "US",
    "projects": [
      { "id": "b.yyy", "name": "My Forma Project" }
    ]
  }
]
```

The actual IDs, hub names, and project names will be specific to your account.

**If you see an empty array (`[]`):** your service account has not been added to any hub yet. In Forma, an administrator must add its email address under Hub Admin → Members.

**If you see an authentication error:** double-check that `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `APS_SERVICE_ACCOUNT_ID`, and `APS_KEY_ID` are all set correctly, and that `service-account-key.pem` exists in your project root.

**If you see an "invalid_grant" or JWT-related error:** the private key in `service-account-key.pem` doesn't match `APS_KEY_ID`, or the key has been disabled in the SSA Manager. Generate a new key and update both.

### Additional resources

- [APS Data Management API overview](https://aps.autodesk.com/en/docs/data/v2/overview/)
- [APS SDK for Node.js](https://github.com/autodesk-platform-services/aps-sdk-node)
- [Secure Service Accounts overview](https://aps.autodesk.com/en/docs/ssa/v1/developers_guide/overview/)
- [SSA Manager tool](https://ssa-manager.autodesk.io/)
