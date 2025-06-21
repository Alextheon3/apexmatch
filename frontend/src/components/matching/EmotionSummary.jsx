import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Brain, MessageCircle, ArrowRight, Star, TrendingUp, Users } from 'lucide-react';

const EmotionSummary = ({ 
  match, 
  revealData, 
  onComplete,
  userEmotions = null 
}) => {
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [personalReflection, setPersonalReflection] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: emotions, 2: reflection, 3: insights

  useEffect(() => {
    // Show insights after a brief delay
    const timer = setTimeout(() => setShowInsights(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const emotionOptions = [
    { emoji: '😊', label: 'Happy', category: 'positive' },
    { emoji: '😍', label: 'Attracted', category: 'positive' },
    { emoji: '🥰', label: 'Smitten', category: 'positive' },
    { emoji: '😌', label: 'Content', category: 'positive' },
    { emoji: '🤗', label: 'Warm', category: 'positive' },
    { emoji: '😰', label: 'Nervous', category: 'complex' },
    { emoji: '😲', label: 'Surprised', category: 'complex' },
    { emoji: '🤔', label: 'Curious', category: 'complex' },
    { emoji: '😅', label: 'Relieved', category: 'complex' },
    { emoji: '🥺', label: 'Vulnerable', category: 'complex' },
    { emoji: '😔', label: 'Disappointed', category: 'challenging' },
    { emoji: '😕', label: 'Uncertain', category: 'challenging' },
    { emoji: '😬', label: 'Awkward', category: 'challenging' }
  ];

  const handleEmotionToggle = (emotion) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const getAIInsights = () => {
    const connectionScore = match?.emotional_connection_score || 72;
    const compatibilityScore = match?.compatibility_score || 89;
    
    return {
      connectionAnalysis: `Your ${connectionScore}% emotional connection is remarkable. Most successful ApexMatch couples reveal at 65-75% connection, so your timing was perfect.`,
      compatibilityInsight: `With ${compatibilityScore}% behavioral compatibility, you're in the top 15% of matches. Your communication styles and emotional rhythms are beautifully synchronized.`,
      nextSteps: connectionScore >= 75 
        ? "Your strong foundation suggests excellent potential for a lasting relationship. Focus on maintaining this emotional intimacy as you explore physical attraction."
        : "Continue building on this solid emotional foundation. The reveal often deepens connection as you integrate physical and emotional attraction.",
      prediction: compatibilityScore >= 85 
        ? "Based on your compatibility patterns, couples like you have an 87% chance of forming lasting relationships."
        : "Your compatibility shows strong potential. Take time to explore how physical and emotional attraction complement each other."
    };
  };

  const insights = getAIInsights();

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-6 border-b border-white/10">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-xl">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Emotional Debrief</h2>
            <p className="text-gray-300">Processing your reveal experience together</p>
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                currentStep >= step 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-white/20 text-white/60'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-1 mx-2 rounded transition-all duration-300 ${
                  currentStep > step ? 'bg-pink-500' : 'bg-white/20'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Emotion Selection */}
      {currentStep === 1 && (
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">How are you feeling right now?</h3>
            <p className="text-gray-300">Select all emotions that resonate with you</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {emotionOptions.map((emotion, index) => (
              <button
                key={index}
                onClick={() => handleEmotionToggle(emotion)}
                className={`p-3 rounded-xl border transition-all duration-300 text-center ${
                  selectedEmotions.includes(emotion)
                    ? 'bg-pink-500/20 border-pink-500/50 scale-105'
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-1">{emotion.emoji}</div>
                <div className="text-white text-xs font-medium">{emotion.label}</div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleNextStep}
              disabled={selectedEmotions.length === 0}
              className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedEmotions.length > 0
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700'
                  : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue to Reflection
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Personal Reflection */}
      {currentStep === 2 && (
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Share your thoughts</h3>
            <p className="text-gray-300">What's going through your mind right now?</p>
          </div>

          {/* Selected Emotions Summary */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="text-white text-sm font-medium mb-2">Your emotional state:</div>
            <div className="flex flex-wrap gap-2">
              {selectedEmotions.map((emotion, index) => (
                <span key={index} className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                  <span>{emotion.emoji}</span>
                  <span>{emotion.label}</span>
                </span>
              ))}
            </div>
          </div>

          <textarea
            value={personalReflection}
            onChange={(e) => setPersonalReflection(e.target.value)}
            placeholder="How does it feel to see each other? What surprised you? What are you hoping for next?"
            className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl p-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
          />

          <div className="text-center mt-6">
            <button
              onClick={handleNextStep}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
            >
              See AI Insights
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Insights */}
      {currentStep === 3 && (
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">AI Relationship Insights</h3>
            <p className="text-gray-300">Based on your journey together</p>
          </div>

          {/* Connection Analysis */}
          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Connection Analysis</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{insights.connectionAnalysis}</p>
            </div>

            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Compatibility Insight</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{insights.compatibilityInsight}</p>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Success Prediction</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{insights.prediction}</p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-4 border border-pink-500/20 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <ArrowRight className="w-5 h-5 text-pink-400" />
              <span className="text-white font-medium">Recommended Next Steps</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">{insights.nextSteps}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <div className="text-white text-sm font-medium">Keep Talking</div>
                <div className="text-gray-400 text-xs">Emotional intimacy deepens attraction</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <Heart className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                <div className="text-white text-sm font-medium">Stay Vulnerable</div>
                <div className="text-gray-400 text-xs">Continue sharing authentically</div>
              </div>
            </div>
          </div>

          {/* Personal Reflection Display */}
          {personalReflection && (
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="text-white font-medium mb-2">Your reflection:</div>
              <p className="text-gray-300 text-sm leading-relaxed italic">"{personalReflection}"</p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 mx-auto"
            >
              <span>Continue Your Journey</span>
              <Heart className="w-5 h-5" />
            </button>
            
            <p className="text-gray-400 text-sm mt-3">
              Your conversation will now include photos, but remember - you've already seen what matters most: each other's hearts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionSummary;