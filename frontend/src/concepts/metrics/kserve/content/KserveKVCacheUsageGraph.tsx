import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { useFetchNimKVCacheUsageData } from '~/api/prometheus/kservePerformanceMetrics';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
import { toPercentage } from '~/pages/modelServing/screens/metrics/utils';

// Graph #1 - KV Cache usage over time
type NimKVCacheUsageGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const NimKVCacheUsageGraph: React.FC<NimKVCacheUsageGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { kvCacheUsage },
  } = useFetchNimKVCacheUsageData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: kvCacheUsage, translatePoint: toPercentage }}
      type={MetricsChartTypes.LINE}
      domain={() => ({
        y: [0, 100],
      })}
    />
  );
};


export default NimKVCacheUsageGraph;