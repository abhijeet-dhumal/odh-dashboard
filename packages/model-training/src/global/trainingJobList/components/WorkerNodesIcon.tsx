import * as React from 'react';
import { Tooltip, Flex, FlexItem } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { TrainingJob } from '../utils';

type WorkerNodesIconProps = {
  job: TrainingJob;
};

const WorkerNodesIcon: React.FC<WorkerNodesIconProps> = ({ job }) => {
  // Extract worker node information based on job type
  const getWorkerNodeInfo = React.useMemo(() => {
    if (job.kind === 'PyTorchJob') {
      const pytorchJob = job as any;
      const workerReplicas = pytorchJob.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
      const masterReplicas = pytorchJob.spec.pytorchReplicaSpecs.Master?.replicas || 0;
      const totalNodes = workerReplicas + masterReplicas;
      
      // Get resources from Worker spec (if available)
      const workerResources = pytorchJob.spec.pytorchReplicaSpecs.Worker?.template?.spec?.containers?.[0]?.resources;
      const masterResources = pytorchJob.spec.pytorchReplicaSpecs.Master?.template?.spec?.containers?.[0]?.resources;
      
      return {
        numNodes: totalNodes,
        numProcPerNode: 1, // PyTorchJob doesn't specify processes per node explicitly
        workerNodes: workerReplicas,
        masterNodes: masterReplicas,
        resourcesPerNode: workerResources || masterResources || {},
        jobType: 'PyTorchJob'
      };
    } else if (job.kind === 'RayJob') {
      const rayJob = job as any;
      const headNodes = rayJob.spec.rayClusterSpec.headGroupSpec?.replicas || 1;
      const workerNodes = rayJob.spec.rayClusterSpec.workerGroupSpecs?.reduce(
        (total: number, group: any) => total + (group.replicas || 0), 0
      ) || 0;
      const totalNodes = headNodes + workerNodes;
      
      // Get resources from head node spec
      const headResources = rayJob.spec.rayClusterSpec.headGroupSpec?.template?.spec?.containers?.[0]?.resources;
      const workerResources = rayJob.spec.rayClusterSpec.workerGroupSpecs?.[0]?.template?.spec?.containers?.[0]?.resources;
      
      return {
        numNodes: totalNodes,
        numProcPerNode: 1, // Ray manages processes internally
        headNodes,
        workerNodes,
        resourcesPerNode: headResources || workerResources || {},
        jobType: 'RayJob'
      };
    } else if (job.kind === 'TrainJob') {
      const trainJob = job as any;
      const numNodes = trainJob.spec.trainer?.numNodes || 1;
      const numProcPerNode = trainJob.spec.trainer?.numProcPerNode || 1;
      const resourcesPerNode = trainJob.spec.trainer?.resourcesPerNode || {};
      
      return {
        numNodes,
        numProcPerNode,
        resourcesPerNode,
        jobType: 'TrainJob'
      };
    }
    
    return {
      numNodes: 1,
      numProcPerNode: 1,
      resourcesPerNode: {},
      jobType: 'Unknown'
    };
  }, [job]);

  // Calculate resources per process
  const getResourcesPerProcess = React.useMemo(() => {
    const { resourcesPerNode, numProcPerNode } = getWorkerNodeInfo;
    const procPerNode = typeof numProcPerNode === 'string' ? parseInt(numProcPerNode, 10) : numProcPerNode;
    
    const calculatePerProcess = (resource: string | undefined, processes: number): string => {
      if (!resource || processes <= 0) return 'N/A';
      
      // Handle CPU resources (could be in cores or millicores)
      if (resource.endsWith('m')) {
        const millicores = parseInt(resource.slice(0, -1), 10);
        const coresPerProcess = millicores / processes / 1000;
        return coresPerProcess >= 1 ? `${coresPerProcess.toFixed(1)}` : `${Math.round(coresPerProcess * 1000)}m`;
      } else if (!isNaN(parseFloat(resource))) {
        const cores = parseFloat(resource);
        const coresPerProcess = cores / processes;
        return coresPerProcess >= 1 ? `${coresPerProcess.toFixed(1)}` : `${Math.round(coresPerProcess * 1000)}m`;
      }
      
      // Handle memory resources (could be in various units)
      if (resource.match(/^\d+(\.\d+)?[KMGTPE]?i?$/)) {
        // For memory, we'll just show the total per node since calculating per process
        // for memory units can be complex and potentially misleading
        return `${resource} (per node)`;
      }
      
      return resource;
    };

    return {
      cpuRequests: calculatePerProcess(resourcesPerNode.requests?.cpu, procPerNode),
      cpuLimits: calculatePerProcess(resourcesPerNode.limits?.cpu, procPerNode),
      memoryRequests: resourcesPerNode.requests?.memory || 'N/A',
      memoryLimits: resourcesPerNode.limits?.memory || 'N/A',
      gpus: resourcesPerNode.limits?.['nvidia.com/gpu'] || 0
    };
  }, [getWorkerNodeInfo]);

  // Build detailed tooltip content
  const tooltipContent: React.ReactNode = (
    <div style={{ 
      maxWidth: '320px', 
      lineHeight: '1.4', 
      backgroundColor: '#1a1a1a', 
      color: '#ffffff', 
      padding: '12px', 
      borderRadius: '6px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#ffffff' }}>
        Worker Nodes Configuration
      </div>
      
      {/* Node Configuration */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#b3b3b3', 
          marginBottom: '6px', 
          fontWeight: '600' 
        }}>
          Node Configuration
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>Nodes:</span> {getWorkerNodeInfo.numNodes}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>Processes per node:</span> {getWorkerNodeInfo.numProcPerNode}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>Total processes:</span> {getWorkerNodeInfo.numNodes * (typeof getWorkerNodeInfo.numProcPerNode === 'string' ? parseInt(getWorkerNodeInfo.numProcPerNode, 10) : getWorkerNodeInfo.numProcPerNode)}
        </div>
        {getWorkerNodeInfo.jobType === 'PyTorchJob' && getWorkerNodeInfo.workerNodes !== undefined && (
          <>
            <div style={{ fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: '#4da6ff', fontWeight: '600' }}>Worker nodes:</span> {getWorkerNodeInfo.workerNodes}
            </div>
            <div style={{ fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: '#4da6ff', fontWeight: '600' }}>Master nodes:</span> {getWorkerNodeInfo.masterNodes}
            </div>
          </>
        )}
        {getWorkerNodeInfo.jobType === 'RayJob' && getWorkerNodeInfo.headNodes !== undefined && (
          <>
            <div style={{ fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: '#4da6ff', fontWeight: '600' }}>Head nodes:</span> {getWorkerNodeInfo.headNodes}
            </div>
            <div style={{ fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: '#4da6ff', fontWeight: '600' }}>Worker nodes:</span> {getWorkerNodeInfo.workerNodes}
            </div>
          </>
        )}
      </div>

      {/* Resources per Node */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#b3b3b3', 
          marginBottom: '6px', 
          fontWeight: '600' 
        }}>
          Resources per Node
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>CPU Requests:</span> {getWorkerNodeInfo.resourcesPerNode.requests?.cpu || 'N/A'}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>CPU Limits:</span> {getWorkerNodeInfo.resourcesPerNode.limits?.cpu || 'N/A'}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>Memory Requests:</span> {getResourcesPerProcess.memoryRequests}
        </div>
        <div style={{ fontSize: '12px', marginBottom: '3px' }}>
          <span style={{ color: '#4da6ff', fontWeight: '600' }}>Memory Limits:</span> {getResourcesPerProcess.memoryLimits}
        </div>
        {getResourcesPerProcess.gpus > 0 && (
          <div style={{ fontSize: '12px', marginBottom: '3px' }}>
            <span style={{ color: '#4da6ff', fontWeight: '600' }}>GPUs per node:</span> {getResourcesPerProcess.gpus}
          </div>
        )}
      </div>

      {/* Resources per Process */}
      {getWorkerNodeInfo.numProcPerNode > 1 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#b3b3b3', 
            marginBottom: '6px', 
            fontWeight: '600' 
          }}>
            Resources per Process
          </div>
          <div style={{ fontSize: '12px', marginBottom: '3px' }}>
            <span style={{ color: '#4da6ff', fontWeight: '600' }}>CPU Requests:</span> {getResourcesPerProcess.cpuRequests}
          </div>
          <div style={{ fontSize: '12px', marginBottom: '3px' }}>
            <span style={{ color: '#4da6ff', fontWeight: '600' }}>CPU Limits:</span> {getResourcesPerProcess.cpuLimits}
          </div>
        </div>
      )}

      {/* Job Type */}
      <div style={{ 
        fontSize: '11px', 
        color: '#888', 
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #333'
      }}>
        Job Type: {getWorkerNodeInfo.jobType}
      </div>
    </div>
  );

  const displayValue = React.useMemo(() => {
    if (job.kind === 'PyTorchJob') {
      return (job as any).spec.pytorchReplicaSpecs.Worker?.replicas || 0;
    } else if (job.kind === 'RayJob') {
      const rayJob = job as any;
      const headNodes = rayJob.spec.rayClusterSpec.headGroupSpec?.replicas || 1;
      const workerNodes = rayJob.spec.rayClusterSpec.workerGroupSpecs?.reduce(
        (total: number, group: any) => total + (group.replicas || 0), 0
      ) || 0;
      return headNodes + workerNodes;
    } else {
      return (job as any).spec.trainer?.numNodes || 1;
    }
  }, [job]);

  return (
    <Tooltip content={tooltipContent} position="top" maxWidth="350px">
      <div 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center',
          gap: '6px',
          padding: '2px 6px',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          backgroundColor: 'transparent',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--pf-v5-global--BackgroundColor--200)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          spaceItems={{ default: 'spaceItemsXs' }}
        >
          <FlexItem>
            <CubesIcon />
          </FlexItem>
          <FlexItem>{displayValue}</FlexItem>
        </Flex>
      </div>
    </Tooltip>
  );
};

export default WorkerNodesIcon;
