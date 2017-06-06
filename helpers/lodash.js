var _ = require('lodash');

var loopLimit = 1000;

var loopArray = function (i, collection, logic, callback) {
    if (!collection) return callback(collection);

    if (i < collection.length) {
        var loopLogic = function () {
            logic(collection[i], function () {
                loopArray(i + 1, collection, logic, callback);
            });
        }

        if (i % loopLimit == 0) {
            setTimeout(function () {
                loopLogic();
            }, 0);
        } else {
            loopLogic();
        }
    } else {
        callback(collection);
    }
}

var forEachCb = function (collection, logic, callback) {
    loopArray(0, collection, logic, function (collection) {
        callback(collection);
    });

    return collection;
}

_.forEachCb = forEachCb;

module.exports = _;
