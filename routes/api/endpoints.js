'use strict';

var _ = require('lodash'),
	mongoose = require('mongoose'),
	md5 = require('md5'),
	jwt = require('jsonwebtoken'),
	moment = require('moment'),
	_ = require('lodash'),
	fs = require('fs'),
	path = require('path'),
	config = require('../../config'),
	request = require('request'),
	Sybase = require('sybase'),
	SQLAnywhere = require('../../models/SQLAnywhere'),
	auth = require('basic-auth'),
	addSchemaProperties = require('express-jsonschema').addSchemaProperties,
	logger = require('tracer').colorConsole(global.loggerFormat);

var schemas = {
	get: {
		"/api/:code/profesionales": {
			params: {
				type: 'object',
				properties: {
					code: {
						type: 'string',
						required: true
					}
				}
			},
			query: {
				type: 'object',
				properties: SQLAnywhere.validate('Profesionales', true)
			}
		},
		"/api/:code/especialidades": {
			params: {
				type: 'object',
				properties: {
					code: {
						type: 'string',
						required: true
					}
				}
			},
			query: {
				type: 'object',
				properties: SQLAnywhere.validate('Especialidades', true)
			}
		},
		"/api/:code/turnos": {
			params: {
				type: 'object',
				properties: {
					code: {
						type: 'string',
						required: true
					}
				}
			},
			query: {
				type: 'object',
				properties: SQLAnywhere.validate('Turnos', true)
			}
		}
	},
	post: {
		"/api/:code/turno": {
			params: {
				type: "object",
				properties: {
					code: {
						type: "string",
						required: true
					}
				}
			},
			body: {
				type: "object",
				properties: SQLAnywhere.validate('Turnos')
			}
		}
	}
};


// Definición de middlewares

var authenticate = function (req, res, next) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.headers['authorization'];
	var username = req.body.username || req.query.username || req.headers['username'];
	var password = req.body.password || req.query.password || req.headers['password'];

	var verifyUser = function (username, password) {
		var Users = mongoose.model('Users');

		Users.findOne({
			username: username
		}).then(function (user) {
			if (!user)
				return res.status(401).json({ result: false, err: "Combinación de usuario y contraseña incorrecta." });

			if (user.password != md5(password))
				return res.status(401).json({ result: false, err: "Combinación de usuario y contraseña incorrecta." });

			req.decoded = {
				"_doc": user
			};

			next();
		}, function (err) {
			return res.status(500).json({ result: false, err: err.message });
		});
	}

	if (token) {
		jwt.verify(token, global.tokenSecret, function (err, decoded) {
			if (err) {
				//Verificar si es un token de Basic Auth
				var user = auth(req);
				if (user) {
					verifyUser(user.name, user.pass);
				} else {
					logger.error(err);
					return res.status(401).json({
						result: false,
						err: "No se pudo autenticar."
					});
				}
			} else {
				req.decoded = decoded;
				next();
			}
		});
	} else if (username && password) {
		//Verificar username+password
		verifyUser(username, password);
	} else {
		return res.status(401).json({
			result: false,
			err: "Por favor provea los datos para la autenticación."
		});
	}
}

var administrative = function (req, res, next) {
	var username = req.decoded ? req.decoded._doc.username : "";
	var Users = mongoose.model('Users');

	Users.findOne({
		username: username,
		admin: true
	}).then((user) => {
		if (!user) {
			return res.status(403).json({
				result: false,
				err: "El usuario no tiene permisos suficientes."
			});
		} else {
			next();
		}
	}, (err) => {
		return res.status(500).json({
			result: false,
			err: err.message
		});
	});
}

var permission = function (req, res, next) {
	var username = req.decoded ? req.decoded._doc.username : "";
	var code = req.params.code;

	var Users = mongoose.model('Users');
	var UserPermissions = mongoose.model('UserPermissions');

	UserPermissions.findOne({
		username: username,
		code: code,
		active: true
	}).then((permit) => {
		if (permit) {
			return next();
		}

		//Si el usuario no tiene permisos, verificar si es administrador
		Users.findOne({
			username: username,
			admin: true
		}).then((user) => {
			if (!user) {
				return res.status(403).json({
					result: false,
					message: "El usuario no tiene permisos para interactuar con el cliente solicitado."
				})
			}

			next();
		}, (err) => {
			res.status(500).json({
				status: false,
				err: err.message
			});
		});
	}).catch((err) => {
		res.status(500).json({
			status: false,
			err: err.message
		});
	});
}

