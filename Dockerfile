# Front Elegance Deco pour Dokploy : build Angular, puis fichiers servis par Nginx sur le port 80.
# Le build a besoin du back à côté (type AppRouter, règles de shared/) : il est cloné depuis GitHub.
FROM node:20-alpine AS build
RUN apk add --no-cache git && corepack enable && corepack prepare pnpm@10.4.1 --activate
ARG BACK_REPO=https://github.com/taha43584/back-neon.git
ARG BACK_BRANCH=main
WORKDIR /src
# Change à chaque commit du back : le clone n'est pas repris du cache Docker s'il a évolué
ADD https://api.github.com/repos/taha43584/back-neon/git/refs/heads/${BACK_BRANCH} /tmp/version-back.json
RUN git clone --depth 1 --branch "$BACK_BRANCH" "$BACK_REPO" back \
 && cd back && pnpm install --frozen-lockfile

WORKDIR /src/front
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/front/dist/client-angular/browser /usr/share/nginx/html
EXPOSE 80
