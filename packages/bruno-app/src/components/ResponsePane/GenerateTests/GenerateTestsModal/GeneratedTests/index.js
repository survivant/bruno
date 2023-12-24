import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import React from 'react';

const GeneratedTests = ({ item, selectedLines }) => {
  // Check if item.response is defined; if not, set response to an empty object
  let response = item.response || {};
  const traverseJson = (obj, selectedLines, parentPath = '') => {
    let result = '';
    if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        // Find the path based on the parent
        const currentPath = parentPath ? `${parentPath}.${key}` : key;

        // check in the value is an array
        if (typeof value === 'object' && value !== null) {
          if (Object.entries(value).length > 0) {
            result += traverseJson(value, selectedLines, currentPath);
          } else {
            if (selectedLines.includes(key)) {
              result += `test("${key} should be empty", function() {
    const data = res.getBody();
    expect(data.${key}).to.be.empty;
  });\n\n`;
            }
          }
        } else {
          // we should put between [''] the words that contains "-"
          let currentPathComponents = currentPath.split('.');

          currentPathComponents = currentPathComponents.map((component) => {
            if (component.includes('-')) {
              return `['${component}']`;
            } else {
              return `.${component}`;
            }
          });

          let currentPathFormatted = currentPathComponents.join('');

          if (selectedLines.includes(currentPath)) {
            result += `test("${currentPath} should equal", function() {
    const data = res.getBody();
    expect(data${currentPathFormatted}).to.equal("${value}");
  });\n\n`;
          }
        }
      });
    }

    return result;
  };

  let result = `test("Response Status should be ${response.status}", function() {
  expect(res.getStatus()).to.equal(${response.status});
});\n\n`;

  result += traverseJson(response.data, selectedLines);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CopyToClipboard text={result} onCopy={() => toast.success('Copied to clipboard!')}>
          <IconCopy size={25} strokeWidth={1.5} />
        </CopyToClipboard>
      </div>
      <div>
        <pre>{result}</pre>
      </div>
    </>
  );
};

export default GeneratedTests;
