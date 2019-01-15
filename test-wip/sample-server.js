'use strict';

const Promise = require('bluebird');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const merge = require('deepmerge');

module.exports = function() {
  return new Promise(function(resolve) {
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

    app.server = http.createServer(app);
    app.server.listen(8080);

    resolve(app);
  });
};
