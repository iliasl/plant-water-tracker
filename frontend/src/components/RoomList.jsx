import React from 'react';
import { Trash2 } from 'lucide-react';

const RoomList = ({ rooms, totalPlants, onRoomClick, onDeleteRoom }) => {
  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Rooms (Total: {totalPlants})</h3>
      <div className="space-y-2">
        {rooms.map(room => (
          <div 
            key={room.id} 
            className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 cursor-pointer"
            onClick={() => onRoomClick(room)}
          >
            <div className="flex flex-col">
              <span className="font-medium">{room.name}</span>
              <span className="text-xs text-slate-400">{room.plants.length} plants</span>
            </div>
            {room.name !== 'Graveyard' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteRoom(room.id, room.name); }}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Room"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RoomList;
