'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const supertest = require('supertest-as-promised');
const merge = require('deepmerge');

function runBefore(def, callback, args, methodName) {
  args = args || [];
  methodName = methodName || 'before';

  if (!def[methodName] || 'function' !== typeof def[methodName]) {
    return Promise.resolve(callback());
  }

  const result = def[methodName].apply(def, args);
  if ('object' !== typeof result || 'function' !== typeof result.then) {
    return Promise.resolve(callback.apply(def, args));
  }
  return result
    .then(function () {
      return callback();
    });
}

function runAfter(def, args, methodName) {
  methodName = methodName || 'before';

  if (!def[methodName] || 'function' !== typeof def[methodName]) {
    return Promise.resolve();
  }

  const result = def[methodName].apply(def, args);
  if ('object' !== typeof result || 'function' !== typeof result.then) {
    return Promise.resolve();
  }
  return result;
}

module.exports = {
  agent: function (app) {

    const request = supertest(app);

    function addSupertestAssertions(req, expected) {

      let key;

      if ('function' === typeof expected.assert) {
        req.expect(expected.assert);
      }

      if (expected.status) {
        req.expect(expected.status);
      }

      if (expected.headers && 'object' === typeof expected.headers) {
        for (key in expected.headers) {
          req.expect(key, expected.headers[key]);
        }
      }

      if (expected.body) {
        req.expect(expected.body);
      }

      if (expected.bodyProperties) {
        req.expect(function (res) {
          const assertProperties = function (obj, expectedProperties) {
            for (let k in expectedProperties) {
              if (!expectedProperties.hasOwnProperty(k)) {
                continue;
              }
              if (typeof expectedProperties[k] === 'undefined') {
                assert('undefined' === typeof obj[k], 'Property is undefined');
                continue;
              }
              assert('undefined' !== typeof obj[k], 'Property `' + k + '` is defined');
              // assert RegExp
              if (expectedProperties[k] instanceof RegExp) {
                assert(expectedProperties[k].match(obj[k]),
                  'Property `' + k + '` matches expected RegExp format');
                continue;
              }
              // assert value equality
              assert(obj[k] === expectedProperties[k], 'Property `' + k + '` equals expected value');
            }
          };

          if (Array.isArray(expected.bodyProperties)) {
            for (let i = 0; i < res.body.length; i++) {
              assertProperties(res.body[i], expected.bodyProperties[i]);
            }
          }

          if ('object' === typeof expected.bodyProperties) {
            assertProperties(res.body, expected.bodyProperties);
            return;
          }
        });
      }
      return req;
    }

    function runSupertestRequest(reqDef) {

      // console.log('Request definition is:', reqDef);

      // TODO: assert essentials
      assert(reqDef.method, 'Request definition must contain `method`');
      assert('string' === typeof reqDef.method, 'Request definition must contain `method` as a string');
      assert(reqDef.url, 'Request definition must contain `url`');
      assert('string' === typeof reqDef.url, 'Request definition must contain `url` as a string');

      const method = request[reqDef.method];
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
        addSupertestAssertions(req, reqDef.expected);
      }

      return req.toPromise();
    }

    return function run(definition) {

      function runEachTest() {
        return Promise.each(definition.tests, function(test) {

          const runTest = function() {

            const runEachRequest = function(res) {

              res = res || {};

              return Promise.each(test.requests, function(reqDef) {

                const runRequest = function() {

                  let body = {};
                  body = merge(body, definition.body || {});
                  body = merge(body, test.body || {});
                  body = merge(body, reqDef.body || {});

                  let headers = {};
                  headers = merge(headers, definition.headers || {});
                  headers = merge(headers, test.headers || {});
                  headers = merge(headers, reqDef.headers || {});

                  let expected = {};
                  expected = merge(expected, definition.expected || {});
                  expected = merge(expected, test.expected || {});
                  expected = merge(expected, reqDef.expected || {});

                  let def = merge({
                    body: body,
                    expected: expected,
                    headers: headers,
                    method: definition.method || test.method || reqDef.method,
                    url: definition.url || test.url || reqDef.url,
                  }, reqDef);

                  res.newReq = def;

                  return runBefore(def, function() {
                    return runSupertestRequest(def)
                      .then((response) => {
                        res = response;
                        return runAfter(def, [res], 'after');
                      });
                  }, [res], 'before');
                };

                return runBefore(test, runRequest, [res], 'beforeEach')
                  .then(function() {
                    return runAfter(test, [res], 'afterEach');
                  });
              });
            };

            // run the test.before block
            return runBefore(test, runEachRequest, [], 'before')
              .then(function() {
                return runAfter(test, [], 'after');
              });
          };

          // run the definition.beforeEach block
          return runBefore(definition, runTest, [], 'beforeEach')
            .then(function() {
              return runAfter(definition, [], 'afterEach');
            });
        });


      }

      // run the test.before once before starting each test
      return runBefore(definition, runEachTest, [], 'before')
        .then(function() {
          return runAfter(definition, [], 'after');
        });
    };
  }
};
