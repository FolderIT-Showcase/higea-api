var schema = {
    conf_turno_id: {
        type: "Number",
        label: "ID Horario",
        identity: true
    },
    profesional_id: {
        type: "Number",
        label: "ID Profesional"
    },
    servicio_profesional_id: {
        type: "Number",
        label: "ID Servicio",
        required: true
    },
    conf_turno_fecha_ini: {
        type: "Date",
        label: "Fecha Inicio",
        required: true
    },
    conf_turno_fecha_fin: {
        type: "Date",
        label: "Fecha Fin"
    },
    conf_turno_hora_ini: {
        type: "Time",
        label: "Hora Inicio"
    },
    conf_turno_hora_fin: {
        type: "Time",
        label: "Hora Fin"
    },
    conf_turno_atiende: {
        type: "String",
        label: "Atiende",
        enum: ["S", "N"],
        default: "S"
    },
    conf_turno_duracion_turno: {
        type: "Number",
        label: "Duración",
        required: true
    },
    conf_turno_dia_atencion: {
        type: "Number",
        label: "Día de Atención",
        enum: [1, 2, 3, 4, 5, 6, 7], // 1 = domingo
        required: true
    },
    conf_turno_efector_id: {
        type: "Number",
        label: "ID Efector",
        required: true
    }
};

module.exports = schema;
