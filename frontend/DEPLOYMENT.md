# Deploy the frontend to Vercel

The frontend is a Vite single-page application. The Git repository root is the parent of this `frontend` directory, so configure the Vercel project's **Root Directory** as `frontend`.

## Vercel project settings

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: leave the Vercel default (`npm install`)

`vercel.json` includes these build settings and routes application paths back to `index.html`, which is required for React Router deep links such as `/detection`.

## Environment variable

Set this in Vercel under **Project Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `VITE_API_BASE_URL` | The public HTTPS base URL of the deployed FastAPI backend, without a trailing slash. |

Set it for Production and for Preview deployments if those deployments should call an API. `VITE_` variables are included in the public browser bundle: never put credentials, database URLs, or other secrets in them. The local `.env.development` value is for local development only and must not be used as the production API URL.

## Backend connectivity

Vercel hosts the static frontend; it does not make a local `127.0.0.1:8000` backend publicly reachable. Deploy FastAPI separately to a publicly accessible HTTPS host, then set its base URL as `VITE_API_BASE_URL`.

Configure the backend's `FRONTEND_ORIGINS` to include the exact Vercel production origin (for example, `https://your-project.vercel.app`) and any custom production domain. Preview deployment origins must also be explicitly allowed if previews need API access. Redeploy the frontend after changing Vercel environment variables.

The current backend reports E0 unavailable until its real checkpoint is configured, and E1 has no detector implementation/checkpoint. Frontend hosting does not change those inference requirements.
