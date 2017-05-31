var schema = {
    paciente_id: {
        type: "Number",
        label: "ID Paciente",
        identity: true
    },
    plan_os_id_1: {
        type: "Number",
        label: "ID Plan de OS 1",
        required: true
    },
    plan_os_id_2: {
        type: "Number",
        label: "ID Plan de OS 2"
    },
    plan_os_id_3: {
        type: "Number",
        label: "ID Plan de OS 3"
    },
    pais_id: {
        type: "Number",
        label: "País"
    },
    provincia_id: {
        type: "Number",
        label: "Provincia"
    },
    localidad_id: {
        type: "Number",
        label: "Localidad",
        required: true
    },
    estado_civil_id: {
        type: "Number",
        label: "Estado Civil"
    },
    documento_id: {
        type: "String",
        label: "Tipo de Documento",
        required: true
    },
    persona_apellido: {
        type: "String",
        label: "Apellido",
        required: true
    },
    persona_nombres: {
        type: "String",
        label: "Nombres",
        required: true
    },
    persona_fecha_nacimiento: {
        type: "Date",
        label: "Fecha de Nacimiento"
    },
    persona_sexo: {
        type: "String",
        label: "Género",
        enum: ["S", "N"],
        default: "N"
    },
    persona_documento_nro: {
        type: "String",
        label: "Nro. de Documento",
        required: true
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
    persona_calle_nro: {
        type: "String",
        label: "Nro. de Calle"
    },
    persona_departamento_nro: {
        type: "String",
        label: "Nro. de Depto."
    },
    persona_piso_nro: {
        type: "String",
        label: "Nro. de Piso"
    },
    persona_email: {
        type: "String",
        label: "Email"
    },
    paciente_calle_texto: {
        type: "String",
        label: "Domicilio"
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
