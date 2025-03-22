const { Schema, model } = require("mongoose");


const ProductSchema = new Schema({
    name : {
        type : String,
        require: true,
    },

    price : {
        type : Number,
        require : true
    },

    description : {
        type : String,
        require : true
    }
})


const ProductModel = model("products ", ProductSchema)


module.exports = ProductModel