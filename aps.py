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
