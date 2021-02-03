import React from "react";

export default ({ pageContext }) => (
  <div style={{
    width: 1200,
    height: 630,
    padding: 50,
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      border: '2px solid black',
      backgroundColor: '#fff',
      color: '#fff',
      backgroundImage: 'linear-gradient(43deg, #4158D0 0%, #C850C0 50%, #FFCC70 95%)',
      boxShadow: 'rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 40,
      fontSize: 64,
      height: '100%'
    }}>
      <div>{pageContext.description}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 42, color: '#fff' }}>
        <div>Eric Bower &middot; {pageContext.date}</div>
        <div>erock.io</div>
      </div>
    </div>
  </div>
);