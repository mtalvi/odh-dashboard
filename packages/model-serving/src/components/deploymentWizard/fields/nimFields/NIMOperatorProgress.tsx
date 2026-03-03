import React from 'react';
import { Alert, AlertVariant, Spinner } from '@patternfly/react-core';

type NIMKeyValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

type NIMKeyValidationStatusProps = {
  status: NIMKeyValidationStatus;
  error?: string;
};

export const NIMKeyValidationAlert: React.FC<NIMKeyValidationStatusProps> = ({ status, error }) => {
  if (status === 'validating') {
    return (
      <Alert
        variant={AlertVariant.info}
        isInline
        title="Validating API key..."
        customIcon={<Spinner size="md" />}
        data-testid="nim-key-validating"
      />
    );
  }

  if (status === 'valid') {
    return (
      <Alert
        variant={AlertVariant.success}
        isInline
        title="API key validated successfully"
        data-testid="nim-key-valid"
      />
    );
  }

  if (status === 'invalid') {
    return (
      <Alert
        variant={AlertVariant.danger}
        isInline
        title="API key validation failed"
        data-testid="nim-key-invalid"
      >
        {error}
      </Alert>
    );
  }

  return null;
};

/**
 * Mock hook simulating a direct call to NVIDIA's validation endpoint
 * (POST https://api.ngc.nvidia.com/v3/keys/get-caller-info).
 *
 * In the real implementation this would go through a backend proxy;
 * here we just check the key prefix for demo purposes.
 */
export const useNIMKeyValidation = (
  apiKey: string,
  shouldValidate: boolean,
): {
  status: NIMKeyValidationStatus;
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
} => {
  const [status, setStatus] = React.useState<NIMKeyValidationStatus>('idle');
  const [error, setError] = React.useState<string | undefined>();
  const validatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!shouldValidate) {
      validatingRef.current = false;
      setStatus('idle');
      setError(undefined);
      return undefined;
    }

    if (!apiKey || validatingRef.current) {
      return undefined;
    }

    validatingRef.current = true;
    setStatus('validating');
    setError(undefined);

    const delay = apiKey.startsWith('nvapi-') && apiKey.length > 10 ? 12000 : 6000;

    const timer = setTimeout(() => {
      if (apiKey.startsWith('nvapi-') && apiKey.length > 10) {
        setStatus('valid');
      } else {
        setStatus('invalid');
        setError(
          'API key validation failed. Ensure you are using a valid personal NVIDIA API key (starts with "nvapi-").',
        );
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [apiKey, shouldValidate]);

  return {
    status,
    isProcessing: status === 'validating',
    isComplete: status === 'valid',
    error,
  };
};
