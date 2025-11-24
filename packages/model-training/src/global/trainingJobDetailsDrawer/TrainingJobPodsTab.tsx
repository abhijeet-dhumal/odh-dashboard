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

  React.useEffect(() => {
    setLoaded(false);
    setError(undefined);

    getPodsForTrainJob(job.metadata.namespace, job.metadata.name)
      .then((fetchedPods) => {
        setPods(fetchedPods);
        setLoaded(true);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch pods');
        setLoaded(true);
      });
  }, [job.metadata.namespace, job.metadata.name]);

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
            const phase = pod.status?.phase || 'Unknown';
            const containerStatuses = pod.status?.containerStatuses || [];
            const restartCount = containerStatuses.reduce(
              (sum, status) => sum + (status.restartCount || 0),
              0,
            );
            const creationTime = pod.metadata?.creationTimestamp
              ? new Date(pod.metadata.creationTimestamp)
              : null;
            const age = creationTime
              ? Math.floor((Date.now() - creationTime.getTime()) / 1000 / 60 / 60 / 24)
              : null;
            const ageText = age !== null ? `${age}d` : 'Unknown';

            return (
              <Tr key={pod.metadata?.uid || pod.metadata?.name}>
                <Td dataLabel="Name">{pod.metadata?.name}</Td>
                <Td dataLabel="Status">{phase}</Td>
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

