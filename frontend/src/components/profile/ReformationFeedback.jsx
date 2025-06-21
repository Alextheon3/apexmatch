import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, CheckCircle, AlertTriangle, Heart, Star, Award, Calendar, ArrowRight } from 'lucide-react';

const ReformationFeedback = ({ 
  user,
  currentChallenges = [],
  completedChallenges = [],
  onAcceptChallenge,
  onViewProgress 
}) => {
  const [selectedTab, setSelectedTab] = useState('current');
  const [expandedChallenge, setExpandedChallenge] = useState(null);

  const trustScore = user?.trust_score || 65;
  const reformationLevel = user?.reformation_level || 1; // 1-5
  const weeklyProgress = user?.weekly_progress || 0;

  const reformationLevels = {
    1: { name: 'Foundation Building', color: 'from-red-500 to-pink-500', target: 50 },
    2: { name: 'Habit Formation', color: 'from-orange-500 to-yellow-500', target: 60 },
    3: { name: 'Consistency Training', color: 'from-yellow-500 to-green-500', target: 70 },
    4: { name: 'Trust Rebuilding', color: 'from-green-500 to-blue-500', target: 80 },
    5: { name: 'Mastery & Mentoring', color: 'from-blue-500 to-purple-500', target: 90 }
  };

  const currentLevel = reformationLevels[reformationLevel];

  const availableChallenges = [
    {
      id: 1,
      title: 'Consistent Communication',
      description: 'Respond to all messages within 24 hours for one week',
      difficulty: 'Beginner',
      points: 5,
      duration: '7 days',
      category: 'reliability',
      requirements: ['Check app daily', 'Respond thoughtfully', 'No ghosting'],
      tips: [
        'Set daily reminders to check messages',
        'Even a quick "I\'ll respond properly later" helps',
        'Quality over speed - thoughtful responses matter more'
      ]
    },
    {
      id: 2,
      title: 'Vulnerable Sharing',
      description: 'Share something personal in 3 different conversations',
      difficulty: 'Intermediate',
      points: 8,
      duration: '10 days',
      category: 'emotional_depth',
      requirements: ['Share personal story', 'Express genuine emotion', 'Be authentic'],
      tips: [
        'Start with smaller vulnerabilities and build up',
        'Share experiences that shaped you',
        'Explain how you felt, not just what happened'
      ]
    },
    {
      id: 3,
      title: 'Graceful Endings',
      description: 'Practice ending conversations respectfully when not interested',
      difficulty: 'Advanced',
      points: 12,
      duration: '14 days',
      category: 'respect',
      requirements: ['Clear communication', 'Kind but honest', 'No sudden disappearing'],
      tips: [
        'Be honest but gentle about lack of connection',
        'Thank them for their time and conversation',
        'Wish them well in their search'
      ]
    },
    {
      id: 4,
      title: 'Active Listening',
      description: 'Ask follow-up questions about what matches share',
      difficulty: 'Beginner',
      points: 6,
      duration: '7 days',
      category: 'empathy',
      requirements: ['Ask meaningful questions', 'Reference previous messages', 'Show genuine interest'],
      tips: [
        'Ask "How did that make you feel?" about their experiences',
        'Remember details they\'ve shared and ask about them later',
        'Share related experiences to show understanding'
      ]
    }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'text-green-400 bg-green-500/20';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-500/20';
      case 'Advanced': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'reliability': return Target;
      case 'emotional_depth': return Heart;
      case 'respect': return Award;
      case 'empathy': return Star;
      default: return CheckCircle;
    }
  };

  const progressToNextLevel = Math.min(100, ((trustScore - (currentLevel.target - 10)) / 10) * 100);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20">
      
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentLevel.color.replace('to-', 'to-').replace('500', '500/20')} p-6 border-b border-white/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${currentLevel.color} flex items-center justify-center`}>
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Reformation Journey</h2>
              <p className="text-gray-300">Level {reformationLevel}: {currentLevel.name}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{trustScore}</div>
            <div className="text-gray-300 text-sm">Trust Score</div>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Progress to Level {reformationLevel + 1}</span>
            <span className="text-white">{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className={`bg-gradient-to-r ${currentLevel.color} h-3 rounded-full transition-all duration-1000`}
              style={{ width: `${progressToNextLevel}%` }}
            ></div>
          </div>
          <div className="text-gray-300 text-sm mt-2">
            {reformationLevel < 5 
              ? `${reformationLevels[reformationLevel + 1].target - trustScore} points to next level`
              : 'Maximum level achieved! 🎉'
            }
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <span>This Week's Progress</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{weeklyProgress}</div>
            <div className="text-gray-300 text-sm">Points Earned</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{currentChallenges.length}</div>
            <div className="text-gray-300 text-sm">Active Challenges</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{completedChallenges.length}</div>
            <div className="text-gray-300 text-sm">Completed</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex space-x-4">
          {[
            { id: 'current', label: 'Available Challenges', count: availableChallenges.length },
            { id: 'active', label: 'Active Challenges', count: currentChallenges.length },
            { id: 'completed', label: 'Completed', count: completedChallenges.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                selectedTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <div className="bg-white/20 px-2 py-1 rounded-full text-xs">{tab.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {selectedTab === 'current' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h4 className="text-xl font-semibold text-white mb-2">Choose Your Next Challenge</h4>
              <p className="text-gray-300">Complete challenges to improve your trust score and relationship skills</p>
            </div>
            
            {availableChallenges.map((challenge) => {
              const CategoryIcon = getCategoryIcon(challenge.category);
              const isExpanded = expandedChallenge === challenge.id;
              
              return (
                <div
                  key={challenge.id}
                  className="bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:bg-white/10"
                >
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedChallenge(isExpanded ? null : challenge.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-xl">
                          <CategoryIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h5 className="text-white font-semibold">{challenge.title}</h5>
                          <p className="text-gray-300 text-sm">{challenge.description}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                              {challenge.difficulty}
                            </span>
                            <span className="text-green-400 text-sm">+{challenge.points} points</span>
                            <span className="text-blue-400 text-sm">{challenge.duration}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 animate-fade-in">
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h6 className="text-white font-medium mb-2">Requirements:</h6>
                          <ul className="space-y-1">
                            {challenge.requirements.map((req, index) => (
                              <li key={index} className="flex items-center space-x-2 text-gray-300 text-sm">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h6 className="text-white font-medium mb-2">Success Tips:</h6>
                          <ul className="space-y-1">
                            {challenge.tips.map((tip, index) => (
                              <li key={index} className="flex items-start space-x-2 text-gray-300 text-sm">
                                <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => onAcceptChallenge && onAcceptChallenge(challenge.id)}
                          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center space-x-2"
                        >
                          <span>Accept Challenge</span>
                          <Target className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedTab === 'active' && (
          <div className="space-y-4">
            {currentChallenges.length > 0 ? (
              currentChallenges.map((challenge, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-white font-semibold">{challenge.title}</h5>
                    <div className="text-blue-400 text-sm">{challenge.days_remaining} days left</div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-sm">Progress</span>
                      <span className="text-white">{challenge.progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${challenge.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{challenge.description}</span>
                    <button
                      onClick={() => onViewProgress && onViewProgress(challenge.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300">No active challenges. Choose one from Available Challenges to get started!</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'completed' && (
          <div className="space-y-4">
            {completedChallenges.length > 0 ? (
              completedChallenges.map((challenge, index) => (
                <div key={index} className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div>
                        <h5 className="text-white font-semibold">{challenge.title}</h5>
                        <p className="text-gray-300 text-sm">Completed {challenge.completed_date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">+{challenge.points_earned}</div>
                      <div className="text-gray-300 text-sm">points</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300">No completed challenges yet. Start your first challenge to build trust!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Motivation Footer */}
      <div className="p-6 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
        <div className="text-center">
          <h4 className="text-white font-semibold mb-2">Remember: Every great relationship starts with trust</h4>
          <p className="text-gray-300 text-sm">
            Each challenge you complete not only improves your score but builds real skills for lasting connections. 
            You're investing in your future happiness! 💪
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReformationFeedback;