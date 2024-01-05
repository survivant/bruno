/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import isEqual from 'lodash/isEqual';
import { getEnvironmentVariables } from 'utils/collections';
import { defineCodeMirrorBrunoVariablesMode } from 'utils/common/codemirror';
import StyledWrapper from './StyledWrapper';
import jsonlint from 'jsonlint';
import { JSHINT } from 'jshint';
import stripJsonComments from 'strip-json-comments';

let CodeMirror;
const SERVER_RENDERED = typeof navigator === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true;

if (!SERVER_RENDERED) {
  CodeMirror = require('codemirror');
  window.jsonlint = jsonlint;
  window.JSHINT = JSHINT;
  //This should be done dynamically if possible
  const hintWords = [
    'res',
    'res.status',
    'res.statusText',
    'res.headers',
    'res.body',
    'res.responseTime',
    'res.getStatus()',
    'res.getHeader(name)',
    'res.getHeaders()',
    'res.getBody()',
    'res.getResponseTime()',
    'req',
    'req.url',
    'req.method',
    'req.headers',
    'req.body',
    'req.timeout',
    'req.getUrl()',
    'req.setUrl(url)',
    'req.getMethod()',
    'req.setMethod(method)',
    'req.getHeader(name)',
    'req.getHeaders()',
    'req.setHeader(name, value)',
    'req.setHeaders(data)',
    'req.getBody()',
    'req.setBody(data)',
    'req.setMaxRedirects(maxRedirects)',
    'req.getTimeout()',
    'req.setTimeout(timeout)',
    'bru',
    'bru.cwd()',
    'bru.getEnvName(key)',
    'bru.getProcessEnv(key)',
    'bru.getEnvVar(key)',
    'bru.setEnvVar(key,value)',
    'bru.getVar(key)',
    'bru.setVar(key,value)'
  ];
  CodeMirror.registerHelper('hint', 'brunoJS', (editor, options) => {
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    let startBru = cursor.ch;
    let endBru = startBru;
    while (endBru < currentLine.length && /[\w.]/.test(currentLine.charAt(endBru))) ++endBru;
    while (startBru && /[\w.]/.test(currentLine.charAt(startBru - 1))) --startBru;
    let curWordBru = startBru != endBru && currentLine.slice(startBru, endBru);

    let start = cursor.ch;
    let end = start;
    while (end < currentLine.length && /[\w]/.test(currentLine.charAt(end))) ++end;
    while (start && /[\w]/.test(currentLine.charAt(start - 1))) --start;
    const jsHinter = CodeMirror.hint.javascript;
    let result = jsHinter(editor) || { list: [] };
    result.to = CodeMirror.Pos(cursor.line, end);
    result.from = CodeMirror.Pos(cursor.line, start);
    if (curWordBru) {
      hintWords.forEach((h) => {
        if (h.includes('.') == curWordBru.includes('.') && h.startsWith(curWordBru)) {
          result.list.push(curWordBru.includes('.') ? h.split('.')[1] : h);
        }
      });
      result.list?.sort();
    }
    return result;
  });
  CodeMirror.commands.autocomplete = (cm, hint, options) => {
    cm.showHint({ hint, ...options });
  };
}

const getJsonArrayFromContent = (content) => {
  const traverseJson = (obj, result, parentPath = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      // Find the path based on the parent
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (typeof value === 'object' && value !== null && Object.entries(value).length > 0) {
        // If the value is an object with nested properties, recursively traverse
        traverseJson(value, result, currentPath);
      } else {
        // Split the currentPath into components
        const currentPathComponents = currentPath.split('.');

        // Iterate through components to create nested paths
        currentPathComponents.reduce((path, component, index) => {
          const nestedPath = index === 0 ? component : `${path}.${component}`;

          // Push the nested path to the result array only if the parent is not already present
          if (!result.includes(nestedPath)) {
            result.push(nestedPath);
          }

          return nestedPath;
        }, '');
      }
    });
  };

  let result = [];
  traverseJson(content, result);

  return result;
};

export default class CodeEditor extends React.Component {
  constructor(props) {
    super(props);

    // Keep a cached version of the value, this cache will be updated when the
    // editor is updated, which can later be used to protect the editor from
    // unnecessary updates during the update lifecycle.
    this.cachedValue = props.value || '';
    this.variables = {};

    this.lintOptions = {
      esversion: 11,
      expr: true,
      asi: true
    };
    this.state = {
      checkboxUpdated: false
    };
  }

