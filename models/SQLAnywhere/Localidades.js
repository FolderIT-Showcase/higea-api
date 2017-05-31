var schema = {
    localidad_id: {
        type: "Number",
        label: "ID Localidad",
        identity: true
    },
    provincia_id: {
        type: "Number",
        label: "ID Provincia",
        identity: true
    },
    localidad_nombre: {
        type: "String",
        label: "Nombre"
    },
    localidad_codigo_postal: {
        type: "String",
        label: "Código Postal"
    }
};

module.exports = schema;
