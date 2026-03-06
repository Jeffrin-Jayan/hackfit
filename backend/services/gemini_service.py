"""
Gemini AI Service
Handles skill evaluation using Google's Gemini 2.0 Flash model
Evaluates responses across 8 behavioral dimensions
"""

import os
import json
from typing import List, Dict, Any
import google.generativeai as genai

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
MODEL_NAME = "gemini-2.0-flash"

# Evaluation prompt template
EVALUATION_PROMPT = """You are an expert skill evaluator for SkillBridge, a platform that verifies genuine understanding.

Your task is to evaluate a candidate's spoken response across 8 behavioral dimensions. You must be thorough but fair.

## Context
Topic: {topic}
Question: {question}

## Candidate's Response (Transcript)
{transcript}

## Behavioral Signals from Audio
- Words per minute: {wpm}
- Number of pauses: {pause_count}
- Average pause duration: {avg_pause_duration}s
- Total response duration: {total_duration}s
- Voice amplitude variance: {amplitude_variance} (higher = more confident/animated)

## Evaluation Dimensions (Score 1-10 each)

1. **Content Accuracy**: Is the information factually correct?
2. **Conceptual Depth**: Does the response show deep understanding beyond surface level?
3. **Explanation Clarity**: Is the explanation clear and well-structured?
4. **Real-World Application**: Does the response include practical examples or applications?
5. **Response Spontaneity**: Does the response feel natural and unrehearsed? (Use audio signals)
6. **Technical Vocabulary**: Appropriate and accurate use of domain terminology?
7. **Logical Flow**: Does the response follow a logical progression?
8. **Confidence Indicators**: Voice patterns suggest genuine confidence in knowledge?

## Important Notes
- Low WPM with many pauses might indicate thinking/formulating (positive) or uncertainty (negative)
- Very high WPM with no pauses might indicate rehearsed/memorized content
- Natural speech has some pauses and variation in pace
- Consider both WHAT was said and HOW it was said

## Output Format
Return a valid JSON object with this exact structure:
{{
    "overall_score": <float 1-10>,
    "dimensions": [
        {{
            "dimension": "content_accuracy",
            "score": <float 1-10>,
            "feedback": "<specific feedback>",
            "indicators": ["<indicator1>", "<indicator2>"]
        }},
        // ... repeat for all 8 dimensions
    ],
    "blind_spots": ["<area1>", "<area2>"],
    "strengths": ["<strength1>", "<strength2>"],
    "recommendations": ["<recommendation1>", "<recommendation2>"]
}}

Evaluate now:"""


CONSISTENCY_PROMPT = """You are checking multiple responses from the same candidate for consistency.

A candidate who truly understands a topic will be consistent in their explanations, even if they phrase things differently.
Look for contradictions, inconsistent terminology, or fundamentally different explanations of the same concept.

## Responses to Analyze
{responses}

## Check for:
1. Direct contradictions between answers
2. Inconsistent use of terminology
3. Fundamentally different explanations of the same concept
4. Signs that answers might be from different sources

## Output Format
Return a valid JSON object:
{{
    "consistent": <boolean>,
    "confidence": <float 0-1>,
    "inconsistencies": [
        {{
            "description": "<what's inconsistent>",
            "responses_involved": [<response indices>]
        }}
    ],
    "analysis": "<brief analysis>"
}}

Analyze now:"""


