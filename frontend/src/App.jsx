import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Error fetching data:', err));
  }, [API_URL]);

  return (
    <div className="container">
      <h1 className="header">🛒 E-Commerce Product Catalog</h1>
      <div className="grid">
        {products.map((item) => (
          <div key={item.id} className="card">
            <h3 className="card-title">{item.name}</h3>
            <span className="category-tag">{item.category}</span>
            <div className="price">${item.price}</div>
            <div className="stock">In Stock: {item.stock}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
