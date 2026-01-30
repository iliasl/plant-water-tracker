import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from './lib/api';
import { Plus, Settings as SettingsIcon, Droplets, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import RoomSection from './components/RoomSection';
import PlantCard from './components/PlantCard';
import PlantModal from './components/PlantModal';
import SettingsPage from './components/SettingsPage';
import PlantDetails from './components/PlantDetails';
import GraveyardPage from './components/GraveyardPage';
import HelpPage from './components/HelpPage';
import LoginPage from './components/LoginPage';
import UserMenu from './components/UserMenu';
import PasswordModal from './components/PasswordModal';
import { Toaster, useToast } from './components/ui/use-toast';
import { isPast, isToday, parseISO } from 'date-fns';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const MainApp = () => {
  const [rooms, setRooms] = useState([]);
  const [archetypes, setArchetypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchData = async () => {
    try {
      const [roomsRes, archetypesRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/archetypes')
      ]);
      setRooms(roomsRes.data || []);
      setArchetypes(archetypesRes.data || []);
    } catch (error) {
      console.error('Error fetching data', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
      setRooms([]);
      setArchetypes([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (plantId, type, isAnomaly = false, extraData = {}) => {
    try {
      await api.post(`/plants/${plantId}/event`, { type, isAnomaly, ...extraData });
      fetchData();
      toast({
        title: type === 'WATER' ? 'Watered!' : 'Snoozed',
        description: isAnomaly ? 'Marked as anomaly.' : 'Updated schedule.',
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update plant.",
      });
    }
  };

  const safeIsPast = (dateStr) => {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    return !isNaN(date) && isPast(date);
  };

  const safeIsToday = (dateStr) => {
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    return !isNaN(date) && isToday(date);
  };

  const currentView = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-700 flex items-center gap-2" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Droplets className="w-6 h-6" /> PlantWise
        </h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate('/')} className={currentView === '/' ? 'text-green-700' : 'text-slate-500'}>
            <Clock className="w-6 h-6" />
          </button>
          <button onClick={() => navigate('/settings')} className={currentView === '/settings' ? 'text-green-700' : 'text-slate-500'}>
            <SettingsIcon className="w-6 h-6" />
          </button>
          <button onClick={() => navigate('/help')} className={currentView === '/help' ? 'text-green-700' : 'text-slate-500'}>
            <HelpCircle className="w-6 h-6" />
          </button>
          <UserMenu openPasswordModal={() => setIsPasswordModalOpen(true)} />
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={
            <div className="space-y-10">
              {(!rooms || rooms.length === 0) ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-slate-600">No plants yet</h2>
                  <p className="text-slate-400 text-sm">Click the + button to add your first plant.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-blue-500" /> To Water
                    </h2>
                    {rooms.map(room => {
                      const urgentPlants = (room.plants || []).filter(p => safeIsPast(p.nextCheckDate) || safeIsToday(p.nextCheckDate));
                      if (urgentPlants.length === 0) return null;
                      return (
                        <RoomSection 
                          key={room.id} 
                          room={{...room, plants: urgentPlants}} 
                          onAction={handleAction} 
                          onEdit={(plant) => { setEditingPlant(plant); setIsModalOpen(true); }}
                          onView={(plant) => navigate(`/plants/${plant.id}`)}
                        />
                      );
                    })}
                    {rooms.every(r => (r.plants || []).filter(p => safeIsPast(p.nextCheckDate) || safeIsToday(p.nextCheckDate)).length === 0) && (
                      <p className="text-slate-400 text-sm italic py-4">All plants are hydrated! ✨</p>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" /> Upcoming
                    </h2>
                    <div className="space-y-3">
                      {rooms
                        .flatMap(r => r.plants || [])
                        .filter(p => !safeIsPast(p.nextCheckDate) && !safeIsToday(p.nextCheckDate))
                        .sort((a, b) => {
                          const da = a.nextCheckDate ? parseISO(a.nextCheckDate) : new Date(0);
                          const db = b.nextCheckDate ? parseISO(b.nextCheckDate) : new Date(0);
                          return da - db;
                        })
                        .map(plant => (
                          <PlantCard 
                            key={plant.id} 
                            plant={plant} 
                            onAction={handleAction} 
                            onEdit={(plant) => { setEditingPlant(plant); setIsModalOpen(true); }}
                            onView={(plant) => navigate(`/plants/${plant.id}`)}
                          />
                        ))
                      }
                    </div>
                  </div>
                </>
              )}

              <button 
                onClick={() => { setEditingPlant(null); setIsModalOpen(true); }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors"
              >
                <Plus className="w-8 h-8" />
              </button>
            </div>
          } />

          <Route path="/settings" element={<SettingsPage onOpenGraveyard={() => navigate('/graveyard')} />} />
          <Route path="/plants/:id" element={<PlantDetails onUpdate={fetchData} onEdit={(plant) => { setEditingPlant(plant); setIsModalOpen(true); }} />} />
          <Route path="/graveyard" element={<GraveyardPage rooms={rooms} onRestore={fetchData} />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </main>

      <PasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      {isModalOpen && (
        <PlantModal 
          plant={editingPlant} 
          archetypes={archetypes} 
          rooms={rooms}
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchData} 
        />
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<PrivateRoute><MainApp /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;

