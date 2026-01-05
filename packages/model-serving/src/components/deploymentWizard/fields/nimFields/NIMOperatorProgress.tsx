import React from 'react';
import {
  Alert,
  AlertVariant,
  Spinner,
  Stack,
  StackItem,
  ProgressStep,
  ProgressStepper,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';

type OperatorStep = 'validating' | 'discovering' | 'fetching' | 'complete';

type NIMOperatorProgressProps = {
  currentStep: OperatorStep;
  error?: string;
};

export const NIMOperatorProgress: React.FC<NIMOperatorProgressProps> = ({ currentStep, error }) => {
  if (error) {
    return (
      <Alert
        variant={AlertVariant.danger}
        isInline
        title="Error fetching NIM models"
        data-testid="nim-operator-error"
      >
        {error}
      </Alert>
    );
  }

  const steps = [
    {
      id: 'validating',
      label: 'Validating API key',
      complete: ['discovering', 'fetching', 'complete'].includes(currentStep),
    },
    {
      id: 'discovering',
      label: 'Discovering models',
      complete: ['fetching', 'complete'].includes(currentStep),
    },
    {
      id: 'fetching',
      label: 'Fetching versions',
      complete: currentStep === 'complete',
    },
  ];

  return (
    <Alert
      variant={AlertVariant.info}
      isInline
      title="Preparing NVIDIA NIM models"
      data-testid="nim-operator-progress"
    >
      <Stack hasGutter>
        <StackItem>
          <p>This may take 1-2 minutes while we fetch available models from NVIDIA.</p>
        </StackItem>
        <StackItem>
          <ProgressStepper isVertical>
            {steps.map((step) => (
              <ProgressStep
                key={step.id}
                variant={step.complete ? 'success' : currentStep === step.id ? 'info' : 'pending'}
                id={step.id}
                titleId={`${step.id}-title`}
                aria-label={step.label}
                icon={
                  step.complete ? (
                    <CheckCircleIcon />
                  ) : currentStep === step.id ? (
                    <Spinner size="md" />
                  ) : undefined
                }
              >
                {step.label}
              </ProgressStep>
            ))}
          </ProgressStepper>
        </StackItem>
      </Stack>
    </Alert>
  );
};

// Hook to simulate operator progress
export const useNIMOperatorProgress = (
  apiKey: string,
  shouldStart: boolean,
): {
  currentStep: OperatorStep;
  modelsDiscovered: number;
  modelsFetched: number;
  totalModels: number;
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
} => {
  const [currentStep, setCurrentStep] = React.useState<OperatorStep>('validating');
  const [modelsDiscovered, setModelsDiscovered] = React.useState(0);
  const [modelsFetched, setModelsFetched] = React.useState(0);
  const [totalModels] = React.useState(47); // Mock value
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    // Only start if we have a valid-looking API key AND shouldStart is true
    const isValidFormat = apiKey && apiKey.startsWith('nvapi-') && apiKey.length > 10;
    if (!isValidFormat || !shouldStart) {
      return undefined;
    }

    // Prevent re-running if already processing
    if (isProcessing) {
      return undefined;
    }

    setIsProcessing(true);
    setError(undefined);
    setCurrentStep('validating');

    // Realistic timing for operator - total ~40 seconds
    const timer1 = setTimeout(() => {
      setCurrentStep('discovering');
    }, 3000); // Validating: 3s

    const timer2 = setTimeout(() => {
      setModelsDiscovered(totalModels);
      setCurrentStep('fetching');
    }, 8000); // Discovering: 5s (starts at 3s)

    // Simulate progressive fetching - slower, more realistic
    const fetchInterval = setInterval(() => {
      setModelsFetched((prev) => {
        if (prev >= totalModels) {
          clearInterval(fetchInterval);
          setCurrentStep('complete');
          return prev;
        }
        return prev + 2; // Fetch 2 at a time for smoother progress
      });
    }, 1200); // Every 1.2s (47 models / 2 per cycle * 1.2s ≈ 28s for fetching)

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(fetchInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, shouldStart, totalModels]); // Remove isProcessing from deps!

  return {
    currentStep,
    modelsDiscovered,
    modelsFetched,
    totalModels,
    isProcessing,
    isComplete: currentStep === 'complete',
    error,
  };
};
