import React from 'react';

function LibraryPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 48px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        color: '#333',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ marginBottom: '1rem' }}>Library - Under Construction</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          A public karaoke library and the option to host your own will soon be available.<br /><br />
          Until then, you will need to manage your library on your own system.
        </p>
        <span style={{ fontSize: '3rem' }}>🚧</span>
      </div>
    </div>
  );
}

export default LibraryPage;

