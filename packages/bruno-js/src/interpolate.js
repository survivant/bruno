const Handlebars = require('handlebars');
const { each, forOwn, cloneDeep } = require('lodash');

const getContentType = (headers = {}) => {
  let contentType = '';
  forOwn(headers, (value, key) => {
    if (key && key.toLowerCase() === 'content-type') {
      contentType = value;
    }
  });

  return contentType;
};

const interpolateEnvVars = (str, processEnvVars) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  const template = Handlebars.compile(str, { noEscape: true });

  return template({
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

const varsRegex = /(?<!\\)\{\{(?!process\.env\.\w+)(.*\..*)\}\}/g;

const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolateEnvVars(value, processEnvVars);
  });

  Object.entries(collectionVariables).map(([key, value]) => {
    collectionVariables[key] = interpolateCollectionVars(value, envVars, collectionVariables);
  });

  const encodeURI = (str) => {
    // Create a URL object from the string
    let url = new URL(str);

    // Get the search params object for easy parsing
    let searchParams = url.searchParams;

    // Encode each parameter
    for (let [key, value] of searchParams) {
      searchParams.set(key, encodeURIComponent(value));
    }

    // Replace the search string in the original url with the properly encoded one
    url.search = searchParams.toString();

    return url.href;
  };
  const interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
    }

    if (varsRegex.test(str)) {
      // Handlebars doesn't allow dots as identifiers, so we need to use literal segments
      str = str.replaceAll(varsRegex, '{{[$1]}}');
    }
    const template = Handlebars.compile(str, { noEscape: true });

    // collectionVariables take precedence over envVars
    const combinedVars = {
      ...envVars,
      ...collectionVariables,
      process: {
        env: {
          ...processEnvVars
        }
      }
    };

    const output = template(combinedVars);

    // Check if returned string has any more variables to interpolate
    if (output.includes('{{') && output.includes('}}')) {
      return interpolate(output);
    }

    return output;
  };

  request.url = encodeURI(interpolate(request.url));

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[interpolate(key)] = interpolate(value);
  });

  each(request.params, (param) => {
    param.name = interpolate(param.name);
    param.value = interpolate(param.value);
  });

  const contentType = getContentType(request.headers);

  if (contentType.includes('json')) {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }

    if (typeof request.data === 'string') {
      if (request.data.length) {
        request.data = interpolate(request.data);
      }
    }
  } else if (contentType === 'application/x-www-form-urlencoded') {
    if (typeof request.data === 'object') {
      try {
        let parsed = JSON.stringify(request.data);
        parsed = interpolate(parsed);
        request.data = JSON.parse(parsed);
      } catch (err) {}
    }
  } else {
    request.data = interpolate(request.data);
  }

  if (request.proxy) {
    request.proxy.protocol = interpolate(request.proxy.protocol);
    request.proxy.hostname = interpolate(request.proxy.hostname);
    request.proxy.port = interpolate(request.proxy.port);

    if (request.proxy.auth) {
      request.proxy.auth.username = interpolate(request.proxy.auth.username);
      request.proxy.auth.password = interpolate(request.proxy.auth.password);
    }
  }

  // todo: we have things happening in two places w.r.t basic auth
  //       need to refactor this in the future
  // the request.auth (basic auth) object gets set inside the prepare-request.js file
  if (request.auth && request.auth.mode === undefined) {
    const username = interpolate(request.auth.username) || '';
    const password = interpolate(request.auth.password) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  // interpolate vars for aws sigv4 auth
  if (request.awsv4config) {
    request.awsv4config.accessKeyId = interpolate(request.awsv4config.accessKeyId) || '';
    request.awsv4config.secretAccessKey = interpolate(request.awsv4config.secretAccessKey) || '';
    request.awsv4config.sessionToken = interpolate(request.awsv4config.sessionToken) || '';
    request.awsv4config.service = interpolate(request.awsv4config.service) || '';
    request.awsv4config.region = interpolate(request.awsv4config.region) || '';
    request.awsv4config.profileName = interpolate(request.awsv4config.profileName) || '';
  }

  // interpolate vars for digest auth
  if (request.digestConfig) {
    request.digestConfig.username = interpolate(request.digestConfig.username) || '';
    request.digestConfig.password = interpolate(request.digestConfig.password) || '';
  }

  return request;
};

module.exports = {
  interpolateVars,
  interpolateString,
  interpolateUrl,
  interpolateCollectionVars
};
