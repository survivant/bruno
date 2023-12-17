import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';
import { interpolateString, interpolateVars } from '@usebruno/js/src/interpolate';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import React from 'react';

const CodeView = ({ language, item }) => {
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  let headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  envVars = cloneDeep(envVars);
  collectionVariables = cloneDeep(collectionVariables);
  headers = cloneDeep(headers);

  const auth =
    get(item, 'draft.request.auth') !== undefined ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  if (auth.mode === 'bearer') {
    headers.push({
      name: 'Authorization',
      value: 'Bearer ' + auth.bearer.token,
      enabled: true,
      uid: uuid()
    });
  }

  for (let i = 0; i < headers.length; i++) {
    let headerValue = headers[i].value;

    // Look for variables {{  }}
    let matches = headerValue.match(/{{(.*?)}}/);

    if (matches) {
      headers[i].value = interpolateString(
        headerValue,
        envVars,
        collectionVariables,
        item.collection.processEnvVariables
      );
    }
  }

  let snippet = '';

  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, headers })).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <div>
      <StyledWrapper>
        <CopyToClipboard
          className="copy-to-clipboard"
          text={snippet}
          onCopy={() => toast.success('Copied to clipboard!')}
        >
          <IconCopy size={25} strokeWidth={1.5} />
        </CopyToClipboard>
        <CodeEditor
          readOnly
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          theme={storedTheme}
          mode={lang}
        />
      </StyledWrapper>
    </div>
  );
};

export default CodeView;
