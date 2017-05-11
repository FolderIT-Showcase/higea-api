var schema = [
    {
        name: "especialidad_id",
        type: "Number",
        label: "ID"
    }, {
        name: "especialidad_nombre",
        type: "String",
        label: "Nombre"
    }, {
        name: "especialidad_abreviatura",
        type: "String",
        label: "Abreviatura"
    }, {
        name: "especialidad_observaciones",
        type: "String",
        label: "Observaciones"
    }
];

var table = "dba.especialidades";

module.exports = {
    columns: schema,
    schema: schema,
    table: table
}
