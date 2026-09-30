# Auto Accelerator Call Tracker

A clean, embeddable call tracking app for Auto Accelerator.

## Setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Vercel auto-detects Vite — just click Deploy
4. Copy the deployed HTTPS URL (e.g. https://your-app.vercel.app)

## Embed in Notion

1. Open your Notion page
2. Type `/embed`
3. Paste your Vercel URL
4. Resize the embed block to fit

## Notes

- Data is stored in your browser's localStorage
- Data is specific to the browser and device you use
- Use Export JSON to back up your data
- Use Import JSON to restore or transfer data to another device

## Future upgrade path

To sync data across devices, replace the localStorage functions with calls to Supabase, Firebase, or any simple REST API. The data shape is already defined in the DayRecord interface.
