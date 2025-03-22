const ProductModel = require("../models/product.model");



const createProductController =async (req, res) => {

    const {name , price, description} = req.body
    
    try {
        
        const product = await ProductModel.create({name , price, description})

        return res.status(201).json({
            data : product
        })



    } catch (error) {
        
        return res.status(500).json({
            msj : "Error in server"
        })
        
    }
}

const getAllProducts = async (req, res) => {
    
    try {
        
        const productData = await ProductModel.find()

        return res.status(200).json({
            data : productData
        })

    } catch (error) {
        return res.status(500).json({
            msj:"Server error"
        })
    }
}


module.exports = {
    createProductController,
    getAllProducts
}