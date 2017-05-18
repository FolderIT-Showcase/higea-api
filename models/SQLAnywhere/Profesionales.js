var schema = {
    profesional_id: {
        type: "Number",
        label: "ID Profesional"
    },
    persona_apellido: {
        type: "String",
        label: "Apellido"
    },
    persona_nombres: {
        type: "String",
        label: "Nombres"
    },
    persona_documento_nro: {
        type: "String",
        label: "Documento Nº"
    },
    especialidad_id: {
        type: "Number",
        label: "ID Especialidad"
    },
    profesional_clinica: {
        type: "String",
        label: "Interno"
    },
    persona_fecha_ingreso: {
        type: "Date",
        label: "Fecha Ingreso"
    },
    persona_observaciones: {
        type: "String",
        label: "Observaciones"
    }
};

var table = "dba.profesionales";

module.exports = {
    schema: schema,
    table: table
}
