# Neural Social — Mini Social Post Application

A clean, responsive full-stack social feed built for the 3W Full Stack Internship Round 1 assignment.

## Stack
- Frontend: React.js + Vite + Basic CSS
- Backend: Node.js + Express
- Database: MongoDB / MongoDB Atlas
- Authentication: JWT + bcrypt
- Image posts: compressed Base64 image data stored inside the Post document
- No TailwindCSS
- Only TWO MongoDB collections: `users` and `posts`

## Features
- Signup and login
- JWT protected authentication
- Create text posts, image posts, or both
- Public paginated feed
- Like / unlike posts
- Add comments
- Like and comment usernames are saved
- Instant UI updates
- Delete your own posts
- Responsive mobile/desktop layout
- Loading, empty and error states
- Character limits and basic validation

## Project structure

neural-social-app/
  frontend/
  backend/
  README.md

## 1. Run backend

```bash
cd backend
npm install
```

Create `.env` from `.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/neural_social
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Then:

```bash
npm run dev
```

Backend: http://localhost:5000

## 2. Run frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

For local development the frontend uses `/api` through Vite proxy.

## MongoDB Atlas

Create a MongoDB Atlas cluster and set:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/neural_social
```

Add your deployment IP / network access as required by Atlas.

## Deployment

### Backend — Render
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CLIENT_URL`

### Frontend — Vercel / Netlify
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your deployed Render backend URL, for example:
  `https://your-backend.onrender.com/api`

Then rebuild/redeploy.

## Important image note

Images are compressed in the browser and stored directly in the post document as a data URL. This keeps the assignment within the required two-collection MongoDB design and avoids adding a third database collection.

For a production-scale application, an object-storage service such as Cloudinary/S3 would be preferable.

## Suggested demo flow

1. Create Account
2. Login
3. Create a text + image post
4. Create another account in an incognito window
5. Like the first account's post
6. Add a comment
7. Refresh to verify persistence
8. Show pagination by creating several posts

## Submission checklist

- [ ] GitHub repository is public
- [ ] `frontend` and `backend` are separate folders
- [ ] MongoDB Atlas connected
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel/Netlify
- [ ] Signup/login tested
- [ ] Text/image/both posts tested
- [ ] Like/comment tested
- [ ] Responsive UI tested
- [ ] README contains deployment instructions
