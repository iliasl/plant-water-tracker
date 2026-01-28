import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import RoomList from './RoomList';
import PlantList from './PlantList';



const SettingsPage = ({ onBack, onOpenGraveyard }) => {
  const [settings, setSettings] = useState({ ema_alpha: 0.35, snooze_factor: 0.2 });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const loadSettings = async () => {
    setLoading(true);
    const res = await axios.get('/api/dashboard');
    setRooms(res.data);
    if (res.data[0]?.user?.settings) {
      setSettings(res.data[0].user.settings);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    const userId = rooms[0].userId;
    await axios.patch('/api/user/settings', { userId, settings });
    alert('Settings saved!');
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (roomName === 'Graveyard') return alert("Cannot delete the Graveyard");

    const confirmMsg = `Are you sure you want to delete "${roomName}"? Any plants in this room will be moved to a "Default" room.`;
    if (confirm(confirmMsg)) {
      try {
        await axios.delete(`/api/rooms/${roomId}`);
        await loadSettings();
      } catch (error) {
        console.error('Failed to delete room', error);
        const msg = error.response?.data?.error || 'Failed to delete room';
        alert(msg);
      }
    }
  };

  const totalPlants = rooms
    .filter(room => room.name !== 'Graveyard')
    .reduce((acc, room) => acc + room.plants.length, 0);

  if (loading) return <div>Loading...</div>;

  if (selectedRoom) {
    return <PlantList room={selectedRoom} onBack={() => setSelectedRoom(null)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 -ml-2"><ChevronLeft /></button>
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      <section className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-lg font-bold text-slate-800">Algorithm Tuning</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-600">Adaptability (Alpha)</label>
              <span className="text-sm font-bold text-green-600">{settings.ema_alpha}</span>
            </div>
            <input 
              type="range" min="0.1" max="0.9" step="0.05"
              value={settings.ema_alpha}
              onChange={e => setSettings({...settings, ema_alpha: parseFloat(e.target.value)})}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Stable</span>
              <span>Reactive</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-600">Snooze Length</label>
              <span className="text-sm font-bold text-green-600">{Math.round(settings.snooze_factor * 100)}%</span>
            </div>
            <input 
              type="range" min="0.1" max="0.5" step="0.05"
              value={settings.snooze_factor}
              onChange={e => setSettings({...settings, snooze_factor: parseFloat(e.target.value)})}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800"
        >
          <Save className="w-5 h-5" /> Save Settings
        </button>
      </section>

      <RoomList
        rooms={rooms}
        totalPlants={totalPlants}
        onRoomClick={setSelectedRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      <section className="pt-4">
        <button 
          onClick={onOpenGraveyard}
          className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-medium py-3 border-2 border-dashed border-slate-200 rounded-xl transition-colors"
        >
          <Trash2 className="w-5 h-5" /> View Plant Graveyard
        </button>
      </section>
    </div>
  );
};

export default SettingsPage;