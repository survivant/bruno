import React from 'react';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconCheckbox } from '@tabler/icons';

const CodeEditorCheckboxes = ({ item }) => {
  const response = item.response || {};

  const saveResponseToFile = () => {
    toast('Coming soon');
  };

  return (
    <StyledWrapper className="ml-4 flex items-center">
      <button onClick={saveResponseToFile} disabled={!response.dataBuffer} title="Select/Unselect checkboxes">
        <IconCheckbox size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default CodeEditorCheckboxes;
