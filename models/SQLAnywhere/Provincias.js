var schema = {
    provincia_id: {
        type: "Number",
        label: "ID Provincia",
        identity: true
    },
    pais_id: {
        type: "Number",
        label: "ID País",
        identity: true
    },
    provincia_nombre: {
        type: "String",
        label: "Nombre"
    },
    provincia_abreviatura: {
        type: "String",
        label: "Abreviatura"
    }
};

module.exports = schema;
