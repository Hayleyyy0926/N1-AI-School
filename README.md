# N1 AI School Application

A bilingual Chinese and English application form for N1 AI School, built with React and Vite.

## Local development

```bash
pnpm install
pnpm dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

## Production build

```bash
pnpm build
```

The production output is generated in `dist/`. The project can be deployed directly to Vercel using the Vite defaults.

## Database

Create a local `.env` from `.env.example`, then apply the Neon Postgres migrations:

```bash
pnpm migrate
```

Never commit `.env` or production credentials.

## Documentation

Engineering decisions, deployment instructions, database practices, and security guidance are maintained in [`docs/`](docs/README.md).
