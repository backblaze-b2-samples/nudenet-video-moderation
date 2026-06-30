# Railway Deployment

Deploy both services (web + api) on Railway.

## Setup

1. Create a new Railway project
2. Add two services from the same repo:

### Web Service (Next.js)
- **Root Directory**: `apps/web`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Port**: `3000`

### API Service (FastAPI)
- **Root Directory**: `services/api`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

The NudeNet ONNX model ships in the `nudenet` wheel and ffmpeg ships in the
`imageio-ffmpeg` wheel, so no extra system packages are required. The default
execution provider is CPU.

## Environment Variables

Set these on the API service. The S3 endpoint is derived from `B2_REGION`
(`https://s3.<B2_REGION>.backblazeb2.com`).

| Variable | Value |
|----------|-------|
| `B2_APPLICATION_KEY_ID` | Your B2 application key ID |
| `B2_APPLICATION_KEY` | Your B2 application key |
| `B2_BUCKET_NAME` | Your bucket name |
| `B2_REGION` | Your bucket region, e.g. `us-west-004` |
| `B2_PUBLIC_URL_BASE` | (Optional) public/CDN base URL for objects |
| `API_CORS_ORIGINS` | Your web service URL (e.g., `https://web-production-xxx.up.railway.app`) |

Optional moderation defaults (all have safe defaults): `MODERATION_THRESHOLD`,
`SAMPLE_MODE`, `SAMPLE_FPS`, `VIOLATION_LABELS`, `MAX_VIDEO_SIZE`.

Set this on the Web service:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your API service URL (e.g., `https://api-production-xxx.up.railway.app`) |
