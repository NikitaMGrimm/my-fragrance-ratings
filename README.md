# My Fragrance Ratings

Small personal tracker for perfume ratings. Data lives in constants.csv and optional images in images/.

## Run locally

1. npm install
2. npm run dev

Use the Vite dev server URL printed by `npm run dev`. VS Code Go Live/Five Server cannot run the raw repo root because the app uses TypeScript/TSX and Vite transforms it in development.

For a static local preview:

1. npm run build
2. Serve the `dist` folder with Go Live/Five Server or `npm run preview`