var validate = function (req, res, next) {
	var path = req.route.path;
	var method = req.method.toLowerCase();
	var schema = {};

	if (schemas[method] && schemas[method][path]) {
		schema = schemas[method][path];
	}

	return require('express-jsonschema').validate(schema)(req, res, next);
}

var queryBuilder = function (req, res, next) {
	let path = req.route.path;
	let method = req.method.toLowerCase();
	let where = {};

	if (schemas[method] && schemas[method][path]) {
		let schema = schemas[method][path];

		// Añadir las propiedades por default en el body
		Object.keys(schema).forEach((s) => {
			var properties = schema[s].properties;

			if (!properties) {
				return;
			}

			Object.keys(properties).forEach((p) => {
				var prop = properties[p];
				if (prop.default !== undefined) {
					req[s][p] = prop.default;
				}
			});
		});

		//Formateo de propiedades del body
		if (schema.body && schema.body.properties) {
			let body = schema.body.properties;

			Object.keys(req.body).forEach((q) => {
				let value = req.body[q];

				if (body[q]) {
					let type = body[q].type ? body[q].type.toLowerCase() : "string";

					if (type === 'date' || (type === 'string' && body[q].isDate === true)) {
						value = moment(value).format("YYYY-MM-DD");
					}

					if (type === 'time' || (type === 'string' && body[q].isTime === true)) {
						let time = moment(value, "HH:mm:ss").isValid() ? moment(value, "HH:mm:ss") : moment(value, "HH:mm").isValid() ? moment(value, "HH:mm") : moment(value, "HH");
						value = time.format("HH:mm:ss");
					}

					if (type === 'number' || (type === 'string' && body[q].isNumber === true)) {
						value = Number(value);
					}
				}

				req.body[q] = value;
			});
		}

		//Construcción del where según parámetros del query
		if (schema.query && schema.query.properties) {
			let query = schema.query.properties;

			Object.keys(req.query).forEach((q) => {
				let value = req.query[q];

				if (query[q]) {
					let type = query[q].type ? query[q].type.toLowerCase() : "string";

					if (type === 'date' || (type === 'string' && query[q].isDate === true)) {
						value = moment(value).format("YYYY-MM-DD");
					}

					if (type === 'time' || (type === 'string' && query[q].isTime === true)) {
						let time = moment(value, "HH:mm:ss").isValid() ? moment(value, "HH:mm:ss") : moment(value, "HH:mm").isValid() ? moment(value, "HH:mm") : moment(value, "HH");
						value = time.format("HH:mm:ss");
					}

					if (type === 'number' || (type === 'string' && query[q].isNumber === true)) {
						value = Number(value);
					}
				}

				where[q] = value;
			});
		}
	}

	req.queryWhere = where;

	next();
}

class Endpoints {
	constructor(app) {
		addSchemaProperties({
			isDate: function (value, schema, options, ctx) {
				if (!value) return;

				var valid = moment(value).isValid() === schema.isDate;

				if (!valid) {
					return "is " + (schema.isDate === true ? "not " : "") + "a valid date";
				}
			},
			isNumber: function (value, schema, options, ctx) {
				if (!value) return;

				var valid = !isNaN(Number(value)) === schema.isNumber;

				if (!valid) {
					return "is " + (schema.isNumber === true ? "not " : "") + "a valid number";
				}
			},
			isTime: function (value, schema, options, ctx) {
				if (!value) return;

				var valid = (moment(value, "HH:mm:ss").isValid() ? true : moment(value, "HH:mm").isValid() ? true : moment(value, "HH").isValid() ? true : false) === schema.isTime;

				if (!valid) {
					return "is " + (schema.isTime === true ? "not " : "") + "a valid time";
				}
			}
		});

		//Autenticacion
		app.post('/api/login', this.login.bind(this));

		//Aplicación de middlewares
		app.use('/api/*', authenticate);

		app.use('/api/:code/*', permission);

		//Verificacion de token o username+password
		app.get('/api/:code/profesionales', validate, queryBuilder, this.getTable("Profesionales").bind(this));

		app.get('/api/:code/especialidades', validate, queryBuilder, this.getTable("Especialidades").bind(this));

		app.get('/api/:code/turnos', validate, queryBuilder, this.getTurnos.bind(this));

		app.get('/api/:code/servicios', validate, queryBuilder, this.getTable("Servicios").bind(this));

		app.get('/api/:code/planesObraSocial', validate, queryBuilder, this.getTable("PlanesObraSocial").bind(this));

		app.get('/api/:code/pacientes', validate, queryBuilder, this.getTable("Pacientes").bind(this));

		app.get('/api/:code/estadoTurnos', validate, queryBuilder, this.getTable("EstadoTurnos").bind(this));

		app.get('/api/:code/tipoOrigenTurno', validate, queryBuilder, this.getTable("TipoOrigenTurno").bind(this));

		app.get('/api/:code/tipoTurnoFac', validate, queryBuilder, this.getTable("TipoTurnoFac").bind(this));

		app.post('/api/:code/turno', validate, queryBuilder, this.newTurno.bind(this));

		app.use(this.jsonSchemaValidation);

		//Aplicación de middlewares administrativos
		app.use('/api/admin/*', administrative);

		//Endpoints administrativos
		app.get('/api/admin/getClients', this.getClients.bind(this));

		app.get('/api/admin/getUsers', this.getUsers.bind(this));

		app.get('/api/admin/permissions/:username', this.getUserPermissions.bind(this));

		app.post('/api/admin/newUser', this.newUser.bind(this));

		app.post('/api/admin/newPermit', this.newPermit.bind(this));

		app.post('/api/admin/newClient', this.newClient.bind(this));

		app.post('/api/admin/editClient', this.editClient.bind(this));

		app.post('/api/admin/editUser', this.editUser.bind(this));

		app.post('/api/admin/editPermit', this.editPermit.bind(this));

		app.post('/api/admin/resetPassword', this.resetPassword.bind(this));

		app.post('/api/admin/removeClient', this.removeClient.bind(this));

		app.post('/api/admin/removePermit', this.removePermit.bind(this));

		app.post('/api/admin/removeUser', this.removeUser.bind(this));
	}

