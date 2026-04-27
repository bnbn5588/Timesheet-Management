# Kong Log

A timesheet management web app for employers to track employee work hours and overtime costs.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Prisma 6** + PostgreSQL (Neon)
- **NextAuth v4** — credential-based login
- **Tailwind CSS 3**

## Features

- Employer login — single account manages everything
- Add / edit / delete employees with hourly and overtime rates
- Create and manage projects
- Log time entries per employee per project
- Live cost preview when adding entries
- Filter timesheets by employee, project, and date range
- Dashboard with monthly stats overview
- Fully mobile responsive

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables** — create `.env.local`:
   ```env
   DATABASE_URL="your_postgresql_connection_string"
   NEXTAUTH_SECRET="your_random_secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Push the database schema**
   ```bash
   npx prisma db push
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and register your employer account.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma db push` | Sync schema to database |
