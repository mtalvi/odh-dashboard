import React from 'react';
import { HelperText, HelperTextItem, Stack, StackItem, Alert } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies, @odh-dashboard/no-restricted-imports -- False positive on dependency; restricted import is acceptable technical debt
import StorageClassSelect from '@odh-dashboard/internal/pages/projects/screens/spawner/storage/StorageClassSelect';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import useStorageClasses from '@odh-dashboard/internal/concepts/k8s/useStorageClasses';
// eslint-disable-next-line import/no-extraneous-dependencies, @odh-dashboard/no-restricted-imports -- False positive on dependency; restricted import is acceptable technical debt
import { useDefaultStorageClass } from '@odh-dashboard/internal/pages/projects/screens/spawner/storage/useDefaultStorageClass';
// eslint-disable-next-line import/no-extraneous-dependencies, @odh-dashboard/no-restricted-imports -- False positive on dependency; restricted import is acceptable technical debt
import { getStorageClassConfig } from '@odh-dashboard/internal/pages/storageClasses/utils';
// eslint-disable-next-line import/no-extraneous-dependencies, @odh-dashboard/no-restricted-imports -- False positive on dependency; restricted import is acceptable technical debt
import PVSizeField from '@odh-dashboard/internal/pages/projects/components/PVSizeField';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import { MEMORY_UNITS_FOR_SELECTION } from '@odh-dashboard/internal/utilities/valueUnits';
import type { StorageClassKind } from '@odh-dashboard/internal/k8sTypes';

type NIMStorageFieldsProps = {
  pvcSize: string;
  setPvcSize: (size: string) => void;
  storageClassName: string;
  setStorageClassName: (name: string) => void;
};

/**
 * Component for configuring storage when creating new PVC
 * Includes storage class selection and PVC size input
 */
export const NIMStorageFields: React.FC<NIMStorageFieldsProps> = ({
  pvcSize,
  setPvcSize,
  storageClassName,
  setStorageClassName,
}) => {
  const [storageClasses, scLoaded] = useStorageClasses();
  const [defaultSc] = useDefaultStorageClass();

  const selectedConfig = React.useMemo(() => {
    if (!storageClasses) return undefined;
    const selectedSc = storageClasses.find(
      (sc: StorageClassKind) => sc.metadata.name === storageClassName,
    );
    return selectedSc ? getStorageClassConfig(selectedSc) : undefined;
  }, [storageClasses, storageClassName]);

  // Auto-select default storage class on mount
  React.useEffect(() => {
    if (scLoaded && !storageClassName && defaultSc) {
      setStorageClassName(defaultSc.metadata.name);
    }
  }, [scLoaded, storageClassName, defaultSc, setStorageClassName]);

  return (
    <Stack hasGutter>
      <StackItem>
        <StorageClassSelect
          storageClasses={storageClasses || []}
          storageClassesLoaded={scLoaded}
          selectedStorageClassConfig={selectedConfig}
          storageClassName={storageClassName}
          setStorageClassName={setStorageClassName}
          isRequired
          additionalHelperText={
            <>
              <HelperTextItem>
                The storage class determines the type of persistent storage provisioned for
                your NIM model cache.
              </HelperTextItem>
              <Alert
                variant="info"
                title="The storage class cannot be changed after creation."
                isInline
                isPlain
              />
            </>
          }
        />
      </StackItem>

      <StackItem>
        <PVSizeField
          fieldID="nim-pvc-size"
          size={pvcSize}
          setSize={setPvcSize}
          label="NIM storage size"
          options={MEMORY_UNITS_FOR_SELECTION.filter((option) => option.unit !== 'Mi')}
        />
        <HelperText>
          <HelperTextItem>
            Specify the size of the cluster storage that will be created to store the
            downloaded NIM model.
          </HelperTextItem>
          <HelperTextItem>
            Make sure your storage size is greater than the model size specified by NVIDIA.
            Most NIM models require at least 30Gi.
          </HelperTextItem>
        </HelperText>
      </StackItem>
    </Stack>
  );
};
