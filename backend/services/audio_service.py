"""
Audio Analysis Service
Server-side audio processing and behavioral signal extraction
"""

import numpy as np
from typing import Dict, Any, List, Tuple
import base64
import io


def analyze_audio_metrics(audio_data: bytes, sample_rate: int = 44100) -> Dict[str, Any]:
    """
    Analyze audio data to extract behavioral metrics
    
    Args:
        audio_data: Raw audio bytes
        sample_rate: Audio sample rate (default 44100 Hz)
        
    Returns:
        Dictionary with extracted metrics
    """
    try:
        # Convert bytes to numpy array
        audio_array = np.frombuffer(audio_data, dtype=np.float32)
        
        if len(audio_array) == 0:
            return _empty_metrics()
        
        # Calculate duration
        duration = len(audio_array) / sample_rate
        
        # Detect pauses
        pauses = detect_pauses(audio_array, sample_rate)
        
        # Calculate amplitude variance (confidence indicator)
        amplitude_variance = calculate_amplitude_variance(audio_array)
        
        # Estimate speaking time (excluding pauses)
        total_pause_duration = sum(p[1] - p[0] for p in pauses) / sample_rate
        speaking_duration = duration - total_pause_duration
        
        return {
            "total_duration": round(duration, 2),
            "speaking_duration": round(speaking_duration, 2),
            "pause_count": len(pauses),
            "avg_pause_duration": round(total_pause_duration / max(len(pauses), 1), 2),
            "total_pause_duration": round(total_pause_duration, 2),
            "amplitude_variance": round(amplitude_variance, 4),
            "pause_ratio": round(total_pause_duration / max(duration, 0.1), 2)
        }
        
    except Exception as e:
        print(f"Audio analysis error: {e}")
        return _empty_metrics()


def detect_pauses(
    audio_array: np.ndarray,
    sample_rate: int,
    threshold: float = 0.02,
    min_pause_duration: float = 0.3
) -> List[Tuple[int, int]]:
    """
    Detect pauses in audio based on amplitude threshold
    
    Args:
        audio_array: Audio signal as numpy array
        sample_rate: Sample rate in Hz
        threshold: Amplitude threshold for silence detection
        min_pause_duration: Minimum pause duration in seconds
        
    Returns:
        List of (start_sample, end_sample) tuples for detected pauses
    """
    # Calculate RMS energy in windows
    window_size = int(sample_rate * 0.05)  # 50ms windows
    
    if len(audio_array) < window_size:
        return []
    
    # Calculate energy per window
    num_windows = len(audio_array) // window_size
    energies = np.zeros(num_windows)
    
    for i in range(num_windows):
        start = i * window_size
        end = start + window_size
        window = audio_array[start:end]
        energies[i] = np.sqrt(np.mean(window ** 2))
    
    # Find silence regions
    is_silent = energies < threshold
    
    # Find pause boundaries
    pauses = []
    in_pause = False
    pause_start = 0
    
    for i, silent in enumerate(is_silent):
        if silent and not in_pause:
            in_pause = True
            pause_start = i * window_size
        elif not silent and in_pause:
            in_pause = False
            pause_end = i * window_size
            
            # Check minimum duration
            pause_duration = (pause_end - pause_start) / sample_rate
            if pause_duration >= min_pause_duration:
                pauses.append((pause_start, pause_end))
    
    # Handle pause at end
    if in_pause:
        pause_end = len(audio_array)
        pause_duration = (pause_end - pause_start) / sample_rate
        if pause_duration >= min_pause_duration:
            pauses.append((pause_start, pause_end))
    
    return pauses


def calculate_amplitude_variance(audio_array: np.ndarray) -> float:
    """
    Calculate variance in audio amplitude
    Higher variance suggests more animated/confident speech
    
    Args:
        audio_array: Audio signal as numpy array
        
    Returns:
        Amplitude variance value
    """
    if len(audio_array) == 0:
        return 0.0
    
    # Calculate amplitude envelope
    window_size = 1024
    hop_size = 512
    
    amplitudes = []
    for i in range(0, len(audio_array) - window_size, hop_size):
        window = audio_array[i:i + window_size]
        amplitude = np.max(np.abs(window))
        amplitudes.append(amplitude)
    
    if len(amplitudes) == 0:
        return 0.0
    
    return float(np.var(amplitudes))


def calculate_speaking_rate(
    transcript: str,
    speaking_duration: float
) -> float:
    """
    Calculate words per minute from transcript and duration
    
    Args:
        transcript: Transcribed text
        speaking_duration: Speaking time in seconds (excluding pauses)
        
    Returns:
        Words per minute
    """
    if speaking_duration <= 0:
        return 0.0
    
    words = transcript.split()
    word_count = len(words)
    
    # Convert to words per minute
    wpm = (word_count / speaking_duration) * 60
    
    return round(wpm, 1)


def analyze_response_completeness(transcript: str) -> Dict[str, Any]:
    """
    Analyze transcript for response quality indicators
    
    Args:
        transcript: Transcribed text
        
    Returns:
        Quality indicators
    """
    words = transcript.split()
    sentences = transcript.split('.')
    
    return {
        "word_count": len(words),
        "sentence_count": len([s for s in sentences if s.strip()]),
        "avg_sentence_length": len(words) / max(len(sentences), 1),
        "has_filler_words": _count_filler_words(transcript),
        "complexity_score": _estimate_complexity(words)
    }


def _count_filler_words(transcript: str) -> int:
    """Count filler words in transcript"""
    filler_words = ["um", "uh", "like", "you know", "basically", "actually", "so", "well"]
    transcript_lower = transcript.lower()
    count = sum(transcript_lower.count(filler) for filler in filler_words)
    return count


def _estimate_complexity(words: List[str]) -> float:
    """Estimate vocabulary complexity"""
    if not words:
        return 0.0
    
    # Simple heuristic: longer words tend to be more complex
    avg_word_length = sum(len(w) for w in words) / len(words)
    
    # Normalize to 0-1 scale (assuming avg word length 4-8 is typical)
    complexity = min((avg_word_length - 3) / 5, 1.0)
    return round(max(complexity, 0.0), 2)


def _empty_metrics() -> Dict[str, Any]:
    """Return empty metrics dictionary"""
    return {
        "total_duration": 0.0,
        "speaking_duration": 0.0,
        "pause_count": 0,
        "avg_pause_duration": 0.0,
        "total_pause_duration": 0.0,
        "amplitude_variance": 0.0,
        "pause_ratio": 0.0
    }
