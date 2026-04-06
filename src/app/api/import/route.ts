import { createClient } from '@/lib/supabase/server';
import { parseOFX } from '@/lib/parsers/ofx-parser';
import { parseCSV } from '@/lib/parsers/csv-parser';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  // ── Etapa 1: Validação de auth ──────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('[import] Etapa 1 auth error:', authError);
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!user) {
    console.warn('[import] Etapa 1: user not found');
    return Response.json({ error: 'Não autorizado' }, { status: 401 });
  }
  console.log('[import] Etapa 1 OK — userId:', user.id);

  // ── Etapa 2: Validação do arquivo ───────────────────────────
  let file: File;
  let bankName: string;
  let ext: string;
  try {
    const formData = await request.formData();
    const rawFile = formData.get('file');
    bankName = (formData.get('bank_name') as string) || 'Outro';

    if (!rawFile || !(rawFile instanceof File)) {
      return Response.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }
    file = rawFile;
    ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!['ofx', 'csv'].includes(ext)) {
      return Response.json(
        { error: 'Formato não suportado. Envie um arquivo .ofx ou .csv' },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: 'Arquivo muito grande. Máximo permitido: 5MB' },
        { status: 413 },
      );
    }
    console.log('[import] Etapa 2 OK — file:', file.name, 'size:', file.size, 'ext:', ext, 'bank:', bankName);
  } catch (err) {
    console.error('[import] Etapa 2 EXCEPTION:', err);
    return Response.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  // ── Get or create bank_account ──────────────────────────────
  let bankAccountId: string;
  try {
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('bank_name', bankName)
      .maybeSingle();

    if (existingAccount) {
      bankAccountId = existingAccount.id;
    } else {
      const { data: newAccount, error: accountError } = await supabase
        .from('bank_accounts')
        .insert({ user_id: user.id, bank_name: bankName })
        .select('id')
        .single();

      if (accountError || !newAccount) {
        console.error('[import] bank_account creation error:', accountError);
        return Response.json({ error: 'Erro ao registrar conta bancária' }, { status: 500 });
      }
      bankAccountId = newAccount.id;
    }
    console.log('[import] bank_account OK — id:', bankAccountId);
  } catch (err) {
    console.error('[import] bank_account EXCEPTION:', err);
    return Response.json({ error: 'Erro ao registrar conta bancária' }, { status: 500 });
  }

  // ── Etapa 4: Criação do import record ───────────────────────
  // IMPORTANTE: DB record criado ANTES do upload para evitar arquivos órfãos
  const importId = crypto.randomUUID();
  // FIX: path dentro do bucket começa com userId (sem prefixo 'imports/')
  // RLS policy: (storage.foldername(name))[1] = auth.uid()::text
  // path 'imports/{userId}/...' faria foldername[1] = 'imports' (falha!)
  // path '{userId}/...' faz foldername[1] = userId (passa)
  const storagePath = `${user.id}/${importId}.${ext}`;

  try {
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
      console.error('[import] Etapa 4 import record error:', JSON.stringify(importError));
      return Response.json({ error: 'Erro ao registrar importação' }, { status: 500 });
    }
    console.log('[import] Etapa 4 OK — importId:', importId, 'storagePath:', storagePath);
  } catch (err) {
    console.error('[import] Etapa 4 EXCEPTION:', err);
    return Response.json({ error: 'Erro ao registrar importação' }, { status: 500 });
  }

  // ── Etapa 3: Upload para Supabase Storage ───────────────────
  try {
    const fileBuffer = await file.arrayBuffer();
    const contentType = file.type || (ext === 'ofx' ? 'application/x-ofx' : 'text/csv');
    console.log('[import] Etapa 3 uploading — path:', storagePath, 'contentType:', contentType);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('imports')
      .upload(storagePath, fileBuffer, { contentType });

    if (uploadError) {
      console.error('[import] Etapa 3 upload error:', JSON.stringify(uploadError));
      await supabase
        .from('imports')
        .update({ status: 'failed', error_message: 'Erro ao fazer upload do arquivo' })
        .eq('id', importId);
      return Response.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
    }
    console.log('[import] Etapa 3 OK — uploaded:', uploadData.path);
  } catch (err) {
    console.error('[import] Etapa 3 EXCEPTION:', err);
    await supabase
      .from('imports')
      .update({ status: 'failed', error_message: 'Erro ao fazer upload do arquivo' })
      .eq('id', importId);
    return Response.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
  }

  // ── Etapa 5: Parse do arquivo ────────────────────────────────
  let parsedTransactions: ReturnType<typeof parseOFX>;
  try {
    const content = await file.text();
    console.log('[import] Etapa 5 parsing', ext.toUpperCase(), '— content length:', content.length);

    if (ext === 'ofx') {
      parsedTransactions = parseOFX(content);
    } else {
      parsedTransactions = parseCSV(content, bankName);
    }
    console.log('[import] Etapa 5 OK — parsed', parsedTransactions.length, 'transactions');
  } catch (err) {
    console.error('[import] Etapa 5 parse error:', err);
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

  // ── Etapa 6: Dedup e insert das transações ──────────────────
  let newTransactions: typeof parsedTransactions;
  let duplicatesSkipped: number;
  try {
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('external_id')
      .eq('user_id', user.id)
      .eq('bank_account_id', bankAccountId);

    const existingIds = new Set((existingTxs || []).map((t) => t.external_id));
    newTransactions = parsedTransactions.filter((t) => !existingIds.has(t.external_id));
    duplicatesSkipped = parsedTransactions.length - newTransactions.length;
    console.log('[import] Etapa 6 dedup — new:', newTransactions.length, 'dupes:', duplicatesSkipped);

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
        console.error('[import] Etapa 6 insert error:', JSON.stringify(insertError));
        await supabase
          .from('imports')
          .update({ status: 'failed', error_message: 'Erro ao salvar transações' })
          .eq('id', importId);
        return Response.json({ error: 'Erro ao salvar transações' }, { status: 500 });
      }
      console.log('[import] Etapa 6 OK — inserted', newTransactions.length, 'transactions');
    }
  } catch (err) {
    console.error('[import] Etapa 6 EXCEPTION:', err);
    await supabase
      .from('imports')
      .update({ status: 'failed', error_message: 'Erro ao salvar transações' })
      .eq('id', importId);
    return Response.json({ error: 'Erro ao salvar transações' }, { status: 500 });
  }

  // Update import status + bank_account last_import_at
  await supabase
    .from('imports')
    .update({
      status: 'categorizing',
      transaction_count: newTransactions.length,
      duplicates_skipped: duplicatesSkipped,
    })
    .eq('id', importId);

  await supabase
    .from('bank_accounts')
    .update({ last_import_at: new Date().toISOString() })
    .eq('id', bankAccountId);

  // ── Etapa 7: Invoke Edge Function (fire-and-forget) ─────────
  console.log('[import] Etapa 7 invoking categorize-import — importId:', importId);
  supabase.functions
    .invoke('categorize-import', {
      body: { importId, userId: user.id },
    })
    .catch((err: unknown) => {
      console.error('[import] Etapa 7 Edge Function invoke failed:', err);
    });

  return Response.json({
    importId,
    transactionCount: newTransactions.length,
    duplicatesSkipped,
    status: 'categorizing',
  });
}
