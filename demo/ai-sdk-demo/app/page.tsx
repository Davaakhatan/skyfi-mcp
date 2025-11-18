'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <h1 className="text-2xl font-bold mb-2">🌍 SkyFi MCP Demo Agent</h1>
            <p className="mb-4">Ask me about geospatial data services!</p>
            <div className="text-left max-w-md mx-auto space-y-2">
              <p className="text-sm font-semibold">Try asking:</p>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>"Search for satellite data over San Francisco"</li>
                <li>"What would it cost to get aerial imagery of New York?"</li>
                <li>"Order satellite data for Central Park"</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Setup:</strong> Add OPENAI_API_KEY to .env.local for AI responses. Add SKYFI_API_KEY when available for full functionality.
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="text-sm font-semibold mb-1">
                {message.role === 'user' ? 'You' : 'SkyFi Agent'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-3">
              <div className="text-sm font-semibold mb-1">SkyFi Agent</div>
              <div className="text-gray-600">Thinking...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
              <div className="text-sm font-semibold mb-1">Error</div>
              <div className="text-sm">{error.message || 'An error occurred'}</div>
            </div>
          </div>
        )}
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }} 
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about geospatial data..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}

