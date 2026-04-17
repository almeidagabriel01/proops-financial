'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IRPF_FICHA, getEducationLimit } from '@/lib/irpf/category-mapping';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

interface CategoryData {
  ficha: string;
  total: number;
  limit: number | null;
  transactions: Transaction[];
}

interface IrpfData {
  year: number;
  saude: CategoryData;
  educacao: CategoryData;
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function CategorySection({ category, data, year }: { category: 'saude' | 'educacao'; data: CategoryData; year: number }) {
  const limit = category === 'educacao' ? getEducationLimit(year) : null;
  const exceeded = limit !== null && data.total > limit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{IRPF_FICHA[category]}</CardTitle>
          <Badge variant={exceeded ? 'destructive' : 'secondary'} className="text-sm font-semibold">
            {fmt(data.total)}
          </Badge>
        </div>
        {limit !== null && (
          <p className="text-xs text-muted-foreground">
            Limite dedutível {year}: {fmt(limit)}/dependente
            {exceeded && (
              <span className="ml-1 text-destructive font-medium">
                — excedente {fmt(data.total - limit)} não dedutível
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {data.transactions.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-medium text-foreground">
                  {fmt(Math.abs(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IrpfPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [data, setData] = useState<IrpfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - 1 - i);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/irpf?year=${year}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [year]);

  const isEmpty =
    !loading &&
    data &&
    data.saude.transactions.length === 0 &&
    data.educacao.transactions.length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-28">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/more">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground lg:text-2xl">Declaração de IR</h1>
            <p className="text-xs text-muted-foreground">Despesas dedutíveis no IRPF</p>
          </div>
        </div>

        {/* Ano + Exportar */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Select value={String(year)} onValueChange={(v) => { if (v) setYear(parseInt(v, 10)); }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(`/api/irpf/export?year=${year}&format=csv`)}
              disabled={loading || isEmpty === true}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(`/api/irpf/export?year=${year}&format=pdf`)}
              disabled={loading || isEmpty === true}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* Estado de carregamento */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Estado vazio */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhuma despesa dedutível em {year}</p>
            <p className="text-xs text-muted-foreground">
              Transações categorizadas como Saúde ou Educação aparecem aqui.
            </p>
            <Link href="/transactions?category=saude" className="text-xs text-primary underline-offset-2 hover:underline">
              Ver transações de Saúde
            </Link>
          </div>
        )}

        {/* Seções por categoria */}
        {!loading && !error && data && !isEmpty && (
          <div className="space-y-4">
            {data.saude.transactions.length > 0 && (
              <CategorySection category="saude" data={data.saude} year={year} />
            )}
            {data.educacao.transactions.length > 0 && (
              <CategorySection category="educacao" data={data.educacao} year={year} />
            )}
          </div>
        )}

        {/* Aviso legal */}
        {!loading && !isEmpty && (
          <div className="mt-6 flex gap-2 rounded-xl bg-muted p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Este relatório é gerado com base nas transações categorizadas no Finansim e tem finalidade
              informativa. Consulte um contador para confirmar os valores antes de preencher sua declaração.
              Finansim não possui vínculo com a Receita Federal do Brasil.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
