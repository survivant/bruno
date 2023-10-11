import jsyaml from 'js-yaml';
const jsf = require('json-schema-faker');
const xmlbuilder = require('xmlbuilder');
import each from 'lodash/each';
import get from 'lodash/get';
import fileDialog from 'file-dialog';
import { uuid } from 'utils/common';
import { BrunoError } from 'utils/common/error';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection } from './common';

const readFile = (files) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      try {
        // Parse the YAML content once it has been read
        const yamlData = e.target.result;
        const parsedYaml = jsyaml.load(yamlData);
        resolve(parsedYaml);
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = (err) => reject(err);

    // Read the selected file as text
    fileReader.readAsText(files[0]);
  });
};

const addSuffixToDuplicateName = (item, index, allItems) => {
  // Check if the request name already exists and if so, add a number suffix
  const nameSuffix = allItems.reduce((nameSuffix, otherItem, otherIndex) => {
    if (otherItem.name === item.name && otherIndex < index) {
      nameSuffix++;
    }
    return nameSuffix;
  }, 0);
  return nameSuffix !== 0 ? `${item.name}_${nameSuffix}` : item.name;
};

const regexVariable = new RegExp('{{.*?}}', 'g');

const normalizeVariables = (value) => {
  const variables = value.match(regexVariable) || [];
  each(variables, (variable) => {
    value = value.replace(variable, variable.replace('_.', '').replaceAll(' ', ''));
  });
  return value;
};

