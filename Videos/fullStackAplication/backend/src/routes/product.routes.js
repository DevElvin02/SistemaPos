const express = require("express")
const { createProductController, getAllProducts } = require("../controllers/product.service")

const router = express.Router()


router.post("/products-add", createProductController)
router.get("/products", getAllProducts)


module.exports = router