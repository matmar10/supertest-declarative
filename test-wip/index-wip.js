'use strict';

const assert = require('assert');

const supertestDeclarative = require('./../');
const initSampleServer = require('./sample-server');

const expected = [
  'before #1',
  'beforeEach #1',
  ''
];
const executed = [];

let beforeNum = 1;
let beforeEachNum = 1;

let beforeTestNum = 1;
let beforeEachRequestNum = 1;

function deferredPush(label, num, delay = 200) {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      executed.push(`${label} #${num}`);
      resolve();
    }, delay);
  });
}

test('executes hooks in order', async function(t) {
  const app = await initSampleServer();
  const runTests = await supertestDeclarative(app);
  await runTests({

    // #1
    before: () => {
      return deferredPush('tests - before', beforeNum++);
    },

    // #2
    beforeEach: () => {
      return deferredPush('tests - beforeEach', beforeEachTestNum++);
    },

    tests: [{
      before: () => {
        return deferredPush('before', beforeEachTestNum++)
      }
      message: 'Create investor',
      url: '/user',
      requests: [{
        method: 'post',
        body: {
          email: 'foo@bar.com',
          password: '1234asdkjasd'
        },
        expected: {
          bodyProperties: {
            id: /\d+/,
            email: 'foo@bar.com',
            password: '1234asdkjasd'
          }
        }
      }, {
        before: function (res) {
          res.next.url += '/' + res.body.id;
          res.next.expected.bodyProperties.id = res.body.id;
        },
        method: 'get',
        body: {
          email: 'foo@bar.com',
          password: '1234asdkjasd'
        },
        expected: {
          bodyProperties: {
            email: 'foo@bar.com',
            password: '1234asdkjasd'
          }
        }
      }]
    }]
  });


});

initSampleServer()
  .then(app => {
    const runTests = supertestDeclarative(app);
    return runTests({
      before: function
      tests: [{
        message: 'Create investor',
        url: '/user',
        requests: [{
          method: 'post',
          body: {
            email: 'foo@bar.com',
            password: '1234asdkjasd'
          },
          expected: {
            bodyProperties: {
              id: /\d+/,
              email: 'foo@bar.com',
              password: '1234asdkjasd'
            }
          }
        }, {
          before: function (res) {
            res.next.url += '/' + res.body.id;
            res.next.expected.bodyProperties.id = res.body.id;
          },
          method: 'get',
          body: {
            email: 'foo@bar.com',
            password: '1234asdkjasd'
          },
          expected: {
            bodyProperties: {
              email: 'foo@bar.com',
              password: '1234asdkjasd'
            }
          }
        }]
      }]
    });
  });
