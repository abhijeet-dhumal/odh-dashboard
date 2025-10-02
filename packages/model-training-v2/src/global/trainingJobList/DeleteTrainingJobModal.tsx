import React from 'react';
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import { TrainingJob } from './utils';
import { deletePyTorchJob, deleteTrainJob } from '../../api';

export type DeleteTrainingJobModalProps = {
  trainingJob: TrainingJob;
  onClose: (deleted: boolean) => void;
};

const DeleteTrainingJobModal: React.FC<DeleteTrainingJobModalProps> = ({
  trainingJob,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = trainingJob.metadata.name;

  return (
    <DeleteModal
      title="Delete training job?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete training job"
      onDelete={() => {
        setIsDeleting(true);
        const deleteFunction = trainingJob.kind === 'PyTorchJob' ? deletePyTorchJob : deleteTrainJob;
        deleteFunction(trainingJob.metadata.name, trainingJob.metadata.namespace)
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      This action cannot be undone. All training data and progress will be lost.
    </DeleteModal>
  );
};

export default DeleteTrainingJobModal;
