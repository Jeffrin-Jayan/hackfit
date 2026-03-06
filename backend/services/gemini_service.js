// Gemini AI service placeholder for Node
// This module currently returns mock data. Integrate with actual API as needed.

export async function evaluateWithGemini({ topic, question, transcript, audio_metrics }) {
  if (!process.env.GEMINI_API_KEY) {
    return _mockEvaluation();
  }
  // TODO: integrate with real Gemini SDK or HTTP call
  return _mockEvaluation();
}

export async function checkResponseConsistency(responses) {
  if (!process.env.GEMINI_API_KEY) {
    return { consistent: true, confidence: 0.8, inconsistencies: [], analysis: 'Mock analysis - API key not configured' };
  }
  // TODO: call Gemini API
  return { consistent: true, confidence: 0.8, inconsistencies: [], analysis: 'Real service not yet implemented' };
}

function _mockEvaluation() {
  return {
    overall_score: 7.2,
    dimensions: [
      { dimension: 'content_accuracy', score: 7.5, feedback: 'Response contains accurate information with minor gaps', indicators: ['Correct core concepts', 'Some terminology errors'] },
      { dimension: 'conceptual_depth', score: 7.0, feedback: 'Shows understanding beyond surface level', indicators: ['Explains why, not just what', 'Connects related concepts'] },
      { dimension: 'explanation_clarity', score: 7.5, feedback: 'Clear and well-structured explanation', indicators: ['Logical progression', 'Good examples'] },
      { dimension: 'real_world_application', score: 6.5, feedback: 'Some practical examples provided', indicators: ['References real scenarios', 'Could expand on applications'] },
      { dimension: 'response_spontaneity', score: 8.0, feedback: 'Response feels natural and unrehearsed', indicators: ['Natural pauses', 'Thinking aloud moments'] },
      { dimension: 'technical_vocabulary', score: 7.0, feedback: 'Appropriate use of domain terminology', indicators: ['Correct term usage', 'Explains jargon when used'] },
      { dimension: 'logical_flow', score: 7.5, feedback: 'Response follows logical progression', indicators: ['Clear structure', 'Connected points'] },
      { dimension: 'confidence_indicators', score: 7.0, feedback: 'Voice patterns suggest genuine confidence', indicators: ['Steady pace', 'Appropriate emphasis'] },
    ],
    blind_spots: ['Edge cases and exceptions', 'Recent developments in the field'],
    strengths: ['Strong foundational understanding', 'Clear communication style'],
    recommendations: ['Explore more advanced use cases', 'Practice explaining complex concepts to non-experts'],
  };
}
