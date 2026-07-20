const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        name: String,
        producer: Boolean,
        artist: Boolean,
        fan: Boolean,
        phoneNumber: String,
        instagram: String,
    },
    {
        timestamps: true
    }
)

module.exports = userSchema;