  componentDidMount() {
    const editor = (this.editor = CodeMirror(this._node, {
      value: this.props.value || '',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      mode: this.props.mode || 'application/ld+json',
      keyMap: 'sublime',
      autoCloseBrackets: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      lint: this.lintOptions,
      readOnly: this.props.readOnly,
      scrollbarStyle: 'overlay',
      theme: this.props.theme === 'dark' ? 'monokai' : 'default',
      extraKeys: {
        'Cmd-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Ctrl-Enter': () => {
          if (this.props.onRun) {
            this.props.onRun();
          }
        },
        'Cmd-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Ctrl-S': () => {
          if (this.props.onSave) {
            this.props.onSave();
          }
        },
        'Cmd-F': 'findPersistent',
        'Ctrl-F': 'findPersistent',
        'Cmd-H': 'replace',
        'Ctrl-H': 'replace',
        Tab: function (cm) {
          cm.getSelection().includes('\n') || editor.getLine(cm.getCursor().line) == cm.getSelection()
            ? cm.execCommand('indentMore')
            : cm.replaceSelection('  ', 'end');
        },
        'Shift-Tab': 'indentLess',
        'Ctrl-Space': 'autocomplete',
        'Cmd-Space': 'autocomplete',
        'Ctrl-Y': 'foldAll',
        'Cmd-Y': 'foldAll',
        'Ctrl-I': 'unfoldAll',
        'Cmd-I': 'unfoldAll'
      },
      foldOptions: {
        widget: (from, to) => {
          var count = undefined;
          var internal = this.editor.getRange(from, to);
          if (this.props.mode == 'application/ld+json') {
            if (this.editor.getLine(from.line).endsWith('[')) {
              var toParse = '[' + internal + ']';
            } else var toParse = '{' + internal + '}';
            try {
              count = Object.keys(JSON.parse(toParse)).length;
            } catch (e) {}
          } else if (this.props.mode == 'application/xml') {
            var doc = new DOMParser();
            try {
              //add header element and remove prefix namespaces for DOMParser
              var dcm = doc.parseFromString(
                '<a> ' + internal.replace(/(?<=\<|<\/)\w+:/g, '') + '</a>',
                'application/xml'
              );
              count = dcm.documentElement.children.length;
            } catch (e) {}
          }
          return count ? `\u21A4${count}\u21A6` : '\u2194';
        }
      }
    }));
    CodeMirror.registerHelper('lint', 'json', function (text) {
      let found = [];
      if (!window.jsonlint) {
        if (window.console) {
          window.console.error('Error: window.jsonlint not defined, CodeMirror JSON linting cannot run.');
        }
        return found;
      }
      let jsonlint = window.jsonlint.parser || window.jsonlint;
      jsonlint.parseError = function (str, hash) {
        let loc = hash.loc;
        found.push({
          from: CodeMirror.Pos(loc.first_line - 1, loc.first_column),
          to: CodeMirror.Pos(loc.last_line - 1, loc.last_column),
          message: str
        });
      };
      try {
        jsonlint.parse(stripJsonComments(text.replace(/(?<!"[^":{]*){{[^}]*}}(?![^"},]*")/g, '1')));
      } catch (e) {}
      return found;
    });
    if (editor) {
      editor.setOption('lint', this.props.mode && editor.getValue().trim().length > 0 ? { esversion: 11 } : false);
      editor.on('change', this._onEdit);
      this.addOverlay();
    }
    if (this.props.mode == 'javascript') {
      editor.on('keyup', function (cm, event) {
        const cursor = editor.getCursor();
        const currentLine = editor.getLine(cursor.line);
        let start = cursor.ch;
        let end = start;
        while (end < currentLine.length && /[^{}();\s\[\]\,]/.test(currentLine.charAt(end))) ++end;
        while (start && /[^{}();\s\[\]\,]/.test(currentLine.charAt(start - 1))) --start;
        let curWord = start != end && currentLine.slice(start, end);
        //Qualify if autocomplete will be shown
        if (
          /^(?!Shift|Tab|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|\s)\w*/.test(event.key) &&
          curWord.length > 0 &&
          !/\/\/|\/\*|.*{{|`[^$]*{|`[^{]*$/.test(currentLine.slice(0, end)) &&
          /(?<!\d)[a-zA-Z\._]$/.test(curWord)
        ) {
          CodeMirror.commands.autocomplete(cm, CodeMirror.hint.brunoJS, { completeSingle: false });
        }
      });
    }

    // Update gutter with CodeMirror-checkboxes after the editor has been initialized
    if (this.props.checkboxEnabled) {
      this.createCheckboxes();
    }
  }

  createCheckboxes = (withUpdate) => {
    const lastLine = this.editor.lineCount();

    // Remove existing CodeMirror-checkboxes
    this.editor.clearGutter('CodeMirror-checkboxes');

    const handleCheckboxChange = (lineNumber, isChecked, key) => {
      const { editor } = this;

      // Check if the line has children
      const hasChildren = this.checkLineHasChildren(lineNumber);
      if (hasChildren) {
        // Handle the children checkboxes (enable/disable them based on the parent checkbox)
        this.handleChildrenCheckboxes(lineNumber, isChecked);
      }

      this.findSelectedLines(lastLine);
    };

    const setCheckboxForLine = (lineNumber, key) => {
      const fileInfo = this.editor.lineInfo(lineNumber);
      if (fileInfo && fileInfo.text.trim() !== '') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        if (this.props.item.response && this.props.item.response.allCheckboxesChecked) {
          checkbox.checked = true;
        }

        checkbox.setAttribute('data-line-number', lineNumber);
        checkbox.setAttribute('data-line-key', key);

        checkbox.addEventListener('change', () => {
          const isChecked = checkbox.checked;
          const lineNumber = parseInt(checkbox.getAttribute('data-line-number'), 10);
          const key = checkbox.getAttribute('data-line-key');

          // Handle checkbox change
          handleCheckboxChange(lineNumber, isChecked, key);
        });

        this.editor.setGutterMarker(lineNumber, 'CodeMirror-checkboxes', checkbox);
      }
    };

    let parentKey = ''; // Initialize parent key
    let parentIndentation = 0;
    let levelStack = [];

    for (let i = 0; i <= lastLine; i++) {
      const fileInfo = this.editor.lineInfo(i);

      if (fileInfo && fileInfo.text) {
        const lineText = fileInfo.text;

        // Exclude lines with only "{" or "}" or "}," or "},{"
        if (/^\s*[\{\}\],\{]+$/.test(lineText)) {
          continue; // Skip this line
        }

        const indentation = lineText.match(/^\s*/)[0].length;

        if (indentation > parentIndentation) {
          // Going deeper, update the parent key
          levelStack.push({ key: parentKey, indentation: parentIndentation });
          if (parentKey !== '') {
            parentKey += '.';
          }
          parentKey += lineText.match(/^\s*"([^"]+)":/)[1];
        } else if (indentation < parentIndentation) {
          // Going back up, update the parent key
          while (levelStack.length > 0 && indentation <= levelStack[levelStack.length - 1].indentation) {
            levelStack.pop();
          }

          if (levelStack.length > 1) {
            parentKey = levelStack[levelStack.length - 1].key + lineText.match(/^\s*"([^"]+)":/)[1];
          } else {
            parentKey = lineText.match(/^\s*"([^"]+)":/)[1];
          }
        } else {
          // We are at the same level
          if (levelStack.length > 1) {
            parentKey = levelStack[levelStack.length - 1].key + '.' + lineText.match(/^\s*"([^"]+)":/)[1];
          } else {
            parentKey = lineText.match(/^\s*"([^"]+)":/)[1];
          }
        }

