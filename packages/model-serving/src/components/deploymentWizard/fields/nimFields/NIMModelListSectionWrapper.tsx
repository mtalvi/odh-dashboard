import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NIMModelListSection from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/NIMModelListSection';

type NIMModelListSectionWrapperProps = {
  selectedModelName?: string;
  onModelSelect: (modelName: string, modelDisplayName?: string) => void;
  isDisabled?: boolean;
};

/**
 * Wrapper component that adapts the real NIMModelListSection for use in the wizard.
 * This maintains compatibility with the existing NIM logic while integrating into wizard state.
 */
const NIMModelListSectionWrapper: React.FC<NIMModelListSectionWrapperProps> = ({
  selectedModelName,
  onModelSelect,
  isDisabled,
}) => {
  // Create mock inference service and serving runtime data structures
  // that the real NIMModelListSection expects
  const [inferenceServiceData, setInferenceServiceData] = React.useState({
    format: { name: selectedModelName || '' },
  });

  const [servingRuntimeData, setServingRuntimeData] = React.useState<{
    supportedModelFormatsInfo?: { name: string; version: string };
    imageName?: string;
  }>({});

  // Update parent when model is selected
  React.useEffect(() => {
    if (servingRuntimeData.supportedModelFormatsInfo) {
      const modelName = servingRuntimeData.supportedModelFormatsInfo.name;
      onModelSelect(modelName);
    }
  }, [servingRuntimeData.supportedModelFormatsInfo, onModelSelect]);

  // Generic setter function to match expected UpdateObjectAtPropAndValue type
  const updateInferenceServiceData = <K extends keyof typeof inferenceServiceData>(
    key: K,
    value: (typeof inferenceServiceData)[K],
  ) => {
    setInferenceServiceData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateServingRuntimeData = <K extends keyof typeof servingRuntimeData>(
    key: K,
    value: (typeof servingRuntimeData)[K],
  ) => {
    setServingRuntimeData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <NIMModelListSection
      inferenceServiceData={inferenceServiceData}
      setInferenceServiceData={
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
        updateInferenceServiceData as any
      }
      setServingRuntimeData={
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
        updateServingRuntimeData as any
      }
      isEditing={isDisabled}
    />
  );
};

export default NIMModelListSectionWrapper;
