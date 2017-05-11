var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var ClientsSchema = new Schema({
    code: String,
    name: String,
    dbHost: String,
    dbPort: Number,
    dbServername: String,
    dbUsername: String,
    dbPassword: String
});

mongoose.model('Clients', ClientsSchema);
