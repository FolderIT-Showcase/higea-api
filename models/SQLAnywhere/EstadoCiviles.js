var schema = {
    estado_civil_id: {
        type: "Number",
        label: "ID Estado Civil",
        identity: true
    },
    estado_civil_nombre: {
        type: "String",
        label: "Nombre"
    },
    estado_civil_observaciones: {
        type: "String",
        label: "Observaciones"
    }
};

module.exports = schema;
