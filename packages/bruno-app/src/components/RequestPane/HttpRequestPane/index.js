import React from 'react';
import find from 'lodash/find';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import { updateCodeEditorContent } from 'providers/ReduxStore/slices/collections';
import QueryParams from 'components/RequestPane/QueryParams';
import RequestHeaders from 'components/RequestPane/RequestHeaders';
import RequestBody from 'components/RequestPane/RequestBody';
import RequestBodyMode from 'components/RequestPane/RequestBody/RequestBodyMode';
import Auth from 'components/RequestPane/Auth';
import AuthMode from 'components/RequestPane/Auth/AuthMode';
import Vars from 'components/RequestPane/Vars';
import Assertions from 'components/RequestPane/Assertions';
import Script from 'components/RequestPane/Script';
import Tests from 'components/RequestPane/Tests';
import StyledWrapper from './StyledWrapper';
import prettier from 'prettier';
import get from 'lodash/get';

const HttpRequestPane = ({ item, collection, leftPaneWidth }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const selectTab = (tab) => {
    dispatch(
      updateRequestPaneTab({
        uid: item.uid,
        requestPaneTab: tab
      })
    );
  };

  const getTabPanel = (tab) => {
    switch (tab) {
      case 'params': {
        return <QueryParams item={item} collection={collection} />;
      }
      case 'body': {
        return <RequestBody item={item} collection={collection} />;
      }
      case 'headers': {
        return <RequestHeaders item={item} collection={collection} />;
      }
      case 'auth': {
        return <Auth item={item} collection={collection} />;
      }
      case 'vars': {
        return <Vars item={item} collection={collection} />;
      }
      case 'assert': {
        return <Assertions item={item} collection={collection} />;
      }
      case 'script': {
        return <Script item={item} collection={collection} />;
      }
      case 'tests': {
        return <Tests item={item} collection={collection} />;
      }
      default: {
        return <div className="mt-4">404 | Not found</div>;
      }
    }
  };

  if (!activeTabUid) {
    return <div>Something went wrong</div>;
  }

  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  if (!focusedTab || !focusedTab.uid || !focusedTab.requestPaneTab) {
    return <div className="pb-4 px-4">An error occurred!</div>;
  }

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === focusedTab.requestPaneTab
    });
  };

  const handlePrettyPrintChange = (event) => {
    if (event.target.checked) {
      // Appel de la fonction de formatage ici
      formatCodeInCodeEditor();
    }
    // Autres actions si la case à cocher est désélectionnée
  };

  const formatCodeInCodeEditor = () => {
    // Utilisez la bibliothèque de formatage de code de votre choix ici
    // Par exemple, si vous utilisez Prettier :

    const body = get(item, 'request.body');
    const bodyMode = get(item, 'request.body.mode');

    //
    const formattedCode = JSON.stringify(body, null, 2);
    // Ensuite, utilisez dispatch pour mettre à jour le contenu du CodeEditor
    dispatch(updateCodeEditorContent(formattedCode));
  };

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex flex-wrap items-center tabs" role="tablist">
        <div className={getTabClassname('params')} role="tab" onClick={() => selectTab('params')}>
          Query
        </div>
        <div className={getTabClassname('body')} role="tab" onClick={() => selectTab('body')}>
          Body
        </div>
        <div className={getTabClassname('headers')} role="tab" onClick={() => selectTab('headers')}>
          Headers
        </div>
        <div className={getTabClassname('auth')} role="tab" onClick={() => selectTab('auth')}>
          Auth
        </div>
        <div className={getTabClassname('vars')} role="tab" onClick={() => selectTab('vars')}>
          Vars
        </div>
        <div className={getTabClassname('script')} role="tab" onClick={() => selectTab('script')}>
          Script
        </div>
        <div className={getTabClassname('assert')} role="tab" onClick={() => selectTab('assert')}>
          Assert
        </div>
        <div className={getTabClassname('tests')} role="tab" onClick={() => selectTab('tests')}>
          Tests
        </div>
        {/* Nouvelle ligne pour Pretty Print */}
        <div className="flex items-center">
          <label htmlFor="prettyPrintCheckbox">Pretty print</label>
          <input type="checkbox" id="prettyPrintCheckbox" onChange={handlePrettyPrintChange} />
        </div>
        {focusedTab.requestPaneTab === 'body' ? (
          <div className="flex flex-grow justify-end items-center">
            <RequestBodyMode item={item} collection={collection} />
          </div>
        ) : null}
      </div>
      <section
        className={`flex w-full ${['script', 'vars', 'auth'].includes(focusedTab.requestPaneTab) ? '' : 'mt-5'}`}
      >
        {getTabPanel(focusedTab.requestPaneTab)}
      </section>
    </StyledWrapper>
  );
};

export default HttpRequestPane;
