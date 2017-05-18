var schema = {
    especialidad_id: {
        type: "Number",
        label: "ID Especialidad"
    },
    especialidad_nombre: {
        type: "String",
        label: "Nombre"
    },
    especialidad_abreviatura: {
        type: "String",
        label: "Abreviatura"
    },
    especialidad_observaciones: {
        type: "String",
        label: "Observaciones"
    }
};

var table = "dba.especialidades";

module.exports = {
    schema: schema,
    table: table
}
