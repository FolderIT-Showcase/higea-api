var schema = {
    plan_os_id: {
        type: "Number",
        label: "ID Plan de OS",
        identity: true
    },
    obra_social_id: {
        type: "Number",
        label: "ID Obra Social"
    },
    plan_os_nombre: {
        type: "String",
        label: "Nombre"
    }
};

module.exports = schema;
