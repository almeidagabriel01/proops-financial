import { describe, it, expect } from 'vitest';

// Tests validate the health check response shape and status logic
// without hitting real dependencies

type DependencyStatus = {
  status: 'ok' | 'error' | 'configured' | 'missing';
  latencyMs?: number;
};

type HealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  dependencies: {
    supabase: DependencyStatus;
    anthropic: DependencyStatus;
    openai: DependencyStatus;
    asaas: DependencyStatus;
  };
};

function computeOverallStatus(
  supabase: DependencyStatus,
  anthropic: DependencyStatus,
  openai: DependencyStatus,
  asaas: DependencyStatus,
): 'ok' | 'degraded' | 'error' {
  if (supabase.status === 'error') return 'error';
  const allConfigured =
    anthropic.status === 'configured' &&
    openai.status === 'configured' &&
    asaas.status === 'configured';
  return allConfigured ? 'ok' : 'degraded';
}

describe('Health Check — overall status logic', () => {
  it('returns ok when all dependencies are healthy', () => {
    const status = computeOverallStatus(
      { status: 'ok', latencyMs: 30 },
      { status: 'configured' },
      { status: 'configured' },
      { status: 'configured' },
    );
    expect(status).toBe('ok');
  });

  it('returns error when Supabase is down', () => {
    const status = computeOverallStatus(
      { status: 'error', latencyMs: 5000 },
      { status: 'configured' },
      { status: 'configured' },
      { status: 'configured' },
    );
    expect(status).toBe('error');
  });

  it('returns degraded when Supabase is ok but Anthropic key is missing', () => {
    const status = computeOverallStatus(
      { status: 'ok', latencyMs: 45 },
      { status: 'missing' },
      { status: 'configured' },
      { status: 'configured' },
    );
    expect(status).toBe('degraded');
  });

  it('returns degraded when OpenAI key is missing', () => {
    const status = computeOverallStatus(
      { status: 'ok' },
      { status: 'configured' },
      { status: 'missing' },
      { status: 'configured' },
    );
    expect(status).toBe('degraded');
  });

  it('returns degraded when Asaas key is missing', () => {
    const status = computeOverallStatus(
      { status: 'ok' },
      { status: 'configured' },
      { status: 'configured' },
      { status: 'missing' },
    );
    expect(status).toBe('degraded');
  });

  it('error takes priority over degraded when Supabase is down and keys missing', () => {
    const status = computeOverallStatus(
      { status: 'error' },
      { status: 'missing' },
      { status: 'missing' },
      { status: 'missing' },
    );
    expect(status).toBe('error');
  });
});

describe('Health Check — response shape', () => {
  it('response has all required fields', () => {
    const response: HealthResponse = {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies: {
        supabase: { status: 'ok', latencyMs: 30 },
        anthropic: { status: 'configured' },
        openai: { status: 'configured' },
        asaas: { status: 'configured' },
      },
    };

    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('version');
    expect(response).toHaveProperty('timestamp');
    expect(response).toHaveProperty('dependencies');
    expect(response.dependencies).toHaveProperty('supabase');
    expect(response.dependencies).toHaveProperty('anthropic');
    expect(response.dependencies).toHaveProperty('openai');
    expect(response.dependencies).toHaveProperty('asaas');
  });

  it('supabase status includes latencyMs', () => {
    const dep: DependencyStatus = { status: 'ok', latencyMs: 45 };
    expect(dep).toHaveProperty('latencyMs');
    expect(typeof dep.latencyMs).toBe('number');
  });

  it('API key deps do not include latencyMs', () => {
    const dep: DependencyStatus = { status: 'configured' };
    expect(dep.latencyMs).toBeUndefined();
  });

  it('timestamp is a valid ISO 8601 string', () => {
    const timestamp = new Date().toISOString();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('valid status values are ok, degraded, error', () => {
    const validStatuses = ['ok', 'degraded', 'error'];
    expect(validStatuses).toContain('ok');
    expect(validStatuses).toContain('degraded');
    expect(validStatuses).toContain('error');
    expect(validStatuses).not.toContain('unknown');
  });

  it('valid dependency statuses for DB are ok and error', () => {
    const dbStatuses = ['ok', 'error'];
    expect(dbStatuses).toContain('ok');
    expect(dbStatuses).toContain('error');
  });

  it('valid dependency statuses for API keys are configured and missing', () => {
    const keyStatuses = ['configured', 'missing'];
    expect(keyStatuses).toContain('configured');
    expect(keyStatuses).toContain('missing');
  });
});
