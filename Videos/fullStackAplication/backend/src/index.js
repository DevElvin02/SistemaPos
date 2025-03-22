const express = require('express')
const MongoService = require('./database/mongo.service')
const cors = require("cors")
const router = require('./routes/product.routes')


const server = express()

const port = 3000

const mongodb = new MongoService()

server.use(express.json())


server.use(cors({
    origin: "http://localhost:5173", 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

server.use("/api", router)
mongodb.connect()

server.listen(port , () => {
    console.log(`server running in http://localhost:${port}`);
    
})