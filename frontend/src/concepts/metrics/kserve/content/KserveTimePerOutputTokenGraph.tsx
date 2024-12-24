import React from 'react';
import { KserveMetricGraphDefinition} from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { useFetchNimTimePerOutputTokenData } from '~/api/prometheus/kservePerformanceMetrics';
import { convertPrometheusNaNToZero } from '~/pages/modelServing/screens/metrics/utils';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';


type NimTimePerOutputTokenGraphProps = {
  graphDefinition: KserveMetricGraphDefinition; // Contains query and title
  timeframe: TimeframeTitle;                   // Time range
  end: number;                                 // End timestamp
  namespace: string;                           // Namespace
};
const NimTimePerOutputTokenGraph: React.FC<NimTimePerOutputTokenGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  // Fetch the data for "Time per Output Token"
  const {
    data: { timePerOutputToken },
  } = useFetchNimTimePerOutputTokenData(graphDefinition, timeframe, end, namespace);
  // Log the fetched data to debug
  console.log('Fetched timePerOutputToken data:', timePerOutputToken);
  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: { ...timePerOutputToken, data: convertPrometheusNaNToZero(timePerOutputToken.data) } }}
      color="blue"
      type={MetricsChartTypes.AREA}
    />
  );

};
export default NimTimePerOutputTokenGraph;