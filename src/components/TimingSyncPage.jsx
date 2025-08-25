/**
 * TimingSyncPage Component
 * 
 * Final step in karaoke creation process - synchronizes lyrics with audio timing.
 * Features:
 * - 16:9 preview screen with active token highlighting
 * - Context-aware token display (blocks, lines, words, characters)
 * - Voice management with colors and positioning
 * - Playback speed control (1.0x, 0.75x, 0.5x, 0.25x)
 * - Recording modes for different granularity levels
 * - Keyboard controls for synchronization (W key to advance)
 * - Fixed audio player bar at bottom
 * - Scrollable settings panel
 */

import React, {useState, useRef, useEffect} from 'react'
import {useLocation} from 'react-router-dom'

function TimingSyncPage() {
	const location = useLocation()
	const audioFile = location.state?.audioFile
	const karaokeData = location.state?.karaokeData
	
	// Audio playback state
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
	const [audioUrl, setAudioUrl] = useState(null)
	
	// Voice and synchronization state
	const [voices, setVoices] = useState(karaokeData?.voices || [])
	const [currentVoice, setCurrentVoice] = useState(1)
	const [recordingMode, setRecordingMode] = useState('blocks') // 'blocks', 'lines', 'words', 'chars'
	const [activeTokenIndex, setActiveTokenIndex] = useState(0)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStartTime, setRecordingStartTime] = useState(null)
	const [wKeyPressed, setWKeyPressed] = useState(false)
	
	const audioRef = useRef(null)
	
	// Initialize audio URL from uploaded file
	useEffect(() => {
		if (audioFile) {
			const url = URL.createObjectURL(audioFile)
			setAudioUrl(url)
			
			return () => {
				URL.revokeObjectURL(url)
			}
		}
	}, [audioFile])
	
	// Audio control handlers
	const handlePlayPause = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause()
			} else {
				audioRef.current.play()
			}
			setIsPlaying(!isPlaying)
		}
	}
	
	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime)
		}
	}
	
	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration)
			audioRef.current.playbackRate = playbackSpeed
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
	 * Record timestamp for current active token
	 * @param {number} timestamp - Current audio time in milliseconds
	 * @param {string} type - 'start' or 'end'
	 */
	/**
	 * Get the next recording mode in the progression
	 * @param {string} currentMode - Current recording mode
	 * @returns {string|null} Next mode or null if finished
	 */
	const getNextRecordingMode = (currentMode) => {
		const modes = ['blocks', 'lines', 'words', 'chars']
		const currentIndex = modes.indexOf(currentMode)
		return currentIndex < modes.length - 1 ? modes[currentIndex + 1] : null
	}
	
	/**
	 * Skip to previous token
	 */
	const goToPreviousToken = () => {
		if (activeTokenIndex > 0) {
			setActiveTokenIndex(prev => prev - 1)
		}
	}
	
	/**
	 * Skip to next token
	 */
	const goToNextToken = () => {
		const tokens = getTokensByMode()
		if (activeTokenIndex < tokens.length - 1) {
			setActiveTokenIndex(prev => prev + 1)
		}
	}
	
	/**
	 * Export karaoke data as JSON file
	 */
	const exportKaraokeData = () => {
		if (!karaokeData) {
			alert('No karaoke data to export')
			return
		}
		
		// Update voices in karaoke data
		const exportData = {
			...karaokeData,
			voices: voices
		}
		
		const dataStr = JSON.stringify(exportData, null, 2)
		const dataBlob = new Blob([dataStr], { type: 'application/json' })
		const url = URL.createObjectURL(dataBlob)
		
		const link = document.createElement('a')
		link.href = url
		link.download = `${audioFile?.name || 'karaoke'}.json`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
		
		console.log('Exported karaoke data:', exportData)
	}

	const recordTimestamp = (timestamp, type) => {
		if (!karaokeData || !audioRef.current) return
		
		const currentTime = Math.round(timestamp * 1000) // Convert to milliseconds
		
		// Update the karaoke data structure based on current recording mode
		const updatedData = { ...karaokeData }
		
		switch (recordingMode) {
			case 'blocks':
				if (activeTokenIndex < updatedData.blocks.length) {
					updatedData.blocks[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						updatedData.blocks[activeTokenIndex].voice = currentVoice
					}
				}
				break
			case 'lines':
				const allLines = updatedData.blocks.flatMap(block => block.lines)
				if (activeTokenIndex < allLines.length) {
					allLines[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						allLines[activeTokenIndex].voice = currentVoice
					}
				}
				break
			case 'words':
				const allWords = updatedData.blocks.flatMap(block => 
					block.lines.flatMap(line => line.words)
				)
				if (activeTokenIndex < allWords.length) {
					allWords[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						allWords[activeTokenIndex].voice = currentVoice
					}
				}
				break
			case 'chars':
				const allChars = updatedData.blocks.flatMap(block => 
					block.lines.flatMap(line => 
						line.words.flatMap(word => word.chars || [])
					)
				)
				if (activeTokenIndex < allChars.length) {
					allChars[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						allChars[activeTokenIndex].voice = currentVoice
					}
				}
				break
		}
		
		setKaraokeData(updatedData)
		console.log(`Recorded ${type} timestamp:`, currentTime, 'ms for token', activeTokenIndex, 'in mode', recordingMode)
	}
	
	// Handle W key DOWN/UP events for timing synchronization
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key.toLowerCase() === 'w' && !event.repeat && !wKeyPressed) {
				setWKeyPressed(true)
				if (!isRecording && audioRef.current) {
					// Start recording - record start timestamp
					setIsRecording(true)
					setRecordingStartTime(audioRef.current.currentTime)
					recordTimestamp(audioRef.current.currentTime, 'start')
					console.log('Started recording at:', audioRef.current.currentTime, 's')
				}
			}
			// Arrow keys for manual navigation
			if (event.key === 'ArrowLeft') {
				setActiveTokenIndex(prev => Math.max(0, prev - 1))
			}
			if (event.key === 'ArrowRight') {
				const tokens = getTokensByMode()
				setActiveTokenIndex(prev => Math.min(tokens.length - 1, prev + 1))
			}
		}
		
		const handleKeyUp = (event) => {
			if (event.key.toLowerCase() === 'w' && wKeyPressed) {
				setWKeyPressed(false)
				if (isRecording && audioRef.current) {
					// End recording - record end timestamp and advance to next token
					recordTimestamp(audioRef.current.currentTime, 'end')
					setIsRecording(false)
					setRecordingStartTime(null)
					console.log('Ended recording at:', audioRef.current.currentTime, 's')
					
					// Advance to next token
					const tokens = getTokensByMode()
					if (activeTokenIndex < tokens.length - 1) {
						setActiveTokenIndex(prev => prev + 1)
					} else {
						// Finished current mode - ask user if they want to proceed to next mode
						console.log(`Finished recording ${recordingMode} mode`)
						const nextMode = getNextRecordingMode(recordingMode)
						if (nextMode) {
							const proceed = confirm(`Finished ${recordingMode} mode. Proceed to ${nextMode} mode for fine-tuning?`)
							if (proceed) {
								setRecordingMode(nextMode)
								setActiveTokenIndex(0)
								console.log(`Switched to ${nextMode} mode`)
							}
						} else {
							alert(`Congratulations! You've finished all recording modes. Your karaoke file is ready!`)
							console.log('All recording modes completed!')
							console.log('Final karaoke data:', karaokeData)
						}
					}
				}
			}
		}
		
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [activeTokenIndex, recordingMode, karaokeData, isRecording, wKeyPressed, audioRef])
	
	// Reset active token when recording mode changes
	useEffect(() => {
		setActiveTokenIndex(0)
	}, [recordingMode])
	
	// Update playback speed when changed
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed
		}
	}, [playbackSpeed])
	
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
	
	// Voice management functions
	const addVoice = () => {
		const newId = Math.max(...voices.map(v => v.id), 0) + 1
		setVoices([
			...voices, {
				id: newId,
				name: "",
				default_position: "C",
				color: "#FFFFFF"
			}
		])
	}
	
	const removeVoice = (id) => {
		if (voices.length <= 1) return // Keep at least one voice
		setVoices(voices.filter(v => v.id !== id))
		if (currentVoice === id) {
			setCurrentVoice(voices.find(v => v.id !== id)?.id || 1)
		}
	}
	
	const updateVoice = (id, field, value) => {
		setVoices(voices.map(v =>
			v.id === id ? {...v, [field]: value} : v
		))
	}
	
	/**
	 * Get tokens based on current recording mode
	 * @returns {Array} Array of token objects with text, voice, and position info
	 */
	const getTokensByMode = () => {
		if (!karaokeData?.blocks) return []
		
		switch (recordingMode) {
			case 'blocks':
				return karaokeData.blocks.map((block, index) => ({
					type: 'block',
					index,
					text: block.lines.map(line => line.text).join('\n'),
					voice: block.voice
				}))
			
			case 'lines':
				const lines = []
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						lines.push({
							type: 'line',
							index: lines.length,
							text: line.text,
							voice: line.voice,
							blockIndex,
							lineIndex
						})
					})
				})
				return lines
			
			case 'words':
				const words = []
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						const lineWords = line.text.split(' ').filter(word => word.trim())
						lineWords.forEach((word, wordIndex) => {
							words.push({
								type: 'word',
								index: words.length,
								text: word,
								voice: line.voice,
								blockIndex,
								lineIndex,
								wordIndex,
								lineText: line.text
							})
						})
					})
				})
				return words
			
			case 'chars':
				const chars = []
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						line.text.split('').forEach((char, charIndex) => {
							chars.push({
								type: 'char',
								index: chars.length,
								text: char,
								voice: line.voice,
								blockIndex,
								lineIndex,
								charIndex,
								lineText: line.text
							})
						})
					})
				})
				return chars
			
			default:
				return []
		}
	}
	
	/**
	 * Get tokens to display based on recording mode and active token
	 * Different modes show different context around the active token
	 */
	const getDisplayTokens = () => {
		const tokens = getTokensByMode()
		if (tokens.length === 0) return []
		
		const activeIndex = Math.min(activeTokenIndex, tokens.length - 1)
		
		switch (recordingMode) {
			case 'blocks':
				// Show 1 above and 1 below
				const blockStart = Math.max(0, activeIndex - 1)
				const blockEnd = Math.min(tokens.length, activeIndex + 2)
				return tokens.slice(blockStart, blockEnd).map((token, index) => ({
					...token,
					isActive: blockStart + index === activeIndex,
					displayIndex: blockStart + index
				}))
			
			case 'lines':
				// Show 2 above and 2 below
				const lineStart = Math.max(0, activeIndex - 2)
				const lineEnd = Math.min(tokens.length, activeIndex + 3)
				return tokens.slice(lineStart, lineEnd).map((token, index) => ({
					...token,
					isActive: lineStart + index === activeIndex,
					displayIndex: lineStart + index
				}))
			
			case 'words':
				// Show current line + 1 above and 1 below
				const activeToken = tokens[activeIndex]
				const currentLineTokens = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex
				)
				
				// Find line above and below
				const lineAbove = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex - 1
				)
				const lineBelow = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex + 1
				)
				
				return [...lineAbove, ...currentLineTokens, ...lineBelow].map((token) => ({
					...token,
					isActive: token.index === activeIndex,
					displayIndex: token.index
				}))
			
			case 'chars':
				// Show only current line
				const activeCharToken = tokens[activeIndex]
				const currentLineChars = tokens.filter(t =>
					t.blockIndex === activeCharToken.blockIndex && t.lineIndex === activeCharToken.lineIndex
				)
				
				return currentLineChars.map((token) => ({
					...token,
					isActive: token.index === activeIndex,
					displayIndex: token.index
				}))
			
			default:
				return []
		}
	}
	
	/**
	 * Render the lyrics preview with active token highlighting
	 */
	const renderPreview = () => {
		const displayTokens = getDisplayTokens()
		if (displayTokens.length === 0) return "No lyrics loaded"
		
		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: recordingMode === 'blocks' ? '2rem' : recordingMode === 'lines' ? '1.5rem' : '0.5rem',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100%',
				padding: '2rem'
			}}>
				{displayTokens.map((token, index) => {
					const voice = voices.find(v => v.id === token.voice) || voices[0]
					
					return (
						<div
							key={`${token.type}-${token.displayIndex}`}
							style={{
								color: token.isActive ? (voice?.color || '#FFFFFF') : 'rgba(255,255,255,0.5)',
								fontSize: token.isActive ?
									(recordingMode === 'blocks' ? '3rem' :
										recordingMode === 'lines' ? '2.5rem' :
											recordingMode === 'words' ? '2rem' : '1.5rem') :
									(recordingMode === 'blocks' ? '1.5rem' :
										recordingMode === 'lines' ? '1.3rem' :
											recordingMode === 'words' ? '1.1rem' : '0.9rem'),
								fontWeight: token.isActive ? 'bold' : 'normal',
								textAlign: 'center',
								lineHeight: '1.4',
								transition: 'all 0.3s ease',
								opacity: token.isActive ? 1 : 0.7,
								transform: token.isActive ? 'scale(1.05)' : 'scale(1)',
								whiteSpace: recordingMode === 'words' ? 'nowrap' : 'pre-line',
								display: recordingMode === 'chars' ? 'inline' : 'block',
								margin: recordingMode === 'chars' ? '0 2px' : '0',
								padding: recordingMode === 'chars' && token.isActive ? '4px 8px' : '0',
								backgroundColor: recordingMode === 'chars' && token.isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
								borderRadius: recordingMode === 'chars' && token.isActive ? '4px' : '0'
							}}
						>
							{token.text}
						</div>
					)
				})}
			</div>
		)
	}
	
	return (
		<div style={{
			height: 'calc(100vh - 80px)',
			display: 'flex',
			flexDirection: 'column',
			background: '#f5f5f5'
		}}>
			{/* Main Content Area - positioned below header, above footer */}
			<div style={{
				flex: 1,
				flexGrow: 0,
				display: 'flex',
				height: 'calc(100vh - 160px)', // Account for header (80px) + footer (80px) = 160px
				boxSizing: 'border-box' // Include padding in height calculation
			}}>
				{/* Left - Lyrics Preview (16:9 aspect ratio) */}
				<div style={{
					flex: 1,
					padding: '1rem',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					minWidth: 0 // Important for flex children to shrink
				}}>
					<div style={{
						background: '#000',
						borderRadius: '12px',
						aspectRatio: '16 / 9',
						width: '100%',
						maxHeight: '100%',
						position: 'relative',
						overflow: 'hidden',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'white',
						fontSize: '1.5rem',
						fontWeight: 'bold',
						textAlign: 'center',
						padding: '2rem'
					}}>
						{renderPreview()}
						
						{/* Mode indicator */}
						<div style={{
							position: 'absolute',
							bottom: '20px',
							right: '20px',
							fontSize: '0.8rem',
							opacity: 0.7
						}}>
							{recordingMode} mode
						</div>
					</div>
				</div>
				
				{/* Right - Settings Panel (scrollable) */}
				<div style={{
					width: '350px',
					background: 'white',
					borderLeft: '1px solid #ddd',
					padding: '2rem 2rem 100px 2rem', // Extra bottom padding to clear fixed player bar (80px + 20px clearance)
					overflowY: 'auto',
					minHeight: 0 // Important for flex children to shrink
				}}>
					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '2rem'
					}}>
						<h3 style={{margin: 0, color: '#333'}}>Settings</h3>
						<button
							onClick={() => navigate('/lyrics-input', { state: { audioFile } })}
							style={{
								padding: '8px 16px',
								borderRadius: '20px',
								border: '2px solid #6c757d',
								background: 'white',
								color: '#6c757d',
								cursor: 'pointer',
								fontSize: '0.9rem',
								transition: 'all 0.2s'
							}}
							onMouseEnter={(e) => {
								e.target.style.background = '#6c757d'
								e.target.style.color = 'white'
							}}
							onMouseLeave={(e) => {
								e.target.style.background = 'white'
								e.target.style.color = '#6c757d'
							}}
						>
							⬅️ Back
						</button>
					</div>
					
					{/* Audio File Info */}
					{audioFile && (
						<div style={{
							marginBottom: '2rem',
							padding: '1rem',
							background: '#f8f9fa',
							borderRadius: '8px'
						}}>
							<h4 style={{marginBottom: '0.5rem', color: '#333'}}>Audio File</h4>
							<p style={{color: '#666', fontSize: '0.9rem', margin: 0}}>
								{audioFile.name}
							</p>
						</div>
					)}
					
					{/* Playback Speed Controls */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Playback Speed</h4>
						<div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
							{[1.0, 0.75, 0.5, 0.25].map(speed => (
								<button
									key={speed}
									onClick={() => {
										setPlaybackSpeed(speed)
										if (audioRef.current) {
											audioRef.current.playbackRate = speed
										}
									}}
									style={{
										padding: '8px 16px',
										borderRadius: '20px',
										border: `2px solid ${playbackSpeed === speed ? '#667eea' : '#ddd'}`,
										background: playbackSpeed === speed ? '#667eea' : 'white',
										color: playbackSpeed === speed ? 'white' : '#666',
										cursor: 'pointer',
										fontSize: '0.9rem'
									}}
								>
									{speed}x
								</button>
							))}
						</div>
					</div>
					
					{/* Recording Mode Selection */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Recording Mode</h4>
						<select
							value={recordingMode}
							onChange={(e) => setRecordingMode(e.target.value)}
							style={{
								width: '100%',
								padding: '8px 12px',
								borderRadius: '6px',
								border: '2px solid #ddd',
								fontSize: '1rem'
							}}
						>
							<option value="blocks">Blocks</option>
							<option value="lines">Lines</option>
							<option value="words">Words</option>
							<option value="chars">Characters</option>
						</select>
					</div>
					
					{/* Navigation Controls */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Navigation</h4>
						<div style={{
							display: 'flex',
							gap: '0.5rem',
							marginBottom: '1rem'
						}}>
							<button
								onClick={goToPreviousToken}
								disabled={activeTokenIndex === 0}
								style={{
									flex: 1,
									padding: '8px 12px',
									borderRadius: '6px',
									border: '2px solid #6c757d',
									background: activeTokenIndex === 0 ? '#f8f9fa' : 'white',
									color: activeTokenIndex === 0 ? '#6c757d' : '#495057',
									cursor: activeTokenIndex === 0 ? 'not-allowed' : 'pointer',
									fontSize: '0.9rem',
									opacity: activeTokenIndex === 0 ? 0.5 : 1
								}}
							>
								⬅️ Previous
							</button>
							<button
								onClick={goToNextToken}
								disabled={activeTokenIndex >= getTokensByMode().length - 1}
								style={{
									flex: 1,
									padding: '8px 12px',
									borderRadius: '6px',
									border: '2px solid #6c757d',
									background: activeTokenIndex >= getTokensByMode().length - 1 ? '#f8f9fa' : 'white',
									color: activeTokenIndex >= getTokensByMode().length - 1 ? '#6c757d' : '#495057',
									cursor: activeTokenIndex >= getTokensByMode().length - 1 ? 'not-allowed' : 'pointer',
									fontSize: '0.9rem',
									opacity: activeTokenIndex >= getTokensByMode().length - 1 ? 0.5 : 1
								}}
							>
								➡️ Next
							</button>
						</div>
						<div style={{
							textAlign: 'center',
							fontSize: '0.9rem',
							color: '#666',
							background: '#f8f9fa',
							padding: '0.5rem',
							borderRadius: '4px'
						}}>
							Token {activeTokenIndex + 1} of {getTokensByMode().length}
						</div>
					</div>
					
					{/* Recording Status */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Status</h4>
						<div style={{
							padding: '1rem',
							background: isRecording ? '#fff3cd' : '#d1ecf1',
							border: `1px solid ${isRecording ? '#ffeaa7' : '#bee5eb'}`,
							borderRadius: '6px',
							color: isRecording ? '#856404' : '#0c5460'
						}}>
							<div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>
								{isRecording ? '🔴 Recording...' : '⏸️ Ready to Record'}
							</div>
							<div style={{fontSize: '0.8rem'}}>
								{isRecording 
									? `Hold W key to continue recording` 
									: `Press and hold W key to start recording`
								}
							</div>
						</div>
					</div>
					
					{/* Voice Management */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Voices</h4>
						
						{voices.map(voice => (
							<div key={voice.id} style={{
								marginBottom: '1rem',
								padding: '1rem',
								background: currentVoice === voice.id ? '#f0f4ff' : '#f8f9fa',
								borderRadius: '8px',
								border: currentVoice === voice.id ? '2px solid #667eea' : '1px solid #ddd'
							}}>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									marginBottom: '0.5rem'
								}}>
									<button
										onClick={() => setCurrentVoice(voice.id)}
										style={{
											background: 'none',
											border: 'none',
											fontSize: '1rem',
											fontWeight: 'bold',
											color: '#333',
											cursor: 'pointer'
										}}
									>
										Voice {voice.id} {currentVoice === voice.id && '✓'}
									</button>
									
									{voices.length > 1 && (
										<button
											onClick={() => removeVoice(voice.id)}
											style={{
												background: 'none',
												border: 'none',
												color: '#dc3545',
												cursor: 'pointer',
												fontSize: '0.8rem'
											}}
										>
											Remove
										</button>
									)}
								</div>
								
								{/* Voice name input */}
								<div style={{marginBottom: '0.5rem'}}>
									<input
										type="text"
										placeholder="Voice name"
										value={voice.name}
										onChange={(e) => updateVoice(voice.id, 'name', e.target.value)}
										style={{
											width: '100%',
											padding: '4px 8px',
											borderRadius: '4px',
											border: '1px solid #ddd',
											fontSize: '0.9rem'
										}}
									/>
								</div>
								
								{/* Color and position controls */}
								<div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
									<input
										type="color"
										value={voice.color}
										onChange={(e) => updateVoice(voice.id, 'color', e.target.value)}
										style={{
											width: '40px',
											height: '30px',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer'
										}}
									/>
									
									{/* Position selector - only shown with multiple voices */}
									{voices.length > 1 && (
										<select
											value={voice.default_position}
											onChange={(e) => updateVoice(voice.id, 'default_position', e.target.value)}
											style={{
												flex: 1,
												padding: '4px 8px',
												borderRadius: '4px',
												border: '1px solid #ddd',
												fontSize: '0.8rem'
											}}
										>
											<option value="C">Center</option>
											<option value="L">Left</option>
											<option value="R">Right</option>
											<option value="U">Up</option>
											<option value="D">Down</option>
											<option value="TL">Top Left</option>
											<option value="TR">Top Right</option>
											<option value="DL">Down Left</option>
											<option value="DR">Down Right</option>
										</select>
									)}
								</div>
							</div>
						))}
						
						{/* Add voice button */}
						<button
							onClick={addVoice}
							style={{
								width: '100%',
								padding: '12px',
								borderRadius: '8px',
								border: '2px dashed #667eea',
								background: 'white',
								color: '#667eea',
								cursor: 'pointer',
								fontSize: '1rem'
							}}
						>
							+ Add Voice
						</button>
					</div>
					
					{/* Current Voice Selector */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Current Voice</h4>
						<div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
							<button
								onClick={() => setCurrentVoice(0)}
								style={{
									padding: '8px 16px',
									borderRadius: '20px',
									border: `2px solid ${currentVoice === 0 ? '#667eea' : '#ddd'}`,
									background: currentVoice === 0 ? '#667eea' : 'white',
									color: currentVoice === 0 ? 'white' : '#666',
									cursor: 'pointer',
									fontSize: '0.9rem'
								}}
							>
								Undefined (0)
							</button>
							{voices.map(voice => (
								<button
									key={voice.id}
									onClick={() => setCurrentVoice(voice.id)}
									style={{
										padding: '8px 16px',
										borderRadius: '20px',
										border: `2px solid ${currentVoice === voice.id ? '#667eea' : '#ddd'}`,
										background: currentVoice === voice.id ? '#667eea' : 'white',
										color: currentVoice === voice.id ? 'white' : '#666',
										cursor: 'pointer',
										fontSize: '0.9rem'
									}}
								>
									{voice.name || `Voice ${voice.id}`}
								</button>
							))}
						</div>
					</div>
					
					{/* Recording Controls */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Recording</h4>
						<button
							style={{
								width: '100%',
								padding: '16px',
								borderRadius: '8px',
								background: '#28a745',
								color: 'white',
								border: 'none',
								cursor: 'pointer',
								fontSize: '1.2rem',
								fontWeight: 'bold',
								marginBottom: '1rem'
							}}
						>
							🎤 Start Recording {recordingMode}
						</button>
						
						{/* Keyboard controls help */}
						<div style={{
							padding: '1rem',
							background: '#f8f9fa',
							borderRadius: '8px',
							fontSize: '0.9rem',
							color: '#666'
						}}>
							<div style={{marginBottom: '0.5rem'}}>
								<strong>Controls:</strong>
							</div>
							<div>• Press <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>W</kbd> to advance to next {recordingMode.slice(0, -1)}</div>
							<div>• Use <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>←</kbd> <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>→</kbd> to navigate manually
							</div>
						</div>
					</div>
					
					{/* Export Controls */}
					<div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #ddd'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Export</h4>
						<button
							onClick={exportKaraokeData}
							style={{
								width: '100%',
								padding: '16px',
								borderRadius: '8px',
								background: '#007bff',
								color: 'white',
								border: 'none',
								cursor: 'pointer',
								fontSize: '1.1rem',
								fontWeight: 'bold',
								marginBottom: '1rem'
							}}
							onMouseEnter={(e) => e.target.style.background = '#0056b3'}
							onMouseLeave={(e) => e.target.style.background = '#007bff'}
						>
							📥 Export Karaoke JSON
						</button>
						<div style={{
							padding: '0.75rem',
							background: '#f8f9fa',
							borderRadius: '6px',
							fontSize: '0.8rem',
							color: '#666',
							textAlign: 'center'
						}}>
							This will download your complete karaoke file with all timing data
						</div>
					</div>
				</div>
			</div>
			
			{/* Hidden Audio Element */}
			{audioUrl && (
				<audio
					ref={audioRef}
					src={audioUrl}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onEnded={() => setIsPlaying(false)}
					style={{display: 'none'}}
				/>
			)}
			
			{/* Fixed Audio Controls Bar at Bottom */}
			<div style={{
				position: 'fixed',
				bottom: 0,
				left: 0,
				right: 0,
				height: '80px',
				background: 'white',
				borderTop: '1px solid #ddd',
				padding: '0.75rem 2rem',
				display: 'flex',
				alignItems: 'center',
				gap: '2rem',
				zIndex: 100
			}}>
				{/* Play Controls */}
				<div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
					<button
						onClick={handlePlayPause}
						style={{
							width: '50px',
							height: '50px',
							borderRadius: '50%',
							background: isPlaying ? '#dc3545' : '#28a745',
							color: 'white',
							border: 'none',
							cursor: 'pointer',
							fontSize: '1.2rem',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						{isPlaying ? '⏸️' : '▶️'}
					</button>
					
					<div style={{color: '#666', fontSize: '0.9rem'}}>
						{playbackSpeed}x speed
					</div>
				</div>
				
				{/* Progress Bar */}
				<div style={{flex: 1}}>
					<div
						style={{
							background: '#e9ecef',
							height: '8px',
							borderRadius: '4px',
							position: 'relative',
							cursor: 'pointer'
						}}
						onClick={handleSeek}
					>
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
						fontSize: '0.8rem',
						color: '#666'
					}}>
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>
				
				{/* Status Display */}
				<div style={{color: '#666', fontSize: '0.9rem', textAlign: 'right'}}>
					<div>Recording: {recordingMode}</div>
					<div>Voice: {voices.find(v => v.id === currentVoice)?.name || `Voice ${currentVoice}`}</div>
					<div>Token: {activeTokenIndex + 1} of {getTokensByMode().length}</div>
				</div>
			</div>
		</div>
	)
}

export default TimingSyncPage