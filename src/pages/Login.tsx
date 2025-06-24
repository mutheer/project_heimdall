import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, UserPlus, Send, Bot, User } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
  action?: 'login' | 'signup' | 'help';
}

const Login: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'chat'>('chat');
  const [step, setStep] = useState<'intent' | 'email' | 'password' | 'username'>('intent');
  const { login, signup } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const addMessageWithTypingEffect = async (content: string, role: 'assistant' | 'user' = 'assistant', action?: 'login' | 'signup' | 'help') => {
    const message: Message = { role, content, isTyping: role === 'assistant', action };
    setMessages(prev => [...prev, message]);

    if (role === 'assistant') {
      const chars = content.split('');
      let currentText = '';
      
      for (let i = 0; i < chars.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        currentText += chars[i];
        setMessages(prev => 
          prev.map((msg, index) => 
            index === prev.length - 1 
              ? { ...msg, content: currentText }
              : msg
          )
        );
      }

      setMessages(prev => 
        prev.map((msg, index) => 
          index === prev.length - 1 
            ? { ...msg, isTyping: false }
            : msg
        )
      );
    }
  };

  const analyzeUserIntent = (input: string): { intent: 'login' | 'signup' | 'help' | 'unknown', confidence: number } => {
    const lowerInput = input.toLowerCase();
    
    // Login keywords
    const loginKeywords = ['login', 'log in', 'sign in', 'signin', 'authenticate', 'access', 'enter'];
    const loginScore = loginKeywords.reduce((score, keyword) => 
      lowerInput.includes(keyword) ? score + 1 : score, 0);

    // Signup keywords
    const signupKeywords = ['signup', 'sign up', 'register', 'create account', 'add analyst', 'new user', 'analyst', 'create user'];
    const signupScore = signupKeywords.reduce((score, keyword) => 
      lowerInput.includes(keyword) ? score + 1 : score, 0);

    // Help keywords
    const helpKeywords = ['help', 'what can', 'how to', 'assistance', 'support'];
    const helpScore = helpKeywords.reduce((score, keyword) => 
      lowerInput.includes(keyword) ? score + 1 : score, 0);

    if (signupScore > loginScore && signupScore > helpScore) {
      return { intent: 'signup', confidence: signupScore };
    } else if (loginScore > helpScore) {
      return { intent: 'login', confidence: loginScore };
    } else if (helpScore > 0) {
      return { intent: 'help', confidence: helpScore };
    }

    return { intent: 'unknown', confidence: 0 };
  };

  const handleAIResponse = async (userInput: string) => {
    const { intent, confidence } = analyzeUserIntent(userInput);

    switch (intent) {
      case 'login':
        await addMessageWithTypingEffect(
          "Perfect! I understand you want to log in to access your account. Please provide your email address to get started.",
          'assistant',
          'login'
        );
        setMode('login');
        setStep('email');
        break;

      case 'signup':
        await addMessageWithTypingEffect(
          "Great! I'll help you create a new analyst account. This will give the new user access to monitor threats and manage devices. Let's start with their email address.",
          'assistant',
          'signup'
        );
        setMode('signup');
        setStep('email');
        break;

      case 'help':
        await addMessageWithTypingEffect(
          "I'm here to help! I can assist you with:\n\n• **Logging in** - Access your existing account\n• **Creating analyst accounts** - Add new team members\n• **System access** - Get into the Heimdall AI dashboard\n\nJust tell me what you'd like to do, for example:\n- \"I want to login\"\n- \"Add a new analyst\"\n- \"Create an account for my colleague\"",
          'assistant',
          'help'
        );
        break;

      default:
        await addMessageWithTypingEffect(
          "I'm not quite sure what you'd like to do. I can help you with:\n\n• **Login** - Access your existing account\n• **Create analyst account** - Add new team members\n\nCould you please clarify? For example, say \"I want to login\" or \"Add new analyst\".",
          'assistant'
        );
        break;
    }
  };

  useEffect(() => {
    // Initial greeting
    addMessageWithTypingEffect(
      "👋 Hello! I'm your Heimdall AI assistant. I can help you log into the system or create new analyst accounts.\n\nWhat would you like to do today?"
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() === '') return;

    await addMessageWithTypingEffect(currentInput, 'user');
    setIsLoading(true);

    try {
      if (step === 'intent') {
        await handleAIResponse(currentInput);
      } else if (step === 'email') {
        setEmail(currentInput);
        if (mode === 'login') {
          await addMessageWithTypingEffect("Perfect! Now please enter your password to complete the login process.");
          setStep('password');
        } else {
          await addMessageWithTypingEffect("Excellent! Now, please provide a username for this analyst account.");
          setStep('username');
        }
      } else if (step === 'username' && mode === 'signup') {
        setUsername(currentInput);
        await addMessageWithTypingEffect("Great! Finally, please create a secure password for this analyst account.");
        setStep('password');
      } else if (step === 'password') {
        setPassword(currentInput);
        
        if (mode === 'login') {
          try {
            const success = await login(email, currentInput);
            if (success) {
              await addMessageWithTypingEffect("🎉 Login successful! Welcome back to Heimdall AI. Redirecting you to the dashboard...");
              setTimeout(() => navigate(from, { replace: true }), 1500);
            } else {
              await addMessageWithTypingEffect("❌ Login failed. The credentials don't seem to be correct. Let's try again - what would you like to do?");
              resetToChat();
            }
          } catch (error) {
            await addMessageWithTypingEffect("❌ Login error occurred. Let's start over - what would you like to do?");
            resetToChat();
          }
        } else {
          try {
            const success = await signup(email, currentInput, username, 'analyst');
            if (success) {
              await addMessageWithTypingEffect("🎉 Analyst account created successfully! The new user can now access the system with their credentials.");
              setTimeout(() => {
                resetToChat();
                addMessageWithTypingEffect("Is there anything else I can help you with today?");
              }, 2000);
            } else {
              await addMessageWithTypingEffect("❌ Account creation failed. Let's try again - what would you like to do?");
              resetToChat();
            }
          } catch (error) {
            await addMessageWithTypingEffect("❌ Error creating account. Let's start over - how can I help you?");
            resetToChat();
          }
        }
      }
    } catch (err) {
      await addMessageWithTypingEffect("❌ Something went wrong. Let's start fresh - what would you like to do?");
      resetToChat();
    }

    setCurrentInput('');
    setIsLoading(false);
  };

  const resetToChat = () => {
    setMode('chat');
    setStep('intent');
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const getPlaceholder = () => {
    if (step === 'intent') return "Type your message... (e.g., 'I want to login' or 'Add new analyst')";
    if (step === 'email') return "Enter email address";
    if (step === 'username') return "Enter username for the analyst";
    if (step === 'password') return mode === 'signup' ? "Create a secure password" : "Enter your password";
    return "";
  };

  const getInputType = () => {
    if (step === 'password') return 'password';
    if (step === 'email') return 'email';
    return 'text'; // Use text for intent recognition and username
  };

  const handleQuickAction = async (action: string) => {
    setCurrentInput(action);
    await addMessageWithTypingEffect(action, 'user');
    setIsLoading(true);
    await handleAIResponse(action);
    setCurrentInput('');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <img 
              src="/ChatGPT Image Jun 16, 2025, 12_28_31 PM.png"
              alt="Heimdall AI Logo"
              className="h-16 w-auto drop-shadow-lg"
            />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Heimdall AI
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          AI-Powered Medical IoT Security for Botswana Healthcare
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
          {/* Chat Messages */}
          <div className="space-y-4 mb-6 h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div className={`flex items-start space-x-2 max-w-xs sm:max-w-sm ${
                  message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse space-x-reverse'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'assistant' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === 'assistant'
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">
                      {message.content}
                      {message.isTyping && (
                        <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse ml-1" />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={getInputType()}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                className="appearance-none block w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={getPlaceholder()}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || currentInput.trim() === ''}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md ${
                  isLoading || currentInput.trim() === ''
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            {step === 'intent' && (
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickAction('I want to login')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Quick Login
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Add new analyst')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center py-2 px-3 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add Analyst
                </button>
              </div>
            )}
          </form>

          {/* Default Credentials Info */}
          {mode === 'login' && step !== 'intent' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Default Admin Credentials</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-center text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium">Email: muthirabu@gmail.com</p>
                <p className="font-medium">Password: admin123</p>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>AI Assistant Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;