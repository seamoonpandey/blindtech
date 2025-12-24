#!/bin/bash
echo "Building UI.."

npm install

npm run build

echo "Deployin to Cloudflare pages"

wrangler pages deploy dist --project-name=blindtech

echo "Deployment complete!"
