import React, { useState } from 'react'; 

export interface BroadcastMessage {
  message: string;
  radius: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface BroadcastFormProps {
  onSubmit: (data: BroadcastMessage) => void;
  onChange?: (data: BroadcastMessage) => void; // NEW
  loading?: boolean;
}

const BroadcastForm: React.FC<BroadcastFormProps> = ({ onSubmit, onChange, loading = false }) => {
  const [broadcast, setBroadcast] = useState<BroadcastMessage>({
    message: '',
    radius: 5,
    priority: 'MEDIUM'
  });

  const updateBroadcast = (next: BroadcastMessage) => {
    setBroadcast(next);
    onChange?.(next);            // notify Dashboard on every change
  };

  const handleBroadcastChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    updateBroadcast({
      ...broadcast,
      [name]: name === 'radius' ? Number(value) : value,
    } as BroadcastMessage);
  };

  const handlePriorityChange = (priority: BroadcastMessage['priority']) => {
    updateBroadcast({ ...broadcast, priority });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBroadcast({ ...broadcast, radius: Number(e.target.value) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(broadcast);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* message, radius, priority, button – unchanged except handlers */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Alert Message</label>
        <textarea
          name="message"
          value={broadcast.message}
          onChange={handleBroadcastChange}
          rows={2}
          placeholder="Enter message to be broadcast"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 placeholder-gray-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Radius</label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            name="radius"
            min="1"
            max="50"
            value={broadcast.radius}
            onChange={handleRadiusChange}
            className="flex-1 h-4 bg-gray-200 rounded-lg accent-purple-900"
          />
          <span className="font-mono text-lg">{broadcast.radius} km</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Priority</label>
        <div className="flex space-x-2 items-center">
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
            <button
              key={priority}
              type="button"
              onClick={() => handlePriorityChange(priority)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                broadcast.priority === priority
                  ? 'shadow-lg'
                  : 'bg-gray-200 hover:bg-gray-300'
              } ${priority === 'URGENT' ? 'bg-red-100 text-red-800' : 
                 priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 
                 priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                 'bg-gray-200 text-gray-800'}`}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full bg-red-600 text-white py-3 px-6 rounded-lg font-bold text-lg shadow-lg hover:bg-red-700 transition-all ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? '🚨 SENDING...' : `BROADCAST (${broadcast.priority})`}
      </button>
    </form>
  );
};

export default BroadcastForm;
