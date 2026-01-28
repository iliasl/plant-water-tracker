import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChevronLeft, Trash2, MoreVertical } from 'lucide-react';
import HistoryChart from './HistoryChart';
import ImageModal from './ImageModal';
import { format, parseISO } from 'date-fns';

const PlantDetails = ({ plant: initialPlant, onBack, onUpdate, onEdit }) => {
  const [plant, setPlant] = useState(initialPlant);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [historyRes, plantRes] = await Promise.all([
        axios.get(`/api/plants/${initialPlant.id}/history`),
        axios.get(`/api/plants/${initialPlant.id}`)
      ]);
      setHistory(historyRes.data);
      setPlant(plantRes.data);
    } catch (error) {
      console.error('Error fetching details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [initialPlant.id]);

  const handleDeleteEvent = async (eventId) => {
    if (confirm('Delete this event? This will recalculate the plant schedule.')) {
      await axios.delete(`/api/events/${eventId}`);
      await fetchDetails();
      onUpdate();
    }
  };

  const handleImageClick = () => {
    if (plant.imageUrl) {
      setImageModalOpen(true);
    }
  };

  const handlePencilClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { imageUrl } = uploadRes.data;

      const updateRes = await axios.patch(`/api/plants/${plant.id}`, { imageUrl });
      setPlant(updateRes.data);
      setImageModalOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;

  const lastWateredDate = plant.lastWateredDate ? parseISO(plant.lastWateredDate) : null;
  const lastWateredDays = lastWateredDate && !isNaN(lastWateredDate)
    ? Math.floor((new Date() - lastWateredDate) / (1000 * 60 * 60 * 24))
    : null;

  const adjustEma = async (amount) => {
    const newEma = Math.max(1, (plant.currentEma || 0) + amount);
    try {
      const res = await axios.patch(`/api/plants/${plant.id}`, { currentEma: newEma });
      setPlant(res.data);
      onUpdate();
    } catch (error) {
      console.error('Failed to adjust schedule', error);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {isImageModalOpen && (
        <ImageModal
          imageUrl={plant.imageUrl}
          onClose={() => setImageModalOpen(false)}
          onEdit={handlePencilClick}
        />
      )}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft />
        </button>
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
            onClick={handleImageClick}
          >
            {plant.imageUrl ? (
              <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{plant.name[0]}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{plant.name}</h2>
              <button 
                onClick={() => onEdit(plant)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                title="Edit Plant"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500">{plant.room?.name} • {plant.archetype?.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border text-center relative group">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Current Schedule</p>
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => adjustEma(-1)}
              className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            >
              -
            </button>
            <p className="text-xl font-bold text-green-600">{Math.round(plant.currentEma)} days</p>
            <button 
              onClick={() => adjustEma(1)}
              className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border text-center">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Last Watered</p>
          <p className="text-xl font-bold text-slate-700">
            {lastWateredDays === null ? 'Never' : `${lastWateredDays} days ago`}
          </p>
        </div>
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Interval History</h3>
        <HistoryChart data={history} currentEma={plant.currentEma} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <h3 className="text-sm font-bold text-slate-400 uppercase p-6 pb-0">Event Log</h3>
        <div className="divide-y">
          {history.slice().reverse().map(event => (
            <div key={event.id} className="p-4 flex justify-between items-center group">
              <div>
                <div className="font-semibold text-slate-800">
                  {event.type} 
                  {event.isAnomaly && <span className="text-red-500 text-xs ml-2">(Anomaly)</span>}
                  {event.snoozeExtraDays && <span className="text-blue-500 text-xs ml-2">(+{event.snoozeExtraDays} days)</span>}
                  {event.soilCondition === 'DRY' && <span className="text-orange-500 text-xs ml-2">(Too Dry)</span>}
                </div>
                <div className="text-xs text-slate-500">{format(new Date(event.timestamp), 'PPP p')}</div>
              </div>
              <div className="flex items-center gap-3">
                {event.note && <div className="text-sm text-slate-600 italic">"{event.note}"</div>}
                <button 
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PlantDetails;
