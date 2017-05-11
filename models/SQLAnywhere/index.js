var fs = require('fs');

fs.readdirSync(__dirname).forEach(function (file) {
    if (file !== 'index.js') {
        var moduleName = file.split('.')[0];
        var model = require('./' + moduleName);

        model.find = function (options) {
            options = options || {};

            var limit = options.limit || "TOP 100";
            var columns = options.columns || model.table + "." + model.schema.map(e => e.name).join(", " + model.table + ".");
            var where = options.where || "";
            var order = options.order || " ORDER BY 1 ";

            var query = " SELECT ";
            query += " " + limit + " ";
            query += " " + columns + " ";
            query += " FROM " + model.table + " ";
            query += " " + where + " ";
            query += " " + order + " ";

            return query;
        }

        exports[moduleName] = model;
    }
});
