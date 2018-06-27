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

  before: function () {
    return Promise.resolve('something');
  },

  beforeEach: function () {

  },

  common: [{
    headers: {
      'Accept': 'application/json',
      'Content-Type', 'application/json'
    },
    baseUrl: '/user'
  }],


  tests: [{
    message: 'creates account with email and password',
    before: function () {

    },
    beforeEach: function () {

    },
    requests: [
      {
        body: {
          email: 'matthew.mar10@gmail.com',
          password: 'JustTesting1234*'
        },
        method: 'post',
        expected: {
          status: 201,
          headers: {
          }
        }
      }, {
        headers: {},
        method: 'get',
        expected: {
          assert: function(req, res) {
            // run any supertest assertions you'd like here
          },
          status: 200,
          body: {
            email: 'matthew.mar10@gmail.com',
            password: 'JustTesting1234*'
          }
        }
      }
    ]
  }];
});

```
