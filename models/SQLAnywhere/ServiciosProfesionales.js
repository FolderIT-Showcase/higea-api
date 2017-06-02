var schema = {
    servicio_profesional_id: {
        type: "Number",
        label: "ID Servicio Profesional",
        identity: true
    },
    profesional_id: {
        type: "Number",
        label: "ID Profesional",
        identity: true
    },
    servicio_id: {
        type: "Number",
        label: "ID Servicio"
    }
};

module.exports = schema;
