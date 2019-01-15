# supertest-declarative

Making REST API testing a little less arduous.

## Installation

```
npm install --save-dev supertest-declarative
```

## Usage

```JavaScript

const supertestDeclarative = require('supertest-declarative');
const express = require('express');

const run = supertestDeclarative.agent(app);

run({

  // a hook to run BEFORE beginning to run the test suit
  before: function () {
    // can return Promise
  },

  // a hook to run BEFORE each and every test
  beforeEach: function () {
    // can return Promise
  },

  // a hook to run AFTER the test suit runs
  // you could use this for some tear-down logic
  after: function () {
    // can return Promise
  },

  // a hook to run BEFORE each and every test
  afterEach: function () {
    // can return Promise
  },

  // things to add to each and every request in this suite by default
  common: [{

    // headers added to each and every request in this suite
    // can be overwritten in individual tests or requests
    headers: {
      'Accept': 'application/json',
      'Content-Type', 'application/json'
    },

    // url for all requests in this suite
    // can be overwritten in individual tests or requests
    url: '/users'
  }],


  // list of tests to run
  // each test can contain one or more requests that are executed
  // serially, passing the previous response to each subsequent
  // request
  tests: [{

    // a message to be displayed as the test('message', ...); argument of
    // tape test
    message: 'creates account with email and password',

    // run some code BEFORE the requests begin executing
    before: function () {
      // can return a Promise
    },

    // run some code BEFORE EACH and every request
    // the previous response is passed in as the only argument
    beforeEach: function (response) {
      // can return a Promise
    },

    // run some code AFTER the requests begin executing
    after: function() {
      // can return a Promise
    }

    // list of requests to execute
    requests: [
      // ... previous request definitions
      {
        // run some code BEFORE this request
        // useful to process the previous request
        // and add information to the new request
        // use the `response.next` object to modify the next request
        before: function(response) {
          // example: modify the next URL
          response.next.url = `/users/${response.body.id}`
          // example: add authorization header
          // response is a supertest response, so all methods are avilable
          response.next.Authorization = response.get('Authorization');
          // can return a Promise
        },

        // run some code AFTER this request
        // response represents the response of THIS request
        after: function (response) {
          // do something with response
          // can return a Promise
        }

        // a request body to send
        body: {
          email: 'matthew.mar10@gmail.com',
          password: 'JustTesting1234*'
        },
        // the request method get, post, put, etc..
        method: 'post',

        // some assertions to run
        expected: {
          // expected status code
          status: 201,
          // expected headers
          headers: {
            // strings are supported
            'Content-Type': 'application/json',
            // regex is supported
            Authorization: /^Bearer .*$/
          },

          // assert a body literal
          // this does an object deep equal
          // so all properties must match exactly
          body: {
            id: 1,
            name: 'Matthew'
          },
          // -- OR --

          // assert some properties
          // note that only properties present here are run as assertions
          // so dynamic properties can be ignored or specified as regex
          bodyProperties: {
            id: /^\d+$/,
            name: 'Matthew'
          },

          // run some generic assertions
          // using any assertion framework you desire
          assert: function(res) {
            assert(res.body.name === 'Matthew', 'Name must be Matthew');
            // can return a Promise
          }
        }
      },
      // ... other request definitions
    ]
  }];
});

```