        // Set the checkbox for this line
        setCheckboxForLine(i, parentKey);

        parentIndentation = indentation;
      }
    }
    if (withUpdate) {
      this.findSelectedLines(lastLine);
    }
  };

  findSelectedLines(lastLine) {
    let array = [];
    let selectedLines = '';
    for (let j = 0; j < lastLine; j++) {
      let lineChecked = false;
      const fileInfo = this.editor.lineInfo(j);
      if (fileInfo && fileInfo.gutterMarkers && fileInfo.gutterMarkers['CodeMirror-checkboxes']) {
        const lineCheckbox = fileInfo.gutterMarkers['CodeMirror-checkboxes'];
        if (lineCheckbox.checked) {
          selectedLines += fileInfo.text;
          lineChecked = true;

          array.push(lineCheckbox.getAttribute('data-line-key'));
        }
      }
    }
    this.setState({ checkboxUpdated: true }, () => {
      this.props.onSelect(array);
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.checkboxEnabled) {
      if (!this.state.checkboxUpdated) {
        if (
          prevProps.item.response == undefined ||
          (this.props.item.response &&
            this.props.item.response.allCheckboxesChecked !== prevProps.item.response.allCheckboxesChecked)
        ) {
          this.createCheckboxes(prevProps.item.response != undefined);
        }
      } else {
        this.setState({ checkboxUpdated: false });
      }
    } else {
      this.editor.clearGutter('CodeMirror-checkboxes');
    }
    // Ensure the changes caused by this update are not interpreted as
    // user-input changes which could otherwise result in an infinite
    // event loop.
    this.ignoreChangeEvent = true;
    if (this.props.schema !== prevProps.schema && this.editor) {
      this.editor.options.lint.schema = this.props.schema;
      this.editor.options.hintOptions.schema = this.props.schema;
      this.editor.options.info.schema = this.props.schema;
      this.editor.options.jump.schema = this.props.schema;
      CodeMirror.signal(this.editor, 'change', this.editor);
    }
    if (this.props.value !== prevProps.value && this.props.value !== this.cachedValue && this.editor) {
      this.cachedValue = this.props.value;
      this.editor.setValue(this.props.value);
      this.jsonArray = getJsonArrayFromContent(JSON.parse(this.props.value));
    }

    if (this.editor) {
      let variables = getEnvironmentVariables(this.props.collection);
      if (!isEqual(variables, this.variables)) {
        this.addOverlay();
      }
    }

    if (this.props.theme !== prevProps.theme && this.editor) {
      this.editor.setOption('theme', this.props.theme === 'dark' ? 'monokai' : 'default');
    }
    this.ignoreChangeEvent = false;
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.off('change', this._onEdit);
      this.editor = null;
    }
  }

  render() {
    if (this.editor) {
      this.editor.refresh();
    }
    return (
      <StyledWrapper
        className="h-full w-full"
        aria-label="Code Editor"
        font={this.props.font}
        ref={(node) => {
          this._node = node;
        }}
      />
    );
  }

  addOverlay = () => {
    const mode = this.props.mode || 'application/ld+json';
    let variables = getEnvironmentVariables(this.props.collection);
    this.variables = variables;

    defineCodeMirrorBrunoVariablesMode(variables, mode);
    this.editor.setOption('mode', 'brunovariables');
  };

  _onEdit = () => {
    if (!this.ignoreChangeEvent && this.editor) {
      this.editor.setOption('lint', this.editor.getValue().trim().length > 0 ? this.lintOptions : false);
      this.cachedValue = this.editor.getValue();
      if (this.props.onEdit) {
        this.props.onEdit(this.cachedValue);
      }
    }
  };

  checkLineHasChildren(lineNumber) {
    const { editor } = this;
    const fileInfo = editor.lineInfo(lineNumber);
    const currentIndentation = fileInfo.text.match(/^\s*/)[0].length;

    for (let i = lineNumber + 1; i <= editor.lineCount(); i++) {
      const nextLineInfo = editor.lineInfo(i);
      if (nextLineInfo) {
        const nextIndentation = nextLineInfo.text.match(/^\s*/)[0].length;
        if (nextIndentation > currentIndentation) {
          // The next line is indented, indicating it's a child of the current line
          return true;
        } else if (nextIndentation <= currentIndentation) {
          // We've reached a line with the same or lesser indentation, meaning no more children
          break;
        }
      }
    }

    return false;
  }

  handleChildrenCheckboxes(lineNumber, isChecked) {
    const { editor } = this;
    const currentIndentation = editor.lineInfo(lineNumber).text.match(/^\s*/)[0].length;

    for (let i = lineNumber + 1; i <= editor.lineCount(); i++) {
      const nextLineInfo = editor.lineInfo(i);
      if (nextLineInfo) {
        const nextIndentation = nextLineInfo.text.match(/^\s*/)[0].length;
        if (nextIndentation > currentIndentation) {
          // The next line is a child, handle its checkbox
          const lineCheckbox = nextLineInfo.gutterMarkers && nextLineInfo.gutterMarkers['CodeMirror-checkboxes'];
          if (lineCheckbox) {
            lineCheckbox.checked = isChecked;
          }
        } else {
          // We've reached a line with the same or lesser indentation, meaning no more children
          break;
        }
      }
    }
  }
}
