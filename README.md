# Agentic AI Video Lab

FluxForge Studio lives inside the `app/` directory. It is a Next.js application that transforms text prompts, still imagery, or reference footage into AI-generated video sequences.

## Quick start

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the studio UI.

## Key capabilities

- Guided workflows for text-to-video, image-to-video, and reference motion remixing
- Drag-and-drop asset uploads with inline previews
- Mock rendering engine for local demos, plus hooks for fal.ai and Replicate
- Responsive Tailwind UI with cinematic theming
- Structured metadata output for post-processing pipelines

## Deployment

The project is optimized for Vercel. After configuring `.env.local`, deploy using:

```bash
cd app
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-711ac72a
```

## Repository layout

```
.
├── app/               # Next.js application (FluxForge Studio)
├── README.md          # This file
└── ...                # Supporting configuration
```

Refer to `app/README.md` for detailed usage and integration guidance.
