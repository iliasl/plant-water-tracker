import React from 'react';
import PlantCard from './PlantCard';

const RoomSection = ({ room, onAction, onEdit, onView }) => {
  if (!room?.plants || room.plants.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">
        {room.name}
      </h2>
      <div className="space-y-3">
        {room.plants.map(plant => (
          <PlantCard 
            key={plant.id} 
            plant={plant} 
            onAction={onAction} 
            onEdit={onEdit} 
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomSection;
