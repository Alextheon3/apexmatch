import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Eye, Users, Clock, Star, ArrowRight, CheckCircle } from 'lucide-react';

const RevealStage = ({ 
  match, 
  onRevealComplete, 
  emotionalConnection = 0 
}) => {
  const [currentStage, setCurrentStage] = useState(1); // 1-5 stages
  const [isAnimating, setIsAnimating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userReadiness, setUserReadiness] = useState(false);
  const [partnerReadiness, setPartnerReadiness] = useState(false);

  const stages = [
    {
      id: 1,
      title: "Preparation",
      subtitle: "Ready your heart for this moment",
      icon: Heart,
      color: "from-pink-500 to-rose-500"
    },
    {
      id: 2,
      title: "Intention Setting",
      subtitle: "Why does this feel right?",
      icon: Sparkles,
      color: "from-purple-500 to-indigo-500"
    },
    {
      id: 3,
      title: "Mutual Readiness",
      subtitle: "Both hearts aligned",
      icon: Users,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 4,
      title: "The Reveal",
      subtitle: "See each other truly",
      icon: Eye,
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 5,
      title: "Integration",
      subtitle: "Processing this beautiful moment",
      icon: CheckCircle,
      color: "from-yellow-500 to-orange-500"
    }
  ];

  useEffect(() => {
    // Simulate partner readiness (in real app, this would come from WebSocket)
    if (currentStage === 3 && userReadiness) {
      const timer = setTimeout(() => {
        setPartnerReadiness(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStage, userReadiness]);

  useEffect(() => {
    // Auto-advance when both are ready
    if (currentStage === 3 && userReadiness && partnerReadiness) {
      const timer = setTimeout(() => {
        handleNextStage();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userReadiness, partnerReadiness, currentStage]);

  useEffect(() => {
    // Countdown for reveal stage
    if (currentStage === 4 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (currentStage === 4 && countdown === 0) {
      // Reveal complete
      setTimeout(() => {
        handleNextStage();
      }, 2000);
    }
  }, [countdown, currentStage]);

  const handleNextStage = () => {
    if (currentStage < 5) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage(prev => prev + 1);
        setIsAnimating(false);
        
        if (currentStage + 1 === 4) {
          setCountdown(3); // 3-second countdown for reveal
        }
      }, 300);
    } else {
      // Complete the reveal ritual
      onRevealComplete({
        timestamp: new Date(),
        emotional_connection: emotionalConnection,
        ritual_completed: true,
        stages_completed: 5
      });
    }
  };

  const handleUserReady = () => {
    setUserReadiness(true);
  };

  const currentStageData = stages[currentStage - 1];
  const StageIcon = currentStageData.icon;

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* Progress Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Reveal Ritual</h2>
          <div className="text-white/70 text-sm">Stage {currentStage} of 5</div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center space-x-2 mb-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 ${
                currentStage >= stage.id 
                  ? `bg-gradient-to-r ${stage.color} text-white` 
                  : 'bg-white/20 text-white/60'
              }`}>
                {currentStage > stage.id ? '✓' : stage.id}
              </div>
              {index < stages.length - 1 && (
                <div className={`h-1 flex-1 mx-2 rounded transition-all duration-500 ${
                  currentStage > stage.id ? `bg-gradient-to-r ${stage.color}` : 'bg-white/20'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">{currentStageData.title}</h3>
          <p className="text-gray-300 text-sm">{currentStageData.subtitle}</p>
        </div>
      </div>

      {/* Stage Content */}
      <div className={`bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden transform transition-all duration-500 ${
        isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
      }`}>
        
        {/* Stage 1: Preparation */}
        {currentStage === 1 && (
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${currentStageData.color} flex items-center justify-center mx-auto mb-6 animate-pulse`}>
              <Heart className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">Take a Moment</h3>
            <p className="text-gray-300 leading-relaxed mb-8 max-w-md mx-auto">
              You're about to see {match?.anonymous_name} for the first time. This is a sacred moment in your connection. 
              Take a deep breath and open your heart to this experience.
            </p>

            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-6 mb-8 border border-pink-500/20">
              <h4 className="text-white font-medium mb-3">Your Journey So Far</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{match?.conversation_days || 8}</div>
                  <div className="text-gray-300 text-sm">Days Connected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{match?.messages_exchanged || 247}</div>
                  <div className="text-gray-300 text-sm">Messages Shared</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{emotionalConnection}%</div>
                  <div className="text-gray-300 text-sm">Connected</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNextStage}
              className={`bg-gradient-to-r ${currentStageData.color} text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
            >
              I'm Ready to Continue
            </button>
          </div>
        )}

        {/* Stage 2: Intention Setting */}
        {currentStage === 2 && (
          <div className="p-8">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${currentStageData.color} flex items-center justify-center mx-auto mb-6 animate-pulse`}>
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Set Your Intention</h3>
            <p className="text-gray-300 leading-relaxed mb-6 text-center max-w-md mx-auto">
              Before you see each other, take a moment to reflect on why this feels right. What drew you to this person?
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Their emotional depth and vulnerability",
                "The way our conversations flow naturally",
                "Their humor and how they make me laugh",
                "The safety I feel when sharing with them",
                "Our shared values and perspectives"
              ].map((intention, index) => (
                <div key={index} className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 cursor-pointer transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white">{intention}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleNextStage}
                className={`bg-gradient-to-r ${currentStageData.color} text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                Continue to Mutual Readiness
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Mutual Readiness */}
        {currentStage === 3 && (
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${currentStageData.color} flex items-center justify-center mx-auto mb-6`}>
              <Users className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">Synchronizing Hearts</h3>
            <p className="text-gray-300 leading-relaxed mb-8 max-w-md mx-auto">
              Both of you need to be ready for this moment. When you're both prepared, the reveal will begin automatically.
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-white font-medium mb-2">You</div>
                  <div className={`text-sm ${userReadiness ? 'text-green-400' : 'text-gray-400'}`}>
                    {userReadiness ? '✓ Ready' : 'Waiting...'}
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <div className="text-white font-medium mb-2">{match?.anonymous_name}</div>
                  <div className={`text-sm ${partnerReadiness ? 'text-green-400' : 'text-gray-400'}`}>
                    {partnerReadiness ? '✓ Ready' : 'Waiting...'}
                  </div>
                </div>
              </div>
            </div>

            {!userReadiness ? (
              <button
                onClick={handleUserReady}
                className={`bg-gradient-to-r ${currentStageData.color} text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                I'm Ready to Reveal
              </button>
            ) : !partnerReadiness ? (
              <div className="text-gray-300">
                <div className="animate-pulse mb-2">Waiting for {match?.anonymous_name}...</div>
                <div className="text-sm text-gray-400">They'll be notified you're ready</div>
              </div>
            ) : (
              <div className="text-green-400">
                <div className="text-lg font-semibold mb-2">Both hearts ready! ✨</div>
                <div className="text-sm">Beginning reveal...</div>
              </div>
            )}
          </div>
        )}

        {/* Stage 4: The Reveal */}
        {currentStage === 4 && (
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${currentStageData.color} flex items-center justify-center mx-auto mb-6`}>
              <Eye className="w-10 h-10 text-white" />
            </div>
            
            {countdown > 0 ? (
              <>
                <h3 className="text-2xl font-bold text-white mb-4">Get Ready...</h3>
                <div className="text-8xl font-bold text-white mb-6 animate-pulse">
                  {countdown}
                </div>
                <p className="text-gray-300">Take a deep breath...</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-6">✨ Revealed! ✨</h3>
                
                {/* Mock reveal photos */}
                <div className="grid grid-cols-2 gap-6 mb-8 max-w-md mx-auto">
                  <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-4xl">👤</span>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-4xl">👤</span>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-6">
                  Beautiful! Take a moment to see each other with fresh eyes, knowing the deep connection you've already built.
                </p>
                
                <div className="text-green-400 animate-pulse">
                  Processing this moment together...
                </div>
              </>
            )}
          </div>
        )}

        {/* Stage 5: Integration */}
        {currentStage === 5 && (
          <div className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${currentStageData.color} flex items-center justify-center mx-auto mb-6 animate-bounce`}>
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">Ritual Complete!</h3>
            <p className="text-gray-300 leading-relaxed mb-8 max-w-md mx-auto">
              You've both been revealed! This is a sacred moment - you've seen each other's hearts first, and now your eyes. 
              Let's take a moment to process this beautiful experience together.
            </p>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/20 mb-8">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Heart className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Congratulations!</span>
              </div>
              <p className="text-gray-300 text-sm">
                You've successfully completed the ApexMatch reveal ritual. Your emotional connection guided this moment perfectly.
              </p>
            </div>

            <button
              onClick={handleNextStage}
              className={`bg-gradient-to-r ${currentStageData.color} text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 mx-auto`}
            >
              <span>Continue to Emotional Debrief</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevealStage;