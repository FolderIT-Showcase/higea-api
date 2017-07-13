let fs = require('fs'),
    _ = require('lodash'),
    moment = require('moment'),
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

    _buildQuery(options = {}) {
        let limit = ""; //"TOP 100";
        let columns = _.map(this.schema, e => e.schema).join(", ");
        let where = "";
        let order = " ORDER BY 1 ";
        let from = " FROM " + this.name + this.joins;

        if (typeof (options.limit) !== "undefined") {
            if (options.limit === 0) {
                limit = "";
            } else {
                limit = "TOP " + options.limit;
            }
        }

        if (!_.isEmpty(options.where)) {
            where = " WHERE ";
            let conditions = "";
            let i = 0;

            for (let column in options.where) {
                let value = options.where[column];
                let condition = this._buildOperator(column, value, i === 0);

                if (condition) {
                    i++;
                }

                conditions += condition;
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

        return query;
    }

    _parseRows(rows) {
        rows.forEach((row) => {
            for (let column in row) {
                let value = row[column];
                let type = this.schema[column].type ? this.schema[column].type.toLowerCase() : "string";

                if (type === 'date' || (type === 'string' && this.schema[column].isDate === true)) {
                    value = moment(value).format("YYYY-MM-DD");
                }

                if (type === 'time' || (type === 'string' && this.schema[column].isTime === true)) {
                    let time = moment(value).isValid() ? moment(value).format("HH:mm:ss") : undefined;
                    value = time;
                }

                if (type === 'number' || (type === 'string' && this.schema[column].isNumber === true)) {
                    value = Number(value);
                }

                row[column] = value;
            }
        });

        return rows;
    }

    find(options = {}) {
        let query = this._buildQuery(options);
        let rowsParsed, db;

        return new Promise((resolve, reject) => {
            this.connectDatabase().then((newDb) => {
                db = newDb;
                return this.queryDatabase(query, db);
            }).then((rows) => {
                // Parsear resultados
                rowsParsed = this._parseRows(rows);

                return this.disconnectDatabase(db);
            }).then(() => {
                resolve(rowsParsed);
            }).catch((err) => {
                this.disconnectDatabase(db);

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

    join(table, leftCol, rightCol = undefined, type = "LEFT OUTER", mergeColumns = true) {
        rightCol = rightCol || { schema: this.name + "." + leftCol.name };
        this.joins += " " + type + " JOIN " + table.name + " ON " + leftCol.schema + " = " + rightCol.schema + " " + table.joins;

        // Anexar esquemas
        if (mergeColumns === true) {
        let s = _.merge({}, table.schema);
        _.merge(s, this.schema);
        this.schema = s;

        // Reconstruir columnas
        this.rebuildColumns();
        }

        return this;
    }

    save(row) {
        return new Promise((resolve, reject) => {
            this._save(row).then(resolve).catch(reject);
        });
    }

    _save(row) {
        return new Promise((resolve, reject) => {
            let columns, values = [], db;

            // Remover el ID de la fila (solo insertar nuevos registros)
            if (row.hasOwnProperty(this.id.name)) {
                row[this.id.name] = undefined;
            }

            // Validar todos los campos requeridos
            Object.keys(this.schema).forEach(c => {
                if (this.schema[c].required === true && (!row.hasOwnProperty(c) || typeof (row[c]) === "undefined")) {
                    return reject({
                        message: "Falta el campo requerido: " + c
                    });
                }
            });

            // Remover campos que no existan en el esquema
            Object.keys(row).forEach(c => {
                if (!this.schema.hasOwnProperty(c)) {
                    delete row[c];
                }
            });

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

            this.connectDatabase().then((newDb) => {
                db = newDb;
                return this.queryDatabase(query, db);
            }).then((rows) => {
                // Si es un INSERT, buscar la fila recien insertada
                if (query.trim().split(" ")[0] === "INSERT") {
                    this.queryDatabase("SELECT @@IDENTITY", db).then((id) => {
                        if (id && id.length) {
                            let columns = _.map(this.schema, e => e.schema).join(", ");

                            id = id[0]["@@IDENTITY"];

                            db.query("SELECT " + columns + " FROM " + this.name + " WHERE " + this.id.name + " = " + id, (err, row) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(row);
                                }

                                this.disconnectDatabase(db);
                            });
                        } else {
                            resolve([]);
                            this.disconnectDatabase(db);
                        }
                    }).catch(reject);
                } else {
                    resolve(rows);
                    this.disconnectDatabase(db);
                }
            }).catch((err) => {
                this.disconnectDatabase(db);

                reject(err);
            });
        });
    }

    queryDatabase(query, db) {
        return new Promise((resolve, reject) => {
            db.query(query, (err, data) => {
                if (err) {
                    return reject(err);
                }

                resolve(data);
            });
        });
    }

    connectDatabase() {
        return new Promise((resolve, reject) => {
            this.getDatabase().then((db) => {
                db.connect((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(db);
                    }
                });
            }).catch(reject);
        });
    }

    disconnectDatabase(db) {
        return new Promise((resolve, reject) => {
            this.getDatabase().then(() => {
                db.disconnect();
                resolve();
            }).catch(reject);
        });
    }

    getDatabase() {
        return new Promise((resolve, reject) => {
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

                let db = new Sybase(client.dbHost, client.dbPort, client.dbServername, client.dbUsername, client.dbPassword);
                resolve(db);
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

    _buildOperator(column, value, first = false) {
        let table = this.name;
        let type, operator = " = ";
        let joint = "";

        if (first === false) {
            joint = " AND ";
        } else {
            joint = "";
        }

        // Operadores OR, AND
        if (["$or", "$and"].indexOf(column) > -1) {
            let condition = "", subJoint = "";

            switch (column) {
                case "$or":
                    subJoint = " OR ";
                    break;

                case "$and":
                    subJoint = " AND ";
                    break;
            }

            if (!Array.isArray(value) || !value.length) {
                return "";
            }

            let i = 0;

            value.forEach((obj) => {
                for (let subColumn in obj) {
                    let subValue = obj[subColumn];
                    let subCondition = this._buildOperator(subColumn, subValue, true);

                    if (subCondition) {
                        if (i > 0) {
                            subCondition = subJoint + subCondition;
                        }
                        i++;
                    }

                    condition += subCondition;
                }
            });

            if (condition) {
                return joint + " ( " + condition + " ) ";
            } else {
                return "";
            }
        }

        if (typeof (value) === 'object') {
            let obj = value;

            if (obj.table) {
                if (typeof (obj.table) === 'object') {
                    if (!obj.table.schema[column]) {
                        return "";
                    }

                    type = obj.table.schema[column].type.toLowerCase();
                    table = obj.table.name;
                } else {
                    type = 'unknown';
                    table = obj.table;
                }
            } else {
                if (!this.schema[column]) {
                    return "";
                }

                type = this.schema[column].type.toLowerCase();
            }

            type = obj.type || type;

            if (obj.operator) {
                operator = " " + obj.operator + " ";
            }

            // Operador BETWEEN
            if (obj.hasOwnProperty("$between") && obj["$between"].length == 2) {
                let valIzq, valDer;

                operator = " BETWEEN ";

                if (type !== 'number' || isNaN(Number(value))) {
                    valIzq = "'" + obj["$between"][0] + "'";
                    valDer = "'" + obj["$between"][1] + "'";
                }

                value = valIzq + " AND " + valDer;

                // Operador INBETWEEN
            } else if (obj.hasOwnProperty("$inbetween") && obj["$inbetween"].length >= 2) {
                operator = " BETWEEN ";

                if (type !== 'number' || isNaN(Number(obj["$inbetween"][0]))) {
                    obj["$inbetween"][0] = "'" + obj["$inbetween"][0] + "'";
                }

                if (obj["$inbetween"].length === 2) {
                    obj["$inbetween"][2] = obj["$inbetween"][1];
                    obj["$inbetween"][1] = column;
                }

                return joint + obj["$inbetween"][0] + operator + obj["$inbetween"][1] + " AND " + obj["$inbetween"][2];
            } else {
                value = obj.value;

                if (type !== 'number' || isNaN(Number(value))) {
                    value = "'" + value + "'";
                }
            }
        } else {
            if (!this.schema[column]) {
                return "";
            }

            type = this.schema[column].type.toLowerCase();

            if (this.schema[column]) {
                table = this.schema[column].table;
            }

            if (type !== 'number' || isNaN(Number(value))) {
                value = "'" + value + "'";
            }
        }

        return joint + table + "." + column + operator + value;
    }

    newRow() {
        let row = {};

        Object.keys(this.schema).forEach(c => {
            if (this.schema[c].required === true || typeof (this.schema[c].default) !== "undefined") {
                if (typeof (this.schema[c].default) !== "undefined") {
                    row[c] = this.schema[c].default;
                } else {
                    row[c] = undefined;
                }
            }
        });

        return row;
    }
}

module.exports = {
    table: function (code, tableName) {
        let options = {
            code: code
        };

        if (!models[tableName]) {
            return;
        } else {
            return new Table(tableName, options)
        };
    },
    validate: function (tableList, noRequireds = false) {
        let objValidate = {};
        let schema = {};

        if (!Array.isArray(tableList)) {
            tableList = [tableList];
        }

        tableList.forEach((table) => {
            let s = _.merge({}, models[table]);
            _.merge(s, schema);
            schema = s;
        });

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

            // if (column.default !== undefined) {
            //     objValidate[e].default = column.default;
            // }

            if (column.required === true && noRequireds === false) {
                objValidate[e].required = true;
            }
        });

        return objValidate;
    }
}
