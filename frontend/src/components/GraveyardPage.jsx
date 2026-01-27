import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, RefreshCw, Trash2, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

const GraveyardPage = ({ onBack, rooms, onRestore }) => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  const fetchGraveyard = async () => {
    try {
      const res = await axios.get('/api/graveyard');
      setPlants(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch graveyard', error);
    }
  };

  useEffect(() => {
    fetchGraveyard();
  }, []);

  const handleRestore = async (plantId) => {
    const roomId = rooms[0]?.id; // Simple restoration to first room
    if (!roomId) return alert("Create a room first!");
    
    setRestoringId(plantId);
    try {
      await axios.post(`/api/plants/${plantId}/restore`, { roomId });
      await fetchGraveyard();
      onRestore(); // Refresh dashboard
    } catch (error) {
      console.error('Restore failed', error);
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Opening the gates...</div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2"><ChevronLeft /></button>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-slate-400" /> Plant Graveyard
        </h2>
      </div>

      <div className="space-y-3">
        {plants.length === 0 && (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">All your plants are safe and sound.</p>
          </div>
        )}
        {plants.map(plant => (
          <div key={plant.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between gap-4 grayscale opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {plant.imageUrl ? (
                  <img src={plant.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-slate-400">{plant.name[0]}</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">{plant.name}</h3>
                <p className="text-xs text-slate-400">{plant.archetype?.name}</p>
              </div>
            </div>
            <button 
              disabled={restoringId === plant.id}
              onClick={() => handleRestore(plant.id)}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", restoringId === plant.id && "animate-spin")} />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GraveyardPage;
