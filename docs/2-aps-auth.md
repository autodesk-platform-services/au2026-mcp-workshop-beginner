# Part 2: APS & Authentication

In this section you will build the APS integration layer for your project. By the end you will have an `aps.py` module with a reusable authentication provider and two data helpers, plus a temporary `main.py` that lists all of your Autodesk Forma hubs and projects as JSON — proving that your credentials work and that you can talk to APS.

## Theory

### The APS Data Management API

The [APS Data Management API](https://aps.autodesk.com/en/docs/data/v2/overview/) organises your files in a hierarchy: **Hubs → Projects → Folders → Items → Versions**. A Hub is typically your company's Forma or Fusion account; Projects live inside hubs; Folders and Items (files, drawings, models) live inside projects. Everything in this hierarchy is identified by a unique ID.

### 2-legged OAuth (client credentials)

APS uses OAuth 2.0 to protect its APIs. There are two common flows:

- **2-legged (client credentials):** Your application authenticates *as itself* using a client ID and secret. No user has to log in. This is the right choice for server-to-server access where you own the data or have been given service-account access to a hub.
- **3-legged (authorization code):** A real user is redirected to Autodesk's login page, grants consent, and your app receives a token scoped to *that user's* data.

For this workshop we start with 2-legged. Your credentials are already stored as Codespace secrets (`APS_CLIENT_ID` and `APS_CLIENT_SECRET`), so the only thing your code needs to do is exchange them for a short-lived access token whenever it needs to call an API.

### The authentication provider pattern

Rather than requesting a new token for every API call — or, worse, passing raw tokens around as function arguments — we will create a small object called an **authentication provider**. The rest of the code never touches tokens directly; it just calls `provider.get_access_token()` and receives a valid token.

> **Why does this pattern matter?**
>
> In the advanced session of this workshop, participants swap the 2-legged provider for a 3-legged (user-level) provider. Because everything downstream only depends on the `get_access_token()` interface, *not a single other line of code changes*. Building the abstraction now means the payoff is visible later.

## Step 1: Authentication provider

Create a new file called `aps.py` in the project root. There is no official APS SDK for Python, so you'll call the OAuth and Data Management REST APIs directly with the [`requests`](https://requests.readthedocs.io) library. Start with the imports and a couple of module-level constants:

```python
import time

import requests

APS_BASE_URL = 'https://developer.api.autodesk.com'
SCOPES = 'data:read'

# TODO: implement AppAuthenticationProvider
```

The `AppAuthenticationProvider` class will have three attributes: the client ID, the client secret, and a token cache. The cache stores the last generated token so that it can be reused for as long as it's valid.

Replace the `# TODO` comment with the following class:

```python
class AppAuthenticationProvider:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.cache = {'access_token': None, 'expires_at': 0}

    def get_access_token(self):
        if self.cache['expires_at'] < time.time():
            response = requests.post(f'{APS_BASE_URL}/authentication/v2/token', data={
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': SCOPES,
            })
            response.raise_for_status()
            credentials = response.json()
            self.cache['access_token'] = credentials['access_token']
            self.cache['expires_at'] = time.time() + credentials['expires_in']
        return self.cache['access_token']
```

A few things worth noting:

- `SCOPES` is defined once at the module level as `'data:read'`. Centralising it means you only need to change it in one place if you later need additional scopes.
- `cache` is a plain dict with `access_token` and `expires_at`. A fresh token is fetched whenever `expires_at` is in the past (i.e. `0` on first call, or after the token has expired).
- `get_access_token()` takes no arguments — the scopes are fixed by the module-level constant, which is intentional for a 2-legged server-to-server integration.
- `response.raise_for_status()` raises an exception immediately if APS returns an error, instead of letting a bad response silently propagate.

## Step 2: List hubs & projects

This helper fetches all hubs, then fetches the projects inside each hub, and returns a clean list of dicts. Add it in the `aps.py` file after the `AppAuthenticationProvider` class:

```python
def get_hubs_projects(authentication_provider):
    headers = {'Authorization': f'Bearer {authentication_provider.get_access_token()}'}
    response = requests.get(f'{APS_BASE_URL}/project/v1/hubs', headers=headers)
    response.raise_for_status()
    hubs = response.json().get('data', [])
    results = []
    for hub in hubs:
        response = requests.get(f'{APS_BASE_URL}/project/v1/hubs/{hub["id"]}/projects', headers=headers)
        response.raise_for_status()
        projects = response.json().get('data', [])
        results.append({
            'id': hub['id'],
            'name': hub['attributes']['name'],
            'region': hub['attributes']['region'],
            'projects': [{'id': p['id'], 'name': p['attributes']['name']} for p in projects],
        })
    return results
```

Notice that the `Authorization` header is built once by calling `authentication_provider.get_access_token()` — you never see the raw token string outside of the provider class. The function calls the hubs endpoint, then loops over each hub to fetch its projects, using a list comprehension to keep the inner projects list compact.

## Step 3: List folder contents

This helper returns the contents of a folder, or — when no `folder_id` is given — the top-level folders of a project. It is not used in this section, but it will be needed when you build the MCP server later. Add it in the `aps.py` file after the `get_hubs_projects` function:

```python
def get_folder_contents(hub_id, project_id, folder_id, authentication_provider):
    headers = {'Authorization': f'Bearer {authentication_provider.get_access_token()}'}
    if folder_id:
        url = f'{APS_BASE_URL}/data/v1/projects/{project_id}/folders/{folder_id}/contents'
    else:
        url = f'{APS_BASE_URL}/project/v1/hubs/{hub_id}/projects/{project_id}/topFolders'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    items = response.json().get('data', [])
    return [
        {
            'type': item['type'],
            'id': item['id'],
            'name': item['attributes']['displayName'],
            'modified_at': item['attributes']['lastModifiedTime'],
            'modified_by': item['attributes']['lastModifiedUserName'],
        }
        for item in items
    ]
```

## Step 4: Update the app

The `main.py` you created previously just printed your credentials. Replace the entire file with this temporary test script — it creates an authentication provider, calls `get_hubs_projects`, and dumps the result as JSON:

```python
import json
import os
import sys

from aps import AppAuthenticationProvider, get_hubs_projects

APS_CLIENT_ID = os.environ.get('APS_CLIENT_ID')
APS_CLIENT_SECRET = os.environ.get('APS_CLIENT_SECRET')
if not APS_CLIENT_ID or not APS_CLIENT_SECRET:
    print('APS_CLIENT_ID and APS_CLIENT_SECRET environment variables are required.', file=sys.stderr)
    sys.exit(1)

authentication_provider = AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET)
hubs = get_hubs_projects(authentication_provider)
print(json.dumps(hubs, indent=2))
```

This code is still temporary. It will be replaced again in the next section when you start building the MCP server.

## Checkpoint

You should now have:

- [x] `aps.py` with `AppAuthenticationProvider`, `get_hubs_projects`, and `get_folder_contents`
- [x] `main.py` replaced with the hub/project listing script
- [x] `python main.py` printing a JSON array of your hubs and projects

<details>
    <summary>
        Reference: full <code>aps.py</code>
    </summary>

```python
import time

import requests

APS_BASE_URL = 'https://developer.api.autodesk.com'
SCOPES = 'data:read'


class AppAuthenticationProvider:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.cache = {'access_token': None, 'expires_at': 0}

    def get_access_token(self):
        if self.cache['expires_at'] < time.time():
            response = requests.post(f'{APS_BASE_URL}/authentication/v2/token', data={
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': SCOPES,
            })
            response.raise_for_status()
            credentials = response.json()
            self.cache['access_token'] = credentials['access_token']
            self.cache['expires_at'] = time.time() + credentials['expires_in']
        return self.cache['access_token']


def get_hubs_projects(authentication_provider):
    headers = {'Authorization': f'Bearer {authentication_provider.get_access_token()}'}
    response = requests.get(f'{APS_BASE_URL}/project/v1/hubs', headers=headers)
    response.raise_for_status()
    hubs = response.json().get('data', [])
    results = []
    for hub in hubs:
        response = requests.get(f'{APS_BASE_URL}/project/v1/hubs/{hub["id"]}/projects', headers=headers)
        response.raise_for_status()
        projects = response.json().get('data', [])
        results.append({
            'id': hub['id'],
            'name': hub['attributes']['name'],
            'region': hub['attributes']['region'],
            'projects': [{'id': p['id'], 'name': p['attributes']['name']} for p in projects],
        })
    return results


def get_folder_contents(hub_id, project_id, folder_id, authentication_provider):
    headers = {'Authorization': f'Bearer {authentication_provider.get_access_token()}'}
    if folder_id:
        url = f'{APS_BASE_URL}/data/v1/projects/{project_id}/folders/{folder_id}/contents'
    else:
        url = f'{APS_BASE_URL}/project/v1/hubs/{hub_id}/projects/{project_id}/topFolders'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    items = response.json().get('data', [])
    return [
        {
            'type': item['type'],
            'id': item['id'],
            'name': item['attributes']['displayName'],
            'modified_at': item['attributes']['lastModifiedTime'],
            'modified_by': item['attributes']['lastModifiedUserName'],
        }
        for item in items
    ]
```

</details>

### Try it out

Run the `main.py` script in the terminal:

```bash
python main.py
```

If your APS credentials are valid and your application has been provisioned to at least one Forma hub, you should see output like:

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

**If you see an empty array (`[]`):** your application has not been added to any hub yet. In Forma, an administrator must add the application under Hub Admin → Custom Integrations.

**If you see an authentication error:** double-check that `APS_CLIENT_ID` and `APS_CLIENT_SECRET` are set correctly.

### Additional resources

- [APS Data Management API overview](https://aps.autodesk.com/en/docs/data/v2/overview/)
- [Python Requests library documentation](https://requests.readthedocs.io)
- [OAuth 2.0 client credentials](https://aps.autodesk.com/en/docs/oauth/v2/tutorials/get-2-legged-token/)
