var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var ClientParametersSchema = new Schema({
    code: String,
    parameters: [{
        parweb_id: Number,
        parweb_propiedad: String,
        parweb_valor: String,
        parweb_descripcion: String,
        parweb_tipo: String
    }]
});

mongoose.model('ClientParameters', ClientParametersSchema);
