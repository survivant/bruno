import React, { useState } from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneTab } from 'providers/ReduxStore/slices/tabs';
import QueryResult from './QueryResult';
import Overlay from './Overlay';
import Placeholder from './Placeholder';
import ResponseHeaders from './ResponseHeaders';
import StatusCode from './StatusCode';
import ResponseTime from './ResponseTime';
import ResponseSize from './ResponseSize';
import Timeline from './Timeline';
import TestResults from './TestResults';
import TestResultsLabel from './TestResultsLabel';
import StyledWrapper from './StyledWrapper';
import ResponseSave from 'src/components/ResponsePane/ResponseSave';
import GenerateTests from 'components/ResponsePane/GenerateTests';
import CodeEditorCheckboxes from 'components/ResponsePane/CodeEditorCheckboxes';
import cloneDeep from 'lodash/cloneDeep';

const ResponsePane = ({ rightPaneWidth, item, collection }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isLoading = ['queued', 'sending'].includes(item.requestState);
  const [selectedRows, setSelectedRows] = useState([]);

  const selectTab = (tab) => {
    dispatch(
      updateResponsePaneTab({
        uid: item.uid,
        responsePaneTab: tab
      })
    );
  };

  let itemCloned = cloneDeep(item);

  const response = item.response || {};

  const handleCheckboxChange = (checkedLines) => {};

  const handleButtonClick = () => {
    return selectedRows;
  };

  const [currentItem, setCurrentItem] = useState(itemCloned);

  const handleToggleAllCheckboxes = (isChecked) => {
    const updatedResponse = {
      ...currentItem.response,
      allCheckboxesChecked: isChecked
    };

    setCurrentItem((prevItem) => ({
      ...prevItem,
      response: updatedResponse
    }));
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'response': {
        return (
          <QueryResult
            item={currentItem}
            collection={collection}
            width={rightPaneWidth}
            data={response.data}
            dataBuffer={response.dataBuffer}
            headers={response.headers}
            error={response.error}
            key={item.filename}
            onCheckboxChange={handleCheckboxChange}
            onToggleAllCheckboxes={handleToggleAllCheckboxes}
            onSelect={setSelectedRows}
          />
        );
      }
      case 'headers': {
        return <ResponseHeaders headers={response.headers} />;
      }
      case 'timeline': {
        return <Timeline request={item.requestSent} response={item.response} />;
      }
      case 'tests': {
        return <TestResults results={item.testResults} assertionResults={item.assertionResults} />;
      }

      default: {
        return <div>404 | Not found</div>;
      }
    }
  };

  if (isLoading && !item.response) {
    return (
      <StyledWrapper className="flex flex-col h-full relative">
        <Overlay item={item} collection={collection} />
      </StyledWrapper>
    );
  }

  if (!item.response) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Placeholder />
      </StyledWrapper>
    );
  }

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.responsePaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.responsePaneTab
    });
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center pl-3 pr-4 tabs" role="tablist">
        <div className={getTabClassname('response')} role="tab" onClick={() => selectTab('response')}>
          Response
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
          {response.headers?.length > 0 && <sup className="ml-1 font-medium">{response.headers.length}</sup>}
        </div>
        <div className={getTabClassname('timeline')} role="tab" onClick={() => selectTab('timeline')}>
          Timeline
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          <TestResultsLabel results={item.testResults} assertionResults={item.assertionResults} />
        </div>
        {!isLoading ? (
          <div className="flex flex-grow justify-end items-center">
            <ResponseSave item={item} />
            <StatusCode status={response.status} />
            <ResponseTime duration={response.duration} />
            <ResponseSize size={response.size} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap ">
        {!isLoading && focusedTab.responsePaneTab == 'response' ? (
          <div className="flex flex-grow ">
            <CodeEditorCheckboxes
              item={currentItem}
              onCheckboxChange={handleCheckboxChange}
              onToggleAllCheckboxes={handleToggleAllCheckboxes}
            />
            <GenerateTests item={currentItem} onButtonClick={handleButtonClick} />
          </div>
        ) : null}
      </div>
      <section
        className={`flex flex-grow relative pl-3 pr-4 ${focusedTab.responsePaneTab === 'response' ? '' : 'mt-4'}`}
      >
        {isLoading ? <Overlay item={item} collection={collection} /> : null}
        {getTabPanel(focusedTab.responsePaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default ResponsePane;
