import React from 'react';
import { Heart, Mail, Shield, FileText, HelpCircle, Twitter, Instagram, Github } from 'lucide-react';

const Footer = ({ onNavigate = () => {} }) => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'ApexMatch',
      links: [
        { label: 'How It Works', id: 'how-it-works', icon: HelpCircle },
        { label: 'Success Stories', id: 'success-stories', icon: Heart },
        { label: 'Safety Center', id: 'safety', icon: Shield },
        { label: 'Premium Features', id: 'upgrade', icon: Heart }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', id: 'help', icon: HelpCircle },
        { label: 'Contact Us', id: 'contact', icon: Mail },
        { label: 'Privacy Policy', id: 'privacy', icon: Shield },
        { label: 'Terms of Service', id: 'terms', icon: FileText }
      ]
    },
    {
      title: 'Community',
      links: [
        { label: 'Blog', id: 'blog', icon: FileText },
        { label: 'Dating Tips', id: 'tips', icon: Heart },
        { label: 'Relationship Advice', id: 'advice', icon: Heart },
        { label: 'Community Guidelines', id: 'guidelines', icon: Shield }
      ]
    }
  ];

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/apexmatch', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/apexmatch', label: 'Instagram' },
    { icon: Github, href: 'https://github.com/apexmatch', label: 'GitHub' }
  ];

  return (
    <footer className="bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-indigo-900/50 backdrop-blur-lg border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-xl">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">ApexMatch</h3>
                <p className="text-white/60 text-sm">Emotional connections first</p>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Revolutionary dating app that prioritizes emotional compatibility over physical attraction. 
              Build meaningful connections through behavioral matching and authentic conversations.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-pink-400">89%</div>
                <div className="text-xs text-gray-400">Success Rate</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-purple-400">50K+</div>
                <div className="text-xs text-gray-400">Happy Couples</div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => {
                  const Icon = link.icon;
                  return (
                    <li key={linkIndex}>
                      <button
                        onClick={() => onNavigate(link.id)}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors text-sm group"
                      >
                        <Icon className="w-4 h-4 group-hover:text-pink-400 transition-colors" />
                        <span>{link.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust & Safety Section */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h4 className="text-lg font-semibold text-white">Your Safety Matters</h4>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>End-to-end encrypted conversations</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>AI-powered safety monitoring</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>24/7 support team</span>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 rounded-2xl p-6 mb-8 border border-pink-500/20">
          <div className="text-center md:text-left">
            <h4 className="text-lg font-semibold text-white mb-2">Stay Connected</h4>
            <p className="text-gray-300 text-sm mb-4">Get dating tips, relationship advice, and ApexMatch updates.</p>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 max-w-md mx-auto md:mx-0">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-300">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            
            {/* Copyright */}
            <div className="text-gray-400 text-sm">
              © {currentYear} ApexMatch. All rights reserved. Made with{' '}
              <Heart className="w-4 h-4 text-pink-400 inline mx-1" />
              for authentic connections.
            </div>

            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-sm">
              <button
                onClick={() => onNavigate('privacy')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => onNavigate('terms')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => onNavigate('cookies')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cookie Policy
              </button>
            </div>

            {/* App Download Links */}
            <div className="flex items-center space-x-3">
              <div className="text-gray-400 text-sm mr-3">Download App:</div>
              <button className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-white text-xs transition-colors">
                📱 iOS
              </button>
              <button className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-white text-xs transition-colors">
                🤖 Android
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;