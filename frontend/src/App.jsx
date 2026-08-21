import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const API_URL = "http://localhost:5000";

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error fetching data:', err));
  }, []);

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]);
  };

  return (
    <div className="container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="header">🛒 E-Commerce Product Catalog</h1>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Cart: <span>{cart.length} items</span>
        </div>
      </div>

      <div className="grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {products.map((item) => (
          <div key={item.id} className="card" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', width: '220px' }}>
            <h3 className="card-title">{item.name}</h3>
            <span className="category-tag" style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{item.category}</span>
            <div className="price" style={{ margin: '10px 0', fontSize: '18px', fontWeight: 'bold' }}>${item.price}</div>
            <div className="stock" style={{ marginBottom: '10px', color: '#555' }}>In Stock: {item.stock}</div>
            <button 
              onClick={() => addToCart(item)}
              style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
