# PanPoint Backend

Deploy FREE on **Render.com** — your Hostinger plan doesn't support Node.js, so backend runs on Render (free tier).

## Services Used (all free)
| Service | Purpose | Cost |
|---------|---------|------|
| Render.com | Node.js backend hosting | Free |
| MongoDB Atlas | Database | Free (512MB) |
| Cloudinary | Image storage | Free (25GB) |

## Deploy Steps

### 1. Create Free Accounts
- **render.com** — sign up free
- **mongodb.com/atlas** — sign up free  
- **cloudinary.com** — sign up free

### 2. Get Your Credentials

**MongoDB Atlas:**
1. Create cluster → Connect → Drivers → copy connection string
2. Replace `<password>` with your DB password

**Cloudinary:**
1. Log in → Dashboard → copy Cloud Name, API Key, API Secret

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/panpoint-backend.git
git push -u origin main
```

### 4. Deploy on Render
1. Go to **render.com** → New → Web Service
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` — just fill in environment variables:
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — any long random string (32+ chars)
   - `JWT_REFRESH_SECRET` — another long random string
   - `CLIENT_URL` — your Hostinger domain (e.g. `https://yourdomain.com`)
   - `CLOUDINARY_CLOUD_NAME` — from Cloudinary dashboard
   - `CLOUDINARY_API_KEY` — from Cloudinary dashboard
   - `CLOUDINARY_API_SECRET` — from Cloudinary dashboard
4. Click **Deploy**
5. Wait ~3 minutes. You'll get a URL like: `https://panpoint-backend.onrender.com`

### 5. Note Your Backend URL
Copy the URL Render gives you — you need it for the frontend `.env`.

## Local Development
```bash
npm install
cp .env.example .env
# fill in .env values
npm run dev
```
