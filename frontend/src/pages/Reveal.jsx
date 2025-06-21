import React, { useState, useEffect } from 'react';
import { Heart, ArrowLeft, Sparkles, Lock, Unlock } from 'lucide-react';

const Reveal = () => {
  const [matchId, setMatchId] = useState('12345'); // In real app, get from URL params
  const [match, setMatch] = useState(null);
  const [revealStage, setRevealStage] = useState('preparation'); // preparation, ritual, revealed, debrief
  const [emotionalConnection, setEmotionalConnection] = useState(72); // Mock data - 72% connected
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealData, setRevealData] = useState(null);

  // Mock match data
  useEffect(() => {
    setMatch({
      id: '12345',
      partner_name: 'Alex',
      conversation_days: 8,
      messages_exchanged: 247,
      emotional_connection_score: 72,
      compatibility_score: 89,
      reveal_status: 'ready',
      shared_interests: ['Philosophy', 'Hiking', 'Cooking'],
      personality_match: 'Deep Thinker & Adventure Seeker'
    });
  }, []);

  const handleBackToMatches = () => {
    // In real app: navigate('/match')
    alert('Back to matches');
  };

  const handleContinueChat = () => {
    // In real app: navigate(`/match/${matchId}`)
    alert('Continue chatting');
  };

  const handleRevealComplete = async (revealResult) => {
    setRevealData(revealResult);
    setRevealStage('debrief');
    
    // In real app: Update match status via API
    console.log('Reveal completed:', revealResult);
  };

  const handleDebriefComplete = () => {
    // In real app: navigate(`/match/${matchId}`)
    alert('Continue to chat with revealed photos');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Preparing your reveal experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={handleBackToMatches}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={handleBackToMatches}
            className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Matches</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 text-pink-400" />
            <h1 className="text-2xl font-bold text-white">ApexMatch Reveal</h1>
          </div>

          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Reveal Journey</h3>
                <div className="flex items-center space-x-2 text-pink-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium">{Math.round(emotionalConnection)}% Connected</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {['preparation', 'ritual', 'revealed', 'debrief'].map((stage, index) => (
                  <div key={stage} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      revealStage === stage 
                        ? 'bg-pink-500 border-pink-500 text-white' 
                        : index < ['preparation', 'ritual', 'revealed', 'debrief'].indexOf(revealStage)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-white/30 text-white/50'
                    }`}>
                      {index < ['preparation', 'ritual', 'revealed', 'debrief'].indexOf(revealStage) ? (
                        <span>✓</span>
                      ) : revealStage === stage ? (
                        <span>{index + 1}</span>
                      ) : (
                        index === 2 ? <Lock className="w-4 h-4" /> : <span>{index + 1}</span>
                      )}
                    </div>
                    {index < 3 && (
                      <div className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
                        index < ['preparation', 'ritual', 'revealed', 'debrief'].indexOf(revealStage)
                          ? 'bg-green-500'
                          : 'bg-white/20'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 grid grid-cols-4 gap-4 text-center">
                <div className="text-white/70 text-sm">
                  <div className="font-medium">Preparation</div>
                  <div className="text-xs mt-1">Building connection</div>
                </div>
                <div className="text-white/70 text-sm">
                  <div className="font-medium">Ritual</div>
                  <div className="text-xs mt-1">Mutual reveal</div>
                </div>
                <div className="text-white/70 text-sm">
                  <div className="font-medium">Revealed</div>
                  <div className="text-xs mt-1">First impressions</div>
                </div>
                <div className="text-white/70 text-sm">
                  <div className="font-medium">Debrief</div>
                  <div className="text-xs mt-1">Process together</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stage Content */}
          {revealStage === 'preparation' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="text-center">
                <div className="text-6xl mb-6">🔮</div>
                <h2 className="text-3xl font-bold text-white mb-4">Preparing for Reveal</h2>
                <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
                  Your emotional connection is building beautifully! Keep chatting and sharing to unlock the reveal ritual. 
                  ApexMatch believes in emotional bonds before physical attraction.
                </p>
                
                <div className="bg-white/5 rounded-2xl p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Connection Progress</h3>
                  <div className="w-full bg-white/20 rounded-full h-4 mb-4">
                    <div 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${emotionalConnection}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-300">
                    {emotionalConnection < 70 
                      ? `${70 - emotionalConnection}% more connection needed to unlock reveal`
                      : "Ready for reveal! 🎉"
                    }
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-2xl mb-2">💭</div>
                    <div className="text-white font-medium">Share Thoughts</div>
                    <div className="text-gray-400 text-sm">Open up about your feelings</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-2xl mb-2">🤝</div>
                    <div className="text-white font-medium">Show Vulnerability</div>
                    <div className="text-gray-400 text-sm">Be authentic and genuine</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-2xl mb-2">💝</div>
                    <div className="text-white font-medium">Build Trust</div>
                    <div className="text-gray-400 text-sm">Consistent communication</div>
                  </div>
                </div>

                <button
                  onClick={handleContinueChat}
                  className="mt-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  Continue Chatting
                </button>
              </div>
            </div>
          )}

          {revealStage === 'ritual' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="text-center">
                <div className="text-6xl mb-6">🔮✨</div>
                <h2 className="text-3xl font-bold text-white mb-4">The Reveal Ritual</h2>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  You've built a beautiful emotional connection with {match?.partner_name}. 
                  The universe has aligned your hearts. Are you both ready to see each other?
                </p>
                
                <div className="bg-white/5 rounded-2xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Your Journey Together</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl p-4">
                      <div className="text-3xl font-bold text-pink-400">{match?.conversation_days}</div>
                      <div className="text-white text-sm">Days Connected</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl p-4">
                      <div className="text-3xl font-bold text-blue-400">{match?.messages_exchanged}</div>
                      <div className="text-white text-sm">Messages Shared</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-4">
                      <div className="text-3xl font-bold text-green-400">{match?.compatibility_score}%</div>
                      <div className="text-white text-sm">Compatible</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 rounded-2xl p-6 mb-8">
                  <h4 className="text-lg font-semibold text-white mb-3">What Makes You Special Together</h4>
                  <p className="text-gray-300 mb-4">🎭 {match?.personality_match}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {match?.shared_interests?.map((interest, index) => (
                      <span key={index} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => handleRevealComplete({ mutualReveal: true, timestamp: new Date() })}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                  >
                    ✨ Yes, Let's Reveal Together ✨
                  </button>
                  
                  <button
                    onClick={handleContinueChat}
                    className="w-full bg-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
                  >
                    Not Yet - Continue Building Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {revealStage === 'revealed' && !revealData && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
              <div className="text-6xl mb-6">✨</div>
              <h2 className="text-3xl font-bold text-white mb-4">Reveal Complete!</h2>
              <p className="text-gray-300 text-lg mb-6">
                You've both revealed yourselves! How beautiful is that?
              </p>
              <button
                onClick={() => setRevealStage('debrief')}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
              >
                Process This Moment
              </button>
            </div>
          )}

          {revealStage === 'debrief' && (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              <div className="text-center">
                <div className="text-6xl mb-6">💝</div>
                <h2 className="text-3xl font-bold text-white mb-4">Emotional Debrief</h2>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  You've both revealed yourselves - what a beautiful moment! Let's take a moment to process this experience together.
                </p>
                
                <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 rounded-2xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4">How Are You Feeling?</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {['Excited 😊', 'Nervous 😰', 'Happy 😄', 'Curious 🤔'].map((feeling) => (
                        <button 
                          key={feeling}
                          className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all duration-300"
                        >
                          {feeling}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {['Grateful 🙏', 'Surprised 😲', 'Content 😌', 'Overwhelmed 😵'].map((feeling) => (
                        <button 
                          key={feeling}
                          className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all duration-300"
                        >
                          {feeling}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 mb-8">
                  <h4 className="text-lg font-semibold text-white mb-4">AI Reflection</h4>
                  <p className="text-gray-300 italic leading-relaxed">
                    "The emotional bond you've built is remarkable. Your {emotionalConnection}% connection shows genuine 
                    compatibility beyond physical attraction. Remember, this reveal is just the beginning of seeing each 
                    other fully - emotional intimacy often deepens attraction. Trust the journey you've created together."
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-600/10 rounded-2xl p-6 mb-8">
                  <h4 className="text-lg font-semibold text-white mb-4">Your Connection Insights</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    <div>
                      <div className="text-pink-400 font-medium mb-2">🧠 Emotional Intelligence</div>
                      <div className="text-gray-300 text-sm">Both of you showed high emotional awareness during conversations</div>
                    </div>
                    <div>
                      <div className="text-blue-400 font-medium mb-2">💭 Communication Style</div>
                      <div className="text-gray-300 text-sm">Your conversation rhythms are beautifully synchronized</div>
                    </div>
                    <div>
                      <div className="text-green-400 font-medium mb-2">🤝 Trust Building</div>
                      <div className="text-gray-300 text-sm">You've created a safe space for vulnerability</div>
                    </div>
                    <div>
                      <div className="text-purple-400 font-medium mb-2">✨ Shared Values</div>
                      <div className="text-gray-300 text-sm">Strong alignment in core life perspectives</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleDebriefComplete}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                  >
                    Continue Our Journey Together 💕
                  </button>
                  
                  <p className="text-gray-400 text-sm">
                    Your conversation will now include photos, but remember - you've already seen what matters most: each other's hearts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reveal;