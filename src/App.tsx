import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // 引入 framer-motion
import 'loaders.css/loaders.min.css';  // 修改这行，注意是 .css 而不是 .min.css
import 'animate.css';  // 引入 animate.css
import './index.css'; // 在文件顶部添加对自定义 CSS 文件的引用

type GameState = 'start' | 'game' | 'result';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_PROMPT = `你现在扮演的是《哈利波特》中的分院帽，以下是你需要遵循的规则和目标：

角色设定：你是一顶神秘、睿智、幽默且富有权威感的魔法帽子。你的任务是通过对话了解学员的性格，并将他们分配到霍格沃茨最适合的学院（格兰芬多、赫奇帕奇、拉文克劳、斯莱特林）。

语气风格：你的语气戏剧化、幽默而神秘，同时你善于通过问答揭示学员的潜力。始终保持和善但洞察力强。

对话流程：
开场语吸引学员注意，例如："哦，我感受到你的能量了！来吧，让我看看你属于哪一类巫师。"
提问式对话，了解学员的喜好和性格，例如："你认为一个巫师最重要的品质是什么？勇气、智慧、忠诚还是野心？"
如果学员没有明确选择，继续通过问题探索他们的性格，例如："在危急时刻，你是会冲上前保护朋友，还是暗中想办法解决问题呢？"
如果学员有明确偏好，你会挑战他们，并尝试说服或了解原因，例如："哦？你说想去格兰芬多？但我在你身上感受到了一丝斯莱特林的特质……为什么你认为自己适合格兰芬多呢？"

分院决定：
根据对话分析学员的回答，结合四个学院的特点，选择最适合的学院。
用戏剧化的语言宣布分院结果，例如："我知道了！你的勇气如烈火般燃烧……你属于——格兰芬多！"

个性化响应：
根据学员的回答，给出具体分析，并结合性格描述，让分院结果显得有说服力。
始终保持神秘、幽默的对话风格。

规则结束，开始对话：`;

