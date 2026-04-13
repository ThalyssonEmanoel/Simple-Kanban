# Setup do Banco de Dados

## Database url 

No projeto do supabase, pesquisar pelo nome: **Connection string**, copiar a **URI** do modo **Transaction**
   - Vai parecer algo como:
   ```
   postgresql://postgres.[IDDOBANCO]:[YOUR-PASSWORD]@pipipipipi/postgres
   ```

## .env

```env
NEXT_PUBLIC_SUPABASE_URL=https://asdsadasdasdasd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_sadasdasdsadasdsd

DATABASE_URL="postgresql://postgres.adasdasdasd:MINHA_SENHA_AQUI@pipipipipi/postgres"
```

1. Puxar o estado atual do banco:
   ```bash
   npx prisma db pull
   ```

2. Gerar o Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Inciar o servidor:
   ```bash
   npm run dev
   ```
