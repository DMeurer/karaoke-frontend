/**
 * LyricsPlaybackScreen Component
 * 
 * Playback mode for karaoke with real-time highlighting and progress bars.
 * Features:
 * - Text highlighting: darker color before, real color during playback
 * - Progress bars for lines, words, and characters
 * - Fullscreen mode for the preview area
 * - Space characters handled with continuous progress bars
 * - Block scrolling and token highlighting
 */

import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function LyricsPlaybackScreen() {
	const location = useLocation()
	const navigate = useNavigate()
	
	// State for karaoke data - can come from navigation state or file upload
	const [lyricsJson, setLyricsJson] = useState(location.state?.lyricsJson)
	const [audioUrl, setAudioUrl] = useState(location.state?.audioUrl)
	const [uploadMode, setUploadMode] = useState(false)
	
	// Audio playback state
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
	const [isFullscreen, setIsFullscreen] = useState(false)
	
	const audioRef = useRef(null)
	const fullscreenRef = useRef(null)
	const fileInputRef = useRef(null)
	
	// Initialize audio
	useEffect(() => {
		if (audioUrl && audioRef.current) {
			audioRef.current.src = audioUrl
		}
	}, [audioUrl])
	
	// Scroll to top when component mounts and initialize container scroll
	useEffect(() => {
		window.scrollTo(0, 0)
		// Also scroll the karaoke container to top
		const container = document.getElementById('karaoke-container')
		if (container) {
			container.scrollTop = 0
		}
	}, [])
	
	// Audio event handlers
	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration)
		}
	}
	
	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime)
		}
	}

	// High-frequency timer for smooth progress bar updates
	useEffect(() => {
		let intervalId
		if (isPlaying && audioRef.current) {
			intervalId = setInterval(() => {
				if (audioRef.current) {
					setCurrentTime(audioRef.current.currentTime)
				}
			}, 16) // Update every 16ms (~60fps)
		}
		return () => {
			if (intervalId) {
				clearInterval(intervalId)
			}
		}
	}, [isPlaying])
	
	const togglePlayPause = () => {
		if (audioRef.current) {
			if (audioRef.current.paused) {
				audioRef.current.play()
				setIsPlaying(true)
			} else {
				audioRef.current.pause()
				setIsPlaying(false)
			}
		}
	}
	
	const handleSeek = (event) => {
		const audio = audioRef.current
		if (audio) {
			const progressBar = event.currentTarget
			const clickX = event.nativeEvent.offsetX
			const width = progressBar.offsetWidth
			const newTime = (clickX / width) * duration
			
			audio.currentTime = newTime
			setCurrentTime(newTime)
		}
	}
	
	// Playback speed control
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed
		}
	}, [playbackSpeed])
	
	// Space key for play/pause
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === ' ' || event.key === 'Spacebar') {
				event.preventDefault()
				togglePlayPause()
			}
		}
		
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])
	
	// Fullscreen handling
	const toggleFullscreen = () => {
		if (!isFullscreen) {
			if (fullscreenRef.current?.requestFullscreen) {
				fullscreenRef.current.requestFullscreen()
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen()
			}
		}
	}
	
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}
		
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
	}, [])
	
	// Get current active tokens based on time
	const getCurrentTokens = () => {
		if (!processedLyricsJson || !processedLyricsJson.blocks) return { blocks: [], lines: [], words: [], chars: [] }
		
		const currentTimeMs = currentTime * 1000
		const result = { blocks: [], lines: [], words: [], chars: [] }
		
		// Find active blocks
		processedLyricsJson.blocks.forEach((block, blockIndex) => {
			const isActive = currentTimeMs >= block.start && currentTimeMs <= block.end
			const isPast = currentTimeMs > block.end
			const isFuture = currentTimeMs < block.start
			
			result.blocks.push({
				...block,
				blockIndex,
				isActive,
				isPast,
				isFuture
			})
			
			// Find active lines within blocks
			block.lines.forEach((line, lineIndex) => {
				const lineIsActive = currentTimeMs >= line.start && currentTimeMs <= line.end
				const lineIsPast = currentTimeMs > line.end
				const lineIsFuture = currentTimeMs < line.start
				
				result.lines.push({
					...line,
					blockIndex,
					lineIndex,
					isActive: lineIsActive,
					isPast: lineIsPast,
					isFuture: lineIsFuture
				})
				
				// Find active words within lines
				line.words.forEach((word, wordIndex) => {
					const wordIsActive = currentTimeMs >= word.start && currentTimeMs <= word.end
					const wordIsPast = currentTimeMs > word.end
					const wordIsFuture = currentTimeMs < word.start
					
					result.words.push({
						...word,
						blockIndex,
						lineIndex,
						wordIndex,
						isActive: wordIsActive,
						isPast: wordIsPast,
						isFuture: wordIsFuture
					})
					
					// Find active characters within words
					if (word.chars) {
						word.chars.forEach((char, charIndex) => {
							const charIsActive = currentTimeMs >= char.start && currentTimeMs <= char.end
							const charIsPast = currentTimeMs > char.end
							const charIsFuture = currentTimeMs < char.start
							
							result.chars.push({
								...char,
								blockIndex,
								lineIndex,
								wordIndex,
								charIndex,
								isActive: charIsActive,
								isPast: charIsPast,
								isFuture: charIsFuture
							})
						})
					}
				})
			})
		})
		
		return result
	}
	
	// Generate linear timing for JSON without proper timing data
	const generateLinearTiming = (json) => {
		if (!json || !duration) return json
		
		const totalDurationMs = duration * 1000
		let currentTimeMs = 0
		
		// Calculate total text length for proportional timing
		const totalChars = json.blocks.reduce((sum, block) => 
			sum + block.lines.reduce((lineSum, line) => 
				lineSum + line.words.reduce((wordSum, word) => 
					wordSum + word.text.length, 0), 0), 0)
		
		if (totalChars === 0) return json
		
		const msPerChar = totalDurationMs / totalChars
		
		// Process blocks
		json.blocks.forEach(block => {
			const blockStartTime = currentTimeMs
			
			block.lines.forEach(line => {
				const lineStartTime = currentTimeMs
				
				line.words.forEach(word => {
					const wordStartTime = currentTimeMs
					const wordDuration = word.text.length * msPerChar
					
					word.start = Math.round(wordStartTime)
					word.end = Math.round(wordStartTime + wordDuration)
					
					// Generate character timing
					if (!word.chars) {
						word.chars = []
					}
					
					word.chars = word.text.split('').map((char, index) => {
						const charStartTime = wordStartTime + (index * (wordDuration / word.text.length))
						const charEndTime = wordStartTime + ((index + 1) * (wordDuration / word.text.length))
						
						const charToken = {
							text: char,
							start: Math.round(charStartTime),
							end: Math.round(charEndTime),
							voice: word.voice || 0,
							position: word.position || ""
						}
						
						
						return charToken
					})
					
					currentTimeMs += wordDuration
				})
				
				// Set line timing to encompass all words
				line.start = Math.round(lineStartTime)
				line.end = Math.round(currentTimeMs)
			})
			
			// Set block timing to encompass all lines
			block.start = Math.round(blockStartTime)
			block.end = Math.round(currentTimeMs)
		})
		
		return json
	}
	
	// Process lyrics JSON to ensure timing data exists
	const processedLyricsJson = React.useMemo(() => {
		if (!lyricsJson) return null
		
		// Check if we need to generate timing data
		const hasTimingData = lyricsJson.blocks?.some(block => 
			block.start > 0 || block.end > 0 ||
			block.lines?.some(line => 
				line.start > 0 || line.end > 0 ||
				line.words?.some(word => 
					word.start > 0 || word.end > 0 ||
					word.chars?.some(char => char.start > 0 || char.end > 0))))
		
		if (hasTimingData) {
			return lyricsJson // Use existing timing data
		} else {
			return generateLinearTiming(JSON.parse(JSON.stringify(lyricsJson))) // Generate timing
		}
	}, [lyricsJson, duration])
	
	// Get progress percentage for a token - shows gradual filling
	const getTokenProgress = (token) => {
		if (!token) return 0
		
		const currentTimeMs = currentTime * 1000
		
		// Ensure we have valid numeric timing
		if (typeof token.start !== 'number' || typeof token.end !== 'number') {
			return 0
		}
		
		// Avoid division by zero
		if (token.start === token.end) {
			return currentTimeMs >= token.start ? 100 : 0
		}
		
		// Before token starts: 0%
		if (currentTimeMs < token.start) {
			return 0
		}
		
		// After token ends: 100%
		if (currentTimeMs >= token.end) {
			return 100
		}
		
		// During token: gradual progress from 0% to 100%
		const progress = ((currentTimeMs - token.start) / (token.end - token.start)) * 100
		return Math.max(0, Math.min(100, progress))
	}
	
	// Get voice color
	const getVoiceColor = (voiceId) => {
		const voice = processedLyricsJson?.voices?.find(v => v.id === voiceId)
		return voice?.color || '#87CEEB'
	}

	// Get darkened voice color (for inactive text)
	const getDarkenedVoiceColor = (voiceId) => {
		const color = getVoiceColor(voiceId)
		// Convert hex to RGB, darken by reducing opacity/brightness
		if (color.startsWith('#')) {
			const r = parseInt(color.slice(1, 3), 16)
			const g = parseInt(color.slice(3, 5), 16)
			const b = parseInt(color.slice(5, 7), 16)
			// Darken by 60%
			return `rgb(${Math.round(r * 0.4)}, ${Math.round(g * 0.4)}, ${Math.round(b * 0.4)})`
		}
		return color
	}

	// Get text color based on timing (darkened for inactive, real color for active/past)
	const getTextColor = (token) => {
		if (!token) return 'white'
		const currentTimeMs = currentTime * 1000
		const isActiveOrPast = currentTimeMs >= token.start
		
		if (token.voice) {
			return isActiveOrPast ? getVoiceColor(token.voice) : getDarkenedVoiceColor(token.voice)
		}
		
		// Default colors if no voice specified
		return isActiveOrPast ? 'white' : 'rgba(255,255,255,0.4)'
	}
	
	// Format time display
	const formatTime = (time) => {
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}
	
	// Handle karaoke file upload
	const handleFileUpload = (event) => {
		const file = event.target.files[0]
		if (file && file.name.endsWith('.json')) {
			const reader = new FileReader()
			reader.onload = (e) => {
				try {
					const karaokeData = JSON.parse(e.target.result)
					
					// Validate that it's a proper karaoke JSON
					if (karaokeData.blocks && Array.isArray(karaokeData.blocks)) {
						setLyricsJson(karaokeData)
						
						// Try to extract audio URL from the karaoke data
						if (karaokeData.audioUrl) {
							setAudioUrl(karaokeData.audioUrl)
						}
						
						setUploadMode(false)
					} else {
						alert('Invalid karaoke file format. Please upload a properly formatted karaoke JSON file.')
					}
				} catch (error) {
					alert('Error reading karaoke file. Please ensure it\'s a valid JSON file.')
				}
			}
			reader.readAsText(file)
		} else {
			alert('Please select a valid JSON karaoke file.')
		}
	}
	
	// Handle audio file upload (separate from karaoke JSON)
	const handleAudioUpload = (event) => {
		const file = event.target.files[0]
		if (file && file.type.startsWith('audio/')) {
			const url = URL.createObjectURL(file)
			setAudioUrl(url)
		} else {
			alert('Please select a valid audio file.')
		}
	}
	
	// Progress calculation using audio timestamp (like your proof of concept)
	const getProgress = (start, end) => {
		const now = currentTime * 1000 // Convert to milliseconds
		if (now < start) return 0
		if (now > end) return 100
		return ((now - start) / (end - start)) * 100
	}

	// Find active line for scrolling
	const getActiveLineId = () => {
		if (!processedLyricsJson) return null
		
		const now = currentTime * 1000
		const activeLines = []
		
		// Find all active lines across all blocks
		processedLyricsJson.blocks.forEach((block, blockIdx) => {
			block.lines.forEach((line, lineIdx) => {
				if (now >= line.start && now <= line.end) {
					activeLines.push(`line-${blockIdx}-${lineIdx}`)
				}
			})
		})
		
		// If multiple active lines, return middle one
		if (activeLines.length > 1) {
			return activeLines[Math.floor(activeLines.length / 2)]
		}
		
		// If one active line, return it
		if (activeLines.length === 1) {
			return activeLines[0]
		}
		
		// If no active lines, find next upcoming line
		for (let blockIdx = 0; blockIdx < processedLyricsJson.blocks.length; blockIdx++) {
			const block = processedLyricsJson.blocks[blockIdx]
			for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
				const line = block.lines[lineIdx]
				if (line.start > now) {
					return `line-${blockIdx}-${lineIdx}`
				}
			}
		}
		
		// If no upcoming lines, return last line
		const lastBlock = processedLyricsJson.blocks[processedLyricsJson.blocks.length - 1]
		if (lastBlock && lastBlock.lines.length > 0) {
			return `line-${processedLyricsJson.blocks.length - 1}-${lastBlock.lines.length - 1}`
		}
		
		return null
	}

	// Auto-scroll to active line
	useEffect(() => {
		const activeLineId = getActiveLineId()
		if (activeLineId) {
			const element = document.getElementById(activeLineId)
			const container = document.getElementById('karaoke-container')
			
			if (element && container) {
				// Calculate the position to scroll the element to center of container
				const containerRect = container.getBoundingClientRect()
				const elementRect = element.getBoundingClientRect()
				
				const containerCenter = containerRect.height / 2
				const elementTop = element.offsetTop - container.offsetTop
				const elementHeight = elementRect.height
				
				const scrollToPosition = elementTop - containerCenter + (elementHeight / 2)
				
				container.scrollTo({
					top: scrollToPosition,
					behavior: 'smooth'
				})
			}
		}
	}, [currentTime, processedLyricsJson])

	// Render karaoke display using proof of concept approach
	const renderKaraokeDisplay = () => {
		if (!processedLyricsJson) {
			return <div style={{color: 'white', textAlign: 'center'}}>No lyrics data available</div>
		}

		return (
			<div 
				id="karaoke-container"
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '2rem',
					alignItems: 'center',
					justifyContent: 'flex-start', // Changed from center to flex-start
					height: '100%',
					padding: '2rem 2rem', // Add large top/bottom padding for scroll space
					overflow: 'auto', // Changed from hidden to auto
					scrollBehavior: 'smooth'
				}}>
				{/* Render all blocks and their lines in order, dynamically generating tokens */}
				{processedLyricsJson.blocks.map((block, blockIdx) => (
					<div 
						key={blockIdx} 
						id={`block-${blockIdx}`}
						style={{
							padding: '1rem',
							background: 'rgba(0,0,0,0.3)'
						}}>
						{block.lines.map((line, lineIdx) => {
							// Unified nested generator for line/word/char levels
							if (line.text !== "") {
								// Line-level: has non-empty text
								return (
									<div 
										key={blockIdx + "-" + lineIdx} 
										id={`line-${blockIdx}-${lineIdx}`}
										style={{
											marginBottom: '1rem',
											display: 'flex',
											justifyContent: 'center',
											fontSize: isFullscreen ? '3rem' : '2rem',
											color: getTextColor(line)
										}}>
										<div style={{ display: 'inline-block' }}>
											<span>{line.text}</span>
											<div style={{
												width: '100%',
												height: '4px',
												background: 'rgba(255,255,255,0.2)',
												marginTop: '4px',
												overflow: 'hidden'
											}}>
												<div style={{
													height: '100%',
													background: getVoiceColor(line.voice),
													width: `${getProgress(line.start, line.end)}%`,
													transition: 'width 0.05s linear'
												}} />
											</div>
										</div>
									</div>
								)
							} else if (Array.isArray(line.words) && line.words.length > 0) {
								// Word-level: has words
								return (
									<div 
										key={blockIdx + "-" + lineIdx}
										id={`line-${blockIdx}-${lineIdx}`}
										style={{
											marginBottom: '1rem',
											display: 'flex',
											justifyContent: 'center',
											fontSize: isFullscreen ? '3rem' : '2rem'
										}}>
										{line.words.map((word, wordIdx) => (
											<span key={wordIdx} style={{
												display: 'inline-flex',
												flexDirection: 'column',
												verticalAlign: 'top'
											}}>
												{/* Char-level: word has chars */}
												{Array.isArray(word.chars) && word.chars.length > 0 ? (
													<span style={{
														flexDirection: 'row',
														display: 'inline-flex'
													}}>
														{word.chars.map((char, charIdx) => (
															<span key={charIdx} style={{
																display: 'inline-flex',
																flexDirection: 'column',
																verticalAlign: 'top',
																color: getTextColor(char)
															}}>
																{char.text === " " ? <span>&nbsp;</span> : char.text}
																<div style={{
																	width: '100%',
																	height: '3px',
																	background: 'rgba(255,255,255,0.2)',
																	marginTop: '4px',
																	overflow: 'hidden'
																}}>
																	<div style={{
																		height: '100%',
																		background: getVoiceColor(char.voice || word.voice),
																		width: `${getProgress(char.start, char.end)}%`,
																		transition: 'width 0.05s linear'
																	}} />
																</div>
															</span>
														))}
													</span>
												) : (
													// Word-level: no chars
													<>
														<span style={{ color: getTextColor(word) }}>
															{word.text === " " ? <span>&nbsp;</span> : word.text}
														</span>
														<div style={{
															width: '100%',
															height: '3px',
															background: 'rgba(255,255,255,0.2)',
															marginTop: '4px',
															overflow: 'hidden'
														}}>
															<div style={{
																height: '100%',
																background: getVoiceColor(word.voice),
																width: `${getProgress(word.start, word.end)}%`,
																transition: 'width 0.05s linear'
															}} />
														</div>
													</>
												)}
											</span>
										))}
									</div>
								)
							}
							// If neither text nor words, render nothing
							return null
						})}
					</div>
				))}
			</div>
		)
	}
	
	if (!processedLyricsJson) {
		return (
			<div style={{
				minHeight: 'calc(100vh - 48px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#f5f5f5',
				padding: '2rem'
			}}>
				<div style={{
					background: 'white',
					borderRadius: '12px',
					padding: '3rem',
					maxWidth: '600px',
					width: '100%',
					textAlign: 'center',
					boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
				}}>
					<div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎤</div>
					<h2 style={{ color: '#333', marginBottom: '1rem' }}>No Karaoke Data Available</h2>
					<p style={{ color: '#666', marginBottom: '2rem' }}>
						You can either create a new karaoke track or upload an existing karaoke file.
					</p>
					
					<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
						<button
							onClick={() => navigate('/audio-upload')}
							style={{
								padding: '12px 24px',
								background: '#667eea',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '1rem',
								minWidth: '160px'
							}}
						>
							🎵 Create New Track
						</button>
						
						<button
							onClick={() => setUploadMode(true)}
							style={{
								padding: '12px 24px',
								background: '#28a745',
								color: 'white',
								border: 'none',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '1rem',
								minWidth: '160px'
							}}
						>
							📁 Upload Karaoke File
						</button>
					</div>
					
					{uploadMode && (
						<div style={{
							marginTop: '2rem',
							padding: '2rem',
							background: '#f8f9fa',
							borderRadius: '8px',
							border: '2px dashed #ddd'
						}}>
							<h4 style={{ marginBottom: '1rem', color: '#333' }}>Upload Karaoke Files</h4>
							
							<div style={{ marginBottom: '1.5rem' }}>
								<label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontWeight: 'bold' }}>
									Karaoke JSON File (Required)
								</label>
								<input
									type="file"
									accept=".json"
									onChange={handleFileUpload}
									style={{
										width: '100%',
										padding: '8px',
										border: '1px solid #ddd',
										borderRadius: '4px'
									}}
								/>
							</div>
							
							{!audioUrl && (
								<div style={{ marginBottom: '1.5rem' }}>
									<label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontWeight: 'bold' }}>
										Audio File (Optional if not embedded in JSON)
									</label>
									<input
										type="file"
										accept="audio/*"
										onChange={handleAudioUpload}
										style={{
											width: '100%',
											padding: '8px',
											border: '1px solid #ddd',
											borderRadius: '4px'
										}}
									/>
								</div>
							)}
							
							<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
								<button
									onClick={() => setUploadMode(false)}
									style={{
										padding: '8px 16px',
										background: '#6c757d',
										color: 'white',
										border: 'none',
										borderRadius: '6px',
										cursor: 'pointer'
									}}
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		)
	}
	
	// Show message if we have lyrics but no audio
	if (!audioUrl) {
		return (
			<div style={{
				minHeight: 'calc(100vh - 48px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#f5f5f5',
				padding: '2rem'
			}}>
				<div style={{
					background: 'white',
					borderRadius: '12px',
					padding: '2rem',
					maxWidth: '500px',
					textAlign: 'center',
					boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
				}}>
					<div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎵</div>
					<h3 style={{ color: '#333', marginBottom: '1rem' }}>Audio File Required</h3>
					<p style={{ color: '#666', marginBottom: '2rem' }}>
						Please upload an audio file to start playback.
					</p>
					
					<input
						ref={fileInputRef}
						type="file"
						accept="audio/*"
						onChange={handleAudioUpload}
						style={{ display: 'none' }}
					/>
					
					<button
						onClick={() => fileInputRef.current?.click()}
						style={{
							padding: '12px 24px',
							background: '#667eea',
							color: 'white',
							border: 'none',
							borderRadius: '8px',
							cursor: 'pointer',
							fontSize: '1rem'
						}}
					>
						📁 Upload Audio File
					</button>
				</div>
			</div>
		)
	}
	
	return (
		<div style={{
			height: 'calc(100vh - 48px)',
			display: 'flex',
			flexDirection: 'column',
			background: '#f5f5f5'
		}}>
			{/* Main Content Area */}
			<div style={{
				flex: 1,
				display: 'flex',
				height: 'calc(100vh - 128px)' // 48px header + 80px footer
			}}>
				{/* Left - Karaoke Preview */}
				<div style={{
					flex: 1,
					padding: '1rem',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				}}>
					<div 
						ref={fullscreenRef}
						style={{
							background: '#000',
							borderRadius: isFullscreen ? '0' : '12px',
							aspectRatio: '16 / 9',
							width: '100%',
							maxHeight: '100%',
							position: 'relative',
							overflow: 'hidden'
						}}
					>
						{renderKaraokeDisplay()}
						
						{/* Fullscreen toggle button */}
						{!isFullscreen && (
							<button
								onClick={toggleFullscreen}
								style={{
									position: 'absolute',
									top: '10px',
									right: '10px',
									background: 'rgba(0,0,0,0.5)',
									border: 'none',
									color: 'white',
									padding: '8px 12px',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '0.9rem'
								}}
							>
								⛶ Fullscreen
							</button>
						)}
					</div>
				</div>
				
				{/* Right - Controls Panel */}
				<div style={{
					width: '300px',
					background: 'white',
					borderLeft: '1px solid #ddd',
					padding: '2rem',
					overflowY: 'auto'
				}}>
					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '2rem'
					}}>
						<h3 style={{ margin: 0, color: '#333' }}>Playback</h3>
						<button
							onClick={() => navigate('/timing-sync', { state: { audioFile: { name: 'audio' }, karaokeData: lyricsJson } })}
							style={{
								padding: '6px 12px',
								borderRadius: '15px',
								border: '2px solid #6c757d',
								background: 'white',
								color: '#6c757d',
								cursor: 'pointer',
								fontSize: '0.8rem'
							}}
						>
							⬅️ Edit
						</button>
					</div>
					
					{/* Playback Speed */}
					<div style={{ marginBottom: '2rem' }}>
						<h4 style={{ marginBottom: '1rem', color: '#333' }}>Speed</h4>
						<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
							{[1.0, 0.75, 0.5, 0.25].map(speed => (
								<button
									key={speed}
									onClick={() => setPlaybackSpeed(speed)}
									style={{
										padding: '8px 12px',
										borderRadius: '15px',
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
					
					{/* Info */}
					<div style={{
						padding: '1rem',
						background: '#f8f9fa',
						borderRadius: '8px',
						fontSize: '0.9rem',
						color: '#666'
					}}>
						<div style={{ marginBottom: '0.5rem' }}>
							<strong>Controls:</strong>
						</div>
						<div>• Press Space to play/pause</div>
						<div>• Click progress bar to seek</div>
						<div>• Use speed controls to adjust tempo</div>
						<div>• Click Fullscreen for presentation mode</div>
					</div>
				</div>
			</div>
			
			{/* Fixed Audio Controls Bar */}
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
				<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
					<button
						onClick={togglePlayPause}
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
					<div style={{ fontSize: '0.9rem', color: '#666' }}>
						{playbackSpeed}x speed
					</div>
				</div>
				
				{/* Progress Bar */}
				<div style={{ flex: 1 }}>
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
						}} />
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
			</div>
			
			{/* Hidden Audio Element */}
			{audioUrl && (
				<audio
					ref={audioRef}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onEnded={() => setIsPlaying(false)}
					style={{ display: 'none' }}
				/>
			)}
		</div>
	)
}

export default LyricsPlaybackScreen
