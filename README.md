# v0-skill-bridge-project-build

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_uHcc0eDN6pbS0NaG0qPpCyAE89PR)

## Getting Started

First, run the frontend development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The backend is now implemented with Node.js and Express. To start it locally (from the `backend` directory):

```bash
cd backend && npm install && npm run dev # requires nodemon for hot reload
```

You can then visit [http://localhost:8000](http://localhost:8000) for the API health check.

### Audio recording & AI detection

The frontend now supports capturing microphone input during the "Test Microphone" step. The recorded audio is uploaded to MongoDB (stored via GridFS) and analysed for possible AI presence. The backend exposes:

- `POST /api/v1/audio/test` – accepts multipart/form-data audio and returns `{fileId, aiDetected}`
- `GET /api/v1/audio/:id` – fetch metadata including AI flag
- `GET /api/v1/audio/file/:fileId` – download the raw audio file

This is used by the setup page; results are shown on screen when you click the Test Microphone button.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/Jeffrin-Jayan/v0-skill-bridge-project-build" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
