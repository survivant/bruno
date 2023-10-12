import { IconCopy, IconDatabase, IconEdit, IconTrash } from '@tabler/icons';
import Toggle from 'react-toggle';
import { useState } from 'react';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import RenameEnvironment from '../../RenameEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import StyledWrapper from './StyledWrapper';

const EnvironmentDetails = ({ environment, collection }) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);

  // État pour le toggle
  const [tofuIsReady, setTofuIsReady] = useState(false);

  // Fonction pour mettre à jour l'état du toggle
  const handleTofuChange = () => {
    setTofuIsReady(!tofuIsReady);
  };

  return (
    <StyledWrapper>
      <div className="px-6 flex-grow flex flex-col pt-6" style={{ maxWidth: '700px' }}>
        {openEditModal && (
          <RenameEnvironment
            onClose={() => setOpenEditModal(false)}
            environment={environment}
            collection={collection}
          />
        )}
        {openDeleteModal && (
          <DeleteEnvironment
            onClose={() => setOpenDeleteModal(false)}
            environment={environment}
            collection={collection}
          />
        )}
        {openCopyModal && (
          <CopyEnvironment onClose={() => setOpenCopyModal(false)} environment={environment} collection={collection} />
        )}
        <div className="flex">
          <div className="flex flex-grow items-center">
            <IconDatabase className="cursor-pointer" size={20} strokeWidth={1.5} />
            <span className="ml-1 font-semibold">{environment.name}</span>
          </div>
          <div className="flex gap-x-4 pl-4">
            <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenEditModal(true)} />
            <IconCopy className="cursor-pointer" size={20} strokeWidth={1.5} onClick={() => setOpenCopyModal(true)} />
            <IconTrash
              className="cursor-pointer"
              size={20}
              strokeWidth={1.5}
              onClick={() => setOpenDeleteModal(true)}
            />
          </div>
        </div>

        <div>
          <EnvironmentVariables
            key={environment.uid}
            environment={environment}
            collection={collection}
            tofuIsReady={tofuIsReady} // Passez l'état du toggle
          />
          <label>
            <Toggle defaultChecked={tofuIsReady} icons={false} onChange={handleTofuChange} />
            <span>json</span>
          </label>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentDetails;
