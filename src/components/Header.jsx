/**
 * Header Component
 * 
 * Fixed navigation header at the top of the application.
 * Features:
 * - Hamburger menu to toggle sidebar
 * - Brand logo and title
 * - Quick navigation links (Home, Create)
 * - Glassmorphism styling effects
 * - Fixed positioning at top of viewport
 */

import React from 'react'
import {Link} from 'react-router-dom'

function Header({onToggleSidebar}) {
	return (
		<header style={{
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			color: 'white',
			padding: '0.75rem 2rem',
			boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			height: '80px',
			zIndex: 1000,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between'
		}}>
			<div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
				<button
					onClick={onToggleSidebar}
					style={{
						background: 'rgba(255,255,255,0.2)',
						border: 'none',
						color: 'white',
						padding: '8px 12px',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '1.2rem',
						display: 'flex',
						alignItems: 'center',
						backdropFilter: 'blur(10px)'
					}}
				>
					☰
				</button>
				
				<Link to="/" style={{
					textDecoration: 'none',
					color: 'white',
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem'
				}}>
					<span style={{fontSize: '1.5rem'}}>🎤</span>
					<h1 style={{
						margin: 0,
						fontSize: '1.5rem',
						fontWeight: 'bold'
					}}>
						Karaoke App
					</h1>
				</Link>
			</div>
			
			<nav style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
				<Link
					to="/"
					style={{
						color: 'white',
						textDecoration: 'none',
						padding: '8px 16px',
						borderRadius: '20px',
						background: 'rgba(255,255,255,0.1)',
						backdropFilter: 'blur(10px)',
						transition: 'background 0.2s'
					}}
					onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
					onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
				>
					Home
				</Link>
				
				<Link
					to="/audio-upload"
					style={{
						color: 'white',
						textDecoration: 'none',
						padding: '8px 16px',
						borderRadius: '20px',
						background: 'rgba(255,255,255,0.1)',
						backdropFilter: 'blur(10px)',
						transition: 'background 0.2s'
					}}
					onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
					onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
				>
					Create
				</Link>
			</nav>
		</header>
	)
}

export default Header