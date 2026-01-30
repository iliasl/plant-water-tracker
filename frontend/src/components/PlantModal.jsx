import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { X, Trash2, RotateCcw, AlertTriangle, Camera, Upload } from 'lucide-react';

const PlantModal = ({ plant, archetypes, rooms, onClose, onSave }) => {
  const [name, setName] = useState(plant?.name || '');
  const [imageUrl, setImageUrl] = useState(plant?.imageUrl || '');
  const [roomId, setRoomId] = useState(plant?.roomId || rooms[0]?.id || '');
  const [archetypeId, setArchetypeId] = useState(plant?.archetypeId || archetypes[0]?.id || '');
  const [waterAmount, setWaterAmount] = useState(plant?.waterAmount || '');
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const waterAmountOptions = [];
  for (let i = 0.25; i <= 3; i += 0.25) {
    waterAmountOptions.push(i.toFixed(2));
  }

  // Sync state if props load after mounting
  useEffect(() => {
    if (!roomId && rooms.length > 0) setRoomId(rooms[0].id);
    if (rooms.length === 0) setShowNewRoom(true);
  }, [rooms, roomId]);

  useEffect(() => {
    if (!archetypeId && archetypes.length > 0) setArchetypeId(archetypes[0].id);
  }, [archetypes, archetypeId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImageUrl(res.data.imageUrl);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archetypeId) {
      alert("Please select a plant type. If the list is empty, ensure the database is seeded.");
      return;
    }
    try {
      let finalRoomId = roomId;
      if (showNewRoom) {
        if (!newRoomName) {
          alert("Please enter a name for the new room.");
          return;
        }
        const roomRes = await api.post('/rooms', { name: newRoomName }); 
        finalRoomId = roomRes.data.id;
      }

      if (!finalRoomId) {
        alert("Please select or create a room.");
        return;
      }

      const payload = { 
        name, 
        roomId: finalRoomId, 
        archetypeId: parseInt(archetypeId), 
        imageUrl,
        waterAmount: waterAmount ? parseFloat(waterAmount) : null
      };

      if (isNaN(payload.archetypeId)) {
        alert("Invalid plant type. Please try again.");
        return;
      }

      if (plant) {
        await api.patch(`/plants/${plant.id}`, payload);
      } else {
        await api.post('/plants', payload);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving plant', error);
      alert("Failed to save plant. Check console for details.");
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this plant? It will be moved to the Graveyard.')) {
      try {
        await api.delete(`/plants/${plant.id}`);
        onSave();
        onClose();
      } catch (error) {
        console.error('Delete failed', error);
      }
    }
  };

  const handleRepot = async () => {
    if (confirm('Are you sure? This will reset the learning history for this plant.')) {
      await api.post(`/plants/${plant.id}/event`, { type: 'REPOT' });
      onSave();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">{plant ? 'Edit Plant' : 'Add New Plant'}</h2>
          <div className="flex gap-2">
            {plant && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400 flex flex-col items-center">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold uppercase">Add Photo</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="text-white w-6 h-6" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
              capture="environment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plant Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="e.g. Monstera Deliciosa"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input 
              type="text" 
              value={imageUrl} 
              onChange={e => setImageUrl(e.target.value)} 
              className="w-full border rounded-lg px-3 py-2"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plant Type</label>
            {archetypes.length === 0 ? (
              <p className="text-xs text-red-500">Loading plant types... (Ensure database is seeded)</p>
            ) : (
              <select 
                value={archetypeId} 
                onChange={e => setArchetypeId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {archetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Water Amount (Liters)</label>
            <select
              value={waterAmount}
              onChange={e => setWaterAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">N/A</option>
              {waterAmountOptions.map(amount => (
                <option key={amount} value={amount}>{amount}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
            {rooms.length === 0 ? (
              <input 
                type="text" 
                value={newRoomName} 
                onChange={e => setNewRoomName(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Create a room to place your plant in..."
                autoFocus
                required
              />
            ) : !showNewRoom ? (
              <div className="flex gap-2">
                <select 
                  value={roomId} 
                  onChange={e => setRoomId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => setShowNewRoom(true)}
                  className="bg-slate-100 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newRoomName} 
                  onChange={e => setNewRoomName(e.target.value)} 
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="New room name..."
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowNewRoom(false)}
                  className="text-slate-400 px-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-colors">
              {plant ? 'Save Changes' : 'Add Plant'}
            </button>
            
            {plant && (
              <div className="grid grid-cols-1 gap-2 mt-2">
                <button 
                  type="button"
                  onClick={handleRepot}
                  className="flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  <RotateCcw className="w-4 h-4" /> Repotted
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlantModal;
