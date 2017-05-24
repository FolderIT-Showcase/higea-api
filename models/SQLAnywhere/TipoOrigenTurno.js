var schema = {
    tot_id: {
        type: "Number",
        label: "ID Tipo de Origen de Turno",
        identity: true
    },
    tot_nombre: {
        type: "String",
        label: "Nombre"
    },
    tot_abrev: {
        type: "String",
        label: "Abreviatura"
    },
    tot_internacion: {
        type: "String",
        label: "Internación",
        default: "N",
        enum: ["S", "N"]
    }
};

module.exports = schema;
