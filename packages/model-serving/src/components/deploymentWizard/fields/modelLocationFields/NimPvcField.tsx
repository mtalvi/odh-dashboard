import React from 'react';
import {
  FormGroup,
  Radio,
  TextInput,
  Stack,
  StackItem,
  HelperText,
  HelperTextItem,
  Alert,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import usePvcs from '../../../../concepts/usePvcs';

type NimPvcFieldProps = {
  mode?: 'create-new' | 'use-existing';
  size?: string;
  existingPvcName?: string;
  onChange: (mode: 'create-new' | 'use-existing', size?: string, pvcName?: string) => void;
  disabled?: boolean;
  projectName?: string;
};

export const NimPvcField: React.FC<NimPvcFieldProps> = ({
  mode = 'create-new',
  size = '100Gi',
  existingPvcName = '',
  onChange,
  disabled = false,
  projectName,
}) => {
  const pvcResult = usePvcs(projectName);
  const { data: pvcs, loaded, error } = pvcResult;

  // Filter PVCs that could be compatible with NIM
  // (in the full implementation, this would check for opendatahub.io/managed label or nim-pvc-* naming)
  const compatiblePvcs = React.useMemo(() => {
    if (!loaded || !pvcs) {
      return [];
    }

    return pvcs.filter((pvc: PersistentVolumeClaimKind) => {
      const labels = pvc.metadata?.labels || {};
      const name = pvc.metadata?.name || '';
      
      // Check if it's a NIM PVC (by label or naming convention)
      return (
        labels['opendatahub.io/managed'] === 'true' ||
        name.startsWith('nim-pvc-') ||
        labels['app'] === 'nim'
      );
    });
  }, [pvcs, loaded]);

  const handleModeChange = (newMode: 'create-new' | 'use-existing') => {
    if (newMode === 'create-new') {
      onChange(newMode, size, undefined);
    } else {
      onChange(newMode, undefined, existingPvcName);
    }
  };

  const handleSizeChange = (newSize: string) => {
    onChange('create-new', newSize, undefined);
  };

  const handlePvcChange = (pvcName: string) => {
    onChange('use-existing', undefined, pvcName);
  };

  return (
    <FormGroup label="Model Storage (PVC)" isRequired fieldId="nim-pvc-config">
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="nim-pvc-create-new"
            name="nim-pvc-mode"
            label="Create new PVC"
            description="A new PersistentVolumeClaim will be created for this deployment"
            isChecked={mode === 'create-new'}
            onChange={() => handleModeChange('create-new')}
            isDisabled={disabled}
          />
          {mode === 'create-new' && (
            <div style={{ marginLeft: '28px', marginTop: '8px' }}>
              <FormGroup label="PVC Size" isRequired fieldId="nim-pvc-size">
                <TextInput
                  id="nim-pvc-size"
                  type="text"
                  value={size}
                  onChange={(_event, newValue) => handleSizeChange(newValue)}
                  placeholder="100Gi"
                  isDisabled={disabled}
                />
                <HelperText>
                  <HelperTextItem>
                    Recommended minimum: 100Gi. Larger models may require more storage.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            </div>
          )}
        </StackItem>

        <StackItem>
          <Radio
            id="nim-pvc-use-existing"
            name="nim-pvc-mode"
            label="Use existing PVC"
            description="Select an existing PVC from this project"
            isChecked={mode === 'use-existing'}
            onChange={() => handleModeChange('use-existing')}
            isDisabled={disabled || compatiblePvcs.length === 0}
          />
          {mode === 'use-existing' && (
            <div style={{ marginLeft: '28px', marginTop: '8px' }}>
              {error && (
                <Alert variant="danger" isInline title="Failed to load PVCs" style={{ marginBottom: '8px' }}>
                  {error.message}
                </Alert>
              )}
              {!loaded && <div>Loading PVCs...</div>}
              {loaded && compatiblePvcs.length === 0 && (
                <Alert variant="info" isInline title="No compatible PVCs found" style={{ marginBottom: '8px' }}>
                  No existing NIM-compatible PVCs were found in this project.
                </Alert>
              )}
              {loaded && compatiblePvcs.length > 0 && (
                <FormGroup label="Select PVC" isRequired fieldId="nim-existing-pvc">
                  <SimpleSelect
                    id="nim-existing-pvc-select"
                    options={compatiblePvcs.map((pvc: PersistentVolumeClaimKind) => ({
                      key: pvc.metadata?.name || '',
                      label: pvc.metadata?.name || '',
                    }))}
                    value={existingPvcName}
                    onChange={(value) => handlePvcChange(value)}
                    placeholder="Select a PVC"
                    isDisabled={disabled}
                  />
                  <HelperText>
                    <HelperTextItem>
                      Choose an existing PVC that was previously used for NIM deployments
                    </HelperTextItem>
                  </HelperText>
                </FormGroup>
              )}
            </div>
          )}
        </StackItem>
      </Stack>

      <HelperText>
        <HelperTextItem>
          NIM models require persistent storage for model caching and optimization. The PVC will be
          mounted to the deployment container.
        </HelperTextItem>
      </HelperText>
    </FormGroup>
  );
};
