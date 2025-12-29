import React from 'react';
import { FormGroup, Radio, Stack, StackItem, Alert } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';

type NIMPVCSelectorProps = {
  pvcMode: 'create-new' | 'use-existing';
  setPvcMode: (mode: 'create-new' | 'use-existing') => void;
  existingPvcName?: string;
  setExistingPvcName: (name: string) => void;
  selectedModel?: string;
  pvcs?: PersistentVolumeClaimKind[];
};

/**
 * Component for selecting PVC mode and choosing existing PVCs
 * Filters PVCs by compatibility with NIM (large enough, RWO/RWX access mode)
 */
export const NIMPVCSelector: React.FC<NIMPVCSelectorProps> = ({
  pvcMode,
  setPvcMode,
  existingPvcName,
  setExistingPvcName,
  selectedModel,
  pvcs = [],
}) => {
  // Filter PVCs that are suitable for NIM
  // NIM PVCs should have:
  // - Label indicating NIM usage (optional, for previously created NIM PVCs)
  // - Sufficient storage (at least 50Gi typically)
  // - RWO or RWX access mode
  const compatiblePVCs = React.useMemo(() => {
    return pvcs.filter((pvc) => {
      const labels = pvc.metadata.labels || {};
      const size = pvc.spec.resources.requests.storage || '';

      // Check if it's a NIM PVC or large enough to be used as one
      const isNIMPVC = labels['opendatahub.io/nim-model-cache'] === 'true';
      const sizeValue = parseInt(size, 10);
      const sizeUnit = size.replace(/[0-9]/g, '');
      const isLargeEnough =
        (sizeUnit === 'Gi' && sizeValue >= 50) || (sizeUnit === 'Ti' && sizeValue >= 1);

      return isNIMPVC || isLargeEnough;
    });
  }, [pvcs]);

  return (
    <FormGroup label="Storage option">
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="nim-pvc-create-new"
            name="nim-pvc-mode"
            label="Create new storage for model caching"
            description="A new storage volume will be created and models will be downloaded at deployment time"
            isChecked={pvcMode === 'create-new'}
            onChange={() => setPvcMode('create-new')}
          />
        </StackItem>

        <StackItem>
          <Radio
            id="nim-pvc-use-existing"
            name="nim-pvc-mode"
            label="Use existing storage with pre-cached models"
            description="Reuse a storage volume that already contains the selected model for faster deployment"
            isChecked={pvcMode === 'use-existing'}
            onChange={() => setPvcMode('use-existing')}
            body={
              pvcMode === 'use-existing' && (
                <Stack hasGutter style={{ marginTop: '1rem' }}>
                  {compatiblePVCs.length === 0 && selectedModel && (
                    <StackItem>
                      <Alert variant="warning" title="No compatible storage found" isInline>
                        No existing storage volumes were found that contain the model{' '}
                        <strong>{selectedModel}</strong>. You can create new storage instead.
                      </Alert>
                    </StackItem>
                  )}

                  {!selectedModel && (
                    <StackItem>
                      <Alert variant="info" title="Select a model first" isInline>
                        Please select a NIM model above to see compatible storage volumes.
                      </Alert>
                    </StackItem>
                  )}

                  {compatiblePVCs.length > 0 && (
                    <StackItem>
                      <FormGroup
                        label="Existing storage name"
                        isRequired
                        fieldId="nim-existing-pvc"
                      >
                        <TypeaheadSelect
                          id="nim-existing-pvc-select"
                          selectOptions={compatiblePVCs.map(
                            (pvc): TypeaheadSelectOption => ({
                              value: pvc.metadata.name,
                              content: `${pvc.metadata.name} (${
                                pvc.spec.resources.requests.storage || 'Unknown size'
                              })`,
                            }),
                          )}
                          selected={existingPvcName}
                          onSelect={(_event, selection) => {
                            setExistingPvcName(String(selection));
                          }}
                          placeholder="Select storage"
                          noOptionsFoundMessage="No compatible storage found"
                        />
                      </FormGroup>
                    </StackItem>
                  )}
                </Stack>
              )
            }
          />
        </StackItem>
      </Stack>
    </FormGroup>
  );
};
