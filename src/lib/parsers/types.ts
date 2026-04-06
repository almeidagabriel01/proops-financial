export interface ParsedTransaction {
  external_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

export interface FetchParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface DataSource {
  type: 'file' | 'open_finance';
  fetchTransactions(params: FetchParams): Promise<ParsedTransaction[]>;
}
