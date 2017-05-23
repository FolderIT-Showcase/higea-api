var fs = require('fs'),
    _ = require('lodash');

var models = {};

fs.readdirSync(__dirname).forEach(function (file) {
    if (file !== 'index.js') {
        var moduleName = file.split('.')[0];
        var model = require('./' + moduleName);
        models[moduleName] = model;
    }
});

module.exports = {
    table: function (tableName) {
        class Table {
            constructor(modelName) {
                this.schema = _.merge({}, models[modelName]);
                this.columns = [];
                this.name = "dba." + modelName.toLowerCase();
                this.joins = "";

                Object.keys(this.schema).forEach(e => {
                    this.schema[e].name = e;
                    this.schema[e].schema = this.name + "." + e;
                    this.schema[e].table = this.name;
                });

                this.rebuildColumns();
            }

            rebuildColumns() {
                this.columns = [];

                Object.keys(this.schema).forEach(e => this.columns.push({
                    name: this.schema[e].name || "",
                    type: this.schema[e].type || "",
                    label: this.schema[e].label || ""
                }));
            }

            find(options) {
                options = options || {};

                var limit = "TOP 100";
                var columns = _.map(this.schema, e => e.schema).join(", ");
                var where = "";
                var order = " ORDER BY 1 ";
                var from = " FROM " + this.name + this.joins;

                if (options.limit) {
                    limit = "TOP " + options.limit;
                }

                if (!_.isEmpty(options.where)) {
                    where = " WHERE ";
                    let i = 0;
                    let joint = "";

                    for (let column in options.where) {
                        let value = options.where[column];
                        let table = this.name;
                        let type;

                        if (i > 0) {
                            joint = " AND ";
                        }

                        if (typeof (value) === 'object') {
                            let obj = options.where[column];
                            value = obj.value;

                            if (i > 0 && obj.joint) {
                                joint = " " + obj.joint + " ";
                            }

                            if (obj.table) {
                                if (typeof (obj.table) === 'object') {
                                    type = obj.table.schema[column].type.toLowerCase();
                                    table = obj.table.name;
                                } else {
                                    type = 'unknown';
                                    table = obj.table;
                                }
                            } else {
                                type = this.schema[column].type.toLowerCase();
                            }
                        } else {
                            type = this.schema[column].type.toLowerCase();

                            if (this.schema[column]) {
                                table = this.schema[column].table;
                            }
                        }

                        if (type !== 'number' || isNaN(Number(value))) {
                            value = "'" + value + "'";
                        }

                        where += joint + table + "." + column + " = " + value;
                        i++;
                    }
                }

                if (!_.isEmpty(options.order)) {
                    order = " ORDER BY ";
                    let i = 0;
                    for (let column in options.order) {
                        let table = this.name;

                        if (i > 0) {
                            order += " AND ";
                        }

                        if (typeof (options.order[column]) === 'object') {
                            let obj = options.order[column];
                            if (obj.table) {
                                table = obj.table.name;
                            }
                        }

                        let asc = options.order[column];
                        if (asc === 1) {
                            asc = " ASC";
                        } else if (asc === -1) {
                            asc = " DESC";
                        } else {
                            asc = "";
                        }

                        order += table + "." + column + asc;
                        i++;
                    }
                }

                var query = " SELECT ";
                query += " " + limit + " ";
                query += " " + columns + " \n\n";
                query += " " + from + " \n\n";
                query += " " + where + " \n\n";
                query += " " + order + " ";

                return query;
            }

            join(table, column, type = "OUTER") {
                let leftCol = this.name + "." + column.name;
                let rightCol = column.schema;
                this.joins += " LEFT " + type + " JOIN " + table.name + " ON " + leftCol + " = " + rightCol + " " + table.joins;

                // Anexar esquemas
                this.schema = _.merge(this.schema, table.schema);

                // Reconstruir columnas
                this.rebuildColumns();
            }
        }

module.exports = {
    table: function (tableName) {
        return new Table(tableName);
    },
    validate: function (tableName) {
        var objValidate = {};
        var schema = models[tableName];

        Object.keys(schema).forEach(e => {
            var column = schema[e];
            var type = column.type ? column.type.toLowerCase() : "string";

            objValidate[e] = {};

            switch (type) {
                case "date":
                    objValidate[e].isDate = true;
                    objValidate[e].type = "string";
                    break;

                case "time":
                    objValidate[e].isTime = true;
                    objValidate[e].type = "string";
                    break;

                // case "number":
                //     objValidate[e].isNumber = true;
                //     break;

                default:
                    objValidate[e].type = type;
            }

            if (column.enum !== undefined) {
                objValidate[e].enum = column.enum;
            }

            if (column.default !== undefined) {
                objValidate[e].default = column.default;
            }

            if (column.required === true) {
                objValidate[e].required = true;
            }
        });

        return objValidate;
    }
}
