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
	
	// Scroll to top when component mounts
	useEffect(() => {
		window.scrollTo(0, 0)
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
						
						return {
							text: char,
							start: Math.round(charStartTime),
							end: Math.round(charEndTime),
							voice: word.voice || 0,
							position: word.position || ""
						}
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
	
	// Get progress percentage for a token
	const getTokenProgress = (token) => {
		if (!token || typeof token.start !== 'number' || typeof token.end !== 'number') return 0
		if (token.start === token.end) return 0
		
		const currentTimeMs = currentTime * 1000
		if (currentTimeMs < token.start) return 0
		if (currentTimeMs >= token.end) return 100
		
		const progress = ((currentTimeMs - token.start) / (token.end - token.start)) * 100
		return Math.max(0, Math.min(100, progress))
	}
	
	// Get voice color
	const getVoiceColor = (voiceId) => {
		const voice = processedLyricsJson?.voices?.find(v => v.id === voiceId)
		return voice?.color || '#87CEEB'
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
	
	// Render karaoke display
	const renderKaraokeDisplay = () => {
		if (!processedLyricsJson) {
			return <div style={{color: 'white', textAlign: 'center'}}>No lyrics data available</div>
		}
		
		const tokens = getCurrentTokens()
		
		// Find active blocks to display (current + context)
		const activeBlockIndex = tokens.blocks.findIndex(block => block.isActive)
		const startIndex = Math.max(0, activeBlockIndex === -1 ? 0 : activeBlockIndex - 1)
		const endIndex = Math.min(tokens.blocks.length - 1, activeBlockIndex === -1 ? 2 : activeBlockIndex + 1)
		const blocksToShow = tokens.blocks.slice(startIndex, endIndex + 1)
		
		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '3rem',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100%',
				padding: '2rem',
				overflow: 'hidden'
			}}>
				{blocksToShow.map((block) => (
					<div key={block.blockIndex} style={{
						textAlign: 'center',
						transition: 'all 0.3s ease',
						opacity: block.isActive ? 1 : 0.4,
						transform: block.isActive ? 'scale(1.1)' : 'scale(1)'
					}}>
						{block.lines.map((line, lineIndex) => {
							const lineTokens = tokens.lines.find(l => 
								l.blockIndex === block.blockIndex && l.lineIndex === lineIndex
							)
							
							return (
								<div key={lineIndex} style={{ marginBottom: '1rem', position: 'relative' }}>
									{/* Line text with progress bars for smallest available token level */}
									<div style={{
										fontSize: isFullscreen ? '3rem' : '2rem',
										lineHeight: '1.4',
										marginBottom: '0.5rem'
									}}>
										{/* Determine the smallest token level available for this line */}
										{(() => {
											// Check if we have character-level data
											const hasCharData = line.words.some(word => word.chars && word.chars.length > 0)
											// Check if we have word-level data
											const hasWordData = line.words && line.words.length > 0
											
											if (hasCharData) {
												// Use character-level progress bars only
												return line.words.map((word, wordIndex) => (
													<span key={wordIndex}>
														{word.chars.map((char, charIndex) => {
															const charToken = tokens.chars.find(c => 
																c.blockIndex === block.blockIndex && 
																c.lineIndex === lineIndex && 
																c.wordIndex === wordIndex && 
																c.charIndex === charIndex
															)
															
															const charVoiceColor = getVoiceColor(char.voice || word.voice)
															const charTextColor = charToken?.isPast || charToken?.isActive ? charVoiceColor : 
																				  `${charVoiceColor}60`
															
															return (
																<span
																	key={charIndex}
																	style={{
																		color: charTextColor,
																		transition: 'color 0.2s ease',
																		position: 'relative',
																		display: 'inline-block'
																	}}
																>
																	{char.text}
																	{/* Progress bar for character - shows current progress */}
																	<div style={{
																		position: 'absolute',
																		bottom: '-6px',
																		left: '0',
																		right: '0',
																		height: '3px',
																		background: 'rgba(255,255,255,0.2)',
																		overflow: 'hidden'
																	}}>
																		<div style={{
																			width: `${charToken ? getTokenProgress(charToken) : 0}%`,
																			height: '100%',
																			background: charVoiceColor,
																			transition: 'width 0.1s linear'
																		}} />
																	</div>
																</span>
															)
														})}
														{/* Space between words with progress bar */}
														{wordIndex < line.words.length - 1 && (() => {
															// Calculate space timing: from end of current word to start of next word
															const currentWord = word
															const nextWord = line.words[wordIndex + 1]
															
															// For character mode, use last char of current word and first char of next word
															const currentEndTime = currentWord.chars && currentWord.chars.length > 0 
																? currentWord.chars[currentWord.chars.length - 1].end
																: currentWord.end
															const nextStartTime = nextWord.chars && nextWord.chars.length > 0
																? nextWord.chars[0].start
																: nextWord.start
															
															// Create virtual space token for progress calculation
															const spaceToken = {
																start: currentEndTime,
																end: nextStartTime,
																isActive: currentTime * 1000 >= currentEndTime && currentTime * 1000 <= nextStartTime,
																isPast: currentTime * 1000 > nextStartTime,
																isFuture: currentTime * 1000 < currentEndTime
															}
															
															return (
																<span style={{ 
																	position: 'relative', 
																	display: 'inline-block',
																	width: '0.5ch',  // Ensure space has width
																	textAlign: 'center'
																}}>
																	&nbsp;
																	{/* Progress bar for space - with calculated timing */}
																	<div style={{
																		position: 'absolute',
																		bottom: '-6px',
																		left: '0',
																		right: '0',
																		height: '3px',
																		background: 'rgba(255,255,255,0.2)',
																		overflow: 'hidden'
																	}}>
																		<div style={{
																			width: `${getTokenProgress(spaceToken)}%`,
																			height: '100%',
																			background: getVoiceColor(currentWord.voice || nextWord.voice),
																			transition: 'width 0.1s linear'
																		}} />
																	</div>
																</span>
															)
														})()}
													</span>
												))
											} else if (hasWordData) {
												// Use word-level progress bars only
												return line.words.map((word, wordIndex) => {
													const wordToken = tokens.words.find(w => 
														w.blockIndex === block.blockIndex && 
														w.lineIndex === lineIndex && 
														w.wordIndex === wordIndex
													)
													
													const voiceColor = getVoiceColor(word.voice)
													const textColor = wordToken?.isPast || wordToken?.isActive ? voiceColor : 
																	 `${voiceColor}60`
													
													return (
														<span key={wordIndex}>
															<span style={{
																color: textColor,
																transition: 'color 0.2s ease',
																position: 'relative',
																display: 'inline-block'
															}}>
																{word.text}
																{/* Progress bar for word - shows current progress */}
																<div style={{
																	position: 'absolute',
																	bottom: '-6px',
																	left: '0',
																	right: '0',
																	height: '3px',
																	background: 'rgba(255,255,255,0.2)',
																	overflow: 'hidden'
																}}>
																	<div style={{
																		width: `${wordToken ? getTokenProgress(wordToken) : 0}%`,
																		height: '100%',
																		background: voiceColor,
																		transition: 'width 0.1s linear'
																	}} />
																</div>
															</span>
															{/* Space between words with progress bar */}
															{wordIndex < line.words.length - 1 && (() => {
																// Calculate space timing: from end of current word to start of next word
																const currentWord = word
																const nextWord = line.words[wordIndex + 1]
																
																// Create virtual space token for progress calculation
																const spaceToken = {
																	start: currentWord.end,
																	end: nextWord.start,
																	isActive: currentTime * 1000 >= currentWord.end && currentTime * 1000 <= nextWord.start,
																	isPast: currentTime * 1000 > nextWord.start,
																	isFuture: currentTime * 1000 < currentWord.end
																}
																
																return (
																	<span style={{ 
																		position: 'relative', 
																		display: 'inline-block',
																		width: '1ch',  // Ensure space has width
																		textAlign: 'center'
																	}}>
																		&nbsp;
																		{/* Progress bar for space - with calculated timing */}
																		<div style={{
																			position: 'absolute',
																			bottom: '-6px',
																			left: '0',
																			right: '0',
																			height: '3px',
																			background: 'rgba(255,255,255,0.2)',
																			overflow: 'hidden'
																		}}>
																			<div style={{
																				width: `${getTokenProgress(spaceToken)}%`,
																				height: '100%',
																				background: getVoiceColor(currentWord.voice || nextWord.voice),
																				transition: 'width 0.1s linear'
																			}} />
																		</div>
																	</span>
																)
															})()}
														</span>
													)
												})
											} else {
												// Use line-level progress bar only
												const lineVoiceColor = getVoiceColor(line.voice)
												const lineTextColor = lineTokens?.isPast || lineTokens?.isActive ? lineVoiceColor : 
																	 `${lineVoiceColor}60`
												
												return (
													<span style={{
														color: lineTextColor,
														transition: 'color 0.2s ease',
														position: 'relative',
														display: 'inline-block'
													}}>
														{line.text}
													</span>
												)
											}
										})()}
									</div>
									
									{/* Line-level progress bar - only shown if no word/char data */}
									{(() => {
										const hasCharData = line.words.some(word => word.chars && word.chars.length > 0)
										const hasWordData = line.words && line.words.length > 0
										
										if (!hasCharData && !hasWordData) {
											return (
												<div style={{
													position: 'absolute',
													bottom: '-8px',
													left: '0',
													right: '0',
													height: '4px',
													background: 'rgba(255,255,255,0.2)',
													overflow: 'hidden'
												}}>
													<div style={{
														width: `${lineTokens ? getTokenProgress(lineTokens) : 0}%`,
														height: '100%',
														background: getVoiceColor(lineTokens?.voice),
														transition: 'width 0.1s linear'
													}} />
												</div>
											)
										}
										return null
									})()}
								</div>
							)
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
