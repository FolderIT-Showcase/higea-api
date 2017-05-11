var schema = [
    {
        name: "profesional_id",
        type: "Number",
        label: "ID"
    }, {
        name: "persona_apellido",
        type: "String",
        label: "Apellido"
    }, {
        name: "persona_nombres",
        type: "String",
        label: "Nombres"
    }, {
        name: "persona_documento_nro",
        type: "String",
        label: "Documento Nº"
    }, {
        name: "especialidad_id",
        type: "Number",
        label: "ID Especialidad"
    }, {
        name: "profesional_clinica",
        type: "String",
        label: "Interno"
    }, {
        name: "persona_fecha_ingreso",
        type: "Date",
        label: "Fecha Ingreso"
    }, {
        name: "persona_observaciones",
        type: "String",
        label: "Observaciones"
    }
];

var table = "dba.profesionales";

module.exports = {
    columns: schema,
    schema: schema,
    table: table
}
