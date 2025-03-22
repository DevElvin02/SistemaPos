import React, { useEffect, useState } from 'react'
import { getAllProducts } from '../service/products';

export default function ListProductComponent() {

  const [products , setProducts] = useState([]);

  console.log(products);
  

  useEffect(() => {

    const getAll = async () => {
      try {
        
        const products = await getAllProducts()

        setProducts(products.data)

      } catch (error) {
        throw new Error(`${error}`);
        
      }
    }

    getAll()

  },[])

  return (
    <>
    
    <div className="flex flex-col">
      <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
          <div className="overflow-hidden">
            <table className="min-w-full text-left text-sm font-light">
              <thead className="border-b font-medium dark:border-neutral-500">
                <tr>

                  <th scope="col" className="px-6 py-4">Name</th>
                  <th scope="col" className="px-6 py-4">Price</th>
                  <th scope="col" className="px-6 py-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {
                  products.map((item) => (
                    <tr className="border-b dark:border-neutral-500" key={item._id}>
                  <td className="whitespace-nowrap px-6 py-4">{item.name}</td>
                  <td className="whitespace-nowrap px-6 py-4">{item.price}</td>
                  <td className="whitespace-nowrap px-6 py-4">{item.description}</td>
                </tr>
                  ))
                }
                
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    </>
  )
}
