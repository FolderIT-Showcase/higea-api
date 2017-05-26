let fs = require('fs'),
    _ = require('lodash'),
    mongoose = require('mongoose'),
    Sybase = require('sybase');

let models = {};

fs.readdirSync(__dirname).forEach(function (file) {
    if (file !== 'index.js') {
        let moduleName = file.split('.')[0];
        let model = require('./' + moduleName);
        models[moduleName] = model;
    }
});

class Table {
    constructor(tableName, options = {}) {
        if (!options.hasOwnProperty("mergeColumns")) {
            options.mergeColumns = true;
        }

        if (!options.hasOwnProperty("code")) {
            options.code = "";
        }

        this.schema = _.merge({}, models[tableName]);
        this.columns = [];
        this.name = "dba." + _.snakeCase(tableName);
        this.joins = "";
        this.code = options.code;

        let id = {};

        Object.keys(this.schema).forEach(e => {
            this.schema[e].name = e;
            this.schema[e].schema = this.name + "." + e;
            this.schema[e].table = this.name;

            if (this.schema[e].identity === true) {
                id = this.schema[e];
            }

            // Anexar columnas al constructor de la tabla
            if (options.mergeColumns === true) {
                this[e] = this.schema[e];
            }
        });

        if (options.mergeColumns === true) {
            this.id = id;
        }

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

    find(options = {}) {
        let limit = "TOP 100";
        let columns = _.map(this.schema, e => e.schema).join(", ");
        let where = "";
        let order = " ORDER BY 1 ";
        let from = " FROM " + this.name + this.joins;

        if (options.limit) {
            limit = "TOP " + options.limit;
        }

        if (!_.isEmpty(options.where)) {
            where = " WHERE ";
            let i = 0;
            let joint = "";
            let conditions = "";

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
                            if (!obj.table.schema[column]) {
                                continue;
                            }

                            type = obj.table.schema[column].type.toLowerCase();
                            table = obj.table.name;
                        } else {
                            type = 'unknown';
                            table = obj.table;
                        }
                    } else {
                        if (!this.schema[column]) {
                            continue;
                        }

                        type = this.schema[column].type.toLowerCase();
                    }
                } else {
                    if (!this.schema[column]) {
                        continue;
                    }

                    type = this.schema[column].type.toLowerCase();

                    if (this.schema[column]) {
                        table = this.schema[column].table;
                    }
                }

                if (type !== 'number' || isNaN(Number(value))) {
                    value = "'" + value + "'";
                }

