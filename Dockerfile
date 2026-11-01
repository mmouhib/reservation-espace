# One image runs everything: the server (API and scheduled jobs) and the built web app it serves.
#
#   docker build -t reservation-espace \
#     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com \
#     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id> \
#     --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... .
#   docker run -p 8080:8080 --env-file server/.env.production.local reservation-espace
#
# The web keys are public (they end up in the JavaScript), so they are build arguments. The server's
# settings (database password, service account...) are NOT in the image: give them when it runs.

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_USE_EMULATORS=false \
    NEXT_PUBLIC_API_URL=""
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev --no-package-lock
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/apps/web/out /app/apps/web/out
EXPOSE 8080
CMD ["node", "dist/index.js"]
