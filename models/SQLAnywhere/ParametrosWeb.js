var schema = {
    parweb_id: {
        type: "Number",
        label: "ID Parámetro Web",
        identity: true
    },
    parweb_propiedad: {
        type: "String",
        label: "Parámetro"
    },
    parweb_valor: {
        type: "String",
        label: "Valor"
    },
    parweb_descripcion: {
        type: "String",
        label: "Descripción"
    },
    parweb_tipo: {
        type: "String",
        label: "Tipo de Valor"
    }
};

module.exports = schema;
