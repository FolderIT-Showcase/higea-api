var schema = {
    servicio_id: {
        type: "Number",
        label: "ID Servicio",
        identity: true
    },
    servicio_nombre: {
        type: "String",
        label: "Nombre"
    },
    servicio_observaciones: {
        type: "String",
        label: "Observaciones"
    },
    servicio_abreviatura: {
        type: "String",
        label: "Abreviatura"
    }
};

module.exports = schema;
