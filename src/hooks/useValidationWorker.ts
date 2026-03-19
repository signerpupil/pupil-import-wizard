import { useCallback, useEffect, useRef, useState } from 'react';
import type { ValidationError, ImportRow, ColumnDefinition, FormatRule, BusinessRule } from '@/types/importTypes';

interface WorkerResult {
  type: string;
  payload: unknown;
}

export function useValidationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingCallbacks = useRef<Map<string, (result: unknown) => void>>(new Map());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/validationWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerResult>) => {
      const { type, payload } = event.data;
      
      if (type === 'error') {
        setError((payload as { message: string }).message);
        setIsProcessing(false);
        return;
      }

      const callbackType = type.replace('-result', '');
      const callback = pendingCallbacks.current.get(callbackType);
      
      if (callback) {
        callback(payload);
        pendingCallbacks.current.delete(callbackType);
      }
      
      if (pendingCallbacks.current.size === 0) {
        setIsProcessing(false);
      }
    };

    workerRef.current.onerror = (e) => {
      setError(e.message);
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const validate = useCallback((
    data: ImportRow[],
    columns: ColumnDefinition[],
    formatRules: FormatRule[],
    businessRules: BusinessRule[]
  ): Promise<{ errors: ValidationError[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setIsProcessing(true);
      setError(null);

      pendingCallbacks.current.set('validate', (result) => {
        resolve(result as { errors: ValidationError[] });
      });

      workerRef.current.postMessage({
        type: 'validate',
        payload: { data, columns, formatRules, businessRules }
      });
    });
  }, []);

  return {
    validate,
    isProcessing,
    error,
  };
}
