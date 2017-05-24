var schema = {
    turnos_id: {
        type: "Number",
        label: "ID Turno",
        identity: true
    },
    paciente_id: {
        type: "Number",
        label: "ID Paciente",
        required: true
    },
    profesional_id: {
        type: "Number",
        label: "ID Profesional",
        required: true
    },
    efector_id: {
        type: "Number",
        label: "ID Efector"
    },
    grupo_atencion_id: {
        type: "Number",
        label: "ID Grupo de Atención"
    },
    servicio_id: {
        type: "Number",
        label: "ID Servicio",
        required: true
    },
    obra_social_id: {
        type: "Number",
        label: "ID Obra Social"
    },
    plan_os_id: {
        type: "Number",
        label: "ID Plan de Obra Social"
    },
    estado_turno_id: {
        type: "Number",
        label: "ID Estado",
        required: true
    },
    derivador_id: {
        type: "Number",
        label: "ID Derivador"
    },
    tipo_turno_fac_id: {
        type: "Number",
        label: "ID Tipo de Turno",
        required: true
    },
    tot_id: {
        type: "Number",
        label: "ID Origen",
        required: true
    },
    turno_tipo_turno: {
        type: "Number",
        label: "ID Tipo Consulta",
        required: true
    },
    turno_fecha: {
        type: "Date",
        label: "Fecha",
        required: true
    },
    turno_hora: {
        type: "Time",
        label: "Hora",
        required: true
    },
    turno_sobreturno: {
        type: "String",
        label: "Sobreturno",
        default: "N",
        enum: ["S", "N"]
    },
    turno_hora_actual: {
        type: "Time",
        label: "Hora de Atención"
    },
    turno_primera_vez: {
        type: "Number",
        label: "Primera Vez",
        default: 0,
        enum: [0, 1]
    },
    turno_duracion: {
        type: "Number",
        label: "Duración",
        required: true
    },
    turno_factor_duracion: {
        type: "Number",
        label: "Factor de Duración",
        default: 1
    },
    turno_asistencia: {
        type: "String",
        label: "Asistencia",
        default: "N",
        enum: ["S", "N"]
    },
    turno_pasado: {
        type: "String",
        label: "Turno Pasado",
        default: "N",
        enum: ["S", "N"]
    },
    paciente_nro_doc: {
        type: "String",
        label: "Nro. de Documento del Paciente"
    },
    paciente_nro_tel: {
        type: "String",
        label: "Nro. de Teléfono del Paciente"
    },
    paciente_nro_afil: {
        type: "String",
        label: "Nro. de Afiliado del Paciente"
    }
};

module.exports = schema;
