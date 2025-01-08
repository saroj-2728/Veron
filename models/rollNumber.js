const mongoose = require('mongoose');
const { Schema } = mongoose;

const rollSchema = new Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    roll: {
        type: String,
        required: true,
        unique: true
    }
});

rollSchema.index({ userId: 1, roll: 1 }, { unique: true });

const Roll = mongoose.models.Roll || mongoose.model('Roll', rollSchema);

module.exports = { Roll };