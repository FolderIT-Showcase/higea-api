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
                this.schema = _.merge({}, models[modelName].schema);
                this.columns = [];
                this.table = models[modelName].table;
                this.joins = "";

                Object.keys(this.schema).forEach(e => {
                    this.schema[e].name = e;
                    this.schema[e].schema = this.table + "." + e;
                    this.schema[e].table = this.table;
                });

                Object.keys(this.schema).forEach(e => this.columns.push(Object.assign({}, this.schema[e])));
            }

            find(options) {
                options = options || {};

                var limit = "TOP 100";
                var columns = _.map(this.schema, e => e.schema).join(", ");
                var where = "";
                var order = " ORDER BY 1 ";
                var from = " FROM " + this.table + this.joins;

                if (options.limit) {
                    limit = "TOP " + options.limit;
                }

                if (!_.isEmpty(options.where)) {
                    where = " WHERE ";
                    let i = 0;

                    for (let column in options.where) {
                        let value = options.where[column];
                        let table = this.table;

                        if (typeof (value) === 'object') {
                            let obj = options.where[column];
                            let type;
                            value = obj.value;

                            if (i > 0) {
                                if (obj.joint) {
                                    where += " " + obj.joint + " ";
                                } else {
                                    where += " AND ";
                                }
                            }

                            if (obj.table) {
                                table = obj.table.table;
                                type = obj.table.schema[column].type.toLowerCase();
                            } else {
                                type = this.schema[column].type.toLowerCase();
                            }

                            if (type !== 'number') {
                                value = "'" + value + "'";
                            }
                        } else {
                            if (i > 0) {
                                where += " AND ";
                            }
                        }

                        where += table + "." + column + " = " + value;
                        i++;
                    }
                }

                if (!_.isEmpty(options.order)) {
                    order = " ORDER BY ";
                    let i = 0;
                    for (let column in options.order) {
                        let table = this.table;

                        if (i > 0) {
                            order += " AND ";
                        }

                        if (typeof (options.order[column]) === 'object') {
                            let obj = options.order[column];
                            if (obj.table) {
                                table = obj.table.table;
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
                let leftCol = this.table + "." + column.name;
                let rightCol = column.schema;
                this.joins += " LEFT " + type + " JOIN " + table.table + " ON " + leftCol + " = " + rightCol + " " + table.joins;

                // Anexar esquemas
                this.schema = _.merge(this.schema, table.schema);

                // Reconstruir columnas
                this.columns = [];
                Object.keys(this.schema).forEach(e => this.columns.push(Object.assign({}, this.schema[e])));
            }
        }

        return new Table(tableName);
    }
}
