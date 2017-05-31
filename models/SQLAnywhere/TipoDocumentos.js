var schema = {
    documento_id: {
        type: "Number",
        label: "ID Tipo Documento",
        identity: true
    },
    documento_abreviatura: {
        type: "String",
        label: "Abreviatura"
    },
    documento_descripcion: {
        type: "String",
        label: "Descripión"
    },
    documento_formato: {
        type: "String",
        label: "Formato"
    }
};

module.exports = schema;
