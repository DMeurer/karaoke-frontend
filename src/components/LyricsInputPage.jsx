/**
 * LyricsInputPage Component
 * 
 * Second step in karaoke creation process - handles lyrics input.
 * Features:
 * - Two input methods: paste text or upload .txt file
 * - Drag & drop .txt file upload
 * - Live preview of entered lyrics
 * - Block separation by double line breaks
 * - Creates JSON structure for timing synchronization
 * - Navigation to timing sync page
 */

import React, {useState, useRef} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'

function LyricsInputPage() {
	const location = useLocation()
	const navigate = useNavigate()
	const audioFile = location.state?.audioFile
	
	// Lyrics input state management
	const [lyrics, setLyrics] = useState('')
	const [dragActive, setDragActive] = useState(false)
	const [uploadMethod, setUploadMethod] = useState('paste') // 'paste' or 'file'
	const fileInputRef = useRef(null)
	
	// Handle textarea input changes
	const handleLyricsChange = (event) => {
		setLyrics(event.target.value)
	}
	
	// Handle file input selection
	const handleFileSelect = (event) => {
		const file = event.target.files[0]
		processFile(file)
	}
	
	/**
	 * Process uploaded text file
	 * @param {File} file - The uploaded .txt file
	 */
	const processFile = (file) => {
		if (file && file.type === 'text/plain') {
			const reader = new FileReader()
			reader.onload = (e) => {
				setLyrics(e.target.result)
			}
			reader.readAsText(file)
		} else {
			alert('Please select a valid text file (.txt)')
		}
	}
	
	/**
	 * Handle drag and drop events for file upload
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
	
	// Clear all lyrics text
	const clearLyrics = () => {
		setLyrics('')
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}
	
	/**
	 * Create karaoke JSON structure from lyrics text
	 * Blocks are separated by empty lines (single or double line breaks)
	 * Lines within blocks are separated by single line breaks (\n)
	 * @param {string} lyricsText - The raw lyrics text
	 * @returns {Object} Karaoke data structure
	 */
	const createKaraokeJSON = (lyricsText) => {
		console.log('Creating karaoke JSON from lyrics text...')
		console.log('Raw lyrics text:', lyricsText)
		
		// Normalize line endings and split by empty lines (one or more)
		// This handles both \n\n and \n\n\n patterns as block separators
		const normalizedText = lyricsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
		const blockTexts = normalizedText.split(/\n\s*\n/).filter(block => block.trim())
		
		console.log(`Found ${blockTexts.length} blocks:`)
		for (let i = 0; i < blockTexts.length; i++) {
			console.log(`Block ${i}:`)
			console.log(`"${blockTexts[i]}"`)
		}
		
		const karaokeData = {
			version: "1",
			audioFile: audioFile ? audioFile.name : null,
			voices: [
				{
					id: 1,
					name: "",
					default_position: "C",
					color: "#87CEEB"
				}
			],
			blocks: blockTexts.map((blockText, blockIndex) => {
				const lines = blockText.split('\n').filter(line => line.trim())
				
				return {
					text: "",
					start: blockIndex * 5000, // Dummy timestamps - 5 seconds per block
					end: (blockIndex + 1) * 5000,
					voice: 1,
					position: "C",
					lines: lines.map((lineText, lineIndex) => ({
						text: lineText,
						start: blockIndex * 5000 + lineIndex * 1000, // Dummy line timestamps
						end: blockIndex * 5000 + (lineIndex + 1) * 1000,
						voice: 1,
						position: "",
						words: []
					}))
				}
			})
		}
		
		return karaokeData
	}
	
	// Navigate to timing synchronization page
	const handleNextStep = () => {
		if (!lyrics.trim()) {
			alert('Please add lyrics before proceeding to the next step.')
			return
		}
		
		const karaokeData = createKaraokeJSON(lyrics)
		navigate('/timing-sync', {
			state: {
				audioFile: audioFile,
				karaokeData: karaokeData
			}
		})
	}
	
	return (
		<div style={{
			minHeight: 'calc(100vh - 80px)', // Account for 80px header
			background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
			padding: '2rem 0'
		}}>
			<div className="container">
				<div style={{
					background: 'white',
					borderRadius: '12px',
					padding: '2rem',
					maxWidth: '900px',
					margin: '0 auto',
					boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
				}}>
					{/* Page header */}
					<div style={{marginBottom: '2rem', textAlign: 'center'}}>
						<h1 style={{color: '#333', marginBottom: '0.5rem'}}>
							Add Lyrics
						</h1>
						<p style={{color: '#666'}}>
							Upload a text file or paste your lyrics directly
						</p>
						{/* Show audio file confirmation */}
						{audioFile && (
							<div style={{
								marginTop: '1rem',
								padding: '0.75rem',
								background: '#e8f5e8',
								borderRadius: '6px',
								color: '#2d5a2d',
								fontSize: '0.9rem'
							}}>
								✅ Audio file: <strong>{audioFile.name}</strong>
							</div>
						)}
					</div>
					
					{/* Method selection buttons */}
					<div style={{
						display: 'flex',
						justifyContent: 'center',
						marginBottom: '2rem',
						gap: '1rem'
					}}>
						<button
							onClick={() => setUploadMethod('paste')}
							style={{
								padding: '10px 20px',
								borderRadius: '25px',
								border: `2px solid ${uploadMethod === 'paste' ? '#667eea' : '#ddd'}`,
								background: uploadMethod === 'paste' ? '#667eea' : 'white',
								color: uploadMethod === 'paste' ? 'white' : '#666',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
						>
							📝 Paste Lyrics
						</button>
						<button
							onClick={() => setUploadMethod('file')}
							style={{
								padding: '10px 20px',
								borderRadius: '25px',
								border: `2px solid ${uploadMethod === 'file' ? '#667eea' : '#ddd'}`,
								background: uploadMethod === 'file' ? '#667eea' : 'white',
								color: uploadMethod === 'file' ? 'white' : '#666',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
						>
							📄 Upload File
						</button>
					</div>
					
					{/* Conditional input method display */}
					{uploadMethod === 'paste' ? (
						/* Paste Method - Text area input */
						<div style={{marginBottom: '2rem'}}>
							<label style={{
								display: 'block',
								marginBottom: '1rem',
								color: '#333',
								fontWeight: '600'
							}}>
								Paste your lyrics here:
							</label>
							<textarea
								value={lyrics}
								onChange={handleLyricsChange}
								placeholder="Paste your lyrics here...&#10;&#10;Each line will be synced with the audio timing in the next step."
								style={{
									width: '100%',
									height: '300px',
									padding: '1rem',
									border: '2px solid #ddd',
									borderRadius: '8px',
									fontSize: '1rem',
									fontFamily: 'monospace',
									resize: 'vertical',
									lineHeight: '1.5'
								}}
							/>
							{/* Line count and clear button */}
							<div style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: '1rem',
								fontSize: '0.9rem',
								color: '#666'
							}}>
								<span>
									{lyrics.split('\n').filter(line => line.trim()).length} lines
								</span>
								{lyrics && (
									<button
										onClick={clearLyrics}
										style={{
											background: 'none',
											border: 'none',
											color: '#dc3545',
											cursor: 'pointer',
											fontSize: '0.9rem'
										}}
									>
										Clear all
									</button>
								)}
							</div>
						</div>
					) : (
						/* File Upload Method - Drag & drop area */
						<div
							style={{
								border: `3px dashed ${dragActive ? '#667eea' : '#ddd'}`,
								borderRadius: '12px',
								padding: '3rem',
								textAlign: 'center',
								marginBottom: '2rem',
								background: dragActive ? '#f0f4ff' : '#fafafa',
								transition: 'all 0.3s ease',
								cursor: 'pointer'
							}}
							onDragEnter={handleDrag}
							onDragLeave={handleDrag}
							onDragOver={handleDrag}
							onDrop={handleDrop}
							onClick={() => fileInputRef.current?.click()}
						>
							<div style={{fontSize: '3rem', marginBottom: '1rem'}}>
								{dragActive ? '📁' : '📄'}
							</div>
							<h3 style={{marginBottom: '1rem', color: '#333'}}>
								{dragActive ? 'Drop your text file here!' : 'Upload Lyrics File'}
							</h3>
							<p style={{color: '#666', marginBottom: '1.5rem'}}>
								{dragActive ? 'Release to upload your file' : 'Drag & drop a .txt file here, or click to browse'}
							</p>
							<input
								ref={fileInputRef}
								type="file"
								accept=".txt,text/plain"
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
						</div>
					)}
					
					{/* Lyrics preview area - shown when lyrics exist */}
					{lyrics && (
						<div style={{
							background: '#f8f9fa',
							borderRadius: '12px',
							padding: '1.5rem',
							marginBottom: '2rem',
							border: '1px solid #e9ecef'
						}}>
							<h4 style={{marginBottom: '1rem', color: '#333'}}>Lyrics Preview:</h4>
							<div style={{
								maxHeight: '200px',
								overflowY: 'auto',
								background: 'white',
								padding: '1rem',
								borderRadius: '6px',
								border: '1px solid #dee2e6',
								fontFamily: 'monospace',
								fontSize: '0.9rem',
								lineHeight: '1.4',
								whiteSpace: 'pre-wrap'
							}}>
								{lyrics}
							</div>
						</div>
					)}
					
					{/* Action buttons */}
					<div style={{
						display: 'flex',
						justifyContent: 'center',
						gap: '1rem'
					}}>
						<button
							onClick={() => navigate('/audio-upload')}
							style={{
								padding: '12px 24px',
								borderRadius: '25px',
								border: '2px solid #6c757d',
								background: 'white',
								color: '#6c757d',
								cursor: 'pointer',
								fontSize: '1rem',
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
						
						<button
							onClick={clearLyrics}
							disabled={!lyrics}
							style={{
								padding: '12px 24px',
								borderRadius: '25px',
								border: '2px solid #dc3545',
								background: 'white',
								color: '#dc3545',
								cursor: lyrics ? 'pointer' : 'not-allowed',
								fontSize: '1rem',
								opacity: lyrics ? 1 : 0.5
							}}
						>
							🗑️ Clear
						</button>
						
						<button
							onClick={handleNextStep}
							disabled={!lyrics.trim()}
							style={{
								padding: '12px 24px',
								borderRadius: '25px',
								background: lyrics.trim() ? '#28a745' : '#ccc',
								color: 'white',
								border: 'none',
								cursor: lyrics.trim() ? 'pointer' : 'not-allowed',
								fontSize: '1rem',
								minWidth: '150px'
							}}
						>
							➡️ Sync with Audio
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default LyricsInputPage