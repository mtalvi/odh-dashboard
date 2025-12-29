import React from 'react';
import type {
  K8sAPIOptions,
  ProjectKind,
  InferenceServiceKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import {
  InferenceServiceModel,
  ServingRuntimeModel,
  PodModel,
} from '@odh-dashboard/internal/api/models';
// eslint-disable-next-line import/no-extraneous-dependencies, @odh-dashboard/no-restricted-imports -- False positive on dependency; restricted import is acceptable technical debt
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import type { NIMDeployment } from '../types';
import { NIM_SERVING_ID } from '../../extensions/extensions';

/**
 * Hook to watch NIM deployments
 * Watches InferenceServices with NIM labels and their associated ServingRuntimes
 */
export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (deployment: NIMDeployment) => boolean,
  opts?: K8sAPIOptions,
): [NIMDeployment[] | undefined, boolean, Error | undefined] => {
  // Watch all InferenceServices with NIM deployment label
  const nimLabelSelectors = {
    ...labelSelectors,
    'opendatahub.io/nim-deployment': 'true',
  };

  const [inferenceServices, inferenceServiceLoaded, inferenceServiceError] =
    useK8sWatchResourceList<InferenceServiceKind[]>(
      {
        isList: true,
        groupVersionKind: groupVersionKind(InferenceServiceModel),
        namespace: project.metadata.name,
        selector: nimLabelSelectors,
      },
      InferenceServiceModel,
      opts,
    );

  const [servingRuntimes, servingRuntimeLoaded, servingRuntimeError] = useK8sWatchResourceList<
    ServingRuntimeKind[]
  >(
    {
      isList: true,
      groupVersionKind: groupVersionKind(ServingRuntimeModel),
      namespace: project.metadata.name,
    },
    ServingRuntimeModel,
    opts,
  );

  const [, deploymentPodsLoaded, deploymentPodsError] = useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PodModel),
      namespace: project.metadata.name,
    },
    PodModel,
    opts,
  );

  // Handle "forbidden" errors gracefully
  const servingRuntimeEffectivelyLoaded =
    servingRuntimeLoaded ||
    (servingRuntimeError ? servingRuntimeError.message.includes('forbidden') : false);
  const deploymentPodsEffectivelyLoaded =
    deploymentPodsLoaded ||
    (deploymentPodsError ? deploymentPodsError.message.includes('forbidden') : false);

  const allLoaded =
    inferenceServiceLoaded && servingRuntimeEffectivelyLoaded && deploymentPodsEffectivelyLoaded;

  // Combine InferenceServices with their ServingRuntimes
  const deployments = React.useMemo(() => {
    return inferenceServices.map((inferenceService: InferenceServiceKind) => {
      const servingRuntime = servingRuntimes.find(
        (sr: ServingRuntimeKind) =>
          sr.metadata.name === inferenceService.spec.predictor.model?.runtime,
      );

      // Determine deployment state from InferenceService conditions
      const readyCondition = inferenceService.status?.conditions?.find(
        (c: { type: string }) => c.type === 'Ready',
      );
      const state: ModelDeploymentState =
        readyCondition?.status === 'True'
          ? ModelDeploymentState.LOADED
          : ModelDeploymentState.LOADING;

      const deployment: NIMDeployment = {
        modelServingPlatformId: NIM_SERVING_ID,
        model: inferenceService,
        server: servingRuntime,
        status: {
          state,
        },
        endpoints: [],
        apiProtocol: 'REST',
      };

      return deployment;
    });
  }, [inferenceServices, servingRuntimes]);

  // Apply filterFn if provided
  const filteredDeployments = React.useMemo(() => {
    if (!filterFn) {
      return deployments;
    }
    return deployments.filter(filterFn);
  }, [deployments, filterFn]);

  return [
    filteredDeployments,
    allLoaded,
    inferenceServiceError || servingRuntimeError || deploymentPodsError,
  ];
};
