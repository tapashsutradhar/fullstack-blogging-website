# Blogging Website – Full Stack Project

## 📌 Overview
This is a full-stack blogging website where users can create accounts, write blogs, and read articles.  
Admins can manage users and blogs through an admin panel.

## 🚀 Features
- User registration & login
- Admin panel
- Create, Read, Update, Delete (CRUD) blog posts
- Delete user accounts (Admin)
- Database integration
- Secure authentication

## 🛠️ Tech Stack
### Frontend:
- HTML, CSS, JavaScript / React

### Backend:
- Node.js / Express (or Django / Flask)

### Database:
- MySQL / MongoDB / PostgreSQL

## 📂 Project Structure
```
altriveo/
├── package.json
├── app.js
├── data/
│   └── (altriveo.db auto-created)
└── public/
    ├── index.html          ← integrated dynamic homepage
    ├── login.html
    ├── register.html
    ├── post.html           ← single post page
    ├── admin.html          ← modern admin panel (create/edit/delete)
    ├── css/
    │   └── style.css
    └── js/
        └── admin.js
```

## How to run (step-by-step)

Save all files above into a directory blog-app preserving the structure. <br>

Open terminal in blog-app and run:<br>
```
npm install
node app.js
```

Or for development:<br>
```
npm run dev
```

- Open your browser at: http://localhost:3000
Register a user at /register. Then login at /login. <br>
Visit /new after login to write and publish articles. Published posts appear on the homepage /.<br>

## Notes, tips & security
This is development code meant for running on your laptop (local testing). <br>
For production, use a secure session store, HTTPS, better secrets, rate limiting, CSRF protection, input sanitization, and a production DB.<br>
Password hashing uses bcrypt. Tune salt rounds as you like (10 is fine for development).<br>
The app uses in-memory session store (express-session) — not recommended for production. For persistent sessions use a store (Redis, connect-sqlite3, etc.). <br>
All debug console.log messages are already in app.js so you can watch the terminal and see flow ([DEBUG] tags). <br>

## Debugging — how to track issues
Watch the server terminal where you ran node app.js — console.log('[DEBUG] ...') lines show key actions (start, DB connect, route hits, insertions). <br>
If you see SQL errors in terminal, check data/blog.db permissions or re-run after deleting it (for dev).<br>
Browser errors: open DevTools → Console to see flash messages or form validation problems.<br>
