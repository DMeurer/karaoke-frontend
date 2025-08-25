/**
 * Main App Component
 * 
 * Root component that handles routing and global state management.
 * Features:
 * - Navigation between pages
 * - Sidebar toggle functionality
 * - Fixed header and responsive layout
 */

import React, {useState} from 'react'
import {Routes, Route} from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import HomePage from './components/HomePage'
import AudioUploadPage from './components/AudioUploadPage'
import LyricsInputPage from './components/LyricsInputPage'
import TimingSyncPage from './components/TimingSyncPage'

function App() {
	// Sidebar visibility state
	const [sidebarOpen, setSidebarOpen] = useState(false)
	
	// Toggle sidebar open/closed
	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen)
	}
	
	// Close sidebar
	const closeSidebar = () => {
		setSidebarOpen(false)
	}
	
	return (
		<div className="App">
			{/* Fixed header with navigation */}
			<Header onToggleSidebar={toggleSidebar}/>
			
			{/* Slide-out sidebar */}
			<Sidebar isOpen={sidebarOpen} onClose={closeSidebar}/>
			
			{/* Main content area with routing */}
			<main style={{
				marginTop: '80px', // Account for fixed header (80px height)
				minHeight: 'calc(100vh - 80px)' // Fill remaining viewport height
			}}>
				<Routes>
					<Route path="/" element={<HomePage/>}/>
					<Route path="/audio-upload" element={<AudioUploadPage/>}/>
					<Route path="/lyrics-input" element={<LyricsInputPage/>}/>
					<Route path="/timing-sync" element={<TimingSyncPage/>}/>
				</Routes>
			</main>
		</div>
	)
}

export default App