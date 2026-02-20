# cx-platform-v2

Firebase + React admin + lightweight on-site SDK.

## Firestore top-level collections
- `workspaces/{workspaceId}`
- `sites/{siteId}`
- `scenarios/{scenarioId}`
- `actions/{actionId}`

`scenario` docs reference `actions` via `actionRefs` (ordered list). The server expands these into concrete `actions[]` for the SDK.

## Local dev

### Admin
```bash
cd admin
npm i
npm run dev
```

### Functions
```bash
cd functions
npm i
npm run build
firebase emulators:start --only functions
```

### Hosting (SDK)
Deploy `public/sdk.js` (and optional `public/sdk.css`) to Firebase Hosting.

