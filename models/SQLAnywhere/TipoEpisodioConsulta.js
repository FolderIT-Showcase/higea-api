var schema = {
    tipo_consulta_id: {
        type: "Number",
        label: "ID Motivo",
        identity: true
    },
    servicio_id: {
        type: "Number",
        label: "ID Servicio"
    },
    tcg_id: {
        type: "Number",
        label: "ID Grupo de Motivos"
    },
    tipo_consulta_nombre: {
        type: "String",
        label: "Nombre"
    },
    tipo_consulta_abreviatura: {
        type: "String",
        label: "Abreviatura"
    },
    tipo_consulta_observaciones: {
        type: "String",
        label: "Observaciones/Preparaciones"
    },
    tipo_consulta_sincargo: {
        type: "String",
        label: "Sin Cargo",
        enum: ["S", "N"],
        default: "N"
    },
    tipo_consulta_factor_duracion: {
        type: "Number",
        label: "Factor de Duración"
    },
    tipo_consulta_consulta: {
        type: "String",
        label: "Consulta",
        enum: ["S", "N"],
        default: "N"
    },
    tipo_consulta_usa_equipo: {
        type: "String",
        label: "Usa Equipo",
        enum: ["S", "N"],
        default: "N"
    }
};

module.exports = schema;
