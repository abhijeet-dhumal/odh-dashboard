import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import TrainingJobProject from './TrainingJobProject';
import { getJobStatus, TrainingJob } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import TrainingProgressIcon from './components/TrainingProgressIcon';
import { TrainingJobState } from '../../types';
import { togglePyTorchJobHibernation } from '../../api';

type TrainingJobTableRowProps = {
  job: TrainingJob;
  jobStatus?: TrainingJobState;
  onDelete: (job: TrainingJob) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
};

const TrainingJobTableRow: React.FC<TrainingJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
}) => {
  const [hibernationModalOpen, setHibernationModalOpen] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);
  const workerReplicas = job.kind === 'PyTorchJob' 
    ? (job as any).spec.pytorchReplicaSpecs.Worker?.replicas || 0
    : (job as any).spec.trainer?.numNodes || 1;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getJobStatus(job);
  const isSuspended = status === 'Suspended';
  const isTerminalState = status === 'Succeeded' || status === 'Complete' || status === 'Failed';

  const handleHibernationToggle = async () => {
    setIsToggling(true);
    try {
      // Only PyTorchJobs support hibernation for now
      if (job.kind === 'PyTorchJob') {
        const result = await togglePyTorchJobHibernation(job as any);
        if (result.success) {
          // Update status optimistically
          const newStatus = isSuspended ? 'Running' : 'Suspended';
          const jobId = job.metadata.uid || job.metadata.name;
          onStatusUpdate?.(jobId, newStatus as TrainingJobState);
        } else {
          console.error('Failed to toggle hibernation:', result.error);
          // TODO: Show error notification
        }
      } else {
        console.warn('Hibernation not supported for TrainJob');
        // TODO: Show warning notification
      }
    } catch (error) {
      console.error('Error toggling hibernation:', error);
      // TODO: Show error notification
    } finally {
      setIsToggling(false);
      setHibernationModalOpen(false);
    }
  };


  // Build kebab menu actions
  const actions = React.useMemo(() => {
    const items = [];

    // Add hibernation toggle action (only for PyTorchJobs and non-terminal states)
    if (!isTerminalState && job.kind === 'PyTorchJob') {
      items.push({
        title: isSuspended ? 'Resume' : 'Suspend',
        onClick: () => setHibernationModalOpen(true),
      });
    }

    // Add delete action
    items.push({
      title: 'Delete',
      onClick: () => onDelete(job),
    });

    return items;
  }, [status, isSuspended, isTerminalState, job, onDelete]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={job}>
            <Link to={`/modelTraining/${job.metadata.namespace}/${job.metadata.name}`}>
              {displayName}
            </Link>
          </ResourceNameTooltip>
        </Td>

        <Td dataLabel="Project">
          <TrainingJobProject trainingJob={job} />
        </Td>

        <Td dataLabel="Worker nodes">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>
              <CubesIcon />
            </FlexItem>
            <FlexItem>{workerReplicas}</FlexItem>
          </Flex>
        </Td>
        <Td dataLabel="Cluster queue">
          <TrainingJobClusterQueue
            localQueueName={localQueueName}
            namespace={job.metadata.namespace}
          />
        </Td>
        <Td dataLabel="Created">
          {job.metadata.creationTimestamp ? (
            <Timestamp
              date={new Date(job.metadata.creationTimestamp)}
              tooltip={{
                variant: TimestampTooltipVariant.default,
              }}
            >
              {relativeTime(Date.now(), new Date(job.metadata.creationTimestamp).getTime())}
            </Timestamp>
          ) : (
            'Unknown'
          )}
        </Td>
        <Td dataLabel="Status">
          <TrainingJobStatus job={job} jobStatus={jobStatus} />
        </Td>
        <Td dataLabel="Progress">
          <TrainingProgressIcon job={job} />
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      <HibernationToggleModal
        job={hibernationModalOpen ? job : undefined}
        isSuspended={isSuspended}
        isToggling={isToggling}
        onClose={() => setHibernationModalOpen(false)}
        onConfirm={handleHibernationToggle}
      />
    </>
  );
};

export default TrainingJobTableRow;
