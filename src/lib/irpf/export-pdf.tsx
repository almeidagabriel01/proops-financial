import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { IRPF_FICHA, getEducationLimit, type IrpfCategory } from './category-mapping';
import type { IrpfTransaction } from './export-csv';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, borderBottom: '1pt solid #ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', paddingVertical: 4, borderBottom: '0.5pt solid #eee' },
  headerRow: { flexDirection: 'row', paddingVertical: 4, backgroundColor: '#f5f5f5', fontWeight: 'bold' },
  col1: { width: '18%' },
  col2: { width: '40%' },
  col3: { width: '22%' },
  col4: { width: '20%', textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  totalLabel: { fontWeight: 'bold', marginRight: 8 },
  totalValue: { fontWeight: 'bold' },
  disclaimer: { marginTop: 30, fontSize: 8, color: '#888', borderTop: '0.5pt solid #ddd', paddingTop: 8 },
  warning: { backgroundColor: '#fff8e1', padding: 8, marginTop: 8, borderRadius: 4 },
  warningText: { fontSize: 9, color: '#7b5800' },
});

function fmt(amount: number) {
  return `R$ ${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function Section({ category, transactions, year }: { category: IrpfCategory; transactions: IrpfTransaction[]; year: number }) {
  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const limit = category === 'educacao' ? getEducationLimit(year) : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{IRPF_FICHA[category]}</Text>
      <View style={styles.headerRow}>
        <Text style={styles.col1}>Data</Text>
        <Text style={styles.col2}>Descrição</Text>
        <Text style={styles.col3}>Categoria</Text>
        <Text style={styles.col4}>Valor</Text>
      </View>
      {transactions.map((t, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.col1}>{new Date(t.date).toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.col2}>{t.description}</Text>
          <Text style={styles.col3}>{category}</Text>
          <Text style={styles.col4}>{fmt(t.amount)}</Text>
        </View>
      ))}
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>{fmt(total)}</Text>
      </View>
      {limit !== null && total > limit && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠ Limite dedutível de instrução para {year}: R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dependente.
            O valor excedente (R$ {(total - limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) não é dedutível.
          </Text>
        </View>
      )}
    </View>
  );
}

interface PdfData {
  year: number;
  userName: string;
  saude: IrpfTransaction[];
  educacao: IrpfTransaction[];
}

function IrpfDocument({ data }: { data: PdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório IRPF {data.year}</Text>
        <Text style={styles.subtitle}>
          {data.userName} — gerado em {new Date().toLocaleDateString('pt-BR')} via Finansim
        </Text>
        {data.saude.length > 0 && <Section category="saude" transactions={data.saude} year={data.year} />}
        {data.educacao.length > 0 && <Section category="educacao" transactions={data.educacao} year={data.year} />}
        <Text style={styles.disclaimer}>
          Este relatório é gerado com base nas transações categorizadas no Finansim e tem finalidade informativa.
          Consulte um contador para confirmar os valores antes de preencher sua declaração.
          Finansim não possui vínculo com a Receita Federal do Brasil.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateIrpfPdf(data: PdfData): Promise<Buffer> {
  return renderToBuffer(<IrpfDocument data={data} />);
}
