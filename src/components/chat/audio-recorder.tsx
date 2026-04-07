'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_RECORDING_SECONDS = 120;

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type RecorderState = 'idle' | 'recording' | 'uploading';

export function AudioRecorder({ onTranscript, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecording = useCallback(async (chunks: Blob[], mimeType: string) => {
    setState('uploading');
    setError(null);

    const blob = new Blob(chunks, { type: mimeType });
    const file = new File([blob], 'audio.webm', { type: mimeType });
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/audio', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao transcrever áudio');
      } else {
        onTranscript(data.transcript as string);
      }
    } catch {
      setError('Erro de rede ao enviar áudio');
    } finally {
      setState('idle');
    }
  }, [onTranscript]);

  async function handleClick() {
    if (state === 'idle') {
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError('Permita acesso ao microfone nas configurações do browser');
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopRecording(chunksRef.current, mimeType);
      };

      recorder.start(250); // collect chunks every 250ms
      setState('recording');

      // Auto-stop at MAX_RECORDING_SECONDS
      timerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } else if (state === 'recording') {
      if (timerRef.current) clearTimeout(timerRef.current);
      mediaRecorderRef.current?.stop();
    }
  }

  const isRecording = state === 'recording';
  const isUploading = state === 'uploading';

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || isUploading}
        onClick={handleClick}
        aria-label={isRecording ? 'Parar gravação' : 'Gravar áudio'}
        className={isRecording ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-foreground'}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-5 w-5 animate-pulse" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {error && (
        <p className="ml-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
