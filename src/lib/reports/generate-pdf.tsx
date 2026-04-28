import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import type { ReportData } from './collect-report-data';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
  header: { marginBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#334155', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#64748b' },
  value: { fontFamily: 'Helvetica-Bold' },
  valueGreen: { fontFamily: 'Helvetica-Bold', color: '#16a34a' },
  valueRed: { fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  scoreNumber: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 },
  footerText: { fontSize: 8, color: '#94a3b8', textAlign: 'center' },
});

const BADGE_LABELS: Record<string, string> = {
  critico: 'Crítico',
  regular: 'Regular',
  bom: 'Bom',
  excelente: 'Excelente',
};

function formatBRL(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${formatted}`;
}

function delta(current: number, prev: number): string {
  if (prev === 0) return '';
  const pct = Math.round(((current - prev) / prev) * 100);
  return pct >= 0 ? `↑${pct}%` : `↓${Math.abs(pct)}%`;
}

function MonthlyReportDocument({ data }: { data: ReportData }) {
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>Seu relatório financeiro — {data.monthLabel}</Text>
          <Text style={styles.subtitle}>Olá, {data.userName}! Aqui está seu resumo de {data.monthLabel}.</Text>
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do mês</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Receitas</Text>
            <Text style={styles.valueGreen}>{formatBRL(data.income)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Despesas</Text>
            <Text style={styles.valueRed}>{formatBRL(data.expenses)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Saldo</Text>
            <Text style={data.balance >= 0 ? styles.valueGreen : styles.valueRed}>{formatBRL(data.balance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Taxa de poupança</Text>
            <Text style={styles.value}>{data.savingsRate}%</Text>
          </View>
        </View>

        {/* Score de saúde */}
        {data.score !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Score de saúde financeira</Text>
            <View style={styles.scoreLine}>
              <Text style={styles.scoreNumber}>{data.score}</Text>
              <Text style={styles.value}>{data.scoreBadge ? BADGE_LABELS[data.scoreBadge] : ''}</Text>
            </View>
          </View>
        )}

        {/* Top 5 categorias */}
        {data.topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 5 categorias de gasto</Text>
            {data.topCategories.map((cat) => (
              <View key={cat.category} style={styles.row}>
                <Text style={styles.label}>{cat.category}</Text>
                <Text style={styles.value}>{formatBRL(cat.total)} ({cat.percentage}%)</Text>
              </View>
            ))}
          </View>
        )}

        {/* Comparativo mês anterior */}
        {data.prevMonth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comparativo com mês anterior</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Receitas</Text>
              <Text style={styles.value}>{formatBRL(data.income)} {delta(data.income, data.prevMonth.income)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Despesas</Text>
              <Text style={styles.value}>{formatBRL(data.expenses)} {delta(data.expenses, data.prevMonth.expenses)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Saldo</Text>
              <Text style={styles.value}>{formatBRL(data.balance)} {delta(data.balance, data.prevMonth.balance)}</Text>
            </View>
          </View>
        )}

        {/* Orçamentos */}
        {data.budgets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Orçamentos</Text>
            {data.budgets.map((b) => (
              <View key={b.name} style={styles.row}>
                <Text style={styles.label}>{b.name}</Text>
                <Text style={b.compliant ? styles.valueGreen : styles.valueRed}>
                  {formatBRL(b.spent)} / {formatBRL(b.limit)} {b.compliant ? '✓' : '✗'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Metas */}
        {data.goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metas ativas</Text>
            {data.goals.map((g) => (
              <View key={g.name} style={styles.row}>
                <Text style={styles.label}>{g.name}</Text>
                <Text style={styles.value}>{g.progressPct}% — {formatBRL(g.currentAmount)} / {formatBRL(g.targetAmount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Gerado pelo Finansim em {today}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateMonthlyReportPDF(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<MonthlyReportDocument data={data} />);
}
