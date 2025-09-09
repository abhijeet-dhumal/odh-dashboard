import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
} from '@patternfly/react-icons';
import { LabelProps } from '@patternfly/react-core';
import { PyTorchJobKind, TrainJobKind } from '../../k8sTypes';
import { PyTorchJobState, TrainJobState, TrainingJobState, TrainingJobType } from '../../types';
import { getWorkloadForPyTorchJob, getWorkloadForTrainJob } from '../../api';

export const getStatusInfo = (
  status: TrainingJobState,
): {
  label: string;
  status?: LabelProps['status'];
  color?: LabelProps['color'];
  IconComponent: React.ComponentType;
} => {
  switch (status) {
    case PyTorchJobState.SUCCEEDED:
    case TrainJobState.COMPLETE:
      return {
        label: status === TrainJobState.COMPLETE ? 'Complete' : 'Succeeded',
        color: 'green',
        IconComponent: CheckCircleIcon,
      };
    case PyTorchJobState.FAILED:
    case TrainJobState.FAILED:
      return {
        label: 'Failed',
        color: 'red',
        IconComponent: ExclamationCircleIcon,
      };
    case PyTorchJobState.RUNNING:
    case TrainJobState.RUNNING:
      return {
        label: 'Running',
        color: 'blue',
        IconComponent: InProgressIcon,
      };
    case PyTorchJobState.PENDING:
    case TrainJobState.PENDING:
      return {
        label: 'Pending',
        color: 'teal',
        IconComponent: PendingIcon,
      };
    case PyTorchJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case PyTorchJobState.SUSPENDED:
    case TrainJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

export const getJobStatusFromPyTorchJob = (job: PyTorchJobKind): PyTorchJobState => {
  if (!job.status?.conditions) {
    return PyTorchJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find((condition) => condition.status === 'True');

  if (!currentCondition) {
    return PyTorchJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case 'Succeeded':
      return PyTorchJobState.SUCCEEDED;
    case 'Failed':
      return PyTorchJobState.FAILED;
    case 'Running':
      return PyTorchJobState.RUNNING;
    case 'Created':
      return PyTorchJobState.CREATED;
    default:
      return PyTorchJobState.UNKNOWN;
  }
};

export const getJobStatusWithHibernation = async (
  job: PyTorchJobKind,
): Promise<PyTorchJobState> => {
  const standardStatus = getJobStatusFromPyTorchJob(job);

  // If the job is in a terminal state (succeeded or failed), don't check hibernation
  // Terminal states take precedence over hibernation status
  if (standardStatus === PyTorchJobState.SUCCEEDED || standardStatus === PyTorchJobState.FAILED) {
    return standardStatus;
  }

  try {
    const workload = await getWorkloadForPyTorchJob(job);
    if (workload && workload.spec.active === false) {
      return PyTorchJobState.SUSPENDED;
    }
  } catch (error) {
    console.warn('Failed to check hibernation status for PyTorchJob:', error);
  }

  return standardStatus;
};

export const getJobStatusFromTrainJob = (job: TrainJobKind): TrainJobState => {
  if (!job.status?.conditions) {
    return TrainJobState.UNKNOWN;
  }

  // Sort conditions by lastTransitionTime (most recent first)
  const sortedConditions = job.status.conditions.toSorted((a, b) =>
    (b.lastTransitionTime || '').localeCompare(a.lastTransitionTime || ''),
  );

  // Find the most recent condition with status='True' (current active state)
  const currentCondition = sortedConditions.find((condition) => condition.status === 'True');

  if (!currentCondition) {
    return TrainJobState.UNKNOWN;
  }

  switch (currentCondition.type) {
    case 'Complete':
      return TrainJobState.COMPLETE;
    case 'Failed':
      return TrainJobState.FAILED;
    case 'Suspended':
      return TrainJobState.SUSPENDED;
    default:
      // If no specific condition is found, check if there are active jobs
      if (job.status.jobsStatus?.some((jobStatus) => jobStatus.active > 0)) {
        return TrainJobState.RUNNING;
      }
      return TrainJobState.PENDING;
  }
};

export const getJobStatusWithHibernationForTrainJob = async (
  job: TrainJobKind,
): Promise<TrainJobState> => {
  const standardStatus = getJobStatusFromTrainJob(job);

  // If the job is in a terminal state (complete or failed), don't check hibernation
  // Terminal states take precedence over hibernation status
  if (standardStatus === TrainJobState.COMPLETE || standardStatus === TrainJobState.FAILED) {
    return standardStatus;
  }

  try {
    const workload = await getWorkloadForTrainJob(job);
    if (workload && workload.spec.active === false) {
      return TrainJobState.SUSPENDED;
    }
  } catch (error) {
    console.warn('Failed to check hibernation status for TrainJob:', error);
  }

  return standardStatus;
};

// Generic functions that work with both job types
export type TrainingJob = PyTorchJobKind | TrainJobKind;

export const getJobType = (job: TrainingJob): TrainingJobType => {
  return job.kind === 'TrainJob' ? TrainingJobType.TRAIN : TrainingJobType.PYTORCH;
};

export const getJobStatus = (job: TrainingJob): TrainingJobState => {
  if (job.kind === 'TrainJob') {
    return getJobStatusFromTrainJob(job as TrainJobKind);
  }
  return getJobStatusFromPyTorchJob(job as PyTorchJobKind);
};

export const getJobStatusWithHibernationGeneric = async (job: TrainingJob): Promise<TrainingJobState> => {
  if (job.kind === 'TrainJob') {
    return getJobStatusWithHibernationForTrainJob(job as TrainJobKind);
  }
  return getJobStatusWithHibernation(job as PyTorchJobKind);
};

export const getJobDisplayName = (job: TrainingJob): string => {
  return job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;
};
