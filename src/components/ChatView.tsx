import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Send, CheckCheck, Trash2, MessageCircle, Lock, Sparkles, Smile, Shield } from 'lucide-react';

const QUICK_TAGS = [
  '🛒 Mercado:',
  '💡 Lembrete:',
  '💳 Cartão:',
  '🏠 Casa:',
  '💰 Economizar:',
  '📌 Importante:',
];

export const ChatView: React.FC = () => {
  const {
    chatMessages,
    partners,
    activeDeviceUser,
    sendChatMessage,
    deleteChatMessage,
  } = useFinance();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeUserName = activeDeviceUser === 'partner1' ? partners.partner1Name : partners.partner2Name;
  const partnerName = activeDeviceUser === 'partner1' ? partners.partner2Name : partners.partner1Name;

  // Auto-scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    await sendChatMessage(trimmed, activeDeviceUser);
    setInputText('');
    setIsSending(false);

    // Keep focus on input for fast mobile/desktop typing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertTag = (tag: string) => {
    setInputText(prev => (prev ? `${prev} ${tag} ` : `${tag} `));
    inputRef.current?.focus();
  };

  // Group messages by date
  const formatMessageDate = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMessageTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Render date separators
  let lastDate = '';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-150px)] max-w-md mx-auto bg-[#efeae2] rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden relative">
      {/* 1. WhatsApp Top Bar Header */}
      <div className="bg-[#008069] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold leading-tight tracking-tight text-white">
                Anotações do Casal
              </h2>
            </div>
            <p className="text-[10.5px] text-emerald-100 flex items-center gap-1">
              <span>{partners.partner1Name} & {partners.partner2Name}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              <span className="text-[9.5px] opacity-90">tempo real</span>
            </p>
          </div>
        </div>

        {/* Sender indicator pill */}
        <div className="bg-emerald-800/60 border border-emerald-400/30 px-2 py-1 rounded-lg text-right">
          <span className="text-[9px] text-emerald-200 block leading-tight">Você é:</span>
          <span className="text-[11px] font-bold text-white block leading-tight truncate max-w-[90px]">
            {activeUserName}
          </span>
        </div>
      </div>

      {/* WhatsApp Encryption banner info */}
      <div className="bg-[#ffeecd] border-b border-[#ebd7a9] px-3 py-1 flex items-center justify-center gap-1.5 text-[10px] text-amber-900 shadow-2xs">
        <Lock className="w-3 h-3 text-amber-700 shrink-0" />
        <span className="truncate">Sincronizado instantaneamente entre os celulares do casal.</span>
      </div>

      {/* 2. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-xs">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-800">
                Nenhuma anotação ainda
              </h3>
              <p className="text-[11px] text-slate-600 max-w-[240px] leading-relaxed">
                Use este espaço como um WhatsApp particular para mandar listas de compras, lembretes de contas e anotações rápidas para {partnerName}.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-xs">
              {QUICK_TAGS.slice(0, 3).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map(msg => {
            const isMe = msg.sender === activeDeviceUser;
            const dateStr = formatMessageDate(msg.timestamp);
            const showDateSeparator = dateStr !== lastDate;
            if (showDateSeparator) {
              lastDate = dateStr;
            }

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-2">
                    <span className="bg-white/90 backdrop-blur-xs text-slate-600 border border-slate-200/60 shadow-2xs text-[10px] font-semibold px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                      {dateStr}
                    </span>
                  </div>
                )}

                <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} group`}>
                  {/* Delete button (shows on hover/subtle) */}
                  {isMe && (
                    <button
                      type="button"
                      onClick={() => deleteChatMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`relative max-w-[82%] sm:max-w-[75%] px-3 py-1.5 shadow-xs transition-all ${
                      isMe
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs border border-emerald-200/50'
                        : 'bg-white text-slate-900 rounded-2xl rounded-tl-xs border border-slate-200/70'
                    }`}
                  >
                    {/* Partner Name Label on incoming messages */}
                    {!isMe && (
                      <div className="text-[10.5px] font-bold text-pink-600 mb-0.5">
                        {msg.senderName || partnerName}
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="text-xs text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </div>

                    {/* Footer: Time + Blue Checks */}
                    <div className="flex items-center justify-end gap-1 mt-1 select-none">
                      <span className="text-[9.5px] text-slate-500 font-mono">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                      {isMe ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Delete button for partner message */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => deleteChatMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Tags Bar */}
      <div className="bg-[#f0f2f5]/90 border-t border-slate-200/60 px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-0.5">
          Atalhos:
        </span>
        {QUICK_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => insertTag(tag)}
            className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-[10.5px] font-medium text-slate-700 whitespace-nowrap shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 4. Bottom WhatsApp Input Bar */}
      <form onSubmit={handleSend} className="bg-[#f0f2f5] p-2 flex items-center gap-2 border-t border-slate-200/70">
        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Anotação para ${partnerName}...`}
            className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs rounded-full pl-4 pr-3 py-2.5 border border-slate-200 focus:outline-none focus:border-[#00a884] shadow-2xs"
          />
        </div>

        {/* WhatsApp Round Green Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
            inputText.trim() && !isSending
              ? 'bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
          title="Enviar anotação"
        >
          <Send className="w-4 h-4 ml-0.5 stroke-[2.5]" />
        </button>
      </form>
    </div>
  );
};