                conditions += joint + table + "." + column + " = " + value;
                i++;
            }

            if (conditions) {
                where += conditions;
            } else {
                where = "";
            }
        }

        if (!_.isEmpty(options.order)) {
            order = " ORDER BY ";
            let conditions = "";
            let i = 0;
            for (let column in options.order) {
                let table = this.name;

                if (i > 0) {
                    order += " AND ";
                }

                if (typeof (options.order[column]) === 'object') {
                    let obj = options.order[column];
                    if (obj.table) {
                        if (!obj.table.schema[column]) {
                            continue;
                        }
                        table = obj.table.name;
                    } else {
                        if (!this.schema[column]) {
                            continue;
                        }
                    }
                } else {
                    if (!this.schema[column]) {
                        continue;
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

                conditions += table + "." + column + asc;
                i++;
            }

            if (conditions) {
                order += conditions;
            } else {
                order = "";
            }
        }

        let query = " SELECT ";
        query += " " + limit + " ";
        query += " " + columns + " \n\n";
        query += " " + from + " \n\n";
        query += " " + where + " \n\n";
        query += " " + order + " ";

        return new Promise((resolve, reject) => {
            this.connectDatabase().then(() => {
                return this.queryDatabase(query);
            }).then((rows) => {
                this.disconnectDatabase();

                resolve(rows);
            }).catch((err) => {
                this.disconnectDatabase();

                reject(err);
            });
        });
    }

    findOne(options = {}) {
        options.limit = 1;

        return new Promise((resolve, reject) => {
            this.find(options).then((row) => {
                if (row && row.length) {
                    resolve(row[0]);
                } else {
                    resolve();
                }
            }).catch(reject);
        });
    }

    join(table, leftCol, rightCol = undefined, type = "OUTER") {
        rightCol = rightCol || { schema: this.name + "." + leftCol.name };
        this.joins += " LEFT " + type + " JOIN " + table.name + " ON " + leftCol.schema + " = " + rightCol.schema + " " + table.joins;

        // Anexar esquemas
        this.schema = _.merge(this.schema, table.schema);

        // Reconstruir columnas
        this.rebuildColumns();

        return this;
    }

    save(row) {
        return new Promise((resolve, reject) => {
            let columns, values = [];

            // Remover el ID de la fila (solo insertar nuevos registros)
            if (row.hasOwnProperty(this.id.name)) {
                row[this.id.name] = undefined;
            }

            Object.keys(row).join(", ");

            columns = Object.keys(row).join(", ");
            Object.keys(row).forEach((c) => {
                let v = row[c];
                if (this.schema[c] && this.schema[c].type && this.schema[c].type.toLowerCase() !== 'number') {
                    v = "'" + v + "'";
                }
                values.push(v);
            });
            values = values.join(", ");

            let query = " INSERT INTO ";
            query += " " + this.name + " ";
            query += " ( " + columns + " ) ";
            query += " VALUES ( " + values + " ) ";

            this.connectDatabase().then(() => {
                return this.queryDatabase(query);
            }).then((rows) => {
                // Si es un INSERT, buscar la fila recien insertada
                if (query.trim().split(" ")[0] === "INSERT") {
                    this.queryDatabase("SELECT @@IDENTITY").then((id) => {
                        if (id && id.length) {
                            let columns = _.map(this.schema, e => e.schema).join(", ");

                            id = id[0]["@@IDENTITY"];

                            this.db.query("SELECT " + columns + " FROM " + this.name + " WHERE " + this.id.name + " = " + id, (err, row) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(row);
                                }

                                this.disconnectDatabase();
                            });
                        } else {
                            resolve([]);
                            this.disconnectDatabase();
                        }
                    }).catch(reject);
                } else {
                    resolve(rows);
                    this.disconnectDatabase();
                }
            }).catch((err) => {
                this.disconnectDatabase();

                reject(err);
            });
        });
    }

    queryDatabase(query) {
        return new Promise((resolve, reject) => {
            this.db.query(query, (err, data) => {
                if (err) {
                    return reject(err);
                }

                resolve(data);
            });
        });
    }

    connectDatabase() {
        return new Promise((resolve, reject) => {
            this.getDatabase().then(() => {
                this.db.connect((err) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            }).catch(reject);
        });
    }

    disconnectDatabase() {
        return new Promise((resolve, reject) => {
            this.getDatabase().then(() => {
                this.db.disconnect((err) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            }).catch(reject);
        });
    }

    getDatabase() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve();
            }

            this.validateClient(this.code).then((client) => {
                if (!client) {
                    return reject({
                        message: "El cliente no existe"
                    });
                }

                if (!client.dbHost || !client.dbPort || !client.dbServername || !client.dbUsername || !client.dbPassword) {
                    return reject({
                        message: "El cliente no tiene los datos de acceso a la DB configurados correctamente"
                    });
                }

                this.db = new Sybase(client.dbHost, client.dbPort, client.dbServername, client.dbUsername, client.dbPassword);
                resolve();
            }).catch(reject);
        });
    }

    validateClient(code) {
        return new Promise((resolve, reject) => {
            if (this.client) {
                return resolve(this.client);
            } else {
                var Clients = mongoose.model('Clients');

                Clients.findOne({
                    code: code
                }).then((client) => {
                    if (!client) {
                        reject({
                            message: "El cliente no existe o no está habilitado."
                        });
                    } else {
                        this.client = client;
                        resolve(client);
                    }
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }
}

module.exports = {
    table: function (code, tableName) {
        let options = {
            code: code
        };

        return new Table(tableName, options);
    },
    validate: function (tableName, noRequireds = false) {
        let objValidate = {};
        let schema = models[tableName];

        Object.keys(schema).forEach(e => {
            let column = schema[e];
            let type = column.type ? column.type.toLowerCase() : "string";

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

                case "number":
                    objValidate[e].isNumber = true;
                    break;

                default:
                    objValidate[e].type = type;
            }

            if (column.enum !== undefined) {
                objValidate[e].enum = column.enum;
            }

            if (column.default !== undefined) {
                objValidate[e].default = column.default;
            }

            if (column.required === true && noRequireds === false) {
                objValidate[e].required = true;
            }
        });

        return objValidate;
    }
}