	/*
	 * Endpoints funcionales
	 */

	validate_client(code) {
		return new Promise((resolve, reject) => {
			var Clients = mongoose.model('Clients');

			Clients.findOne({
				code: code
			}).then((client) => {
				if (!client) {
					reject({
						message: "El cliente no existe o no está habilitado."
					});
				} else {
					resolve(client);
				}
			}).catch((err) => {
				reject(err);
			});
		});
	}

	jsonSchemaValidation(err, req, res, next) {
		var responseData;

		if (err.name === 'JsonSchemaValidation') {
			logger.error(err);
			res.status(400);

			responseData = {
				result: false,
				err: 'Parámetros inválidos',
				validations: err.validations
			};

			if (req.xhr || req.get('Content-Type') === 'application/json') {
				res.json(responseData);
			} else {
				res.send(JSON.stringify(responseData));
			}
		} else {
			next(err);
		}
	}

	/*
	 * Endpoints de autenticación
	 */

	getProfesionales(req, res) {
		var code = req.params.code;

		var Profesionales = SQLAnywhere.table('Profesionales');

		var query = Profesionales.find({
			where: req.queryWhere
		});

		this.dbQuery(code, query).then((data) => {
			res.json({
				result: true,
				data: {
					columns: Profesionales.columns,
					rows: data
				}
			});
		}).catch((err) => {
			if (err.status) {
				res.status(err.status);
			}

			res.json({
				result: false,
				err: err.message
			});
		});
	}

	getEspecialidades(req, res) {
		var code = req.params.code;

		var Especialidades = SQLAnywhere.table('Especialidades');

		var query = Especialidades.find({
			where: req.queryWhere
		});

		this.dbQuery(code, query).then((data) => {
			res.json({
				result: true,
				data: {
					columns: Especialidades.columns,
					rows: data
				}
			});
		}).catch((err) => {
			if (err.status) {
				res.status(err.status);
			}

			res.json({
				result: false,
				err: err.message
			});
		});
	}

	getTurnos(req, res) {
		var code = req.params.code;

		var Turnos = SQLAnywhere.table('Turnos');
		var Especialidades = SQLAnywhere.table('Especialidades');
		var Profesionales = SQLAnywhere.table('Profesionales');

		Turnos.join(Profesionales, Profesionales.profesional_id)
			.join(Especialidades, Profesionales.profesional_id, Especialidades.especialidad_id);

		var query = Turnos.find({
			where: req.queryWhere,
			order: {
				turno_fecha: -1
			}
		}).then((query) => {
			return this.dbQuery(code, query);
		}).then((rows) => {
			res.json({
				result: true,
				data: {
					columns: Turnos.columns,
					rows: rows
				}
			});
		}).catch((err) => {
			if (err.status) {
				res.status(err.status);
			}

			res.json({
				result: false,
				err: err.message
			});
		});
	}

