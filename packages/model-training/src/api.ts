import {
  k8sDeleteResource,
  K8sStatus,
  k8sPatchResource,
  k8sListResourceItems,
  k8sGetResource,
  commonFetchText,
  getK8sResourceURL,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
// Remove the problematic import - we'll implement listWorkloads directly
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';

// Local implementation of listWorkloads function
const listWorkloads = async (
  namespace?: string,
  labelSelector?: string,
): Promise<WorkloadKind[]> => {
  const queryOptions = {
    ns: namespace,
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<WorkloadKind>({
    model: WorkloadModel,
    queryOptions,
  });
};
import * as React from 'react';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { PyTorchJobModel, TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { PyTorchJobKind, TrainJobKind, RayJobKind } from './k8sTypes';

// JobSet model for TrainJob hierarchy
const JobSetModel = {
  apiVersion: 'v1alpha2',
  apiGroup: 'jobset.x-k8s.io',
  kind: 'JobSet',
  plural: 'jobsets',
};

// Standard Kubernetes Job model
const JobModel = {
  apiVersion: 'v1',
  apiGroup: 'batch',
  kind: 'Job',
  plural: 'jobs',
};

// Standard Kubernetes Pod model
const PodModel = {
  apiVersion: 'v1',
  kind: 'Pod',
  plural: 'pods',
};

// RayJob model
const RayJobModel = {
  apiVersion: 'v1',
  apiGroup: 'ray.io',
  kind: 'RayJob',
  plural: 'rayjobs',
};

// Job type definition
export type JobKind = {
  apiVersion?: string;
  kind?: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec?: {
    parallelism?: number;
    completions?: number;
    template: {
      spec: {
        containers: Array<{
          name: string;
          image?: string;
          volumeMounts?: Array<{
            name: string;
            mountPath: string;
            subPath?: string;
            readOnly?: boolean;
          }>;
          [key: string]: any;
        }>;
        volumes?: Array<{
          name: string;
          persistentVolumeClaim?: {
            claimName: string;
          };
          configMap?: {
            name: string;
          };
          secret?: {
            secretName: string;
          };
          [key: string]: any;
        }>;
      };
    };
  };
  status?: {
    active?: number;
    succeeded?: number;
    failed?: number;
    startTime?: string;
    completionTime?: string;
  };
};

export const usePyTorchJobs = (namespace: string): CustomWatchK8sResult<PyTorchJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(PyTorchJobModel),
      namespace,
    },
    PyTorchJobModel,
  );

export const useTrainJobs = (namespace: string): CustomWatchK8sResult<TrainJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(TrainJobModel),
      namespace,
    },
    TrainJobModel,
  );

