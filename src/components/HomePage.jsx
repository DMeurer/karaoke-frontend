/**
 * HomePage Component
 * 
 * The main landing page of the karaoke application.
 * Features:
 * - Welcome message and branding
 * - Navigation to create new karaoke files
 * - Feature highlights and overview
 * - Responsive design with gradient background
 */

import React from 'react'
import {Link} from 'react-router-dom'

function HomePage() {
	return (
		<div style={{
			minHeight: 'calc(100vh - 80px)', // Account for 80px header
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			textAlign: 'center',
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			color: 'white'
		}}>
			<div className="container">
				{/* Main heading and tagline */}
				<h1 style={{
					fontSize: '4rem',
					marginBottom: '1rem',
					fontWeight: 'bold',
					textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
				}}>
					🎤 Karaoke App
				</h1>
				
				<p style={{
					fontSize: '1.5rem',
					marginBottom: '3rem',
					opacity: 0.9
				}}>
					Create amazing karaoke experiences with your favorite songs
				</p>
				
				{/* Primary call-to-action button */}
				<div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
					<Link to="/audio-upload">
						<button style={{
							fontSize: '1.2rem',
							padding: '16px 32px',
							background: 'rgba(255,255,255,0.2)',
							border: '2px solid white',
							color: 'white',
							borderRadius: '50px',
							backdropFilter: 'blur(10px)'
						}}>
							Create New Karaoke File
						</button>
					</Link>
				</div>
				
				{/* Feature highlights grid */}
				<div style={{
					marginTop: '4rem',
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
					gap: '2rem',
					maxWidth: '800px'
				}}>
					<div style={{
						padding: '2rem',
						background: 'rgba(255,255,255,0.1)',
						borderRadius: '12px',
						backdropFilter: 'blur(10px)'
					}}>
						<h3 style={{marginBottom: '1rem', fontSize: '1.3rem'}}>🎵 Upload Songs</h3>
						<p>Upload your favorite MP3 files and start creating karaoke tracks</p>
					</div>
					
					<div style={{
						padding: '2rem',
						background: 'rgba(255,255,255,0.1)',
						borderRadius: '12px',
						backdropFilter: 'blur(10px)'
					}}>
						<h3 style={{marginBottom: '1rem', fontSize: '1.3rem'}}>🎧 Audio Player</h3>
						<p>Built-in audio player with full playback controls</p>
					</div>
					
					<div style={{
						padding: '2rem',
						background: 'rgba(255,255,255,0.1)',
						borderRadius: '12px',
						backdropFilter: 'blur(10px)'
					}}>
						<h3 style={{marginBottom: '1rem', fontSize: '1.3rem'}}>🎤 Easy to Use</h3>
						<p>Simple and intuitive interface for all your karaoke needs</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default HomePage