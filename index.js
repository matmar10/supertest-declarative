'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const supertest = require('supertest-as-promised');
const merge = require('deepmerge');
const tape = require('tape');
const tapePromise = require('tape-promise').default;

// enable promises in tape tests
const test = tapePromise(tape);

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
    req.expect(expected.assert);
    testInstance.pass(`${msg} - supertest callback()`);
  }

  if (expected.status) {
    req.expect(expected.status);
    testInstance.pass(`${msg} - status code is ${expected.status}`);
  }

  if (expected.headers && 'object' === typeof expected.headers) {
    for (key in expected.headers) {
      req.expect(key, expected.headers[key]);
      testInstance.pass(`${msg} - header ${key} is '${expected.headers[key]}'`);
    }
  }

  if (expected.body) {
    req.expect(expected.body);
    testInstance.pass(`${msg} - body matches all expected values`);
  }

  if (expected.bodyProperties) {
    req.expect(function(res) {
      const assertProperties = function(obj, expectedProperties) {
        for (let k in expectedProperties) {
          if (!expectedProperties.hasOwnProperty(k)) {
            continue;
          }
          if (typeof expectedProperties[k] === 'undefined') {
            assert('undefined' === typeof obj[k], 'Property is undefined');
            testInstance.pass(`${msg} - body property ${k} is undefined`);
            continue;
          }
          assert('undefined' !== typeof obj[k], 'Property `' + k + '` is defined');
          testInstance.pass(`${msg} - body property ${k} defined`);
          // assert RegExp
          if (expectedProperties[k] instanceof RegExp) {
            assert(String(obj[k]).match(expectedProperties[k]),
              'Property `' + k + '` matches expected RegExp format');
            testInstance.pass(`${msg} - body property ${k} matches RegExp`);
            continue;
          }
          // assert value equality
          assert(obj[k] === expectedProperties[k], 'Property `' + k + '` equals expected value');
          testInstance.pass(`${msg} - body property ${k} equals ${obj[k]}`);
        }
      };

      if (Array.isArray(expected.bodyProperties)) {
        for (let i = 0; i < res.body.length; i++) {
          assertProperties(res.body[i], expected.bodyProperties[i]);
        }
        testInstance.pass(`${msg} - properties of each element in array match expected`);
      }

      if ('object' === typeof expected.bodyProperties) {
        assertProperties(res.body, expected.bodyProperties);
        testInstance.pass(`${msg} - all properties of object match expected`);
        return;
      }
    });
  }
  return req;
};

SupertestDeclarativeSuite.prototype.runSupertestRequest = function runSupertestRequest(reqDef, testInstance) {

  // console.log('Request definition is:', reqDef);

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

SupertestDeclarativeSuite.prototype.buildDefinition = function(definition, testDefininition,
  requestDefinition) {
  let body = {};
  body = merge(body, definition.body || {});
  body = merge(body, testDefininition.body || {});
  body = merge(body, requestDefinition.body || {});

  let headers = {};
  headers = merge(headers, definition.headers || {});
  headers = merge(headers, testDefininition.headers || {});
  headers = merge(headers, requestDefinition.headers || {});

  let expected = {};
  expected = merge(expected, definition.expected || {});
  expected = merge(expected, testDefininition.expected || {});

  return merge({
    body: body,
    headers: headers,
    method: definition.method || testDefininition.method || requestDefinition.method,
    url: definition.url || testDefininition.url || requestDefinition.url,
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
    })
    .then(res => {
      // testInstance.pass(msg);
      return res;
    }, (err) => {
      testInstance.fail(msg);
      throw err;
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
    test(testDefininition.message, (testInstance) => {
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
