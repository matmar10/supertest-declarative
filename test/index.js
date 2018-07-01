'use strict';

const supertestDeclarative = require('./../');

const initSampleServer = require('./sample-server');

// initSampleServer()
//   .then(app => {
//     const runTests = supertestDeclarative(app);
//
//     runTests({
//
//       before: function () {
//         console.log('Before tests starting ------');
//         return new Promise(function (resolve) {
//           setTimeout(function() {
//             console.log('Before tests ending ------');
//             resolve();
//           }, 1000);
//         });
//       },
//
//       beforeEach: function () {
//         console.log('Before EACH test starting ------');
//         return new Promise(function (resolve) {
//           setTimeout(function() {
//             console.log('Before EACH test ending ------');
//             resolve();
//           }, 1000);
//         });
//       },
//
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       method: 'post',
//       url: '/user',
//
//       expected: {
//         status: 201
//       },
//
//       tests: [{
//
//         // a message to be displayed when running this test
//         message: 'Creates account with email and password',
//
//         headers: {
//           'Test': 'Number 1'
//         },
//
//         // code to be executed before beginning the test suite
//         before: function () {
//           console.log('Before test #1 starting ------');
//           return new Promise(function (resolve) {
//             setTimeout(function() {
//               console.log('Before test #1 ending ------');
//               resolve();
//             }, 1000);
//           });
//         },
//
//         // code to be executed before every request in the series
//         beforeEach: function () {
//           console.log('Before EACH REQUEST for test #1 starting ------');
//           return new Promise(function (resolve) {
//             setTimeout(function() {
//               console.log('Before EACH REQUEST for test #1 ending ------');
//               resolve();
//             }, 1000);
//           });
//         },
//
//         // after: function () {
//         //   console.log('After test #1 starting ------');
//         //   return new Promise(function (resolve) {
//         //     setTimeout(function() {
//         //       console.log('After test #1 ending ------');
//         //       resolve();
//         //     }, 1000);
//         //   });
//         // },
//
//         afterEach: function () {
//           console.log('After EACH for test #1 starting ------');
//           return new Promise(function (resolve) {
//             setTimeout(function() {
//               console.log('After EACH for test #1 ending ------');
//               resolve();
//             }, 1000);
//           });
//         },
//
//         // series of requests to be executed, serially
//         // result of each request is passed to the next request
//         requests: [
//           {
//
//             // REQUEST #1
//
//             // pre-processing of the request
//             before: function() {
//               console.log('Before test #1, request #1 starting ------');
//               // console.log('Res:', res);
//               return new Promise(function (resolve) {
//                 setTimeout(function() {
//                   console.log('Before test #1, request #1 ending ------');
//                   resolve();
//                 }, 1000);
//               });
//             },
//
//             // request definition ----------------------------
//             body: {
//               email: 'matthew.mar10@gmail.com',
//               password: 'JustTesting1234*'
//             },
//             headers: {
//               'Custom-Header1': 'some value'
//             },
//
//             expected: {},
//
//             // do something with either the request or response
//             after: function(res) {
//               console.log('After test #1, request #1 starting ------');
//               console.log('res.body', res.body);
//               return new Promise(function (resolve) {
//                 setTimeout(function() {
//                   console.log('After test #1, request #1 ending ------');
//                   resolve();
//                 }, 1000);
//               });
//             }
//           }, {
//
//             // REQUEST #2
//
//             // pre-processing of the request
//             before: function(res) {
//               console.log('=============================================');
//               console.log('Before REQUEST #2 RES:', Object.keys(res));
//               this.url = this.url + '/' + res.body.id;
//             },
//
//             // do something with either the request or response
//             after: function(res) {
//               console.log('After test #1, request #1 starting ------');
//               console.log('res.body', res.body);
//               return new Promise(function (resolve) {
//                 setTimeout(function() {
//                   console.log('After test #1, request #1 ending ------');
//                   resolve();
//                 }, 1000);
//               });
//             },
//
//             headers: {},
//             method: 'get',
//             expected: {
//               status: 200,
//               body: {
//                 id: 1,
//                 email: 'matthew.mar10@gmail.com',
//                 password: 'JustTesting1234*'
//               }
//             }
//           }
//         ]
//       }]
//     })
//       .then(() => {
//         console.log('All requests completed');
//         app.close();
//       });
//   });
//

initSampleServer()
  .then(app => {
    const runTests = supertestDeclarative(app, app.server);
    return runTests({
      shutdownOnFinish: true,
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
