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
const interpolateString = (str, { envVariables, collectionVariables, processEnvVars }) => {
  if (!str || !str.length || typeof str !== 'string') {
    return str;
  }

  processEnvVars = processEnvVars || {};
  collectionVariables = collectionVariables || {};

  // we clone envVariables because we don't want to modify the original object
  envVariables = envVariables ? cloneDeep(envVariables) : {};

  // envVariables can, in turn, have values as {{process.env.VAR_NAME}}
  // Therefore, we need to interpolate envVariables first with processEnvVars
  forOwn(envVariables, (value, key) => {
    envVariables[key] = interpolateEnvVars(value, processEnvVars);
  });

  const template = Handlebars.compile(str, { noEscape: true });

  // collectionVariables take precedence over envVariables
  const combinedVars = {
    ...envVariables,
    ...collectionVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  };

  return template(combinedVars);
};
const interpolateUrl = ({ url, envVars, collectionVariables, processEnvVars }) => {
  if (!url || !url.length || typeof url !== 'string') {
    return;
  }

  const template = Handlebars.compile(url, { noEscape: true });

  return template({
    ...envVars,
    ...collectionVariables,
    process: {
      env: {
        ...processEnvVars
      }
    }
  });
};

const interpolateVars = (request, envVars = {}, collectionVariables = {}, processEnvVars = {}) => {
  // we clone envVars because we don't want to modify the original object
  envVars = cloneDeep(envVars);

  // envVars can inturn have values as {{process.env.VAR_NAME}}
  // so we need to interpolate envVars first with processEnvVars
  forOwn(envVars, (value, key) => {
    envVars[key] = interpolateEnvVars(value, processEnvVars);
  });

  const interpolate = (str) => {
    if (!str || !str.length || typeof str !== 'string') {
      return str;
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

    return template(combinedVars);
  };

  request.url = interpolate(request.url);

  forOwn(request.headers, (value, key) => {
    delete request.headers[key];
    request.headers[interpolate(key)] = interpolate(value);
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

  each(request.params, (param) => {
    param.value = interpolate(param.value);
  });

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
  if (request.auth) {
    const username = interpolate(request.auth.username) || '';
    const password = interpolate(request.auth.password) || '';

    // use auth header based approach and delete the request.auth object
    request.headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    delete request.auth;
  }

  return request;
};

module.exports = {
  interpolateVars,
  interpolateString,
  interpolateUrl
};
