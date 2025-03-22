const { connect } = require("mongoose")
const Enviroments = require("../plugins/Enviroments.service")


class MongoService {

    #uri = Enviroments.MONGO_URI

    async connect(){
        try {
            
            await connect(this.#uri)
            console.log("Connection to mongodb successfully 200 OK");
            

        } catch (error) {
            throw new Error(`${error}`)
        }
    }

}

module.exports = MongoService