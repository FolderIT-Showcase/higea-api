var schema = {
    tcg_id: {
        type: "Number",
        label: "ID Grupo de Motivos",
        identity: true
    },
    tcg_nombre: {
        type: "String",
        label: "Nombre"
    },
    tcg_abreviatura: {
        type: "String",
        label: "Abreviatura"
    }
};

module.exports = schema;
