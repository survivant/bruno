import Modal from 'components/Modal/index';
import React from 'react';
import GeneratedTests from './GeneratedTests';
import StyledWrapper from './StyledWrapper';

const GenerateTestModal = ({ item, selectedLines, onClose }) => {
  return (
    <Modal size="lg" title="Tests generated" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="flex w-full">
          <div className="flex-grow p-4">
            <GeneratedTests item={item} selectedLines={selectedLines} />
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateTestModal;
