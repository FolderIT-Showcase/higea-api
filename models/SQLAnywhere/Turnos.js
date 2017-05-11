var schema = [
    {
        name: "turnos_id",
        type: "Number",
        label: "ID"
    }, {
        name: "paciente_id",
        type: "Number",
        label: "ID Paciente"
    }, {
        name: "profesional_id",
        type: "Number",
        label: "ID Profesional"
    }, {
        name: "efector_id",
        type: "Number",
        label: "ID Efector"
    }, {
        name: "grupo_atencion_id",
        type: "Number",
        label: "ID Grupo de Atención"
    }, {
        name: "servicio_id",
        type: "Number",
        label: "ID Servicio"
    }, {
        name: "obra_social_id",
        type: "Number",
        label: "ID Obra Social"
    }, {
        name: "plan_os_id",
        type: "Number",
        label: "ID Plan de Obra Social"
    }, {
        name: "estado_turno_id",
        type: "Number",
        label: "ID Estado"
    }, {
        name: "derivador_id",
        type: "Number",
        label: "ID Derivador"
    }, {
        name: "tipo_turno_fac_id",
        type: "Number",
        label: "ID Tipo de Turno"
    }, {
        name: "tot_id",
        type: "Number",
        label: "ID Origen"
    }, {
        name: "turno_fecha",
        type: "Date",
        label: "Fecha"
    }, {
        name: "turno_hora",
        type: "Time",
        label: "Hora"
    }, {
        name: "turno_sobreturno",
        type: "String",
        label: "Sobreturno"
    }, {
        name: "turno_hora_actual",
        type: "Time",
        label: "Hora de Atención"
    }, {
        name: "turno_primera_vez",
        type: "Number",
        label: "Primera Vez"
    }, {
        name: "turno_duracion",
        type: "Number",
        label: "Duración"
    }, {
        name: "turno_factor_duracion",
        type: "Number",
        label: "Factor de Duración"
    }, {
        name: "turno_asistencia",
        type: "String",
        label: "Asistencia"
    }, {
        name: "turno_pasado",
        type: "String",
        label: "Turno Pasado"
    }
];

var table = "dba.turnos";

module.exports = {
    columns: schema,
    schema: schema,
    table: table
}
