var schema = {
    turnos_id: {
        type: "Number",
        label: "ID Turno"
    },
    paciente_id: {
        type: "Number",
        label: "ID Paciente"
    },
    profesional_id: {
        type: "Number",
        label: "ID Profesional"
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
        label: "ID Servicio"
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
        label: "ID Estado"
    },
    derivador_id: {
        type: "Number",
        label: "ID Derivador"
    },
    tipo_turno_fac_id: {
        type: "Number",
        label: "ID Tipo de Turno"
    },
    tot_id: {
        type: "Number",
        label: "ID Origen"
    },
    turno_fecha: {
        type: "Date",
        label: "Fecha"
    },
    turno_hora: {
        type: "Time",
        label: "Hora"
    },
    turno_sobreturno: {
        type: "String",
        label: "Sobreturno"
    },
    turno_hora_actual: {
        type: "Time",
        label: "Hora de Atención"
    },
    turno_primera_vez: {
        type: "Number",
        label: "Primera Vez"
    },
    turno_duracion: {
        type: "Number",
        label: "Duración"
    },
    turno_factor_duracion: {
        type: "Number",
        label: "Factor de Duración"
    },
    turno_asistencia: {
        type: "String",
        label: "Asistencia"
    },
    turno_pasado: {
        type: "String",
        label: "Turno Pasado"
    }
};

var table = "dba.turnos";

module.exports = {
    schema: schema,
    table: table
}
