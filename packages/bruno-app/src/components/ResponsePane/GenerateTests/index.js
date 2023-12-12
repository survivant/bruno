import React, { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { IconListCheck } from '@tabler/icons';
import GenerateTestsModal from 'components/ResponsePane/GenerateTests/GenerateTestsModal';

const GenerateTests = ({ item }) => {
  const response = item.response || {};
  const [generateTestsModalOpen, setGenerateTestsModalOpen] = useState(false);

  const generateTests = () => {
    setGenerateTestsModalOpen(true);
  };

  return (
    <StyledWrapper className="ml-4 flex items-center">
      {generateTestsModalOpen && <GenerateTestsModal item={item} onClose={() => setGenerateTestsModalOpen(false)} />}
      <button onClick={generateTests} disabled={!response.dataBuffer} title="Generate tests from response">
        <IconListCheck size={16} strokeWidth={1.5} />
      </button>
    </StyledWrapper>
  );
};
export default GenerateTests;
