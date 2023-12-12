import Modal from 'components/Modal/index';
import React, { useState } from 'react';
import GeneratedTests from './GeneratedTests';
import StyledWrapper from './StyledWrapper';

const GenerateTestModal = ({ item, onClose }) => {
  return (
    <Modal size="lg" title="Tests generated" handleCancel={onClose} hideFooter={true}>
      <StyledWrapper>
        <div className="flex w-full">
          <div className="flex-grow p-4">
            <GeneratedTests item={item} />
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateTestModal;