	newTurno(req, res) {
		var code = req.params.code;
		var turno = req.body;

		var Turnos = SQLAnywhere.table(code, 'Turnos');
		var Pacientes = SQLAnywhere.table(code, 'Pacientes');
		var PlanesObraSocial = SQLAnywhere.table(code, 'PlanesObraSocial');

		// Obtener datos del paciente y completar datos del turno
		Pacientes.findOne({
			where: {
				paciente_id: turno.paciente_id
			}
		}).then((paciente) => {
			let plan_os_id, paciente_os_afiliado_nro;

			if (paciente.plan_os_id_1) {
				plan_os_id = paciente.plan_os_id_1;
				paciente_os_afiliado_nro = paciente.paciente_os_afiliado1_nro;
			} else if (paciente.plan_os_id_2) {
				plan_os_id = paciente.plan_os_id_2;
				paciente_os_afiliado_nro = paciente.paciente_os_afiliado2_nro;
			} else if (paciente.plan_os_id_3) {
				plan_os_id = paciente.plan_os_id_3;
				paciente_os_afiliado_nro = paciente.paciente_os_afiliado3_nro;
			} else {
				return new Promise((resolve, reject) => {
					reject({
						message: "El paciente no tiene un Plan de Obra Social asignado"
					});
				});
			}

			turno.paciente_nro_doc = paciente.persona_documento_nro;
			turno.paciente_nro_tel = paciente.persona_telefono_part_nro || paciente.persona_telefono_cel_nro || paciente.persona_telefono_lab_nro;
			turno.plan_os_id = plan_os_id;
			turno.paciente_nro_afil = paciente_os_afiliado_nro;

			return PlanesObraSocial.findOne({
				where: {
					plan_os_id: plan_os_id
				}
			});
		}).then((plan_os) => {
			turno.obra_social_id = plan_os.obra_social_id;

			return Turnos.save(turno);
		}).then((row) => {
			res.json({
				result: true,
				data: row
			});
		}).catch((err) => {
			res.json({
				result: false,
				err: err.message
			});
		});
	}

	dbQuery(code, query) {
		return new Promise((resolve, reject) => {
			this.validate_client(code).then((client) => {
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

				var db = new Sybase(client.dbHost, client.dbPort, client.dbServername, client.dbUsername, client.dbPassword);
				db.connect((err) => {
					if (err) {
						logger.error(err);
						return reject(err);
					}

					db.query(query, function (err, data) {
						if (err) {
							logger.error(err);
							return reject(err);
						}

						db.disconnect();

						resolve(data);
					});
				});
			}).catch((err) => {
				reject(err);
			});
		});
	}

	login(req, res) {
		var Users = mongoose.model('Users');

		Users.findOne({
			username: req.body.username
		}).then(function (user) {
			if (!user)
				return res.status(401).json({ result: false, err: "Combinación de usuario y contraseña incorrecta." });

			if (user.password != md5(req.body.password))
				return res.status(401).json({ result: false, err: "Combinación de usuario y contraseña incorrecta." });

			var token = jwt.sign(user, global.tokenSecret, {
				expiresIn: 60 * 60 * 24 // Expirar el token en 24 horas
			});

			// Si no proporciona un reCAPTCHA, se lo identifica como usuario externo y se lo autentica
			if (!req.body.rcResponse) {
				return res.json({
					result: true,
					token: token
				});
			}

			// if (!req.body.rcResponse) {
			// 	return res.json({
			// 		result: false,
			// 		err: "Por favor ingrese la verificación reCAPTCHA."
			// 	});
			// }

			var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + config.rcSecret + "&response=" + req.body.rcResponse + "&remoteip=";

			request(verificationUrl, (error, response, body) => {
				if (error) {
					logger.error(err);
					return res.status(401).json({
						result: false,
						err: "Ocurrió un error al intentar verificar el reCAPTCHA. Por favor, intente nuevamente."
					});
				}

				body = JSON.parse(body);

				if (body.success === true) {
					res.json({
						result: true,
						token: token
					});
				} else {
					res.status(401).json({
						result: false,
						err: "La verificación reCAPTCHA ha expirado o es inválida. Por favor, intente nuevamente."
					});
				}
			});
		}, function (err) {
			return res.status(500).json({ result: false, err: err.message });
		});
	}

	/*
	 * Endpoints administrativos
	 */

	getClients(req, res) {
		var Clients = mongoose.model('Clients');

		Clients.find({}).then((clients) => {
			res.json({
				result: true,
				data: clients
			});
		}, (err) => {
			res.status(500).json({
				result: false,
				err: err.message
			});
		});
	}

	getUsers(req, res) {
		var Users = mongoose.model('Users');

		Users.find({}).then((users) => {
			res.json({
				result: true,
				data: users
			});
		}, (err) => {
			res.status(500).json({
				result: false,
				err: err.message
			});
		});
	}