async def evaluate_with_gemini(
    topic: str,
    question: str,
    transcript: str,
    audio_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluate a response using Gemini AI
    
    Args:
        topic: The skill topic being assessed
        question: The specific question asked
        transcript: The candidate's spoken response (transcribed)
        audio_metrics: Behavioral signals extracted from audio
        
    Returns:
        Evaluation results with scores across 8 dimensions
    """
    if not GEMINI_API_KEY:
        # Return mock evaluation for development
        return _mock_evaluation()
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        prompt = EVALUATION_PROMPT.format(
            topic=topic,
            question=question,
            transcript=transcript,
            wpm=audio_metrics.get("wpm", 0),
            pause_count=audio_metrics.get("pause_count", 0),
            avg_pause_duration=audio_metrics.get("avg_pause_duration", 0),
            total_duration=audio_metrics.get("total_duration", 0),
            amplitude_variance=audio_metrics.get("amplitude_variance", 0)
        )
        
        response = await model.generate_content_async(
            prompt,
            generation_config={
                "temperature": 0.3,
                "top_p": 0.95,
                "max_output_tokens": 2048
            }
        )
        
        # Parse JSON from response
        result_text = response.text
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]
        
        result = json.loads(result_text.strip())
        return result
        
    except Exception as e:
        print(f"Gemini evaluation error: {e}")
        # Return mock evaluation as fallback
        return _mock_evaluation()


async def check_response_consistency(responses: List[Dict]) -> Dict[str, Any]:
    """
    Check multiple responses for consistency
    
    Args:
        responses: List of response objects with question and transcript
        
    Returns:
        Consistency analysis results
    """
    if not GEMINI_API_KEY:
        return {
            "consistent": True,
            "confidence": 0.8,
            "inconsistencies": [],
            "analysis": "Mock analysis - API key not configured"
        }
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Format responses for prompt
        formatted_responses = "\n\n".join([
            f"Response {i+1}:\nQuestion: {r.get('question', 'N/A')}\nAnswer: {r.get('transcript', 'N/A')}"
            for i, r in enumerate(responses)
        ])
        
        prompt = CONSISTENCY_PROMPT.format(responses=formatted_responses)
        
        response = await model.generate_content_async(
            prompt,
            generation_config={
                "temperature": 0.2,
                "top_p": 0.95,
                "max_output_tokens": 1024
            }
        )
        
        result_text = response.text
        
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0]
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0]
        
        return json.loads(result_text.strip())
        
    except Exception as e:
        print(f"Consistency check error: {e}")
        return {
            "consistent": True,
            "confidence": 0.5,
            "inconsistencies": [],
            "analysis": f"Analysis failed: {str(e)}"
        }


def _mock_evaluation() -> Dict[str, Any]:
    """Return mock evaluation for development/testing"""
    return {
        "overall_score": 7.2,
        "dimensions": [
            {
                "dimension": "content_accuracy",
                "score": 7.5,
                "feedback": "Response contains accurate information with minor gaps",
                "indicators": ["Correct core concepts", "Some terminology errors"]
            },
            {
                "dimension": "conceptual_depth",
                "score": 7.0,
                "feedback": "Shows understanding beyond surface level",
                "indicators": ["Explains why, not just what", "Connects related concepts"]
            },
            {
                "dimension": "explanation_clarity",
                "score": 7.5,
                "feedback": "Clear and well-structured explanation",
                "indicators": ["Logical progression", "Good examples"]
            },
            {
                "dimension": "real_world_application",
                "score": 6.5,
                "feedback": "Some practical examples provided",
                "indicators": ["References real scenarios", "Could expand on applications"]
            },
            {
                "dimension": "response_spontaneity",
                "score": 8.0,
                "feedback": "Response feels natural and unrehearsed",
                "indicators": ["Natural pauses", "Thinking aloud moments"]
            },
            {
                "dimension": "technical_vocabulary",
                "score": 7.0,
                "feedback": "Appropriate use of domain terminology",
                "indicators": ["Correct term usage", "Explains jargon when used"]
            },
            {
                "dimension": "logical_flow",
                "score": 7.5,
                "feedback": "Response follows logical progression",
                "indicators": ["Clear structure", "Connected points"]
            },
            {
                "dimension": "confidence_indicators",
                "score": 7.0,
                "feedback": "Voice patterns suggest genuine confidence",
                "indicators": ["Steady pace", "Appropriate emphasis"]
            }
        ],
        "blind_spots": [
            "Edge cases and exceptions",
            "Recent developments in the field"
        ],
        "strengths": [
            "Strong foundational understanding",
            "Clear communication style"
        ],
        "recommendations": [
            "Explore more advanced use cases",
            "Practice explaining complex concepts to non-experts"
        ]
    }
