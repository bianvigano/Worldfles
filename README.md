# Vite + Vue + Express + SQLite (one port)

## Dev (Vue HMR + API on same port)
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Production
```bash
npm run build
npm run start
```
Open http://localhost:3000

## Make first admin
After registering a user, open `app.db` with a SQLite browser and run:
```sql
UPDATE users SET role='admin' WHERE email='admin@example.com';
```
