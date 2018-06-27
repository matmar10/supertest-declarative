'use strict';

const Promise = require('bluebird');
const supertestDeclarative = require('./index');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const merge = require('deepmerge');

const app = express();

const router = express.Router();

router.use(bodyParser.json({
  strict: true,
  type: 'json'
}));

let ids = 0;
let lastBodiesById = {};

router.post('/user', function (req, res) {
  ids++;
  const id = ids;
  lastBodiesById[id] = merge({ id: id }, req.body);
  res.status(201).send(lastBodiesById[id]);
});

router.get('/user/:id', function (req, res) {
  res.status(200).send(lastBodiesById[req.params.id]);
});

app.use(router);

const server = http.createServer(app);
server.listen(8080);

const run = supertestDeclarative.agent(app);

run({

  before: function () {
    console.log('Before tests starting ------');
    return new Promise(function (resolve) {
      setTimeout(function() {
        console.log('Before tests ending ------');
        resolve();
      }, 1000);
    });
  },

  beforeEach: function () {
    console.log('Before EACH test starting ------');
    return new Promise(function (resolve) {
      setTimeout(function() {
        console.log('Before EACH test ending ------');
        resolve();
      }, 1000);
    });
  },

  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  method: 'post',
  url: '/user',

  expected: {
    status: 201
  },

  tests: [{

    // a message to be displayed when running this test
    message: 'creates account with email and password',

    headers: {
      'Test': 'Number 1'
    },

    // code to be executed before beginning the test suite
    before: function () {
      console.log('Before test #1 starting ------');
      return new Promise(function (resolve) {
        setTimeout(function() {
          console.log('Before test #1 ending ------');
          resolve();
        }, 1000);
      });
    },

    // code to be executed before every request in the series
    beforeEach: function () {
      console.log('Before EACH REQUEST for test #1 starting ------');
      return new Promise(function (resolve) {
        setTimeout(function() {
          console.log('Before EACH REQUEST for test #1 ending ------');
          resolve();
        }, 1000);
      });
    },

    // after: function () {
    //   console.log('After test #1 starting ------');
    //   return new Promise(function (resolve) {
    //     setTimeout(function() {
    //       console.log('After test #1 ending ------');
    //       resolve();
    //     }, 1000);
    //   });
    // },

    afterEach: function () {
      console.log('After EACH for test #1 starting ------');
      return new Promise(function (resolve) {
        setTimeout(function() {
          console.log('After EACH for test #1 ending ------');
          resolve();
        }, 1000);
      });
    },

    // series of requests to be executed, serially
    // result of each request is passed to the next request
    requests: [
      {

        // REQUEST #1

        // pre-processing of the request
        before: function() {
          console.log('Before test #1, request #1 starting ------');
          // console.log('Res:', res);
          return new Promise(function (resolve) {
            setTimeout(function() {
              console.log('Before test #1, request #1 ending ------');
              resolve();
            }, 1000);
          });
        },

        // request definition ----------------------------
        body: {
          email: 'matthew.mar10@gmail.com',
          password: 'JustTesting1234*'
        },
        headers: {
          'Custom-Header1': 'some value'
        },

        expected: {},

        // do something with either the request or response
        after: function(res) {
          console.log('After test #1, request #1 starting ------');
          console.log('res.body', res.body);
          return new Promise(function (resolve) {
            setTimeout(function() {
              console.log('After test #1, request #1 ending ------');
              resolve();
            }, 1000);
          });
        }
      }, {

        // REQUEST #2

        // pre-processing of the request
        before: function(res) {
          this.url = this.url + '/' + res.body.id;
        },

        // do something with either the request or response
        after: function(res) {
          console.log('After test #1, request #1 starting ------');
          console.log('res.body', res.body);
          return new Promise(function (resolve) {
            setTimeout(function() {
              console.log('After test #1, request #1 ending ------');
              resolve();
            }, 1000);
          });
        },

        headers: {},
        method: 'get',
        expected: {
          status: 200,
          body: {
            id: 1,
            email: 'matthew.mar10@gmail.com',
            password: 'JustTesting1234*'
          }
        }
      }
    ]
  }]
})
  .then(() => {
    console.log('All requests completed');
  });
