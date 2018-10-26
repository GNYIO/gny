"use strict";
var _ = require('lodash');
var express = require('express');
function map(root, config) {
    var router = this;
    Object.keys(config).forEach(function (params) {
        var route = params.split(' ');
        if (route.length !== 2 || ['post', 'get', 'put'].indexOf(route[0]) === -1) {
            throw Error('wrong map config');
        }
        router[route[0]](route[1], function (req, res) {
            var reqParams = {
                body: route[0] === 'get' ? req.query : req.body,
                params: req.params,
            };
            root[config[params]](reqParams, function (err, response) {
                if (err) {
                    return res.json({ success: false, error: err });
                }
                return res.json(_.assign({ success: true }, response));
            });
        });
    });
}
function Router() {
    var router = express.Router();
    router.map = map;
    return router;
}
module.exports = Router;