	getUserPermissions(req, res) {
		var UserPermissions = mongoose.model('UserPermissions');

		UserPermissions.find({
			username: req.params.username
		}).then((permissions) => {
			res.json({
				result: true,
				data: permissions
			});
		}, (err) => {
			res.status(500).json({
				result: false,
				err: err.message
			});
		});
	}

	newUser(req, res) {
		var Users = mongoose.model('Users');

		Users.findOne({
			username: req.body.username
		}).then(function (user) {
			if (user)
				return res.status(409).json({ result: false, err: "El usuario ya existe" });

			var newUser = req.body;
			newUser.password = md5(req.body.password);

			var user = new Users(newUser);

			user.save().then(function (user) {
				res.json({ result: true, data: user });
			}, function (err) {
				return res.status(500).json({ result: false, err: err.message });
			});
		}, function (err) {
			return res.status(500).json({ result: false, err: err.message });
		});
	}

	newPermit(req, res) {
		var UserPermissions = mongoose.model('UserPermissions');

		UserPermissions.findOne({
			username: req.body.username,
			code: req.body.code
		}).then(function (permit) {
			if (permit)
				return res.status(409).json({ result: false, err: "El permiso ya existe" });

			var permit = new UserPermissions(req.body);

			permit.save().then(function (permit) {
				res.json({ result: true, data: permit });
			}, function (err) {
				return res.status(500).json({ result: false, err: err.message });
			});
		}, function (err) {
			return res.status(500).json({ result: false, err: err.message });
		});
	}

	newClient(req, res) {
		var Clients = mongoose.model('Clients');

		Clients.findOne({
			code: req.body.code
		}).then(function (client) {
			if (client)
				return res.status(409).json({ result: false, err: "El cliente ya existe" });

			var newClient = req.body;

			var client = new Clients(newClient);

			client.save().then(function (client) {
				res.json({ result: true, data: client });
			}, function (err) {
				return res.status(500).json({ result: false, err: err.message });
			});
		}, function (err) {
			return res.status(500).json({ result: false, err: err.message });
		});
	}

	editClient(req, res) {
		var Clients = mongoose.model('Clients');
		var editedClient = req.body;

		Clients.findById(editedClient._id).then((client) => {
			if (!client)
				return res.status(409).json({ result: false, err: "El cliente no existe" });

			_.merge(client, editedClient);
			client.save().then((client) => {
				res.json({ result: true, data: client });
			}, (err) => {
				res.status(500).json({ result: false, err: err.message });
			});
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	editUser(req, res) {
		var Users = mongoose.model('Users');
		var editedUser = req.body;

		Users.findById(editedUser._id).then((user) => {
			if (!user)
				return res.status(409).json({ result: false, err: "El usuario no existe" });

			_.merge(user, editedUser);
			user.save().then((user) => {
				res.json({ result: true, data: user });
			}, (err) => {
				res.status(500).json({ result: false, err: err.message });
			});
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	editPermit(req, res) {
		var UserPermissions = mongoose.model('UserPermissions');
		var editedPermit = req.body;

		UserPermissions.findById(editedPermit._id).then((permit) => {
			if (!permit)
				return res.status(409).json({ result: false, err: "El permiso no existe" });

			_.merge(permit, editedPermit);
			permit.save().then((permit) => {
				res.json({ result: true, data: permit });
			}, (err) => {
				res.status(500).json({ result: false, err: err.message });
			});
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	resetPassword(req, res) {
		var Users = mongoose.model('Users');
		var editedUser = req.body;

		Users.findById(editedUser._id).then((user) => {
			if (!user)
				return res.status(409).json({ result: false, err: "El usuario no existe" });

			user.password = md5(editedUser.newPassword);

			user.save().then((user) => {
				res.json({ result: true, data: user });
			}, (err) => {
				res.status(500).json({ result: false, err: err.message });
			});
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	removeClient(req, res) {
		var Clients = mongoose.model('Clients');
		var client = req.body;

		Clients.findByIdAndRemove(client._id).exec().then((client) => {
			res.json({ result: true, data: client });
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	removePermit(req, res) {
		var UserPermissions = mongoose.model('UserPermissions');
		var permit = req.body;

		UserPermissions.findByIdAndRemove(permit._id).exec().then((permit) => {
			res.json({ result: true, data: permit });
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}

	removeUser(req, res) {
		var Users = mongoose.model('Users');
		var user = req.body;

		Users.findByIdAndRemove(user._id).exec().then((user) => {
			res.json({ result: true, data: user });
		}, (err) => {
			res.status(500).json({ result: false, err: err.message });
		});
	}
}

module.exports = Endpoints;
