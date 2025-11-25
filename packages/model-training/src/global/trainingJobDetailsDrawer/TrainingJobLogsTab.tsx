import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { FileCodeIcon, PlayIcon, PauseIcon } from '@patternfly/react-icons';
import { commonFetchText, getK8sResourceURL } from '@openshift/dynamic-plugin-sdk-utils';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { TrainJobKind } from '../../k8sTypes';
import { getPodsForTrainJob } from '../../api';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';

type TrainingJobLogsTabProps = {
  job: TrainJobKind;
};

const TrainingJobLogsTab: React.FC<TrainingJobLogsTabProps> = ({ job }) => {
  const [pods, setPods] = React.useState<PodKind[]>([]);
  const [podsLoaded, setPodsLoaded] = React.useState(false);
  const [podsError, setPodsError] = React.useState<string | undefined>();
  const [selectedPodName, setSelectedPodName] = React.useState<string>('');
  const [logs, setLogs] = React.useState<string>('');
  const [logsLoaded, setLogsLoaded] = React.useState(false);
  const [logsError, setLogsError] = React.useState<string | undefined>();
  const [isStreaming, setIsStreaming] = React.useState(true);
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch pods
  React.useEffect(() => {
    setPodsLoaded(false);
    setPodsError(undefined);

    getPodsForTrainJob(job.metadata.namespace, job.metadata.name)
      .then((fetchedPods) => {
        setPods(fetchedPods);
        setPodsLoaded(true);
        // Auto-select first pod
        if (fetchedPods.length > 0 && !selectedPodName) {
          setSelectedPodName(fetchedPods[0].metadata?.name || '');
        }
      })
      .catch((err) => {
        setPodsError(err.message || 'Failed to fetch pods');
        setPodsLoaded(true);
      });
  }, [job.metadata.namespace, job.metadata.name, selectedPodName]);

  // Function to fetch logs
  const fetchLogs = React.useCallback(
    (podName: string, initialLoad = false) => {
      if (initialLoad) {
        setLogsLoaded(false);
        setLogsError(undefined);
        setLogs('');
      }

      const selectedPod = pods.find((p) => p.metadata?.name === podName);
      if (!selectedPod) {
        return;
      }

      // Get the first container name
      const containerName =
        selectedPod.spec?.containers?.[0]?.name ||
        selectedPod.status?.containerStatuses?.[0]?.name;

      if (!containerName) {
        setLogsError('No containers found in pod');
        setLogsLoaded(true);
        return;
      }

      // Check container status to determine if we need previous logs
      const containerStatus = selectedPod.status?.containerStatuses?.find(
        (cs) => cs.name === containerName,
      );

      const isTerminated = containerStatus?.state?.terminated !== undefined;
      const isRunning = containerStatus?.state?.running !== undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasRestarted = ((containerStatus as any)?.restartCount || 0) > 0;

      // Only use previous=true if container has restarted (has a previous instance)
      const usePrevious = hasRestarted;

      const tailParam = '&tailLines=1000';

      const fetchLogsRequest = (usePrev: boolean): Promise<string> => {
        const queryPath = `log?container=${containerName}${tailParam}${usePrev ? '&previous=true' : ''}`;
        const url = getK8sResourceURL(PodModel, undefined, {
          name: podName,
          ns: job.metadata.namespace,
          path: queryPath,
        });
        return commonFetchText(url, undefined, undefined, true);
      };

      fetchLogsRequest(usePrevious)
        .then((logText) => {
          setLogs(logText || '');
          setLogsLoaded(true);
          
          // Auto-scroll to bottom if streaming
          if (isStreaming && logContainerRef.current) {
            setTimeout(() => {
              if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
              }
            }, 100);
          }
        })
        .catch((err) => {
          const errorMsg = err.message || err.toString();
          const isCRIOCleanup = errorMsg.includes('unable to retrieve container logs for cri-o://');

          // If we tried with previous=true and failed, try again with previous=false
          if (usePrevious && !isCRIOCleanup) {
            fetchLogsRequest(false)
              .then((logText) => {
                setLogs(logText || '');
                setLogsLoaded(true);
              })
              .catch((retryErr) => {
                const retryErrorMsg = retryErr.message || retryErr.toString();
                const isRetryCRIOCleanup = retryErrorMsg.includes(
                  'unable to retrieve container logs for cri-o://',
                );

                if (isRetryCRIOCleanup) {
                  setLogsError(
                    'Logs are no longer available. The container runtime has cleaned up logs for this completed pod.',
                  );
                } else {
                  setLogsError('Unable to retrieve logs.');
                }
                setLogsLoaded(true);
              });
          } else {
            if (isCRIOCleanup) {
              setLogsError(
                'Logs are no longer available. The container runtime has cleaned up logs for this completed pod.',
              );
            } else {
              setLogsError(errorMsg || 'Failed to fetch logs');
            }
            setLogsLoaded(true);
          }
        });

      // Return whether pod is running (for polling decision)
      return isRunning && !isTerminated;
    },
    [pods, job.metadata.namespace, isStreaming],
  );

  // Initial fetch when pod is selected
  React.useEffect(() => {
    if (!selectedPodName || pods.length === 0) {
      return;
    }

    fetchLogs(selectedPodName, true);
  }, [selectedPodName, pods, fetchLogs]);

  // Polling for running pods
  React.useEffect(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (!selectedPodName || !isStreaming || pods.length === 0) {
      return;
    }

    const selectedPod = pods.find((p) => p.metadata?.name === selectedPodName);
    if (!selectedPod) {
      return;
    }

    // Check if pod is running
    const isRunning =
      selectedPod.status?.phase === 'Running' ||
      selectedPod.status?.containerStatuses?.some((cs) => cs.state?.running !== undefined);

    if (isRunning) {
      // Poll every 5 seconds for running pods
      pollIntervalRef.current = setInterval(() => {
        fetchLogs(selectedPodName, false);
      }, 5000);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedPodName, isStreaming, pods, fetchLogs]);

  if (!podsLoaded) {
    return (
      <EmptyState headingLevel="h3" titleText="Loading pods...">
        <Spinner size="lg" />
      </EmptyState>
    );
  }

  if (podsError) {
    return (
      <Alert variant="danger" title="Error loading pods" isInline>
        {podsError}
      </Alert>
    );
  }

  if (pods.length === 0) {
    return (
      <EmptyState headingLevel="h3" titleText="No pods found" icon={FileCodeIcon}>
        <EmptyStateBody>
          No pods are associated with this training job yet. Logs will be available once the job
          starts running.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const selectedPod = pods.find((p) => p.metadata?.name === selectedPodName);
  const containerName = selectedPod?.spec?.containers?.[0]?.name;

  return (
    <div style={{ padding: '16px 0' }}>
      <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsFlexEnd' }}>
        <FlexItem flex={{ default: 'flex_1' }}>
          <FormGroup label="Select pod" fieldId="pod-selector">
            <FormSelect
              id="pod-selector"
              value={selectedPodName}
              onChange={(_event, value) => setSelectedPodName(value)}
              aria-label="Select pod"
            >
              {pods.map((pod) => (
                <FormSelectOption
                  key={pod.metadata?.uid}
                  value={pod.metadata?.name || ''}
                  label={pod.metadata?.name || ''}
                />
              ))}
            </FormSelect>
          </FormGroup>
        </FlexItem>
        <FlexItem>
          <Button
            variant="secondary"
            onClick={() => setIsStreaming(!isStreaming)}
            icon={isStreaming ? <PauseIcon /> : <PlayIcon />}
            aria-label={isStreaming ? 'Pause log streaming' : 'Resume log streaming'}
          >
            {isStreaming ? 'Pause' : 'Resume'}
          </Button>
        </FlexItem>
      </Flex>
      
      {containerName && (
        <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '0.875rem', color: '#6a6e73' }}>
          Container: <strong>{containerName}</strong>
          {isStreaming && (
            <span style={{ marginLeft: '16px', color: '#3e8635' }}>
              ● Streaming logs (refreshes every 5s)
            </span>
          )}
        </div>
      )}

      {!logsLoaded && (
        <EmptyState headingLevel="h3" titleText="Loading logs...">
          <Spinner size="lg" />
        </EmptyState>
      )}

      {logsError && (
        <Alert variant="danger" title="Error loading logs" isInline>
          {logsError}
        </Alert>
      )}

      {logsLoaded && !logsError && (
        <div style={{ marginTop: '16px' }}>
          {logs ? (
            <div
              ref={logContainerRef}
              style={{
                maxHeight: '600px',
                overflow: 'auto',
                border: '1px solid var(--pf-v6-global--BorderColor--100)',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5',
                position: 'relative',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  whiteSpace: 'pre',
                  wordWrap: 'normal',
                  overflow: 'visible',
                  fontFamily:
                    'var(--pf-v6-global--FontFamily--monospace, "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace)',
                  fontSize: '0.6875rem',
                  lineHeight: '1.3',
                  color: '#4a4a4a',
                }}
              >
                {logs}
              </pre>
            </div>
          ) : (
            <Alert variant="info" title="No logs available" isInline>
              This pod has no logs yet or logs have been cleared.
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default TrainingJobLogsTab;

