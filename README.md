# निध्याक्षर · Nidhyakshar

Nidhi Shrivastava's bilingual Hindi poetry website, hosted on Google Firebase.

- **Firebase Hosting**: the website itself (`public/`)
- **Firestore**: poems, journal entries, About and Contact (`firestore.rules`)
- **Cloud Storage**: photos of handwritten pages and the portrait (`storage.rules`)
- **Firebase Authentication**: Google sign-in for editors
- **Cloud Functions** (`functions/`): Claude reads handwriting and drafts translations; also serves `sitemap.xml` and `robots.txt` for Google

Anyone can read the site. Only Google accounts listed as **editors** can add, edit or delete, and only editors can use the Claude buttons (so nobody else can spend your API credit).

---

## One-time setup

### 1. Make Node.js and the Firebase tool available in Terminal

Node.js is installed in `~/.local/node`. Run this once, then open a new Terminal window:

```sh
echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> ~/.zshrc
```

Check: `firebase --version` should print a version number.

### 2. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Create a project**. Name it `nidhyakshar` (Firebase may add a few letters to make the ID unique).
2. Google Analytics: you can turn it off.
3. **Upgrade to the Blaze plan** (bottom-left, "Upgrade"). Cloud Functions and Storage need it. You pay only past the free allowance, which a personal poetry site is unlikely to exceed. Set a **budget alert** (for example ₹500 a month) when asked.

### 3. Turn on the services (all in the Firebase console, left menu → Build)

1. **Authentication** → Get started → Sign-in method → **Google** → Enable → Save.
2. **Firestore Database** → Create database → location **asia-south1 (Mumbai)** → Start in **production mode**.
3. **Storage** → Get started → same location → production mode.

### 4. Add the editors

In **Firestore Database** → **Start collection**:

- Collection ID: `editors`
- Document ID: the editor's Gmail address exactly, e.g. `nidhi.example@gmail.com`
- Add one field: `role` (string) = `editor` → Save

Add another document in `editors` for each extra person who may edit (for example your own email).

### 5. Get a Claude API key

1. Go to <https://platform.claude.com>, sign in, and add a small amount of credit under **Billing**.
2. **API keys** → **Create key** → copy it (it starts with `sk-ant-`). Keep it private.

Each handwriting reading or translation costs a few US cents.

### 6. Deploy

```sh
cd ~/nidhyakshar
firebase login                                   # opens the browser; sign in with the Google account that owns the project
firebase use --add                               # pick your project, type "default" as the alias
firebase functions:secrets:set ANTHROPIC_API_KEY # paste the Claude API key when asked
firebase deploy
```

The first deploy takes a few minutes. If it asks to grant Storage access to Firestore (for the security rules), answer **Yes**.

When it finishes it prints the address, for example `https://nidhyakshar.web.app`. Open it, scroll to the bottom and click **लेखक लॉगिन / Editor sign-in**. After signing in with an editor account, **+ नई रचना / + New writing** appears at the top.

---

## Connect your own domain (e.g. nidhyakshar.com)

1. Buy the domain from any registrar (GoDaddy, Namecheap, Cloudflare, Hostinger…).
2. Firebase console → **Hosting** → **Add custom domain** → enter the domain. Firebase shows DNS records (usually an `A` record and a `TXT` record).
3. In your registrar's DNS settings, add exactly those records. It can take from a few minutes up to a day to start working; Firebase sets up HTTPS automatically.
4. Firebase console → **Authentication** → **Settings** → **Authorized domains** → **Add domain** → add your domain, so editor sign-in works there too.

## Get found on Google

1. Go to <https://search.google.com/search-console> and add your domain.
2. Under **Sitemaps**, submit `https://YOUR-DOMAIN/sitemap.xml`. It lists every poem automatically.

---

## Updating the website later

Edit files in `public/` (the site) or `functions/` (Claude features), then run `firebase deploy` from `~/nidhyakshar`. Poems and pages added through the website don't need a deploy.

Useful commands:

```sh
firebase deploy --only hosting      # only the website files
firebase deploy --only functions    # only the Claude / sitemap functions
firebase functions:log              # see errors from the functions
```
