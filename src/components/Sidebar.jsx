/**
 * Sidebar Component
 * 
 * Slide-out navigation sidebar for the application.
 * Features:
 * - Animated slide-in/out from left side
 * - Navigation menu with active state highlighting  
 * - Backdrop overlay when open
 * - Brand information panel
 * - Responsive design with proper z-indexing
 */

import React from 'react'
import {Link, useLocation} from 'react-router-dom'

function Sidebar({isOpen, onClose}) {
	const location = useLocation()
	
	// Navigation menu items with updated paths
	const menuItems = [
		{path: '/', label: 'Home', icon: '🏠'},
		{path: '/audio-upload', label: 'Create Track', icon: '🎵'},
		{path: '/playback', label: 'Play Track', icon: '▶️'},
		{path: '/library', label: 'Library', icon: '📚'}
	]
	
	const isActive = (path) => location.pathname === path
	
	return (
		<>
			{/* Backdrop */}
			{isOpen && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0,0,0,0.5)',
						zIndex: 1001,
						transition: 'opacity 0.3s ease'
					}}
					onClick={onClose}
				/>
			)}
			
			{/* Sidebar */}
			<aside
				style={{
					position: 'fixed',
					top: '80px', // Below header
					left: isOpen ? 0 : '-280px',
					width: '280px',
					height: 'calc(100vh - 80px)',
					background: 'white',
					boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
					zIndex: 1002,
					transition: 'left 0.3s ease',
					overflowY: 'auto'
				}}
			>
				<div style={{padding: '2rem 0'}}>
					<div style={{
						padding: '0 1.5rem 1rem',
						borderBottom: '1px solid #e9ecef'
					}}>
						<h3 style={{
							margin: 0,
							color: '#333',
							fontSize: '1.1rem',
							fontWeight: '600'
						}}>
							Navigation
						</h3>
					</div>
					
					<nav style={{padding: '1rem 0'}}>
						{menuItems.map((item) => (
							<Link
								key={item.path}
								to={item.path}
								onClick={onClose}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '1rem',
									padding: '0.75rem 1.5rem',
									color: isActive(item.path) ? '#667eea' : '#666',
									textDecoration: 'none',
									background: isActive(item.path) ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
									borderRight: isActive(item.path) ? '3px solid #667eea' : '3px solid transparent',
									transition: 'all 0.2s ease'
								}}
								onMouseEnter={(e) => {
									if (!isActive(item.path)) {
										e.target.style.background = 'rgba(0,0,0,0.05)'
									}
								}}
								onMouseLeave={(e) => {
									if (!isActive(item.path)) {
										e.target.style.background = 'transparent'
									}
								}}
							>
								<span style={{fontSize: '1.2rem'}}>{item.icon}</span>
								<span style={{fontWeight: isActive(item.path) ? '600' : '400'}}>
                  {item.label}
                </span>
							</Link>
						))}
					</nav>
					
					<div style={{
						padding: '1rem 1.5rem',
						borderTop: '1px solid #e9ecef',
						marginTop: '2rem'
					}}>
						<div style={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							padding: '1rem',
							borderRadius: '8px',
							color: 'white',
							textAlign: 'center'
						}}>
							<div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>🎤</div>
							<h4 style={{margin: '0 0 0.5rem 0', fontSize: '1rem'}}>
								Karaoke App
							</h4>
							<p style={{margin: 0, fontSize: '0.85rem', opacity: 0.9}}>
								Create amazing karaoke experiences
							</p>
						</div>
					</div>
					
					<div style={{
						padding: '1rem 1.5rem',
						color: '#999',
						fontSize: '0.8rem',
						textAlign: 'center'
					}}>
						<p style={{margin: 0}}>Version 1.0.0</p>
					</div>
				</div>
			</aside>
		</>
	)
}

export default Sidebar