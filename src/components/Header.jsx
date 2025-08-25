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
			padding: '0.4rem 1.2rem', // thinner header
			boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			height: '48px', // thinner header
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
						padding: '6px 10px',
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
						fontSize: '1.2rem',
						fontWeight: 'bold'
					}}>
						Karaoke App
					</h1>
				</Link>
			</div>
			
			{/* Github icon on the right */}
			<a
				href="https://github.com/DMeurer/karaoke-frontend"
				target="_blank"
				rel="noopener noreferrer"
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem',
					color: 'white',
					textDecoration: 'none',
					fontSize: '1.5rem',
					padding: '4px 8px',
					borderRadius: '6px',
					background: 'rgba(255,255,255,0.1)',
					transition: 'background 0.2s',
					marginRight: '4px'
				}}
				title="View on GitHub"
			>
				<svg height="24" viewBox="0 0 16 16" width="24" fill="currentColor" style={{display: 'inline-block', verticalAlign: 'middle'}}>
					<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
				</svg>
			</a>
		</header>
	)
}

export default Header