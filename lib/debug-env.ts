// Temporary debug file to check environment variables
export function debugEnvVars() {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  console.log('=== ENVIRONMENT VARIABLE DEBUG ===');
  console.log('GOOGLE_GENERATIVE_AI_API_KEY exists:', !!geminiKey);
  console.log('GOOGLE_GENERATIVE_AI_API_KEY length:', geminiKey?.length || 0);
  console.log('GOOGLE_GENERATIVE_AI_API_KEY starts with:', geminiKey?.substring(0, 10) || 'UNDEFINED');
  console.log('GEMINI_MODEL_NAME:', process.env.GEMINI_MODEL_NAME || 'gemini-1.5-pro (default)');
  console.log('================================');
  
  return {
    hasKey: !!geminiKey,
    keyLength: geminiKey?.length || 0,
    keyPreview: geminiKey?.substring(0, 10) || 'MISSING',
  };
}

