# FluxForge Studio

FluxForge Studio is a Next.js 14 application for generating AI-driven videos from three creative entry points:

- Text-to-video cinematic renders
- Image-to-video animations with depth-aware parallax
- Reference-to-video remixes that mirror existing motion clips

The project ships with a polished UI, mock rendering pipeline for local development, and plug-and-play integration hooks for GPU-backed providers such as [fal.ai](https://fal.ai) or [Replicate](https://replicate.com/).

## Getting started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the studio.

## Environment variables

Copy `.env.local.example` to `.env.local` and populate any provider tokens you intend to use:

```ini
FAL_KEY=your_fal_api_key
REPLICATE_API_TOKEN=your_replicate_key
```

Without credentials the API uses curated mock footage so you can validate the workflow end-to-end.

## Scripts

- `npm run dev` – launch the development server
- `npm run lint` – run ESLint
- `npm run build` – create an optimized production build
- `npm run start` – serve the production build locally

## Architecture overview

- `src/app/page.tsx` – primary UI with mode selector, generation form, and preview surface
- `src/app/api/generate/route.ts` – handles submissions, validates uploads, and orchestrates provider calls
- `tailwind.config.ts` – TailwindCSS configuration with App Router support
- `src/app/globals.css` – global styles and font wiring

The API route automatically falls back to mock content when no provider key is present. Supply your own credentials to unlock real-time AI rendering.

## Deployment

The project is optimized for deployment on [Vercel](https://vercel.com/). Run the following once you have configured your token and environment variables:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-711ac72a
```

## License

MIT © FluxForge Contributors