// Mock RayJobs hook (since RayJob CRD may not be installed)
export const useRayJobs = (namespace: string): CustomWatchK8sResult<RayJobKind[]> => {
  // Return mock data for demonstration
  const mockRayJobs: RayJobKind[] = React.useMemo(() => [
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata: {
        name: 'llm-fine-tuning-ray',
        namespace: namespace || 'default',
        uid: 'ray-job-1',
        creationTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        labels: {
          'kueue.x-k8s.io/queue-name': 'ray-queue',
        },
        annotations: {
          'opendatahub.io/display-name': 'LLM Fine-tuning with Ray',
        },
      },
      spec: {
        entrypoint: 'python /workspace/ray_training.py',
        rayClusterSpec: {
          rayVersion: '2.8.0',
          headGroupSpec: {
            replicas: 1,
            template: {
              spec: {
                containers: [{
                  name: 'ray-head',
                  image: 'rayproject/ray-ml:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '2', memory: '8Gi' },
                    limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': 1 }
                  }
                }]
              }
            }
          },
          workerGroupSpecs: [{
            groupName: 'worker-group',
            replicas: 3,
            minReplicas: 1,
            maxReplicas: 5,
            template: {
              spec: {
                containers: [{
                  name: 'ray-worker',
                  image: 'rayproject/ray-ml:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '4', memory: '16Gi' },
                    limits: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': 2 }
                  }
                }]
              }
            }
          }]
        }
      },
      status: {
        jobStatus: 'RUNNING',
        jobDeploymentStatus: 'RUNNING',
        rayClusterStatus: {
          state: 'ready',
          endpoints: {
            client: '10.244.1.100:10001',
            dashboard: 'http://ray-dashboard.example.com:8265'
          }
        },
        startTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata: {
        name: 'hyperparameter-tuning-ray',
        namespace: namespace || 'default',
        uid: 'ray-job-2',
        creationTimestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        labels: {
          'kueue.x-k8s.io/queue-name': 'ray-queue',
        },
        annotations: {
          'opendatahub.io/display-name': 'Hyperparameter Tuning with Ray Tune',
        },
      },
      spec: {
        entrypoint: 'python /workspace/ray_tune_training.py',
        rayClusterSpec: {
          rayVersion: '2.8.0',
          headGroupSpec: {
            replicas: 1,
            template: {
              spec: {
                containers: [{
                  name: 'ray-head',
                  image: 'rayproject/ray-ml:2.8.0',
                  resources: {
                    requests: { cpu: '1', memory: '4Gi' },
                    limits: { cpu: '2', memory: '8Gi' }
                  }
                }]
              }
            }
          },
          workerGroupSpecs: [{
            groupName: 'tuning-workers',
            replicas: 4,
            template: {
              spec: {
                containers: [{
                  name: 'ray-worker',
                  image: 'rayproject/ray-ml:2.8.0',
                  resources: {
                    requests: { cpu: '2', memory: '8Gi' },
                    limits: { cpu: '4', memory: '16Gi' }
                  }
                }]
              }
            }
          }]
        }
      },
      status: {
        jobStatus: 'SUCCEEDED',
        jobDeploymentStatus: 'RUNNING',
        rayClusterStatus: {
          state: 'ready'
        },
        startTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      }
    },
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata: {
        name: 'distributed-inference-ray',
        namespace: namespace || 'default',
        uid: 'ray-job-3',
        creationTimestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        labels: {
          'kueue.x-k8s.io/queue-name': 'inference-queue',
        },
        annotations: {
          'opendatahub.io/display-name': 'Distributed Model Inference',
        },
      },
      spec: {
        entrypoint: 'python /workspace/ray_serve_model.py',
        rayClusterSpec: {
          rayVersion: '2.8.0',
          headGroupSpec: {
            replicas: 1,
            template: {
              spec: {
                containers: [{
                  name: 'ray-head',
                  image: 'rayproject/ray-ml:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '2', memory: '8Gi' },
                    limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': 1 }
                  }
                }]
              }
            }
          },
          workerGroupSpecs: [{
            groupName: 'inference-workers',
            replicas: 2,
            template: {
              spec: {
                containers: [{
                  name: 'ray-worker',
                  image: 'rayproject/ray-ml:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '3', memory: '12Gi' },
                    limits: { cpu: '6', memory: '24Gi', 'nvidia.com/gpu': 2 }
                  }
                }]
              }
            }
          }]
        }
      },
      status: {
        jobStatus: 'FAILED',
        jobDeploymentStatus: 'FAILED_JOB_DEPLOY',
        rayClusterStatus: {
          state: 'failed'
        },
        startTime: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        message: 'Failed to allocate GPU resources'
      }
    },
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata: {
        name: 'text-classification-ray',
        namespace: namespace || 'default',
        uid: 'ray-job-4',
        creationTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        labels: {
          'kueue.x-k8s.io/queue-name': 'test-cq',
        },
        annotations: {
          'opendatahub.io/display-name': 'Text Classification Training',
        },
      },
      spec: {
        entrypoint: 'python /workspace/text_classification.py',
        rayClusterSpec: {
          rayVersion: '2.8.0',
          headGroupSpec: {
            replicas: 1,
            template: {
              spec: {
                containers: [{
                  name: 'ray-head',
                  image: 'rayproject/ray-ml:2.8.0',
                  resources: {
                    requests: { cpu: '1', memory: '4Gi' },
                    limits: { cpu: '2', memory: '8Gi' }
                  }
                }]
              }
            }
          },
          workerGroupSpecs: [{
            groupName: 'classification-workers',
            replicas: 2,
            template: {
              spec: {
                containers: [{
                  name: 'ray-worker',
                  image: 'rayproject/ray-ml:2.8.0',
                  resources: {
                    requests: { cpu: '2', memory: '8Gi' },
                    limits: { cpu: '4', memory: '16Gi' }
                  }
                }]
              }
            }
          }]
        }
      },
      status: {
        jobStatus: 'SUCCEEDED',
        jobDeploymentStatus: 'RUNNING',
        rayClusterStatus: {
          state: 'ready'
        },
        startTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 0.5 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      apiVersion: 'ray.io/v1',
      kind: 'RayJob',
      metadata: {
        name: 'reinforcement-learning-ray',
        namespace: namespace || 'default',
        uid: 'ray-job-5',
        creationTimestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        labels: {
          'kueue.x-k8s.io/queue-name': 'gpu-queue',
        },
        annotations: {
          'opendatahub.io/display-name': 'RL Agent Training',
        },
      },
      spec: {
        entrypoint: 'python /workspace/rl_training.py',
        rayClusterSpec: {
          rayVersion: '2.8.0',
          headGroupSpec: {
            replicas: 1,
            template: {
              spec: {
                containers: [{
                  name: 'ray-head',
                  image: 'rayproject/ray-rl:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '2', memory: '8Gi' },
                    limits: { cpu: '4', memory: '16Gi', 'nvidia.com/gpu': 1 }
                  }
                }]
              }
            }
          },
          workerGroupSpecs: [{
            groupName: 'rl-workers',
            replicas: 4,
            template: {
              spec: {
                containers: [{
                  name: 'ray-worker',
                  image: 'rayproject/ray-rl:2.8.0-gpu',
                  resources: {
                    requests: { cpu: '4', memory: '16Gi' },
                    limits: { cpu: '8', memory: '32Gi', 'nvidia.com/gpu': 2 }
                  }
                }]
              }
            }
          }]
        }
      },
      status: {
        jobStatus: 'SUCCEEDED',
        jobDeploymentStatus: 'RUNNING',
        rayClusterStatus: {
          state: 'ready'
        },
        startTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()
      }
    }
  ], [namespace]);

  return [mockRayJobs, true, undefined];
};

