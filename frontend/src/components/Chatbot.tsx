import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';

export default function Chatbot() {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: 'ai', text: 'Xin chào! Tôi là trợ lý ảo nhà trọ. Tôi có thể giúp bạn kiểm tra phòng trống, hóa đơn tiền nhà hoặc báo cáo sự cố hư hỏng.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newHistory = [...messages, { role: 'user', text }];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { message: text, history: messages });
      if (res.data.success) {
        setMessages([...newHistory, { role: 'ai', text: res.data.data.text }]);
      }
    } catch (error) {
      setMessages([...newHistory, { role: 'ai', text: 'Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.' }]);
    }
    setLoading(false);
  };

  const suggestions = [
    "Tìm phòng trống giá dưới 3 triệu",
    "Báo hỏng vòi nước phòng 101, sđt 0911111111",
    "Hỏi giờ giấc đóng cửa trọ",
    "Tôi nợ bao nhiêu tiền (sđt 0911111111)?"
  ];

  return (
    <div className="flex flex-col h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center">
        <Bot className="mr-2" />
        <h3 className="font-semibold text-lg">Trợ lý ảo AI</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg flex items-start shadow-sm ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
              {msg.role === 'ai' ? <Bot size={18} className="mr-2 mt-1 flex-shrink-0 text-blue-500" /> : <User size={18} className="mr-2 mt-1 flex-shrink-0 text-white" />}
              <span className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-100 text-gray-500 p-3 rounded-lg rounded-bl-none flex items-center shadow-sm">
               <Bot size={18} className="mr-2 animate-bounce text-blue-400" /> <span className="text-sm">Đang suy nghĩ...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => sendMessage(s)}
              className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-600 px-3 py-1.5 rounded-full transition-colors border border-gray-200"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          <input 
            type="text"
            className="flex-1 border border-gray-300 rounded-l-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tin nhắn của bạn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          />
          <button 
            onClick={() => sendMessage(input)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-r-lg transition-colors flex items-center justify-center w-12"
            disabled={loading}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
