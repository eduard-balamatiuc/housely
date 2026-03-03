FROM node:20-alpine

WORKDIR /app/apps/web

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY apps/web/ .

EXPOSE 3000

CMD ["pnpm", "dev"]
