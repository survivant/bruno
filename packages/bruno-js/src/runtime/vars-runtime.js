const _ = require('lodash');
const Bru = require('../bru');
const BrunoRequest = require('../bruno-request');
const { evaluateJsTemplateLiteral, evaluateJsExpression, createResponseParser } = require('../utils');

class VarsRuntime {
  runPreRequestVars(vars, request, envVariables, collectionVariables, collectionPath, processEnvVars) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars);
    const req = new BrunoRequest(request);

    const bruContext = {
      bru,
      req
    };

    const context = {
      ...envVariables,
      ...collectionVariables,
      ...bruContext
    };

    _.each(enabledVars, (v) => {
      const value = evaluateJsTemplateLiteral(v.value, context);
      bru.setVar(v.name, value);
    });

    return {
      collectionVariables
    };
  }

  runPostResponseVars(vars, request, response, envVariables, collectionVariables, collectionPath, processEnvVars) {
    const enabledVars = _.filter(vars, (v) => v.enabled);
    if (!enabledVars.length) {
      return;
    }

    const bru = new Bru(envVariables, collectionVariables, processEnvVars);
    const req = new BrunoRequest(request);
    const res = createResponseParser(response);

    const bruContext = {
      bru,
      req,
      res
    };

    const context = {
      ...envVariables,
      ...collectionVariables,
      ...bruContext
    };

    _.each(enabledVars, (v) => {
      try {
        const value = evaluateJsExpression(v.value, context);
        bru.setVar(v.name, value);
      } catch (error) {
        // Handle the error or generate a custom exception with a personalized message
        let errorMessage = 'Error evaluating Post Response variables: \n';

        // Include HTTP response code if available
        if (res && res.status) {
          errorMessage += `HTTP Status Code: ${res.status}. \n`;
        }

        // Include information about an empty response body
        if (res && res.data === undefined) {
          errorMessage += 'The response body is empty. \n';
        }

        // Include the variable v.value
        errorMessage += `It was impossible to evaluate the variable: [${v.value}] `;

        throw new Error(errorMessage);
      }
    });

    return {
      envVariables,
      collectionVariables
    };
  }
}

module.exports = VarsRuntime;
