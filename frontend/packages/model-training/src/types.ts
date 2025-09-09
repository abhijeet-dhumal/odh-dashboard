export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  SUSPENDED = 'Suspended',
  PREEMTED = 'Preempted',
  UNKNOWN = 'Unknown',
}

export enum TrainJobState {
  SUSPENDED = 'Suspended',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  RUNNING = 'Running',
  PENDING = 'Pending',
  UNKNOWN = 'Unknown',
}

export type TrainingJobState = PyTorchJobState | TrainJobState;

export enum TrainingJobType {
  PYTORCH = 'PyTorchJob',
  TRAIN = 'TrainJob',
}
