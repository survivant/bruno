import jsyaml from 'js-yaml';

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
        // Analyser le contenu YAML une fois qu'il a été lu
        const yamlData = e.target.result;
        const parsedYaml = jsyaml.load(yamlData);
        resolve(parsedYaml);
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = (err) => reject(err);

    // Lire le fichier sélectionné en tant que texte
    fileReader.readAsText(files[0]);
  });
};

const addSuffixToDuplicateName = (item, index, allItems) => {
  // Check if the request name already exist and if so add a number suffix
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

  // set the name on the parent
  if (yaml.info && yaml.info.title) {
    brunoParent.name = yaml.info.title;
  }

  let serverUrl = '';
  if (yaml.servers && yaml.servers.length > 0) {
    serverUrl = yaml.servers[0].url;
  }

  // Fonction pour obtenir la racine d'un chemin
  function getRoot(path) {
    const parts = path.split('/');
    return parts[1]; // Le root est le deuxième élément après la première barre oblique
  }

  function createFolderStructure(parent, levels, pathObject, serverUrl) {
    if (levels.length === 0) {
      // Si nous avons atteint la fin des niveaux, ajoutez un brunoRequestItem pour chaque opération
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
              json: '{}',
              text: null,
              xml: null,
              formUrlEncoded: [],
              multipartForm: []
            }
          }
        };
        parent.items.push(brunoRequestItem);
      }
    } else {
      // Sinon, créez un brunoFolderItem pour le niveau actuel
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

      // Appelez la fonction récursivement pour les niveaux restants
      createFolderStructure(folderItem, levels.slice(1), pathObject, serverUrl);
    }
  }

  const paths = yaml.paths;

  // Parcourez et affichez toutes les "paths"
  for (const path in paths) {
    const pathObject = paths[path]; // C'est l'objet JSON complet associé au chemin
    console.log(`Path: ${path}`);
    console.log('Path Object:', pathObject);

    const root = getRoot(path);

    // Trouver le brunoFolderItem racine correspondant ou le créer s'il n'existe pas
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

    // Créez la structure du dossier pour les niveaux
    const levels = path.split('/').slice(2); // Exclure le root
    createFolderStructure(rootFolder, levels, pathObject, serverUrl);
  }

  console.log('collections = ' + JSON.stringify(brunoParent, null, 2));

  return brunoParent;
};

const importOpenApiV2Collection = (brunoParent, data) => {
  const paths = data.paths;

  //not yet implemented

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
        // Logique pour OpenAPI 3.x.x
        console.log('Version OpenAPI 3.x.x détectée.');
        return resolve(importOpenApiV3Collection(brunoCollection, data));
      } else if (openapiVersion.startsWith('2.')) {
        // Logique pour OpenAPI 2.x.x
        console.log('Version OpenAPI 2.x.x détectée.');
        return resolve(importOpenApiV2Collection(brunoCollection, data));
      } else {
        // Gérer d'autres versions si nécessaire
        console.log('Version OpenAPI non prise en charge.');
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
