import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TrainJobKind } from '../../k8sTypes';
import { getPodsForTrainJob } from '../../api';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';

type TrainingJobPodsTabProps = {
  job: TrainJobKind;
};

const TrainingJobPodsTab: React.FC<TrainingJobPodsTabProps> = ({ job }) => {
  const [pods, setPods] = React.useState<PodKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  // Function to fetch pods
  const fetchPods = React.useCallback(() => {
    getPodsForTrainJob(job.metadata.namespace, job.metadata.name)
      .then((fetchedPods) => {
        setPods(fetchedPods);
        setLoaded(true);
        setError(undefined);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch pods');
        setLoaded(true);
      });
  }, [job.metadata.namespace, job.metadata.name]);

  // Initial fetch and polling every 5 seconds for real-time updates
  React.useEffect(() => {
    setLoaded(false);
    setError(undefined);

    // Fetch immediately
    fetchPods();

    // Poll every 5 seconds
    const intervalId = setInterval(fetchPods, 5000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchPods]);

  if (!loaded) {
    return (
      <EmptyState headingLevel="h3" titleText="Loading pods...">
        <Spinner size="lg" />
      </EmptyState>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" title="Error loading pods" isInline>
        {error}
      </Alert>
    );
  }

  if (pods.length === 0) {
    return (
      <EmptyState headingLevel="h3" titleText="No pods found" icon={CubesIcon}>
        <EmptyStateBody>
          No pods are associated with this training job yet. Pods will appear once the job starts
          running.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Table aria-label="Training job pods" variant="compact">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Restarts</Th>
            <Th>Age</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pods.map((pod) => {
            // Check if pod is terminating (deletionTimestamp is set)
            const isTerminating = !!pod.metadata?.deletionTimestamp;
            const phase = pod.status?.phase || 'Unknown';
            const status = isTerminating ? 'Terminating' : phase;
            
            const containerStatuses = pod.status?.containerStatuses || [];
            const restartCount = containerStatuses.reduce(
              (sum, status) => sum + (status.restartCount || 0),
              0,
            );
            const creationTime = pod.metadata?.creationTimestamp
              ? new Date(pod.metadata.creationTimestamp)
              : null;
            
            // Calculate age in human-readable format
            let ageText = 'Unknown';
            if (creationTime) {
              const ageInSeconds = Math.floor((Date.now() - creationTime.getTime()) / 1000);
              if (ageInSeconds < 60) {
                ageText = `${ageInSeconds}s`;
              } else if (ageInSeconds < 3600) {
                ageText = `${Math.floor(ageInSeconds / 60)}m`;
              } else if (ageInSeconds < 86400) {
                ageText = `${Math.floor(ageInSeconds / 3600)}h`;
              } else {
                ageText = `${Math.floor(ageInSeconds / 86400)}d`;
              }
            }

            return (
              <Tr key={pod.metadata?.uid || pod.metadata?.name}>
                <Td dataLabel="Name">{pod.metadata?.name}</Td>
                <Td dataLabel="Status">{status}</Td>
                <Td dataLabel="Restarts">{restartCount}</Td>
                <Td dataLabel="Age">{ageText}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};

export default TrainingJobPodsTab;

