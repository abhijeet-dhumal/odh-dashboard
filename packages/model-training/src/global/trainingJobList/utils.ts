import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon,
  ClockIcon,
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
    case PyTorchJobState.RESTARTING:
      return {
        label: 'Restarting',
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
    case PyTorchJobState.QUEUED:
      return {
        label: 'Queued',
        color: 'grey',
        IconComponent: ClockIcon,
      };
    case PyTorchJobState.CREATED:
      return {
        label: 'Created',
        color: 'grey',
        IconComponent: PlayIcon,
      };
    case PyTorchJobState.PAUSED:
      return {
        label: 'Paused',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case PyTorchJobState.SUSPENDED:
    case TrainJobState.SUSPENDED:
      return {
        label: 'Suspended',
        color: 'grey',
        IconComponent: PauseIcon,
      };
    case PyTorchJobState.PREEMPTED:
      return {
        label: 'Preempted',
        color: 'orangered',
        IconComponent: ExclamationTriangleIcon,
      };
    default:
      return {
        label: 'Unknown',
        status: 'warning',
        IconComponent: ExclamationCircleIcon,
      };
  }
};

/**
 * Get basic PyTorch job status from conditions (synchronous)
 * This is the core status extraction function used internally
 */
const getBasicJobStatus = (job: PyTorchJobKind): PyTorchJobState => {
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
    case 'Restarting':
      return PyTorchJobState.RESTARTING;
    default:
      return PyTorchJobState.UNKNOWN;
  }
};

/**
 * Unified function to get training job status with hibernation support (async)
 * @param job - PyTorch job to check status for
 * @param options - Configuration options
 * @returns Promise resolving to the job's current status
 */
export const getTrainingJobStatus = async (
  job: PyTorchJobKind,
  options: {
    skipHibernationCheck?: boolean;
  } = {},
): Promise<{ status: PyTorchJobState; isLoading: boolean; error?: string }> => {
  const { skipHibernationCheck = false } = options;

  try {
    // Get basic status from PyTorch job conditions
    const basicStatus = getBasicJobStatus(job);

    // Skip hibernation check if disabled or job is in terminal state
    if (
      skipHibernationCheck ||
      basicStatus === PyTorchJobState.SUCCEEDED ||
      basicStatus === PyTorchJobState.FAILED
    ) {
      return { status: basicStatus, isLoading: false };
    }

    // Check workload status for Kueue-enabled jobs and runPolicy for non-Kueue jobs
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Kueue-enabled job: Check workload status for queuing, hibernation and preemption

      // Priority 1: Check for paused/hibernated status - workload.spec.active = false
      if (workload.spec.active === false) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }

      // Priority 2: Check for preempted status - workload.spec.active = true AND job.spec.runPolicy.suspend = true
      const isWorkloadActive = workload.spec.active === true;
      const isJobSuspended = job.spec.runPolicy?.suspend === true;

      if (isWorkloadActive && isJobSuspended) {
        return { status: PyTorchJobState.PREEMPTED, isLoading: false };
      }

      // Priority 3: Check for queued status - workload conditions indicate waiting for resources
      const conditions = workload.status?.conditions || [];
      const quotaReservedCondition = conditions.find((c) => c.type === 'QuotaReserved');
      const podsReadyCondition = conditions.find((c) => c.type === 'PodsReady');

      const isWaitingForQuota =
        quotaReservedCondition &&
        quotaReservedCondition.status === 'False' &&
        quotaReservedCondition.reason === 'Pending';
      const isWaitingForPods =
        podsReadyCondition &&
        podsReadyCondition.status === 'False' &&
        podsReadyCondition.reason === 'WaitForStart';

      if (isWaitingForQuota && isWaitingForPods) {
        return { status: PyTorchJobState.QUEUED, isLoading: false };
      }
    } else {
      // Non-Kueue job: Check PyTorchJob runPolicy.suspend for hibernation
      const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;

      if (isSuspendedByRunPolicy) {
        return { status: PyTorchJobState.PAUSED, isLoading: false };
      }
    }

    // Return basic status if no special conditions are met
    return { status: basicStatus, isLoading: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to get status for PyTorchJob ${job.metadata.name}:`, errorMessage);

    // Fallback to basic status on error
    return {
      status: getBasicJobStatus(job),
      isLoading: false,
      error: errorMessage,
    };
  }
};

/**
 * Get training job status (synchronous version for sorting/filtering)
 * This version checks basic PyTorch job status and runPolicy.suspend for non-Kueue jobs
 * @param job - PyTorch job to check status for
 * @returns Job status including basic hibernation check
 */
export const getTrainingJobStatusSync = (job: PyTorchJobKind): PyTorchJobState => {
  const basicStatus = getBasicJobStatus(job);

  // Skip hibernation check for terminal states
  if (basicStatus === PyTorchJobState.SUCCEEDED || basicStatus === PyTorchJobState.FAILED) {
    return basicStatus;
  }

  // Check for non-Kueue job suspension via runPolicy.suspend
  const isSuspendedByRunPolicy = job.spec.runPolicy?.suspend === true;
  if (isSuspendedByRunPolicy) {
    return PyTorchJobState.PAUSED;
  }

  return basicStatus;
};

/**
 * Get basic TrainJob status from conditions (synchronous)
 */
const getBasicTrainJobStatus = (job: TrainJobKind): TrainJobState => {
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

/**
 * Get TrainJob status with hibernation support (async)
 */
export const getTrainJobStatusWithHibernation = async (
  job: TrainJobKind,
): Promise<TrainJobState> => {
  const standardStatus = getBasicTrainJobStatus(job);

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
    return getBasicTrainJobStatus(job as TrainJobKind);
  }
  return getTrainingJobStatusSync(job as PyTorchJobKind);
};

export const getJobStatusWithHibernationGeneric = async (job: TrainingJob): Promise<TrainingJobState> => {
  if (job.kind === 'TrainJob') {
    return getTrainJobStatusWithHibernation(job as TrainJobKind);
  }
  const result = await getTrainingJobStatus(job as PyTorchJobKind);
  return result.status;
};

export const getJobDisplayName = (job: TrainingJob): string => {
  return job.metadata.annotations?.['opendatahub.io/display-name'] || job.metadata.name;
};

// Legacy exports for backward compatibility
export const getJobStatusFromPyTorchJob = getTrainingJobStatusSync;
export const getJobStatusWithHibernation = async (job: PyTorchJobKind): Promise<PyTorchJobState> => {
  const result = await getTrainingJobStatus(job);
  return result.status;
};
