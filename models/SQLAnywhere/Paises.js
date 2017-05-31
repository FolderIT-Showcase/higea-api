var schema = {
    pais_id: {
        type: "Number",
        label: "ID País",
        identity: true
    },
    pais_nombre: {
        type: "String",
        label: "Nombre"
    },
    pais_abreviatura: {
        type: "String",
        label: "Abreviatura"
    }
};

module.exports = schema;
