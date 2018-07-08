'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const supertest = require('supertest-as-promised');
const merge = require('deepmerge');
const tape = require('tape');
const tapePromise = require('tape-promise').default;

// enable promises in tape tests
const test = tapePromise(tape);


function assertProperty(expectedPropertyName, expectedValue, actualValue, testInstance, msgPrefix) {
  if ('undefined' === typeof expectedValue) {
    assert('undefined' === typeof expectedValue, `Property '${expectedPropertyName}' is undefined`);
    testInstance.equal('undefined', typeof expectedValue, `${msgPrefix} - typeof body property ${expectedPropertyName} is undefined`);
    return;
  }

  // assert existence
  assert('undefined' !== typeof expectedValue, `roperty '${expectedPropertyName}' is defined`);
  testInstance.notEqual('undefined', typeof expectedValue, `${msgPrefix} - typeof body property ${expectedPropertyName} is defined`);

  // assert RegExp
  if (expectedValue instanceof RegExp) {
    testInstance.ok(String(actualValue).match(expectedValue), `${msgPrefix} - body property ${expectedPropertyName} matches RegExp`);
    return;
  }

  // recurisvely assert array values
  if (Array.isArray(expectedValue)) {
    testInstance.ok(Array.isArray(actualValue), `${msgPrefix} - body property ${expectedPropertyName} is an array`);
    expectedValue.forEach((expectedSubValue, i) => {
      assertProperty(i, expectedSubValue, actualValue[i], testInstance, msgPrefix);
    });
    return;
  }

  // recursively assert object values
  if ('object' === typeof expectedValue) {
    for (let subKey in expectedValue) {
      assertProperty(subKey, expectedValue[subKey], actualValue[subKey], testInstance, msgPrefix);
    }
    return;
  }

  // assert value equality
  testInstance.equal(actualValue, expectedValue, `${msgPrefix} - body property ${expectedPropertyName} equals expected value`);
}

function runHook(def, methodName, argument) {

  if (!def[methodName] || 'function' !== typeof def[methodName]) {
    return Promise.resolve();
  }

  const result = def[methodName].call(def, argument);
  if ('object' !== typeof result || 'function' !== typeof result.then) {
    return Promise.resolve(result);
  }

  return result;
}

function SupertestDeclarativeSuite(app) {
  this.supertestAgent = supertest(app);
}

SupertestDeclarativeSuite.prototype.addSupertestAssertions = function(req, expected, reqDef, testInstance) {

  let key;

  let msg = `${reqDef.method.toUpperCase()} ${reqDef.url}`;
  if (reqDef.message) {
    msg += ` (${reqDef.message})`;
  }

  if ('function' === typeof expected.assert) {
    testInstance.doesNotThrow(function() {
      req.expect(expected.assert);
    }, `${msg} - supertest assert()`);
  }

  if (expected.status) {
    testInstance.doesNotThrow(function() {
      req.expect(expected.status);
    }, `${msg} - status code is ${expected.status}`);
  }

  if (expected.headers && 'object' === typeof expected.headers) {
    const assertHeader = (headerName, expectedHeaderValue) => {
      testInstance.doesNotThrow(function() {
        req.expect(headerName, expectedHeaderValue);
      }, `${msg} - header ${headerName} is ${expectedHeaderValue}`);
    };
    for (key in expected.headers) {
      assertHeader(key, expected.headers[key]);
    }
  }

  if (expected.body) {
    testInstance.doesNotThrow(function() {
      req.expect(expected.body);
    }, `${msg} - body matches expected body`);
  }

  if (expected.bodyProperties) {
    req.expect(function(res) {

      if (Array.isArray(expected.bodyProperties)) {
        for (let i = 0; i < res.body.length; i++) {
          assertProperty(i, expected.bodyProperties[i], res.body[i], testInstance, msg);
        }
        // testInstance.pass(`${msg} - properties of each element in array match expected`);
        return;
      }

      if ('object' === typeof expected.bodyProperties) {
        assertProperty('body', expected.bodyProperties, res.body, testInstance, msg);
        // testInstance.pass(`${msg} - all properties of object match expected`);
      }
    });
  }
  return req;
};

