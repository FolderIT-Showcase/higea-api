var schema = {
    profesional_id: {
        type: "Number",
        label: "ID Profesional",
        identity: true
    },
    localidad_id: {
        type: "Number",
        label: "ID Localidad",
        required: true
    },
    especialidad_id: {
        type: "Number",
        label: "ID Especialidad",
        required: true
    },
    persona_apellido: {
        type: "String",
        label: "Apellido",
        required: true
    },
    persona_nombres: {
        type: "String",
        label: "Nombres",
        required: true
    },
    persona_documento_nro: {
        type: "String",
        label: "Documento Nº",
        required: true
    },
    persona_fecha_ingreso: {
        type: "Date",
        label: "Fecha Ingreso"
    },
    persona_observaciones: {
        type: "String",
        label: "Observaciones"
    },
    profesional_clinica: {
        type: "String",
        label: "Interno",
        enum: ["S", "N"],
        default: "S"
    },
    persona_fecha_nacimiento: {
        type: "Date",
        label: "Fecha de Nacimiento"
    },
    persona_sexo: {
        type: "String",
        label: "Género",
        enum: ["S", "N"],
        default: "N"
    },
    profesional_web: {
        type: "String",
        label: "Profesional Web",
        enum: ["S", "N"],
        default: "N"
    }
};

module.exports = schema;
