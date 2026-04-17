import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn().mockResolvedValue({ id: 'email-id-123' });
const mockResendInstance = { emails: { send: mockSend } };

vi.mock('resend', () => ({
  Resend: function Resend() {
    return mockResendInstance;
  },
}));

import { sendMonthlyReportEmail } from '@/lib/email/send-monthly-report';

describe('sendMonthlyReportEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  it('calls send with correct recipient', async () => {
    const pdfBuffer = Buffer.from('fake-pdf-content');
    await sendMonthlyReportEmail('user@example.com', 'João Silva', 'Março 2024', '2024-03', pdfBuffer);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('subject contains the month label', async () => {
    await sendMonthlyReportEmail('a@b.com', 'Test', 'Março 2024', '2024-03', Buffer.from('pdf'));
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.subject).toContain('Março 2024');
  });

  it('subject contains user name', async () => {
    await sendMonthlyReportEmail('a@b.com', 'Maria Santos', 'Janeiro 2024', '2024-01', Buffer.from('pdf'));
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.subject).toContain('Maria Santos');
  });

  it('sends from the Finansim address', async () => {
    await sendMonthlyReportEmail('a@b.com', 'Test', 'Abril 2024', '2024-04', Buffer.from('pdf'));
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.from).toContain('finansim.com.br');
  });

  it('attaches PDF with correct filename', async () => {
    const pdfBuffer = Buffer.from('pdf-data');
    await sendMonthlyReportEmail('a@b.com', 'Test', 'Março 2024', '2024-03', pdfBuffer);
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'relatorio-finansim-2024-03.pdf',
          content: pdfBuffer,
        }),
      ]),
    );
  });

  it('includes opt-out instructions in HTML', async () => {
    await sendMonthlyReportEmail('a@b.com', 'Test', 'Fevereiro 2024', '2024-02', Buffer.from('pdf'));
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain('Configurações');
  });

  it('propagates Resend errors', async () => {
    mockSend.mockRejectedValueOnce(new Error('Resend API error'));
    await expect(
      sendMonthlyReportEmail('a@b.com', 'Test', 'Março 2024', '2024-03', Buffer.from('pdf')),
    ).rejects.toThrow('Resend API error');
  });
});
