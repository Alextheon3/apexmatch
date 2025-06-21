import React, { useState, useEffect } from 'react';
import { Heart, Menu, X, Bell, Settings, User, LogOut, Crown, Sparkles } from 'lucide-react';

const Header = ({ 
  user = null, 
  currentPage = 'match',
  onNavigate = () => {},
  notifications = [],
  isPremium = false 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    setUnreadNotifications(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const navigationItems = [
    { id: 'match', label: 'Matches', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'upgrade', label: isPremium ? 'Premium' : 'Upgrade', icon: Crown }
  ];

  const handleNavigation = (pageId) => {
    onNavigate(pageId);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    // In real app: clear auth token and redirect
    localStorage.removeItem('token');
    onNavigate('login');
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavigation('match')}
          >
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-2 rounded-xl">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ApexMatch</h1>
              {isPremium && (
                <div className="flex items-center space-x-1">
                  <Crown className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">Premium</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.id === 'upgrade' && !isPremium && (
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => onNavigate('notifications')}
                className="p-2 text-white/70 hover:text-white transition-colors relative"
              >
                <Bell className="w-6 h-6" />
                {unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </div>
                )}
              </button>
            </div>

            {/* User Profile Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.name?.[0] || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-white text-sm font-medium">{user.name}</div>
                    <div className="text-white/60 text-xs">
                      Trust Score: {user.trust_score || 85}%
                    </div>
                  </div>
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 py-2">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                          {user.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.name}</div>
                          <div className="text-white/60 text-sm">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 text-xs">Trust Score: {user.trust_score || 85}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <button
                        onClick={() => {
                          handleNavigation('profile');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleNavigation('settings');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      
                      {!isPremium && (
                        <button
                          onClick={() => {
                            handleNavigation('upgrade');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Upgrade to Premium</span>
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="border-t border-white/10 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white/5 backdrop-blur-sm rounded-2xl mt-2 mb-4 border border-white/10">
            <nav className="py-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-3 transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'upgrade' && !isPremium && (
                      <Sparkles className="w-4 h-4 text-yellow-400 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(isMenuOpen || isProfileMenuOpen) && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsMenuOpen(false);
            setIsProfileMenuOpen(false);
          }}
        ></div>
      )}
    </header>
  );
};

export default Header;