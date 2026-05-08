# Configuração de Ambientes

## Separação de Ambientes

| Ambiente | Supabase | Vercel | Branch |
|---|---|---|---|
| **Local (dev)** | `supabase start` (local) OU projeto Dev | `localhost:3000` | qualquer |
| **Staging (preview)** | Financial Dev (`mebdrweubmywoeybkhhr`) | Preview deployments | feature branches |
| **Produção** | Financial (`wqvwbawhwypcsmzfbvpy`) | Production | `main` |

---

## Projetos Supabase

### Financial Dev (staging/testes)
- **Project ID:** `mebdrweubmywoeybkhhr`
- **URL:** `https://mebdrweubmywoeybkhhr.supabase.co`
- **Região:** sa-east-1 (São Paulo)
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lYmRyd2V1Ym15d29leWJraGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTQxMDEsImV4cCI6MjA5MzczMDEwMX0.iZVPNutq6ctXxaF-L1ZZ_Ewhab9eZ3rRb-XvSeIDjFY`
- **Service Role Key:** obter em Supabase Dashboard → Financial Dev → Settings → API

### Financial (produção)
- **Project ID:** `wqvwbawhwypcsmzfbvpy`
- **URL:** `https://wqvwbawhwypcsmzfbvpy.supabase.co`
- **Região:** us-west-2

---

## Configuração do Vercel

### Variables por Ambiente

No Vercel Dashboard → Project → Settings → Environment Variables, cada variável pode ter valores diferentes por ambiente (Production / Preview / Development).

#### NEXT_PUBLIC_SUPABASE_URL
| Ambiente Vercel | Valor |
|---|---|
| Production | `https://wqvwbawhwypcsmzfbvpy.supabase.co` |
| Preview | `https://mebdrweubmywoeybkhhr.supabase.co` |

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
| Ambiente Vercel | Valor |
|---|---|
| Production | chave anon do projeto Financial |
| Preview | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (ver .env.example) |

#### SUPABASE_SERVICE_ROLE_KEY
| Ambiente Vercel | Valor |
|---|---|
| Production | service role key do projeto Financial |
| Preview | service role key do projeto Financial Dev (pegar no Dashboard) |

#### NEXT_PUBLIC_APP_URL
| Ambiente Vercel | Valor |
|---|---|
| Production | `https://seudominio.com.br` |
| Preview | deixar vazio (Vercel injeta `VERCEL_URL` automaticamente) |

> As demais variáveis (Stripe, Google AI, Sentry, etc.) geralmente apontam para os mesmos valores em Preview e Production, exceto:
> - `STRIPE_SECRET_KEY`: usar `sk_test_...` em Preview, `sk_live_...` em Production
> - `STRIPE_WEBHOOK_SECRET`: criar webhook separado no Stripe para staging

---

## Configuração de Auth no Supabase Dev

Para que o login funcione nos Vercel preview deployments, adicione os redirect URLs no projeto Financial Dev:

1. Acesse: [Financial Dev → Authentication → URL Configuration](https://supabase.com/dashboard/project/mebdrweubmywoeybkhhr/auth/url-configuration)
2. Em **Redirect URLs**, adicione:
   ```
   https://*.vercel.app/**
   http://localhost:3000/**
   ```

---

## Aplicar Novas Migrations

### No projeto Dev (staging)
```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Linkar ao projeto dev
supabase link --project-ref mebdrweubmywoeybkhhr

# Aplicar migrations pendentes
supabase db push
```

### No projeto Produção
```bash
# Linkar ao projeto prod
supabase link --project-ref wqvwbawhwypcsmzfbvpy

# Aplicar migrations pendentes
supabase db push
```

> **Regra:** sempre aplicar no Dev primeiro, validar, depois aplicar em Prod.

---

## Workflow de Deploy

```
1. Desenvolver na branch feature/*
2. Push → Vercel cria preview deployment → usa Supabase Dev
3. Testar no preview URL
4. PR → merge para main
5. Vercel faz deploy de produção → usa Supabase Prod
```

---

## Gerar Types TypeScript

```bash
# Para o projeto dev (local ou staging)
supabase gen types typescript --project-id mebdrweubmywoeybkhhr > src/lib/supabase/types.ts

# Para o projeto prod (confirmar antes de commitar)
supabase gen types typescript --project-id wqvwbawhwypcsmzfbvpy > src/lib/supabase/types.ts
```

---

## Edge Functions

Após criar uma nova Edge Function, fazer deploy em ambos os projetos:

```bash
supabase functions deploy categorize-import --project-ref mebdrweubmywoeybkhhr
supabase functions deploy categorize-import --project-ref wqvwbawhwypcsmzfbvpy
```