const transformOpenApiRequestItem = (request, index, allRequests) => {
  const name = addSuffixToDuplicateName(request, index, allRequests);

  const brunoRequestItem = {
    uid: uuid(),
    name,
    type: 'http-request',
    request: {
      url: request.url,
      method: request.method,
      auth: {
        mode: 'none',
        basic: null,
        bearer: null
      },
      headers: [],
      params: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      }
    }
  };

  each(request.headers, (header) => {
    brunoRequestItem.request.headers.push({
      uid: uuid(),
      name: header.name,
      value: header.value,
      description: header.description,
      enabled: !header.disabled
    });
  });

  each(request.parameters, (param) => {
    brunoRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: param.value,
      description: param.description,
      enabled: !param.disabled
    });
  });

  const authType = get(request, 'authentication.type', '');

  if (authType === 'basic') {
    brunoRequestItem.request.auth.mode = 'basic';
    brunoRequestItem.request.auth.basic = {
      username: normalizeVariables(get(request, 'authentication.username', '')),
      password: normalizeVariables(get(request, 'authentication.password', ''))
    };
  } else if (authType === 'bearer') {
    brunoRequestItem.request.auth.mode = 'bearer';
    brunoRequestItem.request.auth.bearer = {
      token: normalizeVariables(get(request, 'authentication.token', ''))
    };
  }

  const mimeType = get(request, 'body.mimeType', '').split(';')[0];

  if (mimeType === 'application/json') {
    brunoRequestItem.request.body.mode = 'json';
    brunoRequestItem.request.body.json = request.body.text;
  } else if (mimeType === 'application/x-www-form-urlencoded') {
    brunoRequestItem.request.body.mode = 'formUrlEncoded';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.formUrlEncoded.push({
        uid: uuid(),
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'multipart/form-data') {
    brunoRequestItem.request.body.mode = 'multipartForm';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.multipartForm.push({
        uid: uuid(),
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'text/plain') {
    brunoRequestItem.request.body.mode = 'text';
    brunoRequestItem.request.body.text = request.body.text;
  } else if (mimeType === 'text/xml') {
    brunoRequestItem.request.body.mode = 'xml';
    brunoRequestItem.request.body.xml = request.body.text;
  } else if (mimeType === 'application/graphql') {
    brunoRequestItem.type = 'graphql-request';
    brunoRequestItem.request.body.mode = 'graphql';
    brunoRequestItem.request.body.graphql = parseGraphQL(request.body.text);
  }

  return brunoRequestItem;
};

const importOpenApiV3Collection = (brunoParent, yaml) => {
  brunoParent.items = brunoParent.items || [];

  // Set the name on the parent
  if (yaml.info && yaml.info.title) {
    brunoParent.name = yaml.info.title;
  }

  let serverUrl = '';
  if (yaml.servers && yaml.servers.length > 0) {
    serverUrl = yaml.servers[0].url;
  }

  // Function to get the root of a path
  function getRoot(path) {
    const parts = path.split('/');
    return parts[1]; // The root is the second element after the first slash
  }

  // Function to generate random data for a schema
  function generateRandomData(schema) {
    let randomData = {};

    if (schema.properties) {
      for (const key in schema.properties) {
        const property = schema.properties[key];

        if (property.$ref) {
          // If the property is a reference, use the actual schema from objectItemsWithPrefix
          const referenceKey = property.$ref;
          if (objectItemsWithPrefix[referenceKey]) {
            randomData[key] = generateRandomData(objectItemsWithPrefix[referenceKey]);
          }
        } else if (property.type === 'array' && property.items && property.items.$ref) {
          // If the property is of type "array" with a reference to "items.$ref"
          const referenceKey = property.items.$ref;
          if (objectItemsWithPrefix[referenceKey]) {
            // Recursively call generateRandomData with the schema of the item
            randomData[key] = [generateRandomData(objectItemsWithPrefix[referenceKey])];
          }
        } else {
          // Generate random data based on the property type
          randomData[key] = jsf.generate(property);
        }
      }
    } else if (schema.$ref) {
      const referenceKey = schema.$ref;
      if (objectItemsWithPrefix[referenceKey]) {
        randomData = generateRandomData(objectItemsWithPrefix[referenceKey]);
      }
    }

    return randomData; //JSON.stringify(randomData, null, 2).replace(/\n/g, '');
  }

  function getSchemaName(schemaRef) {
    const parts = schemaRef['$ref'].split('/');
    return parts[parts.length - 1];
  }

  function createFolderStructure(parent, levels, pathObject, serverUrl, objectItemsWithPrefix) {
    if (levels.length === 0) {
      // If we have reached the end of levels, add a brunoRequestItem for each operation
      for (const operationName in pathObject) {
        const operation = pathObject[operationName];

        const brunoRequestItem = {
          uid: uuid(),
          name: operation.summary || '',
          type: 'http-request',
          request: {
            url: serverUrl,
            method: operationName.toUpperCase(),
            headers: [],
            params: [],
            body: {
              mode: 'none',
              json: null,
              text: null,
              xml: null,
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        };
        parent.items.push(brunoRequestItem);

        // Generate random data
        if (operation.requestBody && operation.requestBody.content) {
          const content = operation.requestBody.content;

          for (const contentType in content) {
            const contentObject = content[contentType];

            let randomData = generateRandomData(contentObject.schema);

            if (contentType === 'application/xml') {
              const schemaName = getSchemaName(contentObject.schema);

              const xmlObject = {
                [schemaName]: randomData
              };

              const xmlData = xmlbuilder.create(xmlObject).end({ pretty: true });
              brunoRequestItem.request.body.xml = xmlData;
            } else if (contentType === 'application/json') {
              brunoRequestItem.request.body.json = '"' + randomData + '"';
              brunoRequestItem.request.body.json = randomData;
              brunoRequestItem.request.body.json = JSON.stringify(randomData);
            }
          }

          // Set the mode on the first content type in the list
          const firstContentType = Object.keys(content)[0];
          if (firstContentType === 'application/xml') {
            brunoRequestItem.request.body.mode = 'xml';
            brunoRequestItem.request.body.text = brunoRequestItem.request.xml;
          } else if (firstContentType === 'application/json') {
            brunoRequestItem.request.body.mode = 'json';
            brunoRequestItem.request.body.text = brunoRequestItem.request.json;
          }
        }
      }
    } else {
      // Otherwise, create a brunoFolderItem for the current level
      const currentLevel = levels[0];
      let folderItem = parent.items.find((item) => item.name === currentLevel);

      if (!folderItem) {
        folderItem = {
          uid: uuid(),
          name: currentLevel,
          type: 'folder',
          items: []
        };
        parent.items.push(folderItem);
      }

      // Call the function recursively for the remaining levels
      createFolderStructure(folderItem, levels.slice(1), pathObject, serverUrl, objectItemsWithPrefix);
    }
  }

  // Function to extract "object" type items with a prefix
  function extractObjectsWithPrefix(obj, currentPath = '') {
    const objects = {};
    for (const key in obj) {
      const path = currentPath ? `${currentPath}.${key}` : `#/components/schemas/${key}`;
      if (obj[key] && typeof obj[key] === 'object') {
        if (obj[key].type === 'object') {
          objects[path] = obj[key];
        }
        const nestedObjects = extractObjectsWithPrefix(obj[key], path);
        Object.assign(objects, nestedObjects);
      }
    }
    return objects;
  }

  // Call the function to extract objects
  const objectItemsWithPrefix = extractObjectsWithPrefix(yaml.components.schemas);

  const paths = yaml.paths;

  // Iterate through and process all "paths"
  for (const path in paths) {
    const pathObject = paths[path]; // This is the complete JSON object associated with the path
    console.log(`Path: ${path}`);
    console.log('Path Object:', pathObject);

    const root = getRoot(path);

    // Find the corresponding root brunoFolderItem or create it if it doesn't exist
    let rootFolder = brunoParent.items.find((item) => item.name === root);

    if (!rootFolder) {
      rootFolder = {
        uid: uuid(),
        name: root,
        type: 'folder',
        items: []
      };
      brunoParent.items.push(rootFolder);
    }

    // Create the folder structure for the levels
    const levels = path.split('/').slice(2); // Exclude the root
    createFolderStructure(rootFolder, levels, pathObject, serverUrl, objectItemsWithPrefix);
  }

  console.log('collections = ' + JSON.stringify(brunoParent, null, 2));

  return brunoParent;
};

const importOpenApiV2Collection = (brunoParent, data) => {
  const paths = data.paths;

  // Not yet implemented

  return undefined;
};

const parseOpenApiCollection = (data) => {
  const brunoCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };

  return new Promise((resolve, reject) => {
    try {
      let openapiVersion = data.openapi;

      if (openapiVersion.startsWith('3.')) {
        // Logic for OpenAPI 3.x.x
        console.log('Detected OpenAPI 3.x.x version.');
        return resolve(importOpenApiV3Collection(brunoCollection, data));
      } else if (openapiVersion.startsWith('2.')) {
        // Logic for OpenAPI 2.x.x
        console.log('Detected OpenAPI 2.x.x version.');
        return resolve(importOpenApiV2Collection(brunoCollection, data));
      } else {
        // Handle other versions if necessary
        console.log('Unsupported OpenAPI version.');
      }

      throw new BrunoError('Unknown OpenApi schema version');
    } catch (err) {
      console.log(err);
      if (err instanceof BrunoError) {
        return reject(err);
      }

      return reject(new BrunoError('Unable to parse the OpenApi collection yaml file'));
    }
  });
};

const importCollection = () => {
  return new Promise((resolve, reject) => {
    fileDialog({ accept: 'application/yaml' })
      .then(readFile)
      .then(parseOpenApiCollection)
      .then(transformItemsInCollection)
      .then(hydrateSeqInCollection)
      .then(validateSchema)
      .then((collection) => resolve(collection))
      .catch((err) => {
        console.log(err);
        reject(new BrunoError('Import collection failed'));
      });
  });
};

export default importCollection;
