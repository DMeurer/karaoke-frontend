/**
 * AudioUploadPage Component
 * 
 * First step in karaoke creation process - handles audio file upload.
 * Features:
 * - Drag & drop audio file upload
 * - File format validation (MP3, WAV, etc.)
 * - Audio preview with play/pause controls
 * - Progress bar with seek functionality
 * - File information display
 * - Navigation to next step (lyrics input)
 */

import React, {useState, useRef} from 'react'
import {useNavigate} from 'react-router-dom'

function AudioUploadPage() {
	const navigate = useNavigate()
	
	// Audio file state management
	const [selectedFile, setSelectedFile] = useState(null)
	const [audioUrl, setAudioUrl] = useState(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [dragActive, setDragActive] = useState(false)
	
	// Refs for audio element and file input
	const audioRef = useRef(null)
	const fileInputRef = useRef(null)
	
	/**
	 * Process uploaded file - validate and create preview URL
	 * @param {File} file - The uploaded audio file
	 */
	const processFile = (file) => {
		if (file && file.type.startsWith('audio/')) {
			setSelectedFile(file)
			const url = URL.createObjectURL(file)
			setAudioUrl(url)
			setCurrentTime(0)
			setIsPlaying(false)
		} else {
			alert('Please select a valid audio file (MP3, WAV, etc.)')
		}
	}
	
	// File input change handler
	const handleFileSelect = (event) => {
		const file = event.target.files[0]
		processFile(file)
	}
	
	/**
	 * Handle drag and drop events
	 * @param {DragEvent} e - Drag event
	 */
	const handleDrag = (e) => {
		e.preventDefault()
		e.stopPropagation()
		if (e.type === 'dragenter' || e.type === 'dragover') {
			setDragActive(true)
		} else if (e.type === 'dragleave') {
			setDragActive(false)
		}
	}
	
	// Handle file drop
	const handleDrop = (e) => {
		e.preventDefault()
		e.stopPropagation()
		setDragActive(false)
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			processFile(e.dataTransfer.files[0])
		}
	}
	
	// Audio playback control
	const togglePlayPause = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause()
			} else {
				audioRef.current.play()
			}
			setIsPlaying(!isPlaying)
		}
	}
	
	// Update current time during playback
	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime)
		}
	}
	
	// Set duration when audio metadata loads
	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration)
		}
	}
	
	/**
	 * Handle seeking in audio progress bar
	 * @param {MouseEvent} event - Click event on progress bar
	 */
	const handleSeek = (event) => {
		const audio = audioRef.current
		const progressBar = event.currentTarget
		const clickX = event.nativeEvent.offsetX
		const width = progressBar.offsetWidth
		const newTime = (clickX / width) * duration
		
		if (audio) {
			audio.currentTime = newTime
			setCurrentTime(newTime)
		}
	}
	
	/**
	 * Format time in MM:SS format
	 * @param {number} time - Time in seconds
	 * @returns {string} Formatted time string
	 */
	const formatTime = (time) => {
		if (isNaN(time)) return '0:00'
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}
	
	// Reset file selection
	const resetFile = () => {
		setSelectedFile(null)
		setAudioUrl(null)
		setIsPlaying(false)
		setCurrentTime(0)
		setDuration(0)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}
	
	return (
		<div style={{
			minHeight: 'calc(100vh - 48px)', // Account for 48px header
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			padding: '2rem 0'
		}}>
			<div className="container">
				<div style={{
					background: 'white',
					borderRadius: '12px',
					padding: '2rem',
					maxWidth: '800px',
					margin: '0 auto',
					boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
				}}>
					{/* Page header */}
					<div style={{marginBottom: '2rem', textAlign: 'center'}}>
						<h1 style={{color: '#333', marginBottom: '0.5rem'}}>
							Create New Karaoke File
						</h1>
						<p style={{color: '#666'}}>
							Upload an MP3 file to get started
						</p>
					</div>
					
					{/* File upload area with drag & drop */}
					<div
						style={{
							border: `3px dashed ${dragActive ? '#667eea' : '#ddd'}`,
							borderRadius: '12px',
							padding: '3rem',
							textAlign: 'center',
							marginBottom: '2rem',
							background: dragActive ? '#f0f4ff' : (selectedFile ? '#f8f9fa' : '#fafafa'),
							transition: 'all 0.3s ease',
							cursor: 'pointer'
						}}
						onDragEnter={handleDrag}
						onDragLeave={handleDrag}
						onDragOver={handleDrag}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
					>
						{!selectedFile ? (
							<>
								<div style={{fontSize: '3rem', marginBottom: '1rem'}}>
									{dragActive ? '📁' : '🎵'}
								</div>
								<h3 style={{marginBottom: '1rem', color: '#333'}}>
									{dragActive ? 'Drop your audio file here!' : 'Select an Audio File'}
								</h3>
								<p style={{color: '#666', marginBottom: '1.5rem'}}>
									{dragActive ? 'Release to upload your file' : 'Drag & drop an MP3, WAV, or other audio file here, or click to browse'}
								</p>
								<input
									ref={fileInputRef}
									type="file"
									accept="audio/*"
									onChange={handleFileSelect}
									style={{display: 'none'}}
								/>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation()
										fileInputRef.current?.click()
									}}
									style={{
										padding: '12px 24px',
										border: '2px solid #667eea',
										borderRadius: '6px',
										background: 'white',
										color: '#667eea',
										cursor: 'pointer',
										fontSize: '1rem',
										fontWeight: '500'
									}}
								>
									Browse Files
								</button>
							</>
						) : (
							<div>
								<div style={{fontSize: '2rem', marginBottom: '1rem'}}>🎤</div>
								<h3 style={{color: '#333', marginBottom: '0.5rem'}}>
									File Loaded Successfully!
								</h3>
								<p style={{color: '#666', marginBottom: '1rem'}}>
									<strong>{selectedFile.name}</strong>
								</p>
								<button
									onClick={resetFile}
									style={{
										background: '#dc3545',
										padding: '8px 16px',
										fontSize: '0.9rem'
									}}
								>
									Choose Different File
								</button>
							</div>
						)}
					</div>
					
					{/* Audio player section - shown when file is loaded */}
					{audioUrl && (
						<div style={{
							background: '#f8f9fa',
							borderRadius: '12px',
							padding: '2rem',
							border: '1px solid #e9ecef'
						}}>
							<h3 style={{marginBottom: '1.5rem', color: '#333', textAlign: 'center'}}>
								Audio Player
							</h3>
							
							{/* Hidden audio element for playback */}
							<audio
								ref={audioRef}
								src={audioUrl}
								onTimeUpdate={handleTimeUpdate}
								onLoadedMetadata={handleLoadedMetadata}
								onEnded={() => setIsPlaying(false)}
								style={{display: 'none'}}
							/>
							
							{/* Progress bar with seek functionality */}
							<div style={{marginBottom: '1.5rem'}}>
								<div style={{
									background: '#e9ecef',
									height: '8px',
									borderRadius: '4px',
									position: 'relative',
									cursor: 'pointer'
								}} onClick={handleSeek}>
									<div style={{
										background: '#667eea',
										height: '100%',
										borderRadius: '4px',
										width: `${duration ? (currentTime / duration) * 100 : 0}%`,
										transition: 'width 0.1s'
									}}/>
								</div>
								<div style={{
									display: 'flex',
									justifyContent: 'space-between',
									marginTop: '0.5rem',
									fontSize: '0.9rem',
									color: '#666'
								}}>
									<span>{formatTime(currentTime)}</span>
									<span>{formatTime(duration)}</span>
								</div>
							</div>
							
							{/* Control buttons */}
							<div style={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								gap: '1rem'
							}}>
								<button
									onClick={() => navigate('/')}
									style={{
										fontSize: '1.2rem',
										padding: '12px 24px',
										borderRadius: '50px',
										background: '#6c757d',
										color: 'white',
										border: 'none',
										cursor: 'pointer',
										minWidth: '120px',
										transition: 'background 0.2s'
									}}
									onMouseEnter={(e) => e.target.style.background = '#5a6268'}
									onMouseLeave={(e) => e.target.style.background = '#6c757d'}
								>
									⬅️ Back
								</button>
								
								<button
									onClick={togglePlayPause}
									disabled={!audioUrl}
									style={{
										fontSize: '1.2rem',
										padding: '12px 24px',
										borderRadius: '50px',
										background: isPlaying ? '#dc3545' : '#28a745',
										minWidth: '120px'
									}}
								>
									{isPlaying ? '⏸️ Pause' : '▶️ Play'}
								</button>
								
								<button
									onClick={() => navigate('/lyrics-input', {state: {audioFile: selectedFile}})}
									style={{
										fontSize: '1.2rem',
										padding: '12px 24px',
										borderRadius: '50px',
										background: '#667eea',
										color: 'white',
										border: 'none',
										cursor: 'pointer',
										minWidth: '120px',
										transition: 'background 0.2s'
									}}
									onMouseEnter={(e) => e.target.style.background = '#5a6fd8'}
									onMouseLeave={(e) => e.target.style.background = '#667eea'}
								>
									➡️ Next Step
								</button>
							</div>
							
							{/* File information display */}
							<div style={{
								marginTop: '2rem',
								padding: '1rem',
								background: 'white',
								borderRadius: '8px',
								border: '1px solid #dee2e6'
							}}>
								<h4 style={{marginBottom: '0.5rem', color: '#333'}}>File Information</h4>
								<p style={{color: '#666', margin: '0.25rem 0'}}>
									<strong>Name:</strong> {selectedFile.name}
								</p>
								<p style={{color: '#666', margin: '0.25rem 0'}}>
									<strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
								<p style={{color: '#666', margin: '0.25rem 0'}}>
									<strong>Type:</strong> {selectedFile.type}
								</p>
								{duration > 0 && (
									<p style={{color: '#666', margin: '0.25rem 0'}}>
										<strong>Duration:</strong> {formatTime(duration)}
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default AudioUploadPage