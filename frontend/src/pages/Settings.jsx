import React, { useState } from 'react';
import { 
  Settings, Bell, Shield, Eye, EyeOff, Globe, Moon, Sun, 
  Smartphone, Mail, MessageCircle, Heart, Brain, MapPin, 
  Calendar, User, Lock, AlertTriangle, LogOut, Crown,
  Save, X, Check
} from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    // Notification settings
    pushNotifications: true,
    emailNotifications: true,
    messageNotifications: true,
    matchNotifications: true,
    marketingEmails: false,
    weeklyDigest: true,
    
    // Privacy settings
    showOnlineStatus: true,
    showDistance: true,
    showAge: true,
    showLastActive: false,
    profileVisibility: 'everyone', // everyone, matches, private
    
    // Discovery settings
    discoverable: true,
    ageRange: { min: 22, max: 35 },
    maxDistance: 50,
    showMe: 'everyone', // men, women, everyone
    
    // App settings
    darkMode: false,
    language: 'en',
    autoPlay: true,
    hapticFeedback: true,
    
    // Advanced settings
    dataSharing: false,
    analytics: true,
    crashReports: true,
    betaFeatures: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('notifications');

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNestedSetting = (parent, key, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }));
  };

  const handleDeleteAccount = () => {
    // Fixed: Replace confirm() with custom modal
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    // Handle account deletion logic here
    console.log('Account deletion confirmed');
    setShowDeleteConfirm(false);
    // Redirect to deletion confirmation or login page
  };

  const cancelDeleteAccount = () => {
    setShowDeleteConfirm(false);
  };

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        {description && (
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-purple-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const RangeSlider = ({ min, max, value, onChange, label, unit = '' }) => (
    <div className="py-3">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-900">{label}</span>
        <span className="text-purple-600 font-semibold">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'discovery', label: 'Discovery', icon: Heart },
    { id: 'app', label: 'App Settings', icon: Settings },
    { id: 'account', label: 'Account', icon: User },
    { id: 'advanced', label: 'Advanced', icon: Brain }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Settings
            </h1>
            <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              
              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </h2>
                  
                  <div className="space-y-4">
                    <ToggleSwitch
                      enabled={settings.pushNotifications}
                      onChange={(value) => updateSetting('pushNotifications', value)}
                      label="Push Notifications"
                      description="Receive notifications on your device"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.emailNotifications}
                      onChange={(value) => updateSetting('emailNotifications', value)}
                      label="Email Notifications"
                      description="Get updates via email"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.messageNotifications}
                      onChange={(value) => updateSetting('messageNotifications', value)}
                      label="New Messages"
                      description="Notify when you receive new messages"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.matchNotifications}
                      onChange={(value) => updateSetting('matchNotifications', value)}
                      label="New Matches"
                      description="Notify when you get a new match"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.marketingEmails}
                      onChange={(value) => updateSetting('marketingEmails', value)}
                      label="Marketing Emails"
                      description="Receive promotional content and offers"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.weeklyDigest}
                      onChange={(value) => updateSetting('weeklyDigest', value)}
                      label="Weekly Digest"
                      description="Get a summary of your activity"
                    />
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {activeSection === 'privacy' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy & Visibility
                  </h2>
                  
                  <div className="space-y-4">
                    <ToggleSwitch
                      enabled={settings.showOnlineStatus}
                      onChange={(value) => updateSetting('showOnlineStatus', value)}
                      label="Show Online Status"
                      description="Let others see when you're active"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.showDistance}
                      onChange={(value) => updateSetting('showDistance', value)}
                      label="Show Distance"
                      description="Display your distance to other users"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.showAge}
                      onChange={(value) => updateSetting('showAge', value)}
                      label="Show Age"
                      description="Display your age on your profile"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.showLastActive}
                      onChange={(value) => updateSetting('showLastActive', value)}
                      label="Show Last Active"
                      description="Let others see when you were last online"
                    />
                    
                    <div className="py-3">
                      <label className="block font-medium text-gray-900 mb-2">Profile Visibility</label>
                      <select
                        value={settings.profileVisibility}
                        onChange={(e) => updateSetting('profileVisibility', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="matches">Only Matches</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Discovery Section */}
              {activeSection === 'discovery' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Discovery Settings
                  </h2>
                  
                  <div className="space-y-6">
                    <ToggleSwitch
                      enabled={settings.discoverable}
                      onChange={(value) => updateSetting('discoverable', value)}
                      label="Discoverable"
                      description="Allow others to find your profile"
                    />
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-4">Age Range</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <RangeSlider
                          min={18}
                          max={80}
                          value={settings.ageRange.min}
                          onChange={(value) => updateNestedSetting('ageRange', 'min', value)}
                          label="Minimum Age"
                        />
                        <RangeSlider
                          min={18}
                          max={80}
                          value={settings.ageRange.max}
                          onChange={(value) => updateNestedSetting('ageRange', 'max', value)}
                          label="Maximum Age"
                        />
                      </div>
                    </div>
                    
                    <RangeSlider
                      min={1}
                      max={100}
                      value={settings.maxDistance}
                      onChange={(value) => updateSetting('maxDistance', value)}
                      label="Maximum Distance"
                      unit=" km"
                    />
                    
                    <div className="py-3">
                      <label className="block font-medium text-gray-900 mb-2">Show Me</label>
                      <select
                        value={settings.showMe}
                        onChange={(e) => updateSetting('showMe', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* App Settings Section */}
              {activeSection === 'app' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    App Preferences
                  </h2>
                  
                  <div className="space-y-4">
                    <ToggleSwitch
                      enabled={settings.darkMode}
                      onChange={(value) => updateSetting('darkMode', value)}
                      label="Dark Mode"
                      description="Use dark theme throughout the app"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.autoPlay}
                      onChange={(value) => updateSetting('autoPlay', value)}
                      label="Auto-play Videos"
                      description="Automatically play videos in profiles"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.hapticFeedback}
                      onChange={(value) => updateSetting('hapticFeedback', value)}
                      label="Haptic Feedback"
                      description="Enable vibration for interactions"
                    />
                    
                    <div className="py-3">
                      <label className="block font-medium text-gray-900 mb-2">Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="pt">Português</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Management
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Account Status</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm text-gray-600">Premium Member</span>
                      </div>
                      <button className="text-purple-600 hover:text-purple-700 font-medium">
                        Manage Subscription
                      </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Data & Privacy</h3>
                      <div className="space-y-2">
                        <button className="block text-left text-purple-600 hover:text-purple-700">
                          Download My Data
                        </button>
                        <button className="block text-left text-purple-600 hover:text-purple-700">
                          Privacy Policy
                        </button>
                        <button className="block text-left text-purple-600 hover:text-purple-700">
                          Terms of Service
                        </button>
                      </div>
                    </div>
                    
                    <div className="border border-red-200 rounded-lg p-4">
                      <h3 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Danger Zone
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Section */}
              {activeSection === 'advanced' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Advanced Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <ToggleSwitch
                      enabled={settings.dataSharing}
                      onChange={(value) => updateSetting('dataSharing', value)}
                      label="Data Sharing"
                      description="Share anonymous usage data to improve the app"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.analytics}
                      onChange={(value) => updateSetting('analytics', value)}
                      label="Analytics"
                      description="Help us understand app usage patterns"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.crashReports}
                      onChange={(value) => updateSetting('crashReports', value)}
                      label="Crash Reports"
                      description="Automatically send crash reports to improve stability"
                    />
                    
                    <ToggleSwitch
                      enabled={settings.betaFeatures}
                      onChange={(value) => updateSetting('betaFeatures', value)}
                      label="Beta Features"
                      description="Access experimental features before they're released"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteAccount}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;