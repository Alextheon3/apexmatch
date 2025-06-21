import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Brain, Shield, Sparkles, ArrowRight, Star, Users, Zap } from 'lucide-react';

const ApexMatchLanding = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGetStarted = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-blue-400 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-indigo-400 rounded-full blur-2xl animate-pulse"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 py-8">
          <nav className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center space-x-2">
              <Brain className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                ApexMatch
              </span>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="text-purple-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
          </nav>
        </header>

        {/* Hero Content */}
        <div className={`relative z-10 px-6 py-16 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Where <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Emotional Rhythm</span> Replaces Physical Performance
            </h1>
            
            <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              ApexMatch connects you through behavioral patterns and emotional compatibility—not just photos. 
              Finally meet someone who actually fits your authentic self.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button className="border-2 border-purple-400 hover:bg-purple-400 hover:text-purple-900 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300">
                Watch Demo
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center space-x-6 text-purple-300">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm ml-2">4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full border-2 border-purple-900"></div>
                  ))}
                </div>
                <span className="text-sm">Join 10k+ users</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <section className="py-20 px-6 bg-black bg-opacity-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            How ApexMatch <span className="text-purple-400">Actually Works</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Behavioral Graph Profile */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Behavioral Graph Profile</h3>
              <p className="text-purple-200 leading-relaxed">
                We analyze your emotional patterns, communication style, and decision-making rhythms—not your selfies. 
                Your true self becomes your profile.
              </p>
            </div>

            {/* Blind Match Start */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Blind Match Start</h3>
              <p className="text-purple-200 leading-relaxed">
                Connect through conversation first. Build emotional intimacy before photos. 
                Experience what it's like to be truly seen for who you are.
              </p>
            </div>

            {/* Trust System */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">"Shit Matches Shit" Justice</h3>
              <p className="text-purple-200 leading-relaxed">
                Ghosters match with ghosters. Respectful people get the VIP experience. 
                Your behavior becomes your dating destiny.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Wingman Feature */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Meet Your <span className="text-purple-400">AI Wingman</span>
              </h2>
              <p className="text-xl text-purple-200 mb-8 leading-relaxed">
                Our AI analyzes your behavioral compatibility and crafts the perfect introduction. 
                It's like having the wisest, most insightful friend introduce you—then disappear.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Personalized Insights</h4>
                    <p className="text-purple-200">"You both slow down before decisions and reflect deeply. Start here..."</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Perfect Conversation Starters</h4>
                    <p className="text-purple-200">Based on your emotional compatibility, not generic pickup lines</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Then Disappears</h4>
                    <p className="text-purple-200">No AI chatting for you—just the perfect human introduction</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 shadow-2xl">
                <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold">AI Wingman</span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    "You and Sarah both take time to reflect before making decisions, and you both value deep emotional connections. 
                    You're both morning people who appreciate thoughtful conversation. This could be really meaningful—start with 
                    sharing what made you both smile today."
                  </p>
                </div>
                <div className="text-xs text-purple-200 text-center">
                  ✨ AI Wingman has left the chat
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staged Reveal */}
      <section className="py-20 px-6 bg-black bg-opacity-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">
            The <span className="text-purple-400">Reveal Ritual</span>
          </h2>
          <p className="text-xl text-purple-200 mb-12">
            Only after you've built real emotional connection do you reveal photos. 
            Experience the magic of being truly seen—inside first, outside second.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💭</span>
              </div>
              <h4 className="font-semibold mb-2">Connect Emotionally</h4>
              <p className="text-sm text-purple-200">Build trust through conversation</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <h4 className="font-semibold mb-2">Mutual Reveal</h4>
              <p className="text-sm text-purple-200">Both choose to reveal together</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">❤️</span>
              </div>
              <h4 className="font-semibold mb-2">True Connection</h4>
              <p className="text-sm text-purple-200">Meet with authentic foundation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">
            Simple, <span className="text-purple-400">Honest Pricing</span>
          </h2>
          <p className="text-xl text-purple-200 mb-12">
            No boosts. No swipes. No BS. Just real connections.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <p className="text-3xl font-bold mb-6">$0<span className="text-sm text-purple-300">/month</span></p>
              <ul className="text-left space-y-3 text-purple-200">
                <li>• 1 match every 3 days</li>
                <li>• 3 active chats max</li>
                <li>• Basic BGP insights</li>
                <li>• Trust system protection</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 transform scale-105">
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <p className="text-3xl font-bold mb-6">$18<span className="text-sm text-purple-200">/month</span></p>
              <ul className="text-left space-y-3">
                <li>• Unlimited matches</li>
                <li>• AI Wingman introductions</li>
                <li>• Advanced compatibility insights</li>
                <li>• Priority in high-trust tier</li>
                <li>• Reveal ritual themes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">
            Ready to Meet Someone Who Actually Fits You?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the platform where emotional rhythm replaces physical performance.
          </p>
          <button 
            onClick={handleGetStarted}
            className="bg-white text-purple-600 hover:bg-gray-100 px-12 py-4 rounded-full text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Your Behavioral Profile
          </button>
          <p className="text-sm mt-4 opacity-75">No photos required to start • Build emotional connection first</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-black bg-opacity-40">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Brain className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold">ApexMatch</span>
          </div>
          <p className="text-purple-300 mb-6">
            Where emotional rhythm replaces physical performance
          </p>
          <div className="text-sm text-purple-400">
            © 2025 ApexMatch. Built for authentic human connection.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApexMatchLanding;