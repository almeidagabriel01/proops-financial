# Performance Baseline — Story 4.4

**Data:** 2026-04-07  
**Ambiente:** Build de produção local + Turbopack (Next.js 16.2.2)

---

## Status

Story 4.4 implementa as fundações de performance (PWA, dynamic imports, loading states). O baseline real de Lighthouse deve ser medido no primeiro deploy de preview em Vercel.

### Por que não há screenshot de Lighthouse aqui

O Lighthouse CI (`npm run lighthouse`) requer um servidor rodando e conexão estável para simular carregamento de rede. Em ambiente de desenvolvimento local com dados de seed limitados, os resultados não representam a experiência real de produção.

**Baseline oficial:** rodar `npm run lighthouse` após o primeiro deploy em Vercel (Story 4.5) com dados reais.

---

## Otimizações implementadas nesta story

### Bundle size — Dynamic imports

Os componentes Recharts (~400KB) são carregados lazily via `next/dynamic`:

| Componente | Estratégia | Impacto |
|------------|-----------|---------|
| `SpendingChart` (Recharts BarChart) | `ssr: false`, lazy load | Removido do bundle crítico da rota `/dashboard` |
| `CategoryChart` (Recharts PieChart) | `ssr: false`, lazy load | Removido do bundle crítico da rota `/dashboard` |

Build com Turbopack não expõe "First Load JS" por rota no terminal. Usar Vercel Analytics ou `@next/bundle-analyzer` para análise detalhada em CI/CD.

### PWA

| Item | Status |
|------|--------|
| Service worker (`@serwist/next`) | ✅ Configurado |
| Manifest.json | ✅ Completo (icons, start_url, display: standalone) |
| Ícones (192x192, 512x512) | ✅ Placeholder criado |
| Página offline (`/offline`) | ✅ Implementada |
| Prompt de instalação (2+ visitas) | ✅ PWAInstallBanner |

### Loading states

| Rota | loading.tsx | Tipo |
|------|------------|------|
| `/dashboard` | ✅ | Skeleton cards + charts |
| `/transactions` | ✅ | Skeleton lista |
| `/chat` | ✅ | Skeleton mensagens + input |

---

## Targets para validação em produção (AC2)

| Métrica | Target | Classificação |
|---------|--------|---------------|
| Lighthouse Performance | >= 75 | Obrigatório (AC2) |
| LCP | < 2.5s | Obrigatório |
| CLS | < 0.1 | Obrigatório |
| INP | < 200ms | Referência |
| FCP | < 3.0s | Configurado no lhci |

---

## Como rodar Lighthouse manualmente

```bash
# Iniciar servidor de produção local
npm run build && npm run start

# Em outro terminal, rodar Lighthouse CI
npm run lighthouse
```

O script falha com exit code 1 se qualquer threshold do `lighthouserc.js` for violado.

---

## Notas

- Serwist desabilitado em desenvolvimento (`NODE_ENV === 'development'`)
- Service worker gerado em `public/sw.js` (gitignored) durante o build de produção
- Para instalar como PWA no Chrome Android: abrir o site → três pontos → "Adicionar à tela inicial"
