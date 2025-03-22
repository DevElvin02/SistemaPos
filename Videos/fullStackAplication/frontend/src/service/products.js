import axios from "axios";


export const getAllProducts = async () => {
    
    try {
        
        const response = await axios.get("http://localhost:3000/api/products")

        console.log(response);
        

        return response.data

    } catch (error) {
     throw new Error(`${error}`);
        
    }
}