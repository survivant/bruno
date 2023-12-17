import React, { useEffect, useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { IconListCheck } from '@tabler/icons';
import GenerateTestsModal from 'components/ResponsePane/GenerateTests/GenerateTestsModal';
import toast from 'react-hot-toast';

const GenerateTests = ({ item, onButtonClick }) => {
  const [generateTestsModalOpen, setGenerateTestsModalOpen] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);

  useEffect(() => {
    if (onButtonClick && typeof onButtonClick === 'function') {
      const selectedCheckboxes = onButtonClick();

      setSelectedLines(selectedCheckboxes);
    }
  }, [onButtonClick]);

  const generateTests = () => {
    setGenerateTestsModalOpen(true);
  };

  return (
    <StyledWrapper className="ml-4 flex items-center">
      {generateTestsModalOpen && (
        <GenerateTestsModal
          item={item}
          selectedLines={selectedLines}
          onClose={() => setGenerateTestsModalOpen(false)}
        />
      )}
      <button onClick={generateTests} title="Generate tests from response">
        <IconListCheck size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default GenerateTests;
