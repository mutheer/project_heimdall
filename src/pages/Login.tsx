import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
}

const Login: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'email' | 'password' | 'username'>('email');
  const { login, signup } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const addMessageWithTypingEffect = async (content: string, role: 'assistant' | 'user' = 'assistant') => {
    const message: Message = { role, content, isTyping: role === 'assistant' };
    setMessages(prev => [...prev, message]);

    if (role === 'assistant') {
      const chars = content.split('');
      let currentText = '';
      
      for (let i = 0; i < chars.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
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

  useEffect(() => {
    // Initial greeting
    addMessageWithTypingEffect("Hello! I'm your AI assistant HeimdallAI. please enter your email to log in");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() === '') return;

    await addMessageWithTypingEffect(currentInput, 'user');
    setIsLoading(true);

    try {
      if (step === 'email') {
        setEmail(currentInput);
        if (mode === 'login') {
          await addMessageWithTypingEffect("Great! Now, please enter your password for authentication.");
          setStep('password');
        } else {
          await addMessageWithTypingEffect("Perfect! Now, please choose a username for your account.");
          setStep('username');
        }
      } else if (step === 'username' && mode === 'signup') {
        setUsername(currentInput);
        await addMessageWithTypingEffect("Excellent! Now, please create a secure password for your account.");
        setStep('password');
      } else if (step === 'password') {
        setPassword(currentInput);
        
        if (mode === 'login') {
          const success = await login(email, currentInput);
          if (success) {
            await addMessageWithTypingEffect("Perfect! You're now logged in. I'll take you to your dashboard.");
            setTimeout(() => navigate(from, { replace: true }), 1500);
          } else {
            await addMessageWithTypingEffect("I'm sorry, but those credentials don't seem to be correct. Let's try again with your email.");
            setStep('email');
            setEmail('');
            setPassword('');
          }
        } else {
          const success = await signup(email, currentInput, username);
          if (success) {
            await addMessageWithTypingEffect("Congratulations! Your account has been created successfully. You're now logged in!");
            setTimeout(() => navigate(from, { replace: true }), 1500);
          } else {
            await addMessageWithTypingEffect("I apologize, but there was an issue creating your account. Let's start over.");
            setStep('email');
            setEmail('');
            setPassword('');
            setUsername('');
          }
        }
      }
    } catch (err) {
      await addMessageWithTypingEffect("I apologize, but there was an error. Let's start over with your email.");
      setStep('email');
      setEmail('');
      setPassword('');
      setUsername('');
    }

    setCurrentInput('');
    setIsLoading(false);
  };

  const switchMode = async () => {
    const newMode = mode === 'login' ? 'signup' : 'login';
    setMode(newMode);
    setStep('email');
    setEmail('');
    setPassword('');
    setUsername('');
    setCurrentInput('');
    
    if (newMode === 'signup') {
      await addMessageWithTypingEffect("Great! Let's create a new account for you. Please enter your email address.");
    } else {
      await addMessageWithTypingEffect("Welcome back! Please enter your email address to login.");
    }
  };

  const getPlaceholder = () => {
    if (step === 'email') return "Enter your email";
    if (step === 'username') return "Choose a username";
    if (step === 'password') return mode === 'signup' ? "Create a password" : "Enter your password";
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="/ChatGPT Image Jun 16, 2025, 12_28_31 PM.png"
            alt="Heimdall AI Logo"
            className="h-16 w-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Heimdall AI
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Medical IoT Threat Detection for Botswana Healthcare
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4 mb-4 h-96 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-xs sm:max-w-sm ${
                    message.role === 'assistant'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-primary-600 text-white'
                  }`}
                >
                  <p className="text-sm">
                    {message.content}
                    {message.isTyping && (
                      <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse ml-1" />
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type={step === 'password' ? 'password' : step === 'email' ? 'email' : 'text'}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder={getPlaceholder()}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || currentInput.trim() === ''}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 ${
                  isLoading || currentInput.trim() === ''
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
              >
                {isLoading ? 'Processing...' : 'Send'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={switchMode}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {mode === 'login' ? (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Login Instead
                  </>
                )}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Default Admin Credentials</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-center text-gray-600">
                <p>Email: muthirabu@gmail.com</p>
                <p>Password: admin123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;