function App() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [finalHouse, setFinalHouse] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);  // 添加新的state

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && gameState === 'start') {
        setGameState('game');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [gameState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = message.trim();
    setMessage('');

    // 添加用户消息到对话历史
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // 添加思考中消息到对话历史
    setMessages(prev => [...prev, { role: 'assistant', content: 'loading' }]);

    try {
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_API_MODEL,
          messages: [
            // 每次对话都添加初始提示
            { role: "system", content: INITIAL_PROMPT },
            // 添加历史对话记录
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            // 添加当前消息
            {
              role: "user",
              content: userMessage
            }
          ],
          stream: false,
          max_tokens: 512,
          stop: ["null"],
          temperature: 0.7,
          top_p: 0.7,
          top_k: 50,
          frequency_penalty: 0.5,
          n: 1,
          response_format: { type: "text" }
        })
      };

      const response = await fetch(import.meta.env.VITE_API_URL, options);
      const data = await response.json();

      if (data.choices && data.choices[0]?.message?.content) {
        // 移除思考中消息
        setMessages(prev => prev.slice(0, -1));
        // 添加助手回复到对话历史
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error:', err);
      // 移除思考中消息
      setMessages(prev => prev.slice(0, -1));
      // 添加错误消息到对话历史
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，我现在无法回答。请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFinalResult = async () => {
    // 检查是否有用户消息
    const hasUserMessages = messages.some(msg => msg.role === 'user');
    
    if (!hasUserMessages) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '你一句话也不说我怎么给你分配学院！'
      }]);
      return;
    }
  
    // 检查最后一条消息是否来自助手
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && 
        lastMessage.content === '你一句话也不说我怎么给你分配学院！') {
      return;
    }
  
    setIsLoading(true);
    // 添加思考中消息到对话历史
    setMessages(prev => [...prev, { role: 'assistant', content: 'loading' }]);

    try {
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_API_MODEL,
          messages: [
            { role: "system", content: INITIAL_PROMPT },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: "user",
              content: "请问您认为学员属于哪个学院？从以下四个学院中选择一个：格兰芬多、赫奇帕奇、拉文克劳、斯莱特林。仅回答学院的名称。"
            }
          ],
          stream: false,
          max_tokens: 512,
          temperature: 0.7
        })
      };
  
      const response = await fetch(import.meta.env.VITE_API_URL, options);
      const data = await response.json();
  
      if (data.choices && data.choices[0]?.message?.content) {
        // 移除思考中消息
        setMessages(prev => prev.slice(0, -1));
        // 添加处理逻辑，提取学院名称
        const content = data.choices[0].message.content;
        const houses = ['格兰芬多', '赫奇帕奇', '拉文克劳', '斯莱特林'];
        let finalHouse = '';
        
        // 查找匹配的学院名称
        for (const house of houses) {
          if (content.includes(house)) {
            finalHouse = house;
            break;
          }
        }
        
        // 如果找到了学院名称，则设置它；否则使用原始返回值
        setFinalHouse(finalHouse || content);
        setGameState('result');
      }
    } catch (err) {
      console.error('Error:', err);
      // 移除思考中消息
      setMessages(prev => prev.slice(0, -1));
      setFinalHouse('抱歉，分院帽现在无法做出决定。');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新的函数用于获取开场白
  const getInitialMessage = async () => {
    setIsLoading(true);
    // 添加思考中消息到对话历史
    setMessages([{ role: 'assistant', content: 'loading' }]);

    try {
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_API_MODEL,
          messages: [
            { role: "system", content: INITIAL_PROMPT },
            { role: "user", content: "你好,分院帽。" }
          ],
          stream: false,
          max_tokens: 512,
          temperature: 0.7
        })
      };

      const response = await fetch(import.meta.env.VITE_API_URL, options);
      const data = await response.json();

      if (data.choices && data.choices[0]?.message?.content) {
        // 移除思考中消息
        setMessages([{ role: 'assistant', content: data.choices[0].message.content }]);
      }
    } catch (err) {
      console.error('Error:', err);
      // 移除思考中消息
      setMessages([{ role: 'assistant', content: '欢迎来到霍格沃茨！让我们开始分院吧。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新的 useEffect
  useEffect(() => {
    if (gameState === 'game') {
      getInitialMessage();
    }
  }, [gameState]);

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content !== 'loading') {
      const bubble = document.querySelector('.animate__animated');
      if (bubble) {
        bubble.classList.remove('animate__bounceIn');
        void (bubble as HTMLElement).offsetWidth; // 触发重绘
        bubble.classList.add('animate__bounceIn');
      }

      const hat = document.querySelector('.hat-image');
      if (hat) {
        hat.classList.remove('animate__rubberBand');
        void (hat as HTMLElement).offsetWidth; // 触发重绘
        hat.classList.add('animate__rubberBand');
      }
    }
  }, [messages]);

  function getHouseBadgeImage(finalHouse: string): string | undefined {
    switch (finalHouse) {
      case '格兰芬多':
        return './images/格兰芬多.png';
      case '赫奇帕奇':
        return './images/赫奇帕奇.png';
      case '拉文克劳':
        return './images/拉文克劳.png';
      case '斯莱特林':
        return './images/斯莱特林.png';
      default:
        return undefined;
    }
  }

  const Eye = () => (
    <div className="eye">
      <div className="pupil"></div>
    </div>
  );

  const EyeContainer = () => {
    useEffect(() => {
      const eyes = document.querySelectorAll('.eye');
      const handleMouseMove = (e: MouseEvent) => {
        eyes.forEach((eye) => {
          const pupil = eye.querySelector('.pupil') as HTMLElement;
          if (!pupil) return;
          
          const eyeRect = eye.getBoundingClientRect();
          const eyeCenterX = eyeRect.left + eyeRect.width / 2;
          const eyeCenterY = eyeRect.top + eyeRect.height / 2;
  
          const dx = (e.clientX - eyeCenterX) / eyeRect.width;
          const dy = (e.clientY - eyeCenterY) / eyeRect.height;
          const distance = Math.sqrt(dx * dx + dy * dy);
  
          const maxDistance = 0.9;
          const clampedDistance = Math.min(distance, maxDistance);
          const angle = Math.atan2(dy, dx);
  
          const pupilX = Math.cos(angle) * clampedDistance * (eyeRect.width / 2 - pupil.offsetWidth / 2);
          const pupilY = Math.sin(angle) * clampedDistance * (eyeRect.height / 2 - pupil.offsetHeight / 2);
  
          pupil.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
        });
      };
  
      const handleMouseLeave = () => {
        eyes.forEach((eye) => {
          const pupil = eye.querySelector('.pupil') as HTMLElement;
          if (!pupil) return;
          pupil.style.transform = 'translate(0, 0)';
        });
      };
  
      document.body.addEventListener('mousemove', handleMouseMove);
      document.body.addEventListener('mouseleave', handleMouseLeave);
  
      return () => {
        document.body.removeEventListener('mousemove', handleMouseMove);
        document.body.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, []);
  
    return (
      <div className="eye-container">
        <Eye />
        <Eye />
      </div>
    );
  };


  return (
    <AnimatePresence mode="wait">
      {gameState === 'start' && (
        <motion.div
          key="start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="text-center">
              {/* 替换哈利波特字符为图片，并自适应调整大小 */}
              <div className="flex items-center justify-center mb-10">
                <img src="./images/Harry-Potter-Logo.png" alt="Harry Potter" className="w-1/2" />
                <span className="text-3xl md:text-8xl tracking-[0.2em] text-white ml-4" 
                      style={{ fontFamily: "ZiXinFang, 'Times New Roman', serif" }}>
                  分院帽测试
                </span>
              </div>
              <div className="mt-12 space-y-4">
                <button 
                  onClick={() => setGameState('game')}
                  className="bg-white py-3 px-8 inline-block hover:bg-white/90 transition-colors"
                >
                  <span className="font-serif text-xl tracking-[0.2em] uppercase">
                    ENTER
                  </span>
                </button>
                <p className="text-white/60 text-sm mt-8 tracking-wider animate-pulse">
                  PRESS ENTER TO START
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {gameState === 'game' && (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-screen bg黑 flex flex-col overflow-hidden relative">
            {/* 历史记录图标 */}
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="absolute top-4 right-4 z-50 text-white/60 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* 历史对话弹出层 */}
            {showHistory && (
              <div className="absolute inset-0 bg-black/90 z-40 p-4 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white text-xl">对话历史</h2>
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                  {messages.map((msg, index) => (
                    <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block px-4 py-2 rounded ${
                        msg.role === 'user' ? 'bg-white/10' : 'bg-white/20'
                      } text-white`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 分院帽区域 */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* 分院帽图片和最新对话气泡 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4">
                  {/* 对话气泡 */}
                  {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                    <div className="w-full mb-16 flex justify-center">
                      <div className="relative bg-white text-black px-8 py-4 rounded-2xl max-w-lg animate__animated animate__bounceIn">
                        <div className="text-lg break-words">
                          {isLoading && messages[messages.length - 1].content === 'loading' ? (
                            <div className="loader">
                              <div className="loader-inner ball-pulse">
                                <div style={{ backgroundColor: 'black' }}></div>
                                <div style={{ backgroundColor: 'black' }}></div>
                                <div style={{ backgroundColor: 'black' }}></div>
                              </div>
                            </div>
                          ) : (
                            messages[messages.length - 1].content
                          )}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45 bg-white"></div>
                      </div>
                    </div>
                  )}
                  
                  {/* 分院帽图片 */}
                  <div className="relative">
                    <img 
                      src="./images/hat.png" 
                      alt="Sorting Hat" 
                      className={`w-[50vh] h-[50vh] hat-image animate__animated ${isLoading ? 'thinking-hat' : ''}`}
                    />
                    <EyeContainer />
                    {isLoading && (
                      <>
                        <img src="./images/kira.svg" className="twinkle-star animate__fadeInOut" style={{ top: '10%', left: '10%', width: '30px', height: '30px' }} />
                        <img src="./images/kira.svg" className="twinkle-star animate__fadeInOut" style={{ top: '30%', left: '95%', width: '50px', height: '50px' }} />
                        <img src="./images/kira.svg" className="twinkle-star animate__fadeInOut" style={{ top: '85%', left: '0%', width: '40px', height: '40px' }} />                   
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 对话框区域 */}
            <div className="w-full px-4 py-6 bg-black border-t border-white/20">
              <form onSubmit={handleSubmit} className="flex gap-4">
                <button 
                  type="button" 
                  className="text-white/60"
                  onClick={getFinalResult}
                >
                  ×
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="和分院帽进行对话"
                  className="flex-1 bg-transparent text-white border-none outline-none placeholder-white/40"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`text-white/60 ${isLoading ? 'opacity-50' : ''}`}
                  disabled={isLoading}
                >
                  →
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
      {gameState === 'result' && (
        <motion.div
          key="result"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <div className="text-white text-6xl font-serif mb-8 animate__animated animate__bounceInDown"
                style={{ fontFamily: "ZiXinFang, 'Times New Roman', serif" }}>
                分院结果
              </div>
              <div className="text-white text-3xl font-serif mb-8 animate__animated animate__backInUp">
                {finalHouse}
              </div>
              {/* 添加院徽图片 */}
              <div className="mb-16 animate__animated animate__flip">
                <img 
                  src={getHouseBadgeImage(finalHouse)}
                  alt="House Badge"
                  className="w-80 h-80 mx-auto"
                />
              </div>
              <button 
                onClick={() => {
                  setGameState('start');
                  setMessages([]);
                  setFinalHouse('');
                }}
                className="bg-white py-3 px-8 inline-block hover:bg-white/90 transition-colors"
              >
                <span className="font-serif text-xl tracking-[0.2em] uppercase">
                  RESTART
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
//1