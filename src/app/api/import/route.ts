import { createClient } from '@/lib/supabase/server';
import { parseOFX } from '@/lib/parsers/ofx-parser';
import { parseCSV } from '@/lib/parsers/csv-parser';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 2. Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const bankName = (formData.get('bank_name') as string) || 'Outro';

  if (!file) {
    return Response.json({ error: 'Arquivo obrigatório' }, { status: 400 });
  }

  // 3. Validate type
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['ofx', 'csv'].includes(ext)) {
    return Response.json(
      { error: 'Formato não suportado. Envie um arquivo .ofx ou .csv' },
      { status: 400 },
    );
  }

  // 4. Validate size
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: 'Arquivo muito grande. Máximo permitido: 5MB' },
      { status: 413 },
    );
  }

  // 5. Get or create bank_account
  const { data: existingAccount } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('bank_name', bankName)
    .maybeSingle();

  let bankAccountId: string;

  if (existingAccount) {
    bankAccountId = existingAccount.id;
  } else {
    const { data: newAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .insert({ user_id: user.id, bank_name: bankName })
      .select('id')
      .single();

    if (accountError || !newAccount) {
      console.error('Bank account creation error:', accountError);
      return Response.json({ error: 'Erro ao registrar conta bancária' }, { status: 500 });
    }
    bankAccountId = newAccount.id;
  }

  // 6. Create import record in DB FIRST (status = 'processing')
  // DB must succeed before uploading to Storage — avoids orphan files
  const importId = crypto.randomUUID();
  const storagePath = `imports/${user.id}/${importId}.${ext}`;

  const { error: importError } = await supabase.from('imports').insert({
    id: importId,
    user_id: user.id,
    bank_account_id: bankAccountId,
    file_name: file.name,
    file_type: ext as 'ofx' | 'csv',
    storage_path: storagePath,
    status: 'processing',
  });

  if (importError) {
    console.error('Import record error:', importError);
    return Response.json({ error: 'Erro ao registrar importação' }, { status: 500 });
  }

  // 7. Upload to Supabase Storage (only after DB record exists)
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('imports')
    .upload(storagePath, fileBuffer, { contentType: file.type || 'application/octet-stream' });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    await supabase
      .from('imports')
      .update({ status: 'failed', error_message: 'Erro ao fazer upload do arquivo' })
      .eq('id', importId);
    return Response.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
  }

  // 8. Parse file content
  const content = await file.text();
  let parsedTransactions;

  try {
    if (ext === 'ofx') {
      parsedTransactions = parseOFX(content);
    } else {
      parsedTransactions = parseCSV(content, bankName);
    }
  } catch (err) {
    console.error('Parse error:', err);
    await supabase
      .from('imports')
      .update({
        status: 'failed',
        error_message: 'Não foi possível processar este arquivo. Verifique se é um extrato bancário válido',
      })
      .eq('id', importId);

    return Response.json(
      { error: 'Não foi possível processar este arquivo. Verifique se é um extrato bancário válido' },
      { status: 422 },
    );
  }

  // 9. Dedup: check existing external_ids for this bank_account
  const { data: existingTxs } = await supabase
    .from('transactions')
    .select('external_id')
    .eq('user_id', user.id)
    .eq('bank_account_id', bankAccountId);

  const existingIds = new Set((existingTxs || []).map((t) => t.external_id));
  const newTransactions = parsedTransactions.filter((t) => !existingIds.has(t.external_id));
  const duplicatesSkipped = parsedTransactions.length - newTransactions.length;

  // 10. Insert new transactions
  if (newTransactions.length > 0) {
    const { error: insertError } = await supabase.from('transactions').insert(
      newTransactions.map((t) => ({
        user_id: user.id,
        bank_account_id: bankAccountId,
        import_id: importId,
        external_id: t.external_id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: 'outros',
        category_source: 'pending' as const,
      })),
    );

    if (insertError) {
      console.error('Transactions insert error:', insertError);
      await supabase
        .from('imports')
        .update({ status: 'failed', error_message: 'Erro ao salvar transações' })
        .eq('id', importId);

      return Response.json({ error: 'Erro ao salvar transações' }, { status: 500 });
    }
  }

  // 11. Update import status to 'categorizing'
  await supabase
    .from('imports')
    .update({
      status: 'categorizing',
      transaction_count: newTransactions.length,
      duplicates_skipped: duplicatesSkipped,
    })
    .eq('id', importId);

  // 12. Update bank_account last_import_at
  await supabase
    .from('bank_accounts')
    .update({ last_import_at: new Date().toISOString() })
    .eq('id', bankAccountId);

  // 13. Invoke Edge Function async (non-blocking)
  supabase.functions
    .invoke('categorize-import', {
      body: { importId, userId: user.id },
    })
    .catch((err: unknown) => {
      console.error('Failed to invoke categorize-import:', err);
    });

  return Response.json({
    importId,
    transactionCount: newTransactions.length,
    duplicatesSkipped,
    status: 'categorizing',
  });
}
