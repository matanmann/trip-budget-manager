
# Trip Budget Manager - Windows Setup Guide

This guide walks you through setting up the development environment from scratch on a **new Windows computer**.

---

## Part 1: Install Required Software

### Step 1.1: Install Git for Windows

1. Download from: https://git-scm.com/download/win
2. Run the installer
3. **Important settings during installation:**
   - Select "Git from the command line and also from 3rd-party software"
   - Select "Use Windows' default console window" (or Windows Terminal if you have it)
   - Select "Checkout Windows-style, commit Unix-style line endings"
   - Keep other defaults
4. Click Install and wait for completion

**Verify installation:** Open Command Prompt or PowerShell and run:
```cmd
git --version
```
Should show: `git version 2.x.x.windows.x`

### Step 1.2: Install Node.js 20 LTS

1. Download from: https://nodejs.org/ (click the LTS version, currently 20.x)
2. Run the installer
3. **Important:** Check the box "Automatically install the necessary tools" if prompted
4. Keep all default settings and complete installation
5. **Restart your computer** after installation

**Verify installation:** Open a NEW Command Prompt or PowerShell and run:
```cmd
node --version
npm --version
```
Should show: `v20.x.x` and `10.x.x`

### Step 1.3: Install PostgreSQL 16

1. Download from: https://www.postgresql.org/download/windows/
2. Click "Download the installer" (from EDB)
3. Choose PostgreSQL 16.x for Windows x86-64
4. Run the installer
5. **Important settings:**
   - Installation directory: Keep default (`C:\Program Files\PostgreSQL\16`)
   - Select all components (PostgreSQL Server, pgAdmin 4, Stack Builder, Command Line Tools)
   - Data directory: Keep default
   - **Password:** Set a password for the `postgres` user (REMEMBER THIS!)
   - Port: Keep default `5432`
   - Locale: Keep default
6. Complete installation
7. Uncheck "Launch Stack Builder" at the end

**Add PostgreSQL to PATH:**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to "Advanced" tab → "Environment Variables"
3. Under "System variables", find `Path` and click "Edit"
4. Click "New" and add: `C:\Program Files\PostgreSQL\16\bin`
5. Click OK on all dialogs
6. **Close and reopen** Command Prompt/PowerShell

**Verify installation:**
```cmd
psql --version
```
Should show: `psql (PostgreSQL) 16.x`

### Step 1.4: Install Visual Studio Code

1. Download from: https://code.visualstudio.com/
2. Run the installer
3. **Recommended:** Check these options during install:
   - Add "Open with Code" action to Windows Explorer file context menu
   - Add "Open with Code" action to Windows Explorer directory context menu
   - Add to PATH

**Install recommended extensions:**
Open VS Code, press `Ctrl+Shift+X` and install:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Prisma
- GitLens

---

## Part 2: Configure Git and GitHub

### Step 2.1: Configure Git Identity

Open Command Prompt or PowerShell:
```cmd
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
```

### Step 2.2: Create GitHub Account (if needed)

1. Go to https://github.com/signup
2. Create account with your email
3. Verify your email address

### Step 2.3: Generate SSH Key

Open Command Prompt or PowerShell:
```cmd
ssh-keygen -t ed25519 -C "your.email@example.com"
```
- Press Enter to accept default file location
- Enter a passphrase (or leave empty for no passphrase)

### Step 2.4: Add SSH Key to GitHub

1. Copy your public key:
   ```cmd
   type %USERPROFILE%\.ssh\id_ed25519.pub
   ```
2. Go to https://github.com/settings/keys
3. Click "New SSH key"
4. Title: "My Windows PC"
5. Key type: "Authentication Key"
6. Paste the key content
7. Click "Add SSH key"

**Verify connection:**
```cmd
ssh -T git@github.com
```
Type "yes" if prompted. Should see: "Hi username! You've successfully authenticated..."

---

## Part 3: Project Setup

### Step 3.1: Create Project Directory

```cmd
mkdir C:\Projects
cd C:\Projects
```

### Step 3.2: Clone or Create Repository

**Option A - Clone existing repo:**
```cmd
git clone git@github.com:YOUR_USERNAME/trip-budget-manager.git
cd trip-budget-manager
```

**Option B - If you have the files locally:**
```cmd
mkdir trip-budget-manager
cd trip-budget-manager
git init
```

### Step 3.3: Create the Database

Open Command Prompt and run:
```cmd
createdb -U postgres trip_budget
```
Enter the password you set during PostgreSQL installation.

**Alternative using pgAdmin:**
1. Open pgAdmin 4 (from Start menu)
2. Connect to your local server (enter your postgres password)
3. Right-click "Databases" → "Create" → "Database"
4. Name: `trip_budget`
5. Click Save

### Step 3.4: Backend Setup

```cmd
cd backend

REM Install dependencies
npm install

REM Copy environment file
copy .env.example .env
```

**Edit the .env file:**
Open `backend\.env` in VS Code or Notepad and update:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trip_budget?schema=public"
```
Replace `YOUR_PASSWORD` with your PostgreSQL password.

**Run database migration:**
```cmd
npx prisma migrate dev --name init
```

**Start the backend server:**
```cmd
npm run dev
```
Should show: `🚀 Server running on http://localhost:3000`

