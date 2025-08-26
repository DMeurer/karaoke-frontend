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
import {useLocation, useNavigate} from 'react-router-dom'

function TimingSyncPage() {
	const location = useLocation()
	const navigate = useNavigate();
	const audioFile = location.state?.audioFile
	const initialAudioUrl = location.state?.audioUrl
	const initialKaraokeData = location.state?.karaokeData
	
	// Audio playback state
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
	const [audioUrl, setAudioUrl] = useState(initialAudioUrl)
	
	// Karaoke data state (mutable copy from initial data)
	const [karaokeData, setKaraokeData] = useState(initialKaraokeData)
	
	// Voice and synchronization state
	const [voices, setVoices] = useState(initialKaraokeData?.voices || [])
	const [currentVoice, setCurrentVoice] = useState(1)
	const [recordingMode, setRecordingMode] = useState('blocks') // 'blocks', 'lines', 'words', 'chars'
	const [activeTokenIndex, setActiveTokenIndex] = useState(0)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStartTime, setRecordingStartTime] = useState(null)
	const [wKeyPressed, setWKeyPressed] = useState(false)
	const [unlockedModes, setUnlockedModes] = useState(['blocks', 'lines']) // Start with blocks and lines unlocked
	const [voicesExpanded, setVoicesExpanded] = useState(false) // Voice section collapsed by default
	const [syncLocked, setSyncLocked] = useState(false) // Token-playhead sync lock
	const wKeyPressedRef = useRef(false) // Use ref for immediate state tracking
	
	const audioRef = useRef(null)
	
	// Initialize audio URL from uploaded file (only if no initialAudioUrl)
	useEffect(() => {
		if (audioFile && !initialAudioUrl) {
			const url = URL.createObjectURL(audioFile)
			setAudioUrl(url)
			
			return () => {
				URL.revokeObjectURL(url)
			}
		}
	}, [audioFile, initialAudioUrl])
	
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
	 * Only allows seeking when W is not pressed and playback is paused
	 * @param {MouseEvent} event - Click event on progress bar
	 */
	const handleSeek = (event) => {
		const audio = audioRef.current
		
		// Only allow seeking when W is not pressed and playback is paused
		if (!wKeyPressedRef.current && audio && audio.paused) {
			const progressBar = event.currentTarget
			const clickX = event.nativeEvent.offsetX
			const width = progressBar.offsetWidth
			const newTime = (clickX / width) * duration
			
			if (typeof newTime === 'number' && isFinite(newTime) && newTime >= 0) {
				audio.currentTime = newTime
				setCurrentTime(newTime)
			}
			console.log('Seeked to:', newTime, 's')
			
			// If sync is locked, find and set the token at this time
			if (syncLocked && typeof newTime === 'number' && isFinite(newTime)) {
				const tokens = getTokensByMode()
				const newTimeMs = newTime * 1000
				
				if (tokens.length > 0) {
					// Find the token that should be active at this time
					let targetTokenIndex = -1
					for (let i = 0; i < tokens.length; i++) {
						const token = tokens[i]
						if (token && typeof token.start === 'number' && typeof token.end === 'number') {
							if (token.start <= newTimeMs && newTimeMs <= token.end) {
								targetTokenIndex = i
								break
							}
							// If we're between tokens, pick the next one
							if (i < tokens.length - 1 && token.end < newTimeMs && newTimeMs < tokens[i + 1].start) {
								targetTokenIndex = i + 1
								break
							}
						}
					}
					
					// If no token found but time is past the last token, use last token
					if (targetTokenIndex === -1 && tokens[tokens.length - 1] && 
						typeof tokens[tokens.length - 1].end === 'number' && 
						newTimeMs > tokens[tokens.length - 1].end) {
						targetTokenIndex = tokens.length - 1
					}
					
					// If still no token and time is before first token, use first token
					if (targetTokenIndex === -1 && tokens[0] && 
						typeof tokens[0].start === 'number' && 
						newTimeMs < tokens[0].start) {
						targetTokenIndex = 0
					}
					
					if (targetTokenIndex >= 0 && targetTokenIndex !== activeTokenIndex) {
						setActiveTokenIndex(targetTokenIndex)
					}
				}
			}
		}
	}
	
	/**
	 * Toggle play/pause
	 */
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
	
	/**
	 * Clean up and interpolate timing data for child tokens
	 * @param {Object} data - The karaoke data to process
	 * @returns {Object} Cleaned karaoke data
	 */
	const cleanupTimingData = (data) => {
		if (!data || !data.blocks) return data

		const cleanedData = JSON.parse(JSON.stringify(data)) // Deep copy

		cleanedData.blocks.forEach(block => {
			// Clean up lines within blocks first
			if (block.lines && Array.isArray(block.lines)) {
				const timedLines = block.lines.filter(line => 
					typeof line.start === 'number' && typeof line.end === 'number' && 
					(line.start !== 0 || line.end !== 0)
				)

				if (timedLines.length === 0) {
					// No lines have timing - this shouldn't happen for blocks, but handle it
					// Keep the lines but they'll have no timing data
				} else if (timedLines.length < block.lines.length) {
					// Some lines have timing - use linear distribution for all lines
					const totalDuration = block.end - block.start
					const tokenCount = block.lines.length
					const tokenDuration = totalDuration / tokenCount
					
					block.lines = block.lines.map((line, index) => {
						const startTime = block.start + (index * tokenDuration)
						const endTime = block.start + ((index + 1) * tokenDuration)
						
						return {
							...line,
							start: Math.round(startTime),
							end: Math.round(endTime),
							voice: line.voice || block.voice // Inherit parent voice
						}
					})
				}
			}

			block.lines.forEach(line => {
				// Clean up words
				if (line.words && Array.isArray(line.words)) {
					const timedWords = line.words.filter(word => 
						typeof word.start === 'number' && typeof word.end === 'number' && 
						(word.start !== 0 || word.end !== 0)
					)

					if (timedWords.length === 0) {
						// No words have timing - remove all word data
						delete line.words
					} else if (timedWords.length < line.words.length) {
						// Some words have timing - use linear distribution for all words
						const totalDuration = line.end - line.start
						const tokenCount = line.words.length
						const tokenDuration = totalDuration / tokenCount
						
						const interpolatedWords = line.words.map((word, index) => {
							const startTime = line.start + (index * tokenDuration)
							const endTime = line.start + ((index + 1) * tokenDuration)
							
							return {
								...word,
								start: Math.round(startTime),
								end: Math.round(endTime),
								voice: word.voice || line.voice // Inherit parent voice
							}
						})
						
						line.words = interpolatedWords
					}

					// Clean up characters for each word
					if (line.words) {
						line.words.forEach(word => {
							if (word.chars && Array.isArray(word.chars)) {
								const timedChars = word.chars.filter(char => 
									typeof char.start === 'number' && typeof char.end === 'number' && 
									(char.start !== 0 || char.end !== 0)
								)

								if (timedChars.length === 0) {
									// No chars have timing - remove all char data
									delete word.chars
								} else if (timedChars.length < word.chars.length) {
									// Some chars have timing - use linear distribution for all chars
									const totalDuration = word.end - word.start
									const tokenCount = word.chars.length
									const tokenDuration = totalDuration / tokenCount
									
									const interpolatedChars = word.chars.map((char, index) => {
										const startTime = word.start + (index * tokenDuration)
										const endTime = word.start + ((index + 1) * tokenDuration)
										
										return {
											...char,
											start: Math.round(startTime),
											end: Math.round(endTime),
											voice: char.voice || word.voice || line.voice // Inherit parent voice
										}
									})
									
									word.chars = interpolatedChars
								}
							}
						})
					}
				}
			})
		})

		// Clear text for tokens that have children to avoid duplication
		cleanedData.blocks.forEach(block => {
			// Clear block text if it has lines (which it always should)
			if (block.lines && Array.isArray(block.lines) && block.lines.length > 0) {
				block.text = ""
			}

			block.lines.forEach(line => {
				// Clear line text if it has words
				if (line.words && Array.isArray(line.words) && line.words.length > 0) {
					line.text = ""
				}

				// Clear word text if it has characters
				if (line.words) {
					line.words.forEach(word => {
						if (word.chars && Array.isArray(word.chars) && word.chars.length > 0) {
							word.text = ""
						}
					})
				}
			})
		})

		return cleanedData
	}
	
	/**
	 * Check if a token is a space token (should be skipped during recording)
	 */
	const isSpaceToken = (token) => {
		return token && token.text && token.text.trim() === ''
	}
	
	/**
	 * Find the first non-space token index for the given tokens array
	 */
	const findFirstNonSpaceTokenIndex = (tokens) => {
		for (let i = 0; i < tokens.length; i++) {
			if (!isSpaceToken(tokens[i])) {
				return i
			}
		}
		return 0 // Fallback to 0 if no non-space tokens found
	}
	
	/**
	 * Update block timing based on child lines timing
	 * Called when recording lines to ensure parent blocks are updated
	 */
	const updateBlockTimingFromLines = (updatedData) => {
		updatedData.blocks.forEach(block => {
			if (!block.lines || block.lines.length === 0) return
			
			// Get all lines with valid timing
			const timedLines = block.lines.filter(line => 
				typeof line.start === 'number' && typeof line.end === 'number' && 
				line.start > 0 && line.end > 0
			)
			
			if (timedLines.length === 0) return
			
			// Calculate block timing from children
			const lineStarts = timedLines.map(line => line.start)
			const lineEnds = timedLines.map(line => line.end)
			const blockStart = Math.min(...lineStarts)
			const blockEnd = Math.max(...lineEnds)
			
			// Update block timing if not recorded or out of bounds
			const shouldUpdateStart = !block.start || block.start === 0 || block.start > blockStart
			const shouldUpdateEnd = !block.end || block.end === 0 || block.end < blockEnd
			
			if (shouldUpdateStart) {
				block.start = blockStart
				console.log(`📦 Updated block start to ${blockStart}ms based on child lines`)
			}
			
			if (shouldUpdateEnd) {
				block.end = blockEnd
				console.log(`📦 Updated block end to ${blockEnd}ms based on child lines`)
			}
		})
	}
	
	/**
	 * Update line and block timing based on child words timing
	 * Called when recording words to ensure parent lines and blocks are updated
	 */
	const updateParentTimingFromWords = (updatedData) => {
		updatedData.blocks.forEach(block => {
			block.lines.forEach(line => {
				if (!line.words || line.words.length === 0) return
				
				// Get all words with valid timing
				const timedWords = line.words.filter(word => 
					typeof word.start === 'number' && typeof word.end === 'number' && 
					word.start > 0 && word.end > 0
				)
				
				if (timedWords.length === 0) return
				
				// Calculate line timing from children
				const wordStarts = timedWords.map(word => word.start)
				const wordEnds = timedWords.map(word => word.end)
				const lineStart = Math.min(...wordStarts)
				const lineEnd = Math.max(...wordEnds)
				
				// Update line timing if not recorded or out of bounds
				const shouldUpdateStart = !line.start || line.start === 0 || line.start > lineStart
				const shouldUpdateEnd = !line.end || line.end === 0 || line.end < lineEnd
				
				if (shouldUpdateStart) {
					line.start = lineStart
					console.log(`📝 Updated line start to ${lineStart}ms based on child words`)
				}
				
				if (shouldUpdateEnd) {
					line.end = lineEnd
					console.log(`📝 Updated line end to ${lineEnd}ms based on child words`)
				}
			})
		})
		
		// Also update blocks based on updated lines
		updateBlockTimingFromLines(updatedData)
	}
	
	/**
	 * Update word, line and block timing based on child characters timing
	 * Called when recording characters to ensure parent words, lines and blocks are updated
	 */
	const updateParentTimingFromChars = (updatedData) => {
		updatedData.blocks.forEach(block => {
			block.lines.forEach(line => {
				if (!line.words || line.words.length === 0) return
				
				line.words.forEach(word => {
					if (!word.chars || word.chars.length === 0) return
					
					// Get all characters with valid timing
					const timedChars = word.chars.filter(char => 
						typeof char.start === 'number' && typeof char.end === 'number' && 
						char.start > 0 && char.end > 0
					)
					
					if (timedChars.length === 0) return
					
					// Calculate word timing from children
					const charStarts = timedChars.map(char => char.start)
					const charEnds = timedChars.map(char => char.end)
					const wordStart = Math.min(...charStarts)
					const wordEnd = Math.max(...charEnds)
					
					// Update word timing if not recorded or out of bounds
					const shouldUpdateStart = !word.start || word.start === 0 || word.start > wordStart
					const shouldUpdateEnd = !word.end || word.end === 0 || word.end < wordEnd
					
					if (shouldUpdateStart) {
						word.start = wordStart
						console.log(`🔤 Updated word start to ${wordStart}ms based on child characters`)
					}
					
					if (shouldUpdateEnd) {
						word.end = wordEnd
						console.log(`🔤 Updated word end to ${wordEnd}ms based on child characters`)
					}
				})
			})
		})
		
		// Also update lines and blocks based on updated words
		updateParentTimingFromWords(updatedData)
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
	 * Skip to previous non-space token
	 */
	const goToPreviousToken = () => {
		const tokens = getTokensByMode()
		let newIndex = activeTokenIndex - 1
		
		// Skip over space tokens
		while (newIndex >= 0 && isSpaceToken(tokens[newIndex])) {
			newIndex--
		}
		
		if (newIndex >= 0) {
			setActiveTokenIndex(newIndex)
			console.log(`⬅️ Moved to previous non-space token at index ${newIndex}: "${tokens[newIndex].text}"`)
			
			// If sync is locked, jump playhead to this token's start time
			if (syncLocked && audioRef.current) {
				const token = tokens[newIndex]
				const tokenStartTime = token.start / 1000 // Convert to seconds
				if (typeof tokenStartTime === 'number' && isFinite(tokenStartTime) && tokenStartTime >= 0) {
					audioRef.current.currentTime = tokenStartTime
					setCurrentTime(tokenStartTime)
				}
			}
		}
	}
	
	/**
	 * Skip to next non-space token
	 */
	const goToNextToken = () => {
		const tokens = getTokensByMode()
		let newIndex = activeTokenIndex + 1
		
		// Skip over space tokens
		while (newIndex < tokens.length && isSpaceToken(tokens[newIndex])) {
			newIndex++
		}
		
		if (newIndex < tokens.length) {
			setActiveTokenIndex(newIndex)
			console.log(`➡️ Moved to next non-space token at index ${newIndex}: "${tokens[newIndex].text}"`)
		}
	}
	
	/**
	 * Navigate in current recording mode
	 * @param {number} direction - 1 for forward, -1 for backward
	 */
	const navigateCurrentLevel = (direction) => {
		const tokens = getTokensByMode()
		const newIndex = activeTokenIndex + direction
		if (newIndex >= 0 && newIndex < tokens.length) {
			setActiveTokenIndex(newIndex)
			
			// If sync is locked, jump playhead to this token's start time
			if (syncLocked && audioRef.current && tokens[newIndex]) {
				const token = tokens[newIndex]
				const tokenStartTime = token.start / 1000 // Convert to seconds
				// Only sync if the token has meaningful timing data (not just 0)
				if (typeof tokenStartTime === 'number' && isFinite(tokenStartTime) && 
					tokenStartTime >= 0 && (token.start !== 0 || token.end !== 0)) {
					audioRef.current.currentTime = tokenStartTime
					setCurrentTime(tokenStartTime)
				}
			}
		}
	}
	
	/**
	 * Navigate in parent level (e.g., blocks when in lines mode)
	 * @param {number} direction - 1 for forward, -1 for backward
	 */
	const navigateParentLevel = (direction) => {
		if (!karaokeData) return
		
		switch (recordingMode) {
			case 'lines':
				// Navigate blocks
				const currentLineIndex = activeTokenIndex
				const allLines = karaokeData.blocks.flatMap((block, blockIndex) => 
					block.lines.map((line, lineIndex) => ({ blockIndex, lineIndex, globalIndex: currentLineIndex }))
				)
				const currentBlock = allLines.find(item => item.globalIndex === currentLineIndex)?.blockIndex || 0
				const newBlock = Math.max(0, Math.min(karaokeData.blocks.length - 1, currentBlock + direction))
				
				if (newBlock !== currentBlock) {
					// Jump to first line of the new block
					const newLineIndex = karaokeData.blocks.slice(0, newBlock).reduce((acc, block) => acc + block.lines.length, 0)
					setActiveTokenIndex(newLineIndex)
				}
				break
				
			case 'words':
				// Navigate lines
				const currentWordIndex = activeTokenIndex
				const allWords = karaokeData.blocks.flatMap(block => 
					block.lines.flatMap((line, lineIndex) => 
						line.words.map(word => ({ lineIndex: block.lines.slice(0, lineIndex).reduce((acc, l) => acc + l.words.length, 0) }))
					)
				)
				// Simplified: navigate by estimated line jumps
				const wordsPerLine = 5 // Estimate
				const newWordIndex = Math.max(0, Math.min(allWords.length - 1, activeTokenIndex + direction * wordsPerLine))
				setActiveTokenIndex(newWordIndex)
				break
				
			case 'chars':
				// Navigate words
				const currentCharIndex = activeTokenIndex
				const allChars = karaokeData.blocks.flatMap(block => 
					block.lines.flatMap(line => 
						line.words.flatMap(word => word.chars)
					)
				)
				// Simplified: navigate by estimated word jumps
				const charsPerWord = 4 // Estimate
				const newCharIndex = Math.max(0, Math.min(allChars.length - 1, activeTokenIndex + direction * charsPerWord))
				setActiveTokenIndex(newCharIndex)
				break
				
			default:
				// In blocks mode, no parent level
				break
		}
	}
	
	/**
	 * Check if all tokens in a mode have been recorded (have non-zero timestamps)
	 * @param {string} mode - Recording mode to check
	 * @returns {boolean} True if all tokens in mode are recorded
	 */
	const isModeCompleted = (mode) => {
		if (!karaokeData) return false
		
		switch (mode) {
			case 'blocks':
				return karaokeData.blocks.every(block => block.start > 0 && block.end > 0)
			case 'lines':
				return karaokeData.blocks.every(block => 
					block.lines.every(line => line.start > 0 && line.end > 0)
				)
			case 'words':
				return karaokeData.blocks.every(block => 
					block.lines.every(line => 
						line.words.every(word => word.start > 0 && word.end > 0)
					)
				)
			case 'chars':
				return karaokeData.blocks.every(block => 
					block.lines.every(line => 
						line.words.every(word => 
							word.chars.every(char => char.start > 0 && char.end > 0)
						)
					)
				)
			default:
				return false
		}
	}
	
	/**
	 * Check if the current active token has been recorded
	 * @returns {boolean} True if current token has timing data
	 */
	const isCurrentTokenRecorded = () => {
		if (!karaokeData) return false
		
		const tokens = getTokensByMode()
		if (activeTokenIndex >= tokens.length) return false
		
		const currentToken = tokens[activeTokenIndex]
		const hasValidTiming = currentToken && 
			   typeof currentToken.start === 'number' && 
			   typeof currentToken.end === 'number' &&
			   currentToken.start > 0 && currentToken.end > 0
		
		console.log('Checking current token recorded:', {
			recordingMode,
			activeTokenIndex,
			currentToken,
			hasValidTiming
		})
		
		return hasValidTiming
	}
	
	/**
	 * Update unlocked modes based on current token recording status and completion
	 */
	const updateUnlockedModes = () => {
		const modes = ['blocks', 'lines', 'words', 'chars']
		const newUnlockedModes = ['blocks', 'lines'] // Always start with blocks and lines
		
		// Traditional completion-based unlocking (start from lines since blocks and lines are always unlocked)
		for (let i = 1; i < modes.length - 1; i++) {
			if (isModeCompleted(modes[i])) {
				if (!newUnlockedModes.includes(modes[i + 1])) {
					newUnlockedModes.push(modes[i + 1])
				}
			} else {
				break
			}
		}
		
		// Additionally, unlock the next mode if current token is recorded
		const currentModeIndex = modes.indexOf(recordingMode)
		if (currentModeIndex >= 0 && currentModeIndex < modes.length - 1) {
			const nextMode = modes[currentModeIndex + 1]
			const tokenRecorded = isCurrentTokenRecorded()
			if (tokenRecorded && !newUnlockedModes.includes(nextMode)) {
				newUnlockedModes.push(nextMode)
				console.log(`Unlocking ${nextMode} mode because current ${recordingMode} token is recorded`)
			}
		}
		
		// Always ensure the current recording mode is unlocked
		if (!newUnlockedModes.includes(recordingMode)) {
			newUnlockedModes.push(recordingMode)
		}
		
		console.log('Updated unlocked modes:', newUnlockedModes)
		setUnlockedModes(newUnlockedModes)
	}
	
	/**
	 * Export karaoke data as JSON file
	 */
	const exportKaraokeData = () => {
		if (!karaokeData) {
			alert('No karaoke data to export')
			return
		}
		
		// Clean up and interpolate timing data before export
		const cleanedData = cleanupTimingData(karaokeData)
		
		// Update voices in cleaned karaoke data
		const exportData = {
			...cleanedData,
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
		
		// Skip space tokens - they are not recorded
		const tokens = getTokensByMode()
		const currentToken = tokens[activeTokenIndex]
		if (isSpaceToken(currentToken)) {
			console.log(`🚫 Skipping recording for space token at index ${activeTokenIndex}`)
			return
		}
		
		console.log(`🎯 Recording ${type} for token at index ${activeTokenIndex}: "${currentToken.text}"`)
		
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
					
					// Update parent block timing based on child lines
					updateBlockTimingFromLines(updatedData)
				}
				break
			case 'words':
				const allWords = updatedData.blocks.flatMap(block => 
					block.lines.flatMap(line => line.words || [])
				)
				if (activeTokenIndex < allWords.length) {
					allWords[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						allWords[activeTokenIndex].voice = currentVoice
					}
					
					// Update parent line and block timing based on child words
					updateParentTimingFromWords(updatedData)
				}
				break
			case 'chars':
				const allChars = updatedData.blocks.flatMap(block => 
					block.lines.flatMap(line => 
						line.words ? line.words.flatMap(word => word.chars || []) : []
					)
				)
				if (activeTokenIndex < allChars.length) {
					allChars[activeTokenIndex][type] = currentTime
					// Assign current voice when recording starts
					if (type === 'start') {
						allChars[activeTokenIndex].voice = currentVoice
					}
					
					// Update parent word, line and block timing based on child characters
					updateParentTimingFromChars(updatedData)
				}
				break
		}
		
		setKaraokeData(updatedData)
		console.log(`Recorded ${type} timestamp:`, currentTime, 'ms for token', activeTokenIndex, 'in mode', recordingMode)
		
		// Update unlocked modes after recording
		setTimeout(() => updateUnlockedModes(), 100)
	}
	
	// Handle W key DOWN/UP events for timing synchronization
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key.toLowerCase() === 'w' && !event.repeat && !wKeyPressedRef.current) {
				wKeyPressedRef.current = true
				setWKeyPressed(true)
				
				// In character mode, resume playback when W is pressed
				if (recordingMode === 'chars' && audioRef.current && audioRef.current.paused) {
					audioRef.current.play()
					setIsPlaying(true)
				}
				
				// Only record when music is playing
				if (!isRecording && audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
					// Start recording - record start timestamp
					setIsRecording(true)
					setRecordingStartTime(audioRef.current.currentTime)
					recordTimestamp(audioRef.current.currentTime, 'start')
					console.log('Started recording at:', audioRef.current.currentTime, 's')
				} else if (audioRef.current && audioRef.current.paused && recordingMode !== 'chars') {
					console.log('Cannot record while music is paused')
				}
			}
			// Space key for play/pause
			if (event.key === ' ' || event.key === 'Spacebar') {
				event.preventDefault() // Prevent page scroll
				togglePlayPause()
			}
			
			// Navigation controls
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				event.preventDefault() // Prevent duplicate handling
				const direction = event.key === 'ArrowRight' ? 1 : -1
				
				if (event.ctrlKey || event.metaKey) {
					// CTRL+Arrow: Navigate in parent level
					navigateParentLevel(direction)
				} else {
					// Arrow: Navigate in current level
					navigateCurrentLevel(direction)
				}
			}
		}
		
		const handleKeyUp = (event) => {
			if (event.key.toLowerCase() === 'w' && wKeyPressedRef.current) {
				wKeyPressedRef.current = false
				setWKeyPressed(false)
				
				// In character mode, pause playback when W is released
				if (recordingMode === 'chars' && audioRef.current && !audioRef.current.paused) {
					audioRef.current.pause()
					setIsPlaying(false)
				}
				
				if (isRecording && audioRef.current) {
					// End recording - record end timestamp and advance to next token
					recordTimestamp(audioRef.current.currentTime, 'end')
					setIsRecording(false)
					setRecordingStartTime(null)
					console.log('Ended recording at:', audioRef.current.currentTime, 's')
					
					// Advance to next non-space token
					const tokens = getTokensByMode()
					let nextIndex = activeTokenIndex + 1
					
					// Skip over space tokens
					while (nextIndex < tokens.length && isSpaceToken(tokens[nextIndex])) {
						nextIndex++
					}
					
					if (nextIndex < tokens.length) {
						setActiveTokenIndex(nextIndex)
						console.log(`🎯 Advanced to next non-space token at index ${nextIndex}: "${tokens[nextIndex].text}"`)
					} else {
						// Finished current mode - ask user if they want to proceed to next mode
						console.log(`Finished recording ${recordingMode} mode`)
						const nextMode = getNextRecordingMode(recordingMode)
						if (nextMode) {
							const proceed = confirm(`Finished ${recordingMode} mode. Proceed to ${nextMode} mode for fine-tuning?`)
							if (proceed) {
								setRecordingMode(nextMode)
								// Find first non-space token for the new mode
								const nextModeTokens = getTokensByModeType(nextMode)
								const firstNonSpaceIndex = findFirstNonSpaceTokenIndex(nextModeTokens)
								setActiveTokenIndex(firstNonSpaceIndex)
								console.log(`Switched to ${nextMode} mode, starting at non-space token index ${firstNonSpaceIndex}`)
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
		
		// Use only window event listener to prevent duplicate events
		window.addEventListener('keydown', handleKeyDown, true)
		window.addEventListener('keyup', handleKeyUp, true)
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
			window.removeEventListener('keyup', handleKeyUp, true)
		}
	}, [activeTokenIndex, recordingMode, karaokeData, isRecording, wKeyPressed, audioRef])
	
	/**
	 * Find the related token when switching modes
	 * @param {string} fromMode - Previous recording mode
	 * @param {string} toMode - New recording mode
	 * @param {number} currentIndex - Current token index in fromMode
	 * @returns {number} New token index for toMode
	 */
	const findRelatedToken = (fromMode, toMode, currentIndex) => {
		if (!karaokeData) return 0
		
		const fromTokens = getTokensByModeType(fromMode)
		const toTokens = getTokensByModeType(toMode)
		
		if (fromTokens.length === 0 || toTokens.length === 0 || currentIndex >= fromTokens.length) {
			return 0
		}
		
		const currentToken = fromTokens[currentIndex]
		
		// Define mode hierarchy: blocks > lines > words > chars
		const modeHierarchy = ['blocks', 'lines', 'words', 'chars']
		const fromLevel = modeHierarchy.indexOf(fromMode)
		const toLevel = modeHierarchy.indexOf(toMode)
		
		if (fromLevel === -1 || toLevel === -1) return 0
		
		if (toLevel < fromLevel) {
			// Going up (e.g., words -> lines): find parent
			for (let i = 0; i < toTokens.length; i++) {
				const toToken = toTokens[i]
				// Check if current token is within this parent token
				if (toToken.blockIndex === currentToken.blockIndex &&
					(toMode === 'blocks' || 
					 (toMode === 'lines' && toToken.lineIndex === currentToken.lineIndex) ||
					 (toMode === 'words' && toToken.lineIndex === currentToken.lineIndex && toToken.wordIndex === currentToken.wordIndex))) {
					return i
				}
			}
		} else if (toLevel > fromLevel) {
			// Going down (e.g., lines -> words): find first child
			for (let i = 0; i < toTokens.length; i++) {
				const toToken = toTokens[i]
				// Check if this token is a child of current token
				if (toToken.blockIndex === currentToken.blockIndex &&
					(fromMode === 'blocks' || 
					 (fromMode === 'lines' && toToken.lineIndex === currentToken.lineIndex) ||
					 (fromMode === 'words' && toToken.lineIndex === currentToken.lineIndex && toToken.wordIndex === currentToken.wordIndex))) {
					return i
				}
			}
		}
		
		return 0 // Fallback to first token
	}
	
	/**
	 * Get tokens by mode type (helper for findRelatedToken)
	 */
	const getTokensByModeType = (mode) => {
		if (!karaokeData) return []
		
		switch (mode) {
			case 'blocks':
				return karaokeData.blocks.map((block, blockIndex) => ({
					...block,
					type: 'block',
					index: blockIndex,
					blockIndex
				}))
			case 'lines':
				const lineTokens = []
				let lineIndex = 0
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, localLineIndex) => {
						lineTokens.push({
							...line,
							type: 'line',
							index: lineIndex++,
							blockIndex,
							lineIndex: localLineIndex
						})
					})
				})
				return lineTokens
			case 'words':
				const wordTokens = []
				let wordIndex = 0
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						line.words.forEach((word, localWordIndex) => {
							wordTokens.push({
								...word,
								type: 'word',
								index: wordIndex++,
								blockIndex,
								lineIndex,
								wordIndex: localWordIndex
							})
						})
					})
				})
				return wordTokens
			case 'chars':
				const charTokens = []
				let charIndex = 0
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						line.words.forEach((word, wordIndex) => {
							word.chars.forEach((char, localCharIndex) => {
								charTokens.push({
									...char,
									type: 'char',
									index: charIndex++,
									blockIndex,
									lineIndex,
									wordIndex,
									charIndex: localCharIndex
								})
							})
						})
					})
				})
				return charTokens
			default:
				return []
		}
	}
	
	// Track previous mode for smart token selection
	const previousModeRef = useRef(recordingMode)
	
	// Smart token selection when recording mode changes
	useEffect(() => {
		// Only run this logic if we actually changed modes (not initial load)
		if (previousModeRef.current !== recordingMode) {
			const newIndex = findRelatedToken(previousModeRef.current, recordingMode, activeTokenIndex)
			setActiveTokenIndex(newIndex)
		}
		
		previousModeRef.current = recordingMode
	}, [recordingMode, activeTokenIndex, karaokeData])
	
	// Update unlocked modes on component load and data changes
	useEffect(() => {
		updateUnlockedModes()
	}, [karaokeData, recordingMode, activeTokenIndex])
	
	// Update voices when karaokeData changes
	useEffect(() => {
		if (karaokeData?.voices) {
			setVoices(karaokeData.voices)
		}
	}, [karaokeData])
	
	// Reset W key state if it gets stuck (fallback mechanism)
	useEffect(() => {
		const resetWKeyState = () => {
			if (wKeyPressedRef.current !== wKeyPressed) {
				wKeyPressedRef.current = wKeyPressed
			}
		}
		
		const interval = setInterval(resetWKeyState, 1000) // Check every second
		return () => clearInterval(interval)
	}, [wKeyPressed])
	
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
					voice: block.voice,
					start: block.start,
					end: block.end
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
							lineIndex,
							start: line.start,
							end: line.end
						})
					})
				})
				return lines
			
			case 'words':
				const words = []
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						if (line.words && Array.isArray(line.words)) {
							// Use existing word data if available
							line.words.forEach((word, wordIndex) => {
								words.push({
									type: 'word',
									index: words.length,
									text: word.text,
									voice: word.voice || line.voice,
									blockIndex,
									lineIndex,
									wordIndex,
									start: word.start,
									end: word.end
								})
							})
						} else {
							// Fallback: split line text into words and spaces
							const tokens = line.text.split(/( )/g) // Splits into words and spaces
							tokens.forEach((token, tokenIndex) => {
								if (token.length > 0) { // Skip empty strings
									words.push({
										type: 'word',
										index: words.length,
										text: token,
										voice: line.voice,
										blockIndex,
										lineIndex,
										wordIndex: tokenIndex,
										lineText: line.text,
										start: undefined, // No timing data available
										end: undefined
									})
								}
							})
						}
					})
				})
				return words
			
			case 'chars':
				const chars = []
				karaokeData.blocks.forEach((block, blockIndex) => {
					block.lines.forEach((line, lineIndex) => {
						if (line.words && Array.isArray(line.words)) {
							// Use existing character data if available
							line.words.forEach((word, wordIndex) => {
								if (word.chars && Array.isArray(word.chars)) {
									word.chars.forEach((char, charIndex) => {
										chars.push({
											type: 'char',
											index: chars.length,
											text: char.text,
											voice: char.voice || word.voice || line.voice,
											blockIndex,
											lineIndex,
											wordIndex,
											charIndex,
											start: char.start,
											end: char.end
										})
									})
								} else {
									// Fallback: split word into characters
									word.text.split('').forEach((char, charIndex) => {
										chars.push({
											type: 'char',
											index: chars.length,
											text: char,
											voice: word.voice || line.voice,
											blockIndex,
											lineIndex,
											wordIndex,
											charIndex,
											start: undefined, // No timing data available
											end: undefined
										})
									})
								}
							})
						} else {
							// Fallback: split line text into characters
							line.text.split('').forEach((char, charIndex) => {
								chars.push({
									type: 'char',
									index: chars.length,
									text: char,
									voice: line.voice,
									blockIndex,
									lineIndex,
									charIndex,
									lineText: line.text,
									start: undefined, // No timing data available
									end: undefined
								})
							})
						}
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
	 * Space tokens are filtered out from display
	 */
	const getDisplayTokens = () => {
		const tokens = getTokensByMode()
		if (tokens.length === 0) return []
		
		const activeIndex = Math.min(activeTokenIndex, tokens.length - 1)
		
		switch (recordingMode) {
			case 'blocks':
				// Show 1 above and 1 below (filter out spaces)
				const blockStart = Math.max(0, activeIndex - 1)
				const blockEnd = Math.min(tokens.length, activeIndex + 2)
				return tokens.slice(blockStart, blockEnd)
					.filter(token => !isSpaceToken(token))
					.map((token, index) => ({
						...token,
						isActive: tokens.indexOf(token) === activeIndex,
						displayIndex: tokens.indexOf(token)
					}))
			
			case 'lines':
				// Show 2 above and 2 below (filter out spaces)
				const lineStart = Math.max(0, activeIndex - 2)
				const lineEnd = Math.min(tokens.length, activeIndex + 3)
				return tokens.slice(lineStart, lineEnd)
					.filter(token => !isSpaceToken(token))
					.map((token, index) => ({
						...token,
						isActive: tokens.indexOf(token) === activeIndex,
						displayIndex: tokens.indexOf(token)
					}))
			
			case 'words':
				// Show current line + 1 above and 1 below (filter out spaces)
				const activeToken = tokens[activeIndex]
				const currentLineTokens = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex && !isSpaceToken(t)
				)
				
				// Find line above and below
				const lineAbove = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex - 1 && !isSpaceToken(t)
				)
				const lineBelow = tokens.filter(t =>
					t.blockIndex === activeToken.blockIndex && t.lineIndex === activeToken.lineIndex + 1 && !isSpaceToken(t)
				)
				
				return [...lineAbove, ...currentLineTokens, ...lineBelow].map((token) => ({
					...token,
					isActive: tokens.indexOf(token) === activeIndex,
					displayIndex: tokens.indexOf(token)
				}))
			
			case 'chars':
				// Show only current line (filter out spaces)
				const activeCharToken = tokens[activeIndex]
				const currentLineChars = tokens.filter(t =>
					t.blockIndex === activeCharToken.blockIndex && 
					t.lineIndex === activeCharToken.lineIndex && 
					!isSpaceToken(t)
				)
				
				return currentLineChars.map((token) => ({
					...token,
					isActive: tokens.indexOf(token) === activeIndex,
					displayIndex: tokens.indexOf(token)
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
		
		// For words and chars modes, group tokens by line
		if (recordingMode === 'words' || recordingMode === 'chars') {
			// Group tokens by line
			const lineGroups = {}
			displayTokens.forEach(token => {
				const lineKey = `${token.blockIndex}-${token.lineIndex}`
				if (!lineGroups[lineKey]) {
					lineGroups[lineKey] = []
				}
				lineGroups[lineKey].push(token)
			})
			
			return (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1.5rem',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					padding: '2rem'
				}}>
					{Object.entries(lineGroups).map(([lineKey, lineTokens]) => {
						const hasActiveToken = lineTokens.some(token => token.isActive)
						
						return (
							<div key={lineKey} style={{
								display: 'flex',
								flexWrap: 'wrap',
								justifyContent: 'center',
								alignItems: 'center',
								gap: recordingMode === 'chars' ? '1px' : '4px',
								fontSize: hasActiveToken ? '2.2rem' : '1.8rem',
								opacity: hasActiveToken ? 1 : 0.7,
								transform: hasActiveToken ? 'scale(1.02)' : 'scale(1)',
								transition: 'all 0.3s ease'
							}}>
								{lineTokens.map(token => {
									const voice = voices.find(v => v.id === token.voice) || voices[0]
									const isRecordingThisToken = isRecording && token.isActive
									
									return (
										<span
											key={`${token.type}-${token.displayIndex}`}
											style={{
												color: token.isActive ? (voice?.color || '#87CEEB') : 'rgba(255,255,255,0.8)',
												boxShadow: isRecordingThisToken ? `0 0 20px ${voice?.color || '#87CEEB'}` : 'none',
												fontWeight: token.isActive ? 'bold' : 'normal',
												padding: token.isActive ? '4px 8px' : '2px 4px',
												backgroundColor: token.isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
												borderRadius: token.isActive ? '4px' : '0',
												transition: 'all 0.3s ease',
												display: 'inline-block'
											}}
										>
											{token.text === ' ' ? '\u00A0' : token.text}
										</span>
									)
								})}
							</div>
						)
					})}
				</div>
			)
		}
		
		// Original rendering for blocks and lines modes
		if (recordingMode === 'lines') {
			// Group lines by blocks for proper spacing
			const linesByBlock = {}
			displayTokens.forEach(token => {
				if (!linesByBlock[token.blockIndex]) {
					linesByBlock[token.blockIndex] = []
				}
				linesByBlock[token.blockIndex].push(token)
			})
			
			return (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					padding: '2rem',
					gap: '3rem' // Large gap between blocks
				}}>
					{Object.entries(linesByBlock).map(([blockIndex, blockTokens]) => (
						<div key={`block-${blockIndex}`} style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '0.8rem' // Smaller gap between lines within the same block
						}}>
							{blockTokens.map((token) => {
								const voice = voices.find(v => v.id === token.voice) || voices[0]
								const isRecordingThisToken = isRecording && token.isActive
								
								return (
									<div
										key={`${token.type}-${token.displayIndex}`}
										style={{
											color: token.isActive ? (voice?.color || '#87CEEB') : 'rgba(255,255,255,0.5)',
											boxShadow: isRecordingThisToken ? `0 0 20px ${voice?.color || '#87CEEB'}` : 'none',
											fontSize: token.isActive ? '2.2rem' : '1.8rem',
											fontWeight: token.isActive ? 'bold' : 'normal',
											textAlign: 'center',
											lineHeight: '1.4',
											transition: 'all 0.3s ease',
											opacity: token.isActive ? 1 : 0.7,
											transform: token.isActive ? 'scale(1.02)' : 'scale(1)',
											whiteSpace: 'pre-line'
										}}
									>
										{token.text}
									</div>
								)
							})}
						</div>
					))}
				</div>
			)
		}
		
		// Blocks mode
		return (
			<div style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '2rem',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100%',
				padding: '2rem'
			}}>
				{displayTokens.map((token, index) => {
					const voice = voices.find(v => v.id === token.voice) || voices[0]
					const isRecordingThisToken = isRecording && token.isActive
					
					return (
						<div
							key={`${token.type}-${token.displayIndex}`}
							style={{
								color: token.isActive ? (voice?.color || '#87CEEB') : 'rgba(255,255,255,0.5)',
								boxShadow: isRecordingThisToken ? `0 0 20px ${voice?.color || '#87CEEB'}` : 'none',
								fontSize: token.isActive ? '2.6rem' : '2rem',
								fontWeight: token.isActive ? 'bold' : 'normal',
								textAlign: 'center',
								lineHeight: '1.4',
								transition: 'all 0.3s ease',
								opacity: token.isActive ? 1 : 0.7,
								transform: token.isActive ? 'scale(1.02)' : 'scale(1)',
								whiteSpace: 'pre-line'
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
			height: 'calc(100vh - 48px)', // Updated for new header height
			display: 'flex',
			flexDirection: 'column',
			background: '#f5f5f5'
		}}>
			{/* Main Content Area - positioned below header, above footer */}
			<div style={{
				flex: 1,
				flexGrow: 0,
				display: 'flex',
				height: 'calc(100vh - 128px)', // 48px header + 80px footer
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
							{[1.5, 1.0, 0.75, 0.5, 0.25].map(speed => (
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
						<div style={{
							display: 'flex',
							gap: '0.5rem',
							flexWrap: 'wrap'
						}}>
							{[
								{value: 'blocks', label: 'Blocks'},
								{value: 'lines', label: 'Lines'},
								{value: 'words', label: 'Words'},
								{value: 'chars', label: 'Chars'}
							].map(mode => {
								const isLocked = !unlockedModes.includes(mode.value)
								const isSelected = recordingMode === mode.value
								
								return (
									<label
										key={mode.value}
										style={{
											flex: 1,
											minWidth: 'fit-content',
											cursor: isLocked ? 'not-allowed' : 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											padding: '8px 12px',
											borderRadius: '6px',
											border: `2px solid ${isSelected ? '#667eea' : (isLocked ? '#ccc' : '#ddd')}`,
											background: isSelected ? '#667eea' : (isLocked ? '#f5f5f5' : 'white'),
											color: isSelected ? 'white' : (isLocked ? '#999' : '#666'),
											fontSize: '0.9rem',
											fontWeight: isSelected ? '600' : '400',
											opacity: isLocked ? 0.6 : 1,
											transition: 'all 0.2s ease'
										}}
										onMouseEnter={(e) => {
											if (!isSelected && !isLocked) {
												e.target.style.background = '#f0f4ff'
												e.target.style.borderColor = '#a0a8ff'
											}
										}}
										onMouseLeave={(e) => {
											if (!isSelected && !isLocked) {
												e.target.style.background = 'white'
												e.target.style.borderColor = '#ddd'
											}
										}}
									>
										<input
											type="radio"
											value={mode.value}
											checked={isSelected}
											onChange={(e) => {
												if (!isLocked) {
													const newMode = e.target.value
													setRecordingMode(newMode)
													// Find first non-space token for the new mode
													const newModeTokens = getTokensByModeType(newMode)
													const firstNonSpaceIndex = findFirstNonSpaceTokenIndex(newModeTokens)
													setActiveTokenIndex(firstNonSpaceIndex)
													console.log(`Manually switched to ${newMode} mode, starting at non-space token index ${firstNonSpaceIndex}`)
												}
											}}
											disabled={isLocked}
											style={{display: 'none'}}
										/>
										{isLocked ? '🔒' : ''} {mode.label}
									</label>
								)
							})}
						</div>
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
							background: isRecording ? '#fff3cd' : (audioRef.current?.paused !== false ? '#f8d7da' : '#d1ecf1'),
							border: `1px solid ${isRecording ? '#ffeaa7' : (audioRef.current?.paused !== false ? '#f5c6cb' : '#bee5eb')}`,
							borderRadius: '6px',
							color: isRecording ? '#856404' : (audioRef.current?.paused !== false ? '#721c24' : '#0c5460')
						}}>
							<div style={{fontWeight: 'bold', marginBottom: '0.25rem'}}>
								{isRecording ? '🔴 Recording...' : 
									(audioRef.current?.paused !== false ? '⏸️ Music Paused - Cannot Record' : '✅ Ready to Record')}
							</div>
							<div style={{fontSize: '0.8rem'}}>
								{isRecording 
									? `Release W key to finish recording token ${activeTokenIndex + 1}` 
									: (audioRef.current?.paused !== false 
										? 'Play the music first to start recording'
										: `Press and hold W key to record token ${activeTokenIndex + 1}`
									)
								}
							</div>
							{audioRef.current?.paused === false && (
								<div style={{fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8}}>
									Mode: {recordingMode} | Voice: {voices.find(v => v.id === currentVoice)?.name || `Voice ${currentVoice}`}
								</div>
							)}
						</div>
					</div>
					
					{/* Voice Management - Foldable */}
					<div style={{marginBottom: '2rem'}}>
						<button
							onClick={() => setVoicesExpanded(!voicesExpanded)}
							style={{
								width: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '12px',
								background: '#f8f9fa',
								border: '1px solid #ddd',
								borderRadius: '8px',
								cursor: 'pointer',
								fontSize: '1rem',
								color: '#333',
								fontWeight: '600',
								marginBottom: voicesExpanded ? '1rem' : '0'
							}}
						>
							<span>🎭 Voices ({voices.length})</span>
							<span style={{transform: voicesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}}>
								▼
							</span>
						</button>
						
						{voicesExpanded && (
						<>
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
						
						</>
						)}
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
					
					{/* Keyboard Controls Help */}
					<div style={{marginBottom: '2rem'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Controls</h4>
						
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
							<div>• Hold <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>W</kbd> to record token timing (while music plays)</div>
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
							}}>→</kbd> to navigate within {recordingMode}</div>
							<div>• Use <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>Ctrl+←</kbd> <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>Ctrl+→</kbd> to navigate parent level</div>
							<div>• Press <kbd style={{
								background: '#e9ecef',
								padding: '2px 6px',
								borderRadius: '3px',
								fontFamily: 'monospace',
								fontSize: '0.8rem'
							}}>Space</kbd> to play/pause audio</div>
							<div>• Click progress bar to seek (when paused and W not pressed)</div>
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
					
					{/* Playback Navigation */}
					<div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #ddd'}}>
						<h4 style={{marginBottom: '1rem', color: '#333'}}>Playback</h4>
						<button
							onClick={() => {
								const cleanedData = cleanupTimingData(karaokeData)
								navigate('/playback', { state: { lyricsJson: cleanedData, audioFile } })
							}}
							style={{
								width: '100%',
								padding: '16px',
								borderRadius: '8px',
								background: '#28a745',
								color: 'white',
								border: 'none',
								cursor: 'pointer',
								fontSize: '1.1rem',
								fontWeight: 'bold',
								marginBottom: '1rem'
							}}
							onMouseEnter={(e) => e.target.style.background = '#218838'}
							onMouseLeave={(e) => e.target.style.background = '#28a745'}
						>
							▶️ Preview Karaoke Playback
						</button>
						<div style={{
							padding: '0.75rem',
							background: '#f8f9fa',
							borderRadius: '6px',
							fontSize: '0.8rem',
							color: '#666',
							textAlign: 'center'
						}}>
							Preview your karaoke timing and highlighting as it will appear to users
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
							cursor: (!wKeyPressedRef.current && audioRef.current?.paused) ? 'pointer' : 'not-allowed',
							opacity: (!wKeyPressedRef.current && audioRef.current?.paused) ? 1 : 0.6
						}}
						onClick={handleSeek}
						title={(!wKeyPressedRef.current && audioRef.current?.paused) ? 'Click to seek' : 'Pause playback and release W key to seek'}
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
				
				{/* Sync Lock Toggle */}
				<div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
					<button
						onClick={() => setSyncLocked(!syncLocked)}
						style={{
							width: '40px',
							height: '40px',
							borderRadius: '6px',
							background: syncLocked ? '#667eea' : '#f8f9fa',
							color: syncLocked ? 'white' : '#666',
							border: `2px solid ${syncLocked ? '#667eea' : '#dee2e6'}`,
							cursor: 'pointer',
							fontSize: '1.2rem',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transition: 'all 0.2s ease'
						}}
						title={syncLocked ? 'Sync locked: Playhead and tokens move together' : 'Sync unlocked: Independent playhead and token navigation'}
					>
						{syncLocked ? '🔒' : '🔓'}
					</button>
					<div style={{
						fontSize: '0.8rem',
						color: '#666',
						textAlign: 'center',
						lineHeight: '1.2'
					}}>
						Sync<br/>Lock
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