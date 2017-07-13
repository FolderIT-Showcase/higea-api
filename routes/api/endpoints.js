'use strict';

var _ = require('../../helpers/lodash'),
	mongoose = require('mongoose'),
	md5 = require('md5'),
	jwt = require('jsonwebtoken'),
	moment = require('moment'),
	fs = require('fs'),
	path = require('path'),
	config = require('../../config'),
	request = require('request'),
	SQLAnywhere = require('../../models/SQLAnywhere'),
	auth = require('basic-auth'),
	addSchemaProperties = require('express-jsonschema').addSchemaProperties,
	logger = require('tracer').colorConsole(global.loggerFormat);

var schemas = {
	get: {
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
				properties: SQLAnywhere.validate(["Turnos", "Especialidades"], true)
			}
		},
		"/api/:code/pacientes": {
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
				properties: {}
			}
		},
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
				properties: SQLAnywhere.validate(["Profesionales", "ServiciosProfesionales"], true)
			}
		},
		"/api/:code/agendas": {
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
				properties: SQLAnywhere.validate(["ConfiguracionTurnosProf", "ConfTurnosObraSocial", "ServiciosProfesionales"], true),
				additionalProperties: {
					agenda_fecha: {
						type: "string",
						isDate: true
					}
				}
			}
		},
		"/api/:code/calendario": {
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
				properties: SQLAnywhere.validate(["ConfiguracionTurnosProf", "ServiciosProfesionales"], true),
				additionalProperties: {
					servicio_id: {
						type: "string",
						required: true
					},
					profesional_id: {
						type: "string",
						required: true
					},
					calendario_fecha: {
						type: "string",
						required: true,
						isDate: true
					}
				}
			}
		}
	},
	post: {
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
		if (schema.query && schema.query.additionalProperties) {
			for (let p in schema.query.additionalProperties) {
				schema.query.properties[p] = schema.query.additionalProperties[p];
			}
		}

		return require('express-jsonschema').validate(schema)(req, res, next);
	} else if (path.startsWith("/api/:code")) {
		// Intentar construir el esquema, si se identifica una tabla definida
		var tableName = path.split("/").splice(-1)[0];
		tableName = _.snakeCase(tableName).charAt(0).toUpperCase() + tableName.slice(1);
		var table = SQLAnywhere.table("", tableName);

		// Si existe la tabla, construir el esquema
		if (table) {
			schema = {
				params: {
					type: 'object',
					properties: {
						code: {
							type: 'string',
							required: true
						}
					}
				}
			};

			if (method === "get") {
				schema.query = {
					type: 'object',
					properties: SQLAnywhere.validate(tableName, true)
				};
			}

			if (method === "post") {
				schema.body = {
					type: 'object',
					properties: SQLAnywhere.validate(tableName)
				};
			}

			return require('express-jsonschema').validate(schema)(req, res, next);
		} else {
			next();
		}
	} else {
		next();
	}
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

				if (typeof (body[q]) !== "undefined" && typeof (body[q]) !== "null") {
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

				//Remover propiedad para evitar conflictos
				if (req.body[q] === null || req.body[q] === undefined) {
					delete req.body[q];
				} else {
					req.body[q] = value;
				}
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
		app.get('/api/:code/profesionales', validate, queryBuilder, this.getProfesionales.bind(this));

		app.get('/api/:code/profesionalesDisponibles', validate, queryBuilder, this.getProfesionalesDisponibles.bind(this));

		app.get('/api/:code/especialidades', validate, queryBuilder, this.getTable("Especialidades").bind(this));

		app.get('/api/:code/turnos', validate, queryBuilder, this.getTurnos.bind(this));

		app.get('/api/:code/servicios', validate, queryBuilder, this.getTable("Servicios").bind(this));

		app.get('/api/:code/obrasSociales', validate, queryBuilder, this.getTable("ObrasSociales").bind(this));

		app.get('/api/:code/planesObraSocial', validate, queryBuilder, this.getTable("PlanesObraSocial").bind(this));

		app.get('/api/:code/pacientes', validate, queryBuilder, this.getTable("Pacientes").bind(this));

		app.get('/api/:code/estadoTurnos', validate, queryBuilder, this.getTable("EstadoTurnos").bind(this));

		app.get('/api/:code/tipoOrigenTurno', validate, queryBuilder, this.getTable("TipoOrigenTurno").bind(this));

		// app.get('/api/:code/tipoTurnoFac', validate, queryBuilder, this.getTable("TipoTurnoFac").bind(this));

		app.get('/api/:code/tipoTurnos', validate, queryBuilder, this.getTable("TipoConsultaGrupo").bind(this));

		app.get('/api/:code/motivoTurnos', validate, queryBuilder, this.getTable("TipoEpisodioConsulta").bind(this));

		app.get('/api/:code/estadoCiviles', validate, queryBuilder, this.getTable("EstadoCiviles").bind(this));

		app.get('/api/:code/tipoDocumentos', validate, queryBuilder, this.getTable("TipoDocumentos").bind(this));

		app.get('/api/:code/paises', validate, queryBuilder, this.getTable("Paises").bind(this));

		app.get('/api/:code/provincias', validate, queryBuilder, this.getTable("Provincias").bind(this));

		app.get('/api/:code/localidades', validate, queryBuilder, this.getTable("Localidades").bind(this));

		app.get('/api/:code/agendas', validate, queryBuilder, this.getAgenda.bind(this));

		app.get('/api/:code/calendario', validate, queryBuilder, this.getCalendario.bind(this));

		app.post('/api/:code/turnos', validate, queryBuilder, this.newTurno.bind(this));

		app.post('/api/:code/pacientes', validate, queryBuilder, this.newPaciente.bind(this));

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

	jsonSchemaValidation(err, req, res, next) {
		var responseData;

		if (err.name === 'JsonSchemaValidation') {
			logger.error(err.validations);
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

	getTable(tableName) {
		return function (req, res) {
			var code = req.params.code;

			var Table = SQLAnywhere.table(code, tableName);
			Table.find({
				where: req.queryWhere
			}).then((rows) => {
				res.json({
					result: true,
					data: {
						columns: Table.columns,
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
	}

	getProfesionales(req, res) {
		var code = req.params.code;

		var Profesionales = SQLAnywhere.table(code, "Profesionales");
		var ServiciosProfesionales = SQLAnywhere.table(code, "ServiciosProfesionales");

		Profesionales.join(ServiciosProfesionales, ServiciosProfesionales.profesional_id);

		Profesionales.find({
			where: req.queryWhere
		}).then((profesionales) => {
			res.json({
				result: true,
				data: {
					columns: Profesionales.columns,
					rows: profesionales
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

	getProfesionalesDisponibles(req, res) {
		var code = req.params.code;

		var Profesionales = SQLAnywhere.table(code, "Profesionales");
		var ServiciosProfesionales = SQLAnywhere.table(code, "ServiciosProfesionales");
		var ConfiguracionTurnosProf = SQLAnywhere.table(code, "ConfiguracionTurnosProf");

		Profesionales.join(ServiciosProfesionales, ServiciosProfesionales.profesional_id, undefined, "INNER")
			.join(ConfiguracionTurnosProf, ServiciosProfesionales.servicio_profesional_id, ConfiguracionTurnosProf.servicio_profesional_id, "INNER", false);

		// Mostrar sólo profesionales habilitados (para los casos de desactivación de profesionales)
		req.queryWhere.profesional_clinica = "S";

		Profesionales.find({
			distinct: true,
			where: req.queryWhere
		}).then((profesionales) => {
			res.json({
				result: true,
				data: {
					columns: Profesionales.columns,
					rows: profesionales
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

		var Turnos = SQLAnywhere.table(code, 'Turnos');
		var Especialidades = SQLAnywhere.table(code, 'Especialidades');
		var Profesionales = SQLAnywhere.table(code, 'Profesionales');

		Turnos.join(Profesionales, Profesionales.profesional_id)
			.join(Especialidades, Profesionales.profesional_id, Especialidades.especialidad_id);

		Turnos.find({
			where: req.queryWhere,
			order: {
				turno_fecha: -1
			}
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

	getAgenda(req, res) {
		var code = req.params.code;
		var horariosAtencion = [], horariosNoAtencion = [];

		if (req.queryWhere.profesional_id) {
			let profesional_id = req.queryWhere.profesional_id;
			delete req.queryWhere.profesional_id;
			req.queryWhere["$or"] = [{
				profesional_id: profesional_id
			}, {
				conf_turno_efector_id: profesional_id
			}];
		}

		if (req.queryWhere.agenda_fecha) {
			let diaSemana = moment(req.queryWhere.agenda_fecha).day() + 1;

			req.queryWhere.conf_turno_fecha_fin = {
				value: req.queryWhere.agenda_fecha,
				operator: ">="
			};

			req.queryWhere.conf_turno_fecha_ini = {
				value: req.queryWhere.agenda_fecha,
				operator: "<="
			};

			req.queryWhere.conf_turno_dia_atencion = diaSemana;
		}

		var Turnos = SQLAnywhere.table(code, "Turnos");
		var ConfiguracionTurnosProf = SQLAnywhere.table(code, "ConfiguracionTurnosProf");
		var ConfTurnosObraSocial = SQLAnywhere.table(code, "ConfTurnosObraSocial");
		var ServiciosProfesionales = SQLAnywhere.table(code, "ServiciosProfesionales");
		var PlanesObraSocial = SQLAnywhere.table(code, "PlanesObraSocial");

		ConfiguracionTurnosProf.join(ConfTurnosObraSocial, ConfTurnosObraSocial.conf_turno_id)
			.join(ServiciosProfesionales, ServiciosProfesionales.servicio_profesional_id)
			.join(PlanesObraSocial, ConfTurnosObraSocial.obra_social_id, PlanesObraSocial.obra_social_id);

		req.queryWhere.conf_turno_atiende = "S";

		ConfiguracionTurnosProf.find({
			where: req.queryWhere,
			limit: 0
		}).then((horarios) => {
			horariosAtencion = horarios;

			req.queryWhere.conf_turno_atiende = "N";

			if (req.queryWhere.plan_os_id) {
				delete req.queryWhere.plan_os_id;
			}

			if (req.queryWhere.conf_turno_dia_atencion) {
				delete req.queryWhere.conf_turno_dia_atencion;
			}

			return ConfiguracionTurnosProf.find({
				where: req.queryWhere,
				limit: 0
			});
		}).then((horarios) => {
			horariosNoAtencion = horarios;

			return new Promise((resolve, reject) => {
				let turnosAll = [];

				_.forEachCb(horariosAtencion, (horario, next) => {
					let turnosWhere = {
						turno_hora: {
							$between: [horario.conf_turno_hora_ini, horario.conf_turno_hora_fin]
						},
						servicio_id: horario.servicio_id,
						profesional_id: horario.profesional_id || horario.conf_turno_efector_id
					};

					if (req.queryWhere.agenda_fecha) {
						turnosWhere.turno_fecha = req.queryWhere.agenda_fecha;
					} else {
						turnosWhere.turno_fecha = {
							$between: [horario.conf_turno_fecha_ini, horario.conf_turno_fecha_fin]
						};
					}

					if (horario.plan_os_id) {
						turnosWhere.plan_os_id = horario.plan_os_id;
					}

					Turnos.find({
						where: turnosWhere
					}).then((turnos) => {
						// Agregar turnos vacíos
						let fechaInicio = moment(horario.conf_turno_fecha_ini, "YYYY-MM-DD");
						let fechaActual = moment.max(moment(), moment(horario.conf_turno_fecha_ini, "YYYY-MM-DD")).clone();
						let fechaFin = moment(horario.conf_turno_fecha_fin, "YYYY-MM-DD");

						if (req.queryWhere.agenda_fecha) {
							fechaInicio = moment(req.queryWhere.agenda_fecha, "YYYY-MM-DD");
							fechaActual = moment(req.queryWhere.agenda_fecha, "YYYY-MM-DD");
							fechaFin = moment(req.queryWhere.agenda_fecha, "YYYY-MM-DD");
						}

						while (fechaActual <= fechaFin) {
							let horaInicio = moment(horario.conf_turno_hora_ini, "HH:mm:ss");
							let horaActual = moment(horario.conf_turno_hora_ini, "HH:mm:ss");
							let horaFin = moment(horario.conf_turno_hora_fin, "HH:mm:ss");
							let duracion = horario.conf_turno_duracion_turno;

							while (horaActual <= horaFin) {
								let turno = Turnos.newRow();

								turno.profesional_id = horario.profesional_id || horario.conf_turno_efector_id;
								turno.servicio_id = horario.servicio_id;
								turno.turno_fecha = fechaActual.format("YYYY-MM-DD");
								turno.turno_hora = horaActual.format("HH:mm:ss");
								turno.turno_duracion = duracion;

								if (horario.plan_os_id) {
									turno.plan_os_id = horario.plan_os_id;
								}

								let fechaHoraActual = fechaActual.clone();
								fechaHoraActual.set({
									'hour': horaActual.get('hour'),
									'minute': horaActual.get('minute')
								});

								// Verificar que el turno no esté ocupado y sea a futuro
								if (fechaHoraActual.isAfter(moment(), "minutes") && _.findIndex(turnos, (t) => {
									if (t.turno_fecha === turno.turno_fecha
										&& t.turno_hora === turno.turno_hora
										&& (t.profesional_id === turno.profesional_id
											|| t.profesional_id === turno.conf_turno_efector_id)
										&& t.servicio_id === turno.servicio_id) {
										if (turno.plan_os_id && t.plan_os_id !== turno.plan_os_id) {
											return false;
										} else {
											return true
										}
									} else {
										return false;
									}
								}) === -1) {
									turnos.push(turno);
								}

								horaActual.add(duracion, "minutes");
							}
							fechaActual.add(1, "days");
						}

						// Evitar agregar turnos vacíos duplicados
						turnosAll = _.unionWith(turnosAll, turnos, _.isEqual);

						next();
					}).catch(reject);
				}, (horariosAtencion) => {
					// Quitar turnos vacíos de horarios de NO atención
					horariosNoAtencion.forEach((horario) => {
						let fechaInicio = moment(horario.conf_turno_fecha_ini, "YYYY-MM-DD");
						let fechaFin = moment(horario.conf_turno_fecha_fin, "YYYY-MM-DD");
						let horaInicio = moment(horario.conf_turno_hora_ini, "HH:mm:ss");
						let horaFin = moment(horario.conf_turno_hora_fin, "HH:mm:ss");

						if (req.queryWhere.agenda_fecha) {
							fechaInicio = moment(req.queryWhere.agenda_fecha, "YYYY-MM-DD");
							fechaFin = moment(req.queryWhere.agenda_fecha, "YYYY-MM-DD");
						}

						_.remove(turnosAll, (t) => {
							if (typeof (t.turnos_id) === "undefined"
								&& moment(t.turno_fecha, "YYYY-MM-DD").isBetween(fechaInicio, fechaFin, null, "[]")
								&& moment(t.turno_hora, "HH:mm:ss").isBetween(horaInicio, horaFin, "minutes", "[]")
								&& (t.profesional_id === horario.profesional_id
									|| t.profesional_id === horario.conf_turno_efector_id)
								&& t.servicio_id === horario.servicio_id) {
								return true;
							} else {
								return false;
							}
						});
					});

					turnosAll = _.sortBy(turnosAll, ["profesional_id", "turno_fecha", "turno_hora"]);

					resolve(turnosAll);
				});
			});
		}).then((turnos) => {
			res.json({
				result: true,
				data: {
					columns: Turnos.columns,
					rows: turnos
				}
			});
		}).catch((err) => {
			logger.error(err);
			res.json({
				result: false,
				err: err.message
			});
		});
	}

	getCalendario(req, res) {
		var code = req.params.code;
		var calendarioIni, calendarioFin;
		let calendariosAll = [];

		var ConfiguracionTurnosProf = SQLAnywhere.table(code, "ConfiguracionTurnosProf");
		var ServiciosProfesionales = SQLAnywhere.table(code, "ServiciosProfesionales");

		ConfiguracionTurnosProf.join(ServiciosProfesionales, ServiciosProfesionales.servicio_profesional_id);

		if (req.queryWhere.profesional_id) {
			let profesional_id = req.queryWhere.profesional_id;
			delete req.queryWhere.profesional_id;
			req.queryWhere["$or"] = [{
				profesional_id: profesional_id
			}, {
				conf_turno_efector_id: profesional_id
			}];
		}

		if (req.queryWhere.calendario_fecha) {
			let calendario_fecha = moment(req.queryWhere.calendario_fecha).format("YYYYMM");
			calendarioIni = moment(req.queryWhere.calendario_fecha).startOf("month");
			calendarioFin = moment(req.queryWhere.calendario_fecha).endOf("month");

			req.queryWhere.conf_turno_fecha_ini = {
				"$inbetween": [
					calendario_fecha,
					"(Year(dba.configuracion_turnos_prof.conf_turno_fecha_ini)*100)+Month(dba.configuracion_turnos_prof.conf_turno_fecha_ini)",
					"(Year(dba.configuracion_turnos_prof.conf_turno_fecha_fin)*100)+Month(dba.configuracion_turnos_prof.conf_turno_fecha_fin)"],
				type: "number"
			};
		}

		ConfiguracionTurnosProf.find({
			where: req.queryWhere
		}).then((calendarios) => {
			// Establecer dias de atencion
			return new Promise((resolve, reject) => {
				_.forEachCb(calendarios, (calendario, next) => {
					if (calendario.conf_turno_atiende !== "S") {
						return next();
					}

					let fechaIni = moment.max(moment(calendario.conf_turno_fecha_ini), calendarioIni).clone();
					let fechaFin = moment.min(moment(calendario.conf_turno_fecha_fin), calendarioFin).clone();
					let dias = [];

					while (fechaIni <= fechaFin) {
						let diaSemana = fechaIni.day() + 1;

						if (calendario.conf_turno_dia_atencion === diaSemana) {
							dias.push({
								profesional_id: calendario.profesional_id || calendario.conf_turno_efector_id,
								servicio_id: calendario.servicio_id,
								calendario_fecha: fechaIni.format("YYYY-MM-DD"),
								calendario_atiende: "S"
							});
						}

						fechaIni.add(1, "days");
					}

					calendariosAll = _.unionWith(calendariosAll, dias, _.isEqual);

					next();
				}, resolve);
			});
		}).then((calendarios) => {
			// Establecer dias de no atencion
			return new Promise((resolve, reject) => {
				_.forEachCb(calendarios, (calendario, next) => {
					if (calendario.conf_turno_atiende !== "N") {
						return next();
					}

					let fechaIni = moment.max(moment(calendario.conf_turno_fecha_ini), calendarioIni).clone();
					let fechaFin = moment.min(moment(calendario.conf_turno_fecha_fin), calendarioFin).clone();

					while (fechaIni <= fechaFin) {
						let i = _.findIndex(calendariosAll, (o) => {
							return o.calendario_fecha === fechaIni.format("YYYY-MM-DD");
						});

						if (i >= 0) {
							calendariosAll[i].calendario_atiende = "N";
						} else {
							calendariosAll.push({
								profesional_id: calendario.profesional_id || calendario.conf_turno_efector_id,
								servicio_id: calendario.servicio_id,
								calendario_fecha: fechaIni.format("YYYY-MM-DD"),
								calendario_atiende: "N"
							});
						}

						fechaIni.add(1, "days");
					}

					next();
				}, (calendarios) => {
					calendariosAll = _.sortBy(calendariosAll, ["calendario_fecha"]);

					resolve(calendariosAll);
				});
			});
		}).then((calendarios) => {
			res.json({
				result: true,
				data: calendarios
			});
		}).catch((err) => {
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

		if (turno.tipo_turno_fac_id === 1) {
			turno.efector_id = turno.profesional_id;
		}

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
		}).then((turno) => {
			res.json({
				result: true,
				data: {
					columns: Turnos.columns,
					rows: turno
				}
			});
		}).catch((err) => {
			res.json({
				result: false,
				err: err.message
			});
		});
	}

	newPaciente(req, res) {
		var code = req.params.code;
		var paciente = req.body;

		var Pacientes = SQLAnywhere.table(code, 'Pacientes');
		var Paises = SQLAnywhere.table(code, 'Paises');
		var Localidades = SQLAnywhere.table(code, 'Localidades');
		var Provincias = SQLAnywhere.table(code, 'Provincias');

		//Obtener datos adicionales y autocompletar
		Localidades.join(Provincias, Provincias.provincia_id)
			.join(Paises, Provincias.pais_id, Paises.pais_id);

		Localidades.findOne({
			where: {
				localidad_id: paciente.localidad_id
			}
		}).then((localidad) => {
			paciente.provincia_id = localidad.provincia_id;
			paciente.pais_id = localidad.pais_id;

			return Pacientes.save(paciente).then((paciente) => {
				res.json({
					result: true,
					data: {
						columns: Pacientes.columns,
						rows: paciente
					}
				});
			});
		}).catch((err) => {
			res.json({
				result: false,
				err: err.message
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
