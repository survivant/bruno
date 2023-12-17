import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { IconSquare, IconSquareCheck } from '@tabler/icons';

const CodeEditorCheckboxes = ({ item, onCheckboxChange, onToggleAllCheckboxes }) => {
  const response = item.response || {};

  const [isChecked, setIsChecked] = useState(false);

  const handleClick = () => {
    setIsChecked((prevChecked) => !prevChecked);
    if (onToggleAllCheckboxes && typeof onToggleAllCheckboxes === 'function') {
      const isChecked = !response.allCheckboxesChecked;
      onToggleAllCheckboxes(isChecked);
    }
  };

  return (
    <StyledWrapper className="ml-4 flex items-center">
      <button onClick={handleClick} title="Select/Unselect checkboxes">
        {isChecked ? <IconSquareCheck size={20} strokeWidth={1.5} /> : <IconSquare size={20} strokeWidth={1.5} />}
      </button>
    </StyledWrapper>
  );
};
export default CodeEditorCheckboxes;
