var schema = {
    paciente_id: {
        type: "Number",
        label: "ID Paciente",
        identity: true
    },
    plan_os_id_1: {
        type: "Number",
        label: "ID Plan de OS 1"
    },
    plan_os_id_2: {
        type: "Number",
        label: "ID Plan de OS 2"
    },
    plan_os_id_3: {
        type: "Number",
        label: "ID Plan de OS 3"
    },
    persona_documento_nro: {
        type: "String",
        label: "Nro. de Documento"
    },
    persona_telefono_part_nro: {
        type: "String",
        label: "Teléfono Particular"
    },
    persona_telefono_cel_nro: {
        type: "String",
        label: "Teléfono Celular"
    },
    persona_telefono_lab_nro: {
        type: "String",
        label: "Teléfono Laboral"
    },
    paciente_os_afiliado1_nro: {
        type: "String",
        label: "Nro. de Afiliado 1"
    },
    paciente_os_afiliado2_nro: {
        type: "String",
        label: "Nro. de Afiliado 2"
    },
    paciente_os_afiliado3_nro: {
        type: "String",
        label: "Nro. de Afiliado 3"
    }
};

module.exports = schema;