SupertestDeclarativeSuite.prototype.runSupertestRequest = function runSupertestRequest(reqDef, testInstance) {

  // TODO: assert essentials
  assert(reqDef.method, 'Request definition must contain `method`');
  assert('string' === typeof reqDef.method, 'Request definition must contain `method` as a string');
  assert(reqDef.url, 'Request definition must contain `url`');
  assert('string' === typeof reqDef.url, 'Request definition must contain `url` as a string');

  const method = this.supertestAgent[reqDef.method];
  assert('function' === typeof method, `No supertest method exists for HTTP method ${reqDef.method}`);

  let req = method(reqDef.url);

  if ('object' === typeof reqDef.headers) {
    for (let header in reqDef.headers) {
      req.set(header, reqDef.headers[header]);
    }
  }

  if ('object' === typeof reqDef.body) {
    req.send(reqDef.body);
  }

  if ('object' === typeof reqDef.expected) {
    this.addSupertestAssertions(req, reqDef.expected, reqDef, testInstance);
  }

  return req.toPromise();
};

SupertestDeclarativeSuite.prototype.buildDefinition = function(definition, testDefininition, requestDefinition) {
  let headers = {};
  headers = merge(headers, definition.headers || {});
  headers = merge(headers, testDefininition.headers || {});
  headers = merge(headers, requestDefinition.headers || {});

  let expected = {};
  expected = merge(expected, definition.expected || {});
  expected = merge(expected, testDefininition.expected || {});

  // don't merge body twice
  requestDefinition.body = definition.body || testDefininition.body || requestDefinition.body;

  return merge({
    method: definition.method || testDefininition.method || requestDefinition.method,
    url: definition.url || testDefininition.url || requestDefinition.url,
    headers: headers,
    expected: expected
  }, requestDefinition);
};

SupertestDeclarativeSuite.prototype.runRequest = function(definition, testDefininition, requestDefinition, previousResponse, testInstance) {

  previousResponse.next = requestDefinition;

  let msg = `${requestDefinition.method.toUpperCase()} ${requestDefinition.url}`;
  if (requestDefinition.message) {
    msg += ` - ${requestDefinition.message}`;
  }

  // run the test.before once before starting each test
  return runHook(requestDefinition, 'before', previousResponse)
    .then(() => {
      return this.runSupertestRequest(requestDefinition, testInstance);
    })
    .then(res => {
      return runHook(requestDefinition, 'after', res)
        .then(() => {
          return res;
        });
    });
};

SupertestDeclarativeSuite.prototype.runEachRequestDefinition = function(definition,
  testDefininition, listOfRequestDefinitions, testInstance) {
  let previousResponse = {};

  // run the test.before once before starting each test
  return Promise.each(listOfRequestDefinitions, requestDefinition => {
    let def = this.buildDefinition(definition, testDefininition, requestDefinition);
    return runHook(definition, 'beforeEach')
      .then(() => {
        return this.runRequest(definition, testDefininition, def, previousResponse, testInstance);
      })
      .then((res) => {
        previousResponse = res;
        return runHook(definition, 'afterEach');
      }, err => {
        err.definition = def;
        testInstance.fail(`Request failed with error (${err}): ${JSON.stringify(def)}`);
        return Promise.reject(err);
      });
  });
};

SupertestDeclarativeSuite.prototype.runTest = function(definition, testDefininition, testInstance) {
  // run the test.before once before starting each test
  return runHook(testDefininition, 'before')
    .then(() => {
      return this.runEachRequestDefinition(definition, testDefininition, testDefininition.requests, testInstance);
    })
    .then(() => {
      return runHook(testDefininition, 'after');
    })
    .then(() => testInstance.end(), err => testInstance.end(err));
};

SupertestDeclarativeSuite.prototype.runEachTest = function(definition, listOfTests) {
  // run the test.before once before starting each test
  listOfTests.forEach(testDefininition => {
    const msg = (definition.message) ? `${definition.message}: ${testDefininition.message}` :
      testDefininition.message;
    test(msg, (testInstance) => {
      return runHook(definition, 'beforeEach')
        .then(() => {
          return this.runTest(definition, testDefininition, testInstance);
        })
        .then(() => {
          return runHook(definition, 'afterEach');
        });
    });
  });
};

SupertestDeclarativeSuite.prototype.run = function(definition) {
  return runHook(definition, 'before')
    .then(() => {
      return this.runEachTest(definition, definition.tests);
    })
    .then(() => {
      return runHook(definition, 'after');
    });
};

module.exports = function(app) {
  const runner = new SupertestDeclarativeSuite(app);
  return function(definition) {
    return runner.run(definition);
  };
};
