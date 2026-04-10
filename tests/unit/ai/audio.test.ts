import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before vi.mock factories run
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Mock Supabase — createClient used by the audio route
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// ---------------------------------------------------------------------------
// Mock Groq SDK — default export is a class constructor
// ---------------------------------------------------------------------------
vi.mock('groq-sdk', () => {
  function MockGroq() {
    return {
      audio: {
        transcriptions: {
          create: mockCreate,
        },
      },
    };
  }
  return { default: MockGroq };
});

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
const { POST } = await import('@/app/api/audio/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(file: File | null): Request {
  const form = new FormData();
  if (file) form.append('file', file);
  return {
    formData: vi.fn().mockResolvedValue(form),
  } as unknown as Request;
}

function makePro() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { plan: 'pro', trial_ends_at: null, audio_enabled: true },
          error: null,
        }),
      }),
    }),
  });
}

function makeBasic() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { plan: 'basic', trial_ends_at: null, audio_enabled: false },
          error: null,
        }),
      }),
    }),
  });
}

function makeWebmFile(sizeBytes = 1000) {
  return new File([new Uint8Array(sizeBytes)], 'audio.webm', { type: 'audio/webm' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/api/audio stub mode', () => {
  beforeEach(() => {
    vi.stubEnv('GROQ_API_KEY', '');
    mockCreate.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retorna transcrição de demonstração quando GROQ_API_KEY não configurada', async () => {
    makePro();
    const req = makeRequest(makeWebmFile());

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transcript).toContain('demonstração');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('/api/audio validação', () => {
  beforeEach(() => {
    vi.stubEnv('GROQ_API_KEY', 'gsk-test');
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retorna 403 para usuário Basic', async () => {
    makeBasic();
    const req = makeRequest(makeWebmFile());

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('audio_pro_only');
  });

  it('Pro com audio_enabled=false ainda tem acesso (plano é fonte de verdade)', async () => {
    // M4 fix: audio_enabled is a cached hint; plan/trial is the source of truth.
    // A Pro subscriber with a stale audio_enabled=false must not be locked out.
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { plan: 'pro', trial_ends_at: null, audio_enabled: false },
            error: null,
          }),
        }),
      }),
    });
    mockCreate.mockResolvedValue({ text: 'teste' });
    const req = makeRequest(makeWebmFile());

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('retorna 401 quando não autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest(makeWebmFile());

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando nenhum arquivo enviado', async () => {
    makePro();
    const req = makeRequest(null);

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('retorna 400 para arquivo maior que 25MB', async () => {
    makePro();
    const bigFile = new File([new Uint8Array(26 * 1024 * 1024)], 'audio.webm', {
      type: 'audio/webm',
    });
    const req = makeRequest(bigFile);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('25MB');
  });

  it('retorna 400 para formato não suportado', async () => {
    makePro();
    const invalidFile = new File([new Uint8Array(100)], 'audio.flac', { type: 'audio/flac' });
    const req = makeRequest(invalidFile);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Formato não suportado');
  });

  it('chama Whisper e retorna transcript para Pro com GROQ_API_KEY', async () => {
    makePro();
    mockCreate.mockResolvedValue({ text: 'Quanto gastei esse mês?' });

    const req = makeRequest(makeWebmFile());
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transcript).toBe('Quanto gastei esse mês?');
    expect(mockCreate).toHaveBeenCalledOnce();
  });
});