export const deletePyTorchJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<PyTorchJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const deleteTrainJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrainJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const getWorkloadForPyTorchJob = async (
  job: PyTorchJobKind,
): Promise<WorkloadKind | null> => {
  try {
    // Try to find workload by job UID (most reliable)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // Fallback: try to find by job name if UID doesn't work
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for PyTorchJob:', error);
    return null;
  }
};

export const getWorkloadForTrainJob = async (
  job: TrainJobKind,
): Promise<WorkloadKind | null> => {
  try {
    // Try to find workload by job UID (most reliable)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // Fallback: try to find by job name if UID doesn't work
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for TrainJob:', error);
    return null;
  }
};

export const patchWorkloadHibernation = async (
  workload: WorkloadKind,
  isHibernated: boolean,
  opts?: K8sAPIOptions,
): Promise<WorkloadKind> => {
  const result = await k8sPatchResource<WorkloadKind>(
    applyK8sAPIOptions(
      {
        model: WorkloadModel,
        queryOptions: {
          name: workload.metadata?.name || '',
          ns: workload.metadata?.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/active',
            value: !isHibernated,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const patchPyTorchJobSuspension = async (
  job: PyTorchJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<PyTorchJobKind> => {
  const result = await k8sPatchResource<PyTorchJobKind>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/runPolicy/suspend',
            value: isSuspended,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const togglePyTorchJobHibernation = async (
  job: PyTorchJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: PyTorchJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForPyTorchJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - use workload hibernation
      const isCurrentlyHibernated = workload.spec.active === false;
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        !isCurrentlyHibernated,
        opts,
      );

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Path 2: Non-Kueue job - use PyTorchJob runPolicy.suspend
    const isCurrentlySuspended = job.spec.runPolicy?.suspend === true;
    const updatedJob = await patchPyTorchJobSuspension(job, !isCurrentlySuspended, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to toggle hibernation: ${errorMessage}`,
    };
  }
};

// TrainJob hierarchy API functions
export const getJobSetForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<any | null> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: JobSetModel,
          queryOptions: {
            ns: namespace,
            name: jobSetName,
          },
        },
        opts || {},
      ),
    );
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch JobSet for TrainJob:', error);
    return null;
  }
};

export const getJobsForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<JobKind[]> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: JobModel,
          queryOptions: {
            ns: namespace,
            queryParams: {
              labelSelector: `jobset.sigs.k8s.io/jobset-name=${jobSetName}`,
            },
          },
        },
        opts || {},
      ),
    );
    
    return (result || []) as JobKind[];
  } catch (error) {
    console.error('Failed to fetch Jobs for TrainJob:', error);
    return [];
  }
};

export const getPodsForTrainJob = async (
  trainJob: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<PodKind[]> => {
  try {
    const jobSetName = trainJob.metadata.name;
    const namespace = trainJob.metadata.namespace;
    
    const result = await k8sListResourceItems(
      applyK8sAPIOptions(
        {
          model: PodModel,
          queryOptions: {
            ns: namespace,
            queryParams: {
              labelSelector: `jobset.sigs.k8s.io/jobset-name=${jobSetName}`,
            },
          },
        },
        opts || {},
      ),
    );
    
    return (result || []) as PodKind[];
  } catch (error) {
    console.error('Failed to fetch Pods for TrainJob:', error);
    return [];
  }
};

// Pod log fetching function with direct fetch for large logs
export const getPodContainerLogText = (
  namespace: string,
  podName: string,
  containerName: string,
  tail?: number,
): Promise<string> => {
  // If tail is 0 or undefined, get all logs without tail parameter
  const logPath = tail && tail > 0 
    ? `log?container=${containerName}&tailLines=${tail}`
    : `log?container=${containerName}`;
    
  const url = getK8sResourceURL(PodModel, undefined, {
    name: podName,
    ns: namespace,
    path: logPath,
  });
  
  console.log('Fetching logs from URL:', url);
  console.log('Tail parameter:', tail);
  
  // Try direct fetch first for large logs
  if (!tail || tail === 0) {
    return fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'text/plain',
      },
      credentials: 'same-origin',
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(`Container logs not available (pod may be completed or logs garbage collected)`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    })
    .then((result) => {
      console.log('Direct fetch - Log response length:', result.length);
      console.log('Direct fetch - Log lines count:', result.split('\n').length);
      console.log('Direct fetch - First 200 chars:', result.substring(0, 200));
      console.log('Direct fetch - Last 200 chars:', result.substring(result.length - 200));
      return result;
    })
    .catch((error) => {
      console.log('Direct fetch failed, falling back to commonFetchText:', error);
      // Fallback to original method
      return commonFetchText(url, undefined, undefined, true);
    });
  }
  
  // Use commonFetchText for tailed logs
  return commonFetchText(url, undefined, undefined, true)
    .then((result) => {
      console.log('CommonFetchText - Log response length:', result.length);
      console.log('CommonFetchText - Log lines count:', result.split('\n').length);
      console.log('CommonFetchText - First 200 chars:', result.substring(0, 200));
      console.log('CommonFetchText - Last 200 chars:', result.substring(result.length - 200));
      return result;
    })
    .catch((error) => {
      console.error('Error fetching logs:', error);
      if (error.message && error.message.includes('unable to retrieve container logs')) {
        throw new Error('Container logs not available (pod may be completed or logs garbage collected)');
      }
      throw error;
    });
};

// TrainJob suspend/resume functionality
export const patchTrainJobSuspension = async (
  job: TrainJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
  const result = await k8sPatchResource<TrainJobKind>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/suspend',
            value: isSuspended,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};


export const resumeTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    console.log('🚀 resumeTrainJob called for:', job.metadata.name);
    const workload = await getWorkloadForTrainJob(job);
    console.log('🔍 Found workload:', workload?.metadata?.name || 'none');

    if (workload) {
      // Path 1: Kueue-enabled job - update workload first (Kueue should auto-sync TrainJob)
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        false, // false = not hibernated = active
        opts,
      );

      // Wait a moment for Kueue to sync the TrainJob automatically
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if TrainJob was automatically unsuspended
      const refreshedJob = await k8sGetResource<TrainJobKind>({
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
      });

      // If TrainJob is still suspended, manually unsuspend it (fallback for webhook issues)
      let updatedJob = refreshedJob;
      if (refreshedJob.spec.suspend === true) {
        console.warn('Kueue auto-sync failed, manually unsuspending TrainJob');
        updatedJob = await patchTrainJobSuspension(refreshedJob, false, opts);
      }

      return {
        success: true,
        workload: updatedWorkload,
        updatedJob,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = false
    const updatedJob = await patchTrainJobSuspension(job, false, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to resume job: ${errorMessage}`,
    };
  }
};

export const pauseTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - update workload first (Kueue should auto-sync TrainJob)
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        true, // true = hibernated = not active
        opts,
      );

      // Wait a moment for Kueue to sync the TrainJob automatically
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if TrainJob was automatically suspended
      const refreshedJob = await k8sGetResource<TrainJobKind>({
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
      });

      // If TrainJob is still not suspended, manually suspend it (fallback for webhook issues)
      let updatedJob = refreshedJob;
      if (refreshedJob.spec.suspend !== true) {
        console.warn('Kueue auto-sync failed, manually suspending TrainJob');
        updatedJob = await patchTrainJobSuspension(refreshedJob, true, opts);
      }

      return {
        success: true,
        workload: updatedWorkload,
        updatedJob,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = true
    const updatedJob = await patchTrainJobSuspension(job, true, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to pause job: ${errorMessage}`,
    };
  }
};

export const toggleTrainJobHibernation = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    console.log('🔄 toggleTrainJobHibernation called for:', job.metadata.name);
    const workload = await getWorkloadForTrainJob(job);
    console.log('🔍 Found workload:', workload?.metadata?.name || 'none');

    if (workload) {
      // Path 1: Kueue-enabled job - determine current state and toggle
      const isCurrentlySuspended = job.spec.suspend === true;
      console.log('📊 Current suspended state:', isCurrentlySuspended);
      
      if (isCurrentlySuspended) {
        // Resume the job
        return resumeTrainJob(job, opts);
      } else {
        // Pause the job  
        return pauseTrainJob(job, opts);
      }
    }

    // Path 2: Non-Kueue job - use TrainJob spec.suspend
    const isCurrentlySuspended = job.spec.suspend === true;
    const updatedJob = await patchTrainJobSuspension(job, !isCurrentlySuspended, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to toggle hibernation: ${errorMessage}`,
    };
  }
};
