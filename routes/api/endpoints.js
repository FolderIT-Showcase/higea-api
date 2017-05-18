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
	validate = require('express-jsonschema').validate,
	addSchemaProperties = require('express-jsonschema').addSchemaProperties,
	logger = require('tracer').colorConsole(global.loggerFormat);

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

class Endpoints {
	constructor(app) {
		this.schemas = {
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
						properties: {
							turno_fecha: {
								type: 'string',
								isDate: true
							},
							especialidad_id: {
								type: 'string',
								isNumber: true
							},
							profesional_id: {
								type: 'string',
								isNumber: true
							}
						}
					}
				},
				"/api/:code/turnos/:profesional": {
					params: {
						type: 'object',
						properties: {
							code: {
								type: 'string',
								required: true
							},
							profesional: {
								type: 'string',
								required: true
							}
						}
					}
				}
			},
			post: {
			}
		};

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
			}
		});

		//Autenticacion
		app.post('/api/login', this.login.bind(this));

		//Verificacion de token o username+password
		app.get('/api/:code/profesionales', authenticate, validate(this.schemas.get['/api/:code/profesionales']), this.getProfesionales.bind(this));

		app.get('/api/:code/especialidades', authenticate, validate(this.schemas.get['/api/:code/especialidades']), this.getEspecialidades.bind(this));

		app.get('/api/:code/turnos', authenticate, validate(this.schemas.get['/api/:code/turnos']), this.getTurnos.bind(this));

		app.use(this.jsonSchemaValidation);

		//Verificación de permisos administrativos
		app.get('/api/getClients', authenticate, administrative, this.getClients.bind(this));

		app.get('/api/getUsers', authenticate, administrative, this.getUsers.bind(this));

		app.get('/api/permissions/:username', authenticate, administrative, this.getUserPermissions.bind(this));

		app.post('/api/newUser', authenticate, administrative, this.newUser.bind(this));

		app.post('/api/newPermit', authenticate, administrative, this.newPermit.bind(this));

		app.post('/api/newClient', authenticate, administrative, this.newClient.bind(this));

		app.post('/api/editClient', authenticate, administrative, this.editClient.bind(this));

		app.post('/api/editUser', authenticate, administrative, this.editUser.bind(this));

		app.post('/api/editPermit', authenticate, administrative, this.editPermit.bind(this));

		app.post('/api/resetPassword', authenticate, administrative, this.resetPassword.bind(this));

		app.post('/api/removeClient', authenticate, administrative, this.removeClient.bind(this));

		app.post('/api/removePermit', authenticate, administrative, this.removePermit.bind(this));

		app.post('/api/removeUser', authenticate, administrative, this.removeUser.bind(this));
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

	validate_username(username, code) {
		return new Promise((resolve, reject) => {
			var Users = mongoose.model('Users');
			var UserPermissions = mongoose.model('UserPermissions');

			UserPermissions.findOne({
				username: username,
				code: code,
				active: true
			}).then((permit) => {
				if (!permit) {
					//Si el usuario no tiene permisos, verificar si es administrador
					Users.findOne({
						username: username,
						admin: true
					}).then((user) => {
						if (!user) {
							reject({
								status: 403,
								message: "El usuario no tiene permisos para interactuar con el cliente solicitado."
							});
						} else {
							resolve(user);
						}
					}, (err) => {
						reject(err);
					});
				} else {
					resolve(permit);
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
		var username = req.decoded ? req.decoded._doc.username : "";
		var code = req.params.code;
		var where = {};

		var Profesionales = SQLAnywhere.table('Profesionales');

		for (let param in req.query) {
			if (Profesionales.schema[param]) {
				let value = req.query[param];

				if (Profesionales.schema[param].type.toLowerCase() === 'date') {
					value = moment(value).format("YYYY-MM-DD");
				}

				where[param] = value;
			}
		}

		var query = Profesionales.find({
			where: where
		});

		this.dbQuery(username, code, query).then((data) => {
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
		var username = req.decoded ? req.decoded._doc.username : "";
		var code = req.params.code;
		var where = {};

		var Especialidades = SQLAnywhere.table('Especialidades');

		for (let param in req.query) {
			if (Especialidades.schema[param]) {
				let value = req.query[param];

				if (Especialidades.schema[param].type.toLowerCase() === 'date') {
					value = moment(value).format("YYYY-MM-DD");
				}

				where[param] = value;
			}
		}

		var query = Especialidades.find({
			where: where
		});

		this.dbQuery(username, code, query).then((data) => {
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
		var username = req.decoded ? req.decoded._doc.username : "";
		var code = req.params.code;
		var where = {};

		var Turnos = SQLAnywhere.table('Turnos');
		var Especialidades = SQLAnywhere.table('Especialidades');
		var Profesionales = SQLAnywhere.table('Profesionales');

		Profesionales.join(Especialidades, Especialidades.schema.especialidad_id);
		Turnos.join(Profesionales, Profesionales.schema.profesional_id);

		for (let param in req.query) {
			if (Turnos.schema[param]) {
				let value = req.query[param];

				if (Turnos.schema[param].type.toLowerCase() === 'date') {
					value = moment(value).format("YYYY-MM-DD");
				}

				where[param] = value;
			}
		}

		var query = Turnos.find({
			where: where,
			order: {
				turno_fecha: -1
			}
		});

		this.dbQuery(username, code, query).then((data) => {
			res.json({
				result: true,
				data: {
					columns: Turnos.columns,
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

	dbQuery(username, code, query) {
		return new Promise((resolve, reject) => {
			this.validate_username(username, code).then((permit) => {
				return this.validate_client(code);
			}).then((client) => {
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
