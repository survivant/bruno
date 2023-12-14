import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconCheckbox } from '@tabler/icons';

const CodeEditorCheckboxes = ({ item, onCheckboxChange }) => {
  const response = item.response || {};

  const handleClick = () => {
    toast('Coming soon');
  };
  // Fonction pour gérer le changement d'état de la case à cocher
  const handleCheckboxChange = () => {
    console.log('CodeEditorCheckboxes:handleCheckboxChange');
    if (onCheckboxChange && typeof onCheckboxChange === 'function') {
      onCheckboxChange('all');
    }
  };

  return (
    <StyledWrapper className="ml-4 flex items-center">
      <button onClick={handleCheckboxChange} disabled={!response.dataBuffer} title="Select/Unselect checkboxes">
        <IconCheckbox size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default CodeEditorCheckboxes;
