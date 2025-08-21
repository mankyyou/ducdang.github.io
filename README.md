# Mongo Login App (HTML + JS + Node/Express + MongoDB Atlas)

A minimal login/register example using **HTML + plain JavaScript** on the frontend and **Node/Express + MongoDB** on the backend.

- Frontend: static HTML/JS (can be hosted on GitHub Pages).
- Backend: Node/Express + Mongoose, JWT auth (deploy to Render/Railway/Vercel).
- Database: MongoDB Atlas.

## 1) Prerequisites
- Node.js 18+
- A MongoDB Atlas connection string
- A GitHub account (to push the repo and optionally use GitHub Pages for the frontend)
- A Render/Railway/Vercel account (to host the backend for free)

## 2) Local setup

```bash
git clone <your-repo-url>
cd mongo-login-app/server
cp .env.example .env
# edit .env and set MONGODB_URI and JWT_SECRET

npm install
npm start
# backend runs on http://localhost:4000

# open in another terminal:
cd ../client
# simply open index.html in your browser (e.g. with Live Server)
```

> If you open `client/index.html` from the file system, set `API_BASE` in `client/app.js` to `http://localhost:4000`. If you host the frontend somewhere, set it to your deployed backend URL.

## 3) Environment variables

Create `server/.env` from `.env.example`:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
PORT=4000
JWT_SECRET=your_super_secret_token_key
```

## 4) Deploy

### Backend (Render - quick way)
1. Push this whole folder to GitHub.
2. On Render.com, create a **New Web Service** from your repo.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables shown above in **Render > Environment**.
7. After deploy, you’ll get a URL like `https://your-app.onrender.com`

### Frontend (GitHub Pages)
1. In your GitHub repo, put the **client** folder at the repo root (or keep as-is and configure Pages to serve from `/client`).
2. In repo **Settings > Pages**, set Source to:
   - **Deploy from a branch**
   - Branch: `main` (or `master`)
   - Folder: `/client`
3. Update `API_BASE` in `client/app.js` to your Render/Railway/Vercel backend URL.
4. Wait for GitHub Pages to publish your site.

## 5) Notes
- This demo stores the JWT in `localStorage` (simple for a demo). In production, prefer HttpOnly cookies and CSRF protection.
- Passwords are hashed with `bcryptjs`.
- The `/api/auth/me` route demonstrates an authenticated request.
- Keep your `.env` out of Git. The provided `.gitignore` handles that.

Enjoy! 🚀