### Step 3.5: Frontend Setup

Open a NEW Command Prompt window (keep backend running):
```cmd
cd C:\Projects\trip-budget-manager\frontend

REM Serve the frontend
npx serve -p 8080
```

If prompted to install `serve`, type `y` and press Enter.

### Step 3.6: Open the App

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Prisma Studio: `npm run db:studio` (http://localhost:5555)

---

## Part 4: Google OAuth Setup

### Step 4.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → "New Project"
3. Project name: `Trip Budget Manager`
4. Click "Create"
5. Wait for project creation, then select it from the dropdown

### Step 4.2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services > OAuth consent screen**
2. Select **External** user type → Click "Create"
3. Fill in the form:
   - App name: `Trip Budget Manager`
   - User support email: Your email
   - Developer contact email: Your email
4. Click "Save and Continue"
5. On Scopes page, click "Add or Remove Scopes"
   - Select: `.../auth/userinfo.email`
   - Select: `.../auth/userinfo.profile`
   - Click "Update"
6. Click "Save and Continue"
7. On Test users page, click "Add Users"
   - Add your Google email address
   - Click "Save and Continue"
8. Click "Back to Dashboard"

### Step 4.3: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: `Trip Budget Manager Web Client`
5. **Authorized JavaScript origins:**
   - Click "Add URI" → `http://localhost:3000`
   - Click "Add URI" → `http://localhost:8080`
6. **Authorized redirect URIs:**
   - Click "Add URI" → `http://localhost:3000/auth/google/callback`
7. Click "Create"
8. **Copy the Client ID and Client Secret** (you'll need these!)

### Step 4.4: Update Environment Variables

Open `backend\.env` and update:
```env
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

**Restart the backend server** after updating .env:
- Press `Ctrl+C` in the backend terminal
- Run `npm run dev` again

---

## Part 5: Troubleshooting (Windows)

### PostgreSQL Connection Issues

**Check if PostgreSQL is running:**
1. Press `Win + R`, type `services.msc`, press Enter
2. Find "postgresql-x64-16" in the list
3. Status should be "Running"
4. If not, right-click → Start

**Test database connection:**
```cmd
psql -U postgres -d trip_budget
```
Enter your password. If it connects, type `\q` to exit.

**Common error: "password authentication failed"**
- Make sure you're using the correct password from installation
- Check the DATABASE_URL in your .env file

### Port Already in Use

**Find what's using port 3000:**
```cmd
netstat -ano | findstr :3000
```
This shows the PID (last column).

**Kill the process:**
```cmd
taskkill /PID <PID_NUMBER> /F
```

**Alternative:** Just use a different port in .env:
```env
PORT=3001
```

### Node.js/npm Issues

**"npm is not recognized":**
- Restart your computer after Node.js installation
- Or manually add to PATH: `C:\Program Files\nodejs`

**Clear npm cache:**
```cmd
npm cache clean --force
```

**Delete node_modules and reinstall:**
```cmd
rd /s /q node_modules
del package-lock.json
npm install
```

### Prisma Issues

**Regenerate Prisma client:**
```cmd
npx prisma generate
```

**Reset database (WARNING: deletes all data):**
```cmd
npx prisma migrate reset
```

**View database in browser:**
```cmd
npm run db:studio
```

### Git/SSH Issues

**"Permission denied (publickey)":**
1. Make sure SSH key is added to GitHub (Step 2.4)
2. Check SSH agent is running:
   ```cmd
   ssh-agent -s
   ssh-add %USERPROFILE%\.ssh\id_ed25519
   ```

**Use HTTPS instead of SSH:**
```cmd
git remote set-url origin https://github.com/YOUR_USERNAME/trip-budget-manager.git
```

---

## Part 6: Daily Development Workflow

### Starting the App

1. **Open Terminal 1 - Backend:**
   ```cmd
   cd C:\Projects\trip-budget-manager\backend
   npm run dev
   ```

2. **Open Terminal 2 - Frontend:**
   ```cmd
   cd C:\Projects\trip-budget-manager\frontend
   npx serve -p 8080
   ```

3. **Open browser:** http://localhost:8080

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend in development mode |
| `npm run db:studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Apply database changes |
| `git status` | Check changed files |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit changes |
| `git push` | Push to GitHub |

### VS Code Tips

- **Open project:** `code C:\Projects\trip-budget-manager`
- **Integrated terminal:** Press `` Ctrl+` ``
- **Split terminal:** Click the + icon in terminal panel
- **Format code:** `Shift+Alt+F`
- **Go to file:** `Ctrl+P`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 TRIP BUDGET MANAGER                      │
├─────────────────────────────────────────────────────────┤
│  Frontend URL:    http://localhost:8080                  │
│  Backend URL:     http://localhost:3000                  │
│  Prisma Studio:   http://localhost:5555                  │
├─────────────────────────────────────────────────────────┤
│  Start Backend:   cd backend && npm run dev              │
│  Start Frontend:  cd frontend && npx serve -p 8080       │
│  View Database:   cd backend && npm run db:studio        │
├─────────────────────────────────────────────────────────┤
│  Database:        PostgreSQL on localhost:5432           │
│  Database Name:   trip_budget                            │
│  Database User:   postgres                               │
└─────────────────────────────────────────────────────────┘
```